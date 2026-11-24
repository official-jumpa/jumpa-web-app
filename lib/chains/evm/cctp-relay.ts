import {
  createPublicClient,
  createWalletClient,
  fallback,
  getAddress,
  type Hex,
  http,
} from "viem";
import { base, mainnet } from "viem/chains";
import {
  CCTP_DOMAINS,
  CIRCLE_IRIS_API,
  CONTRACT_ADDRESSES,
  getExplorerTxUrl,
  getRpcUrl,
} from "@/lib/blockchain";
import { getEvmSponsorAccount } from "@/lib/chains/evm/sponsor";
import { connectDB } from "@/lib/db";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { Transaction } from "@/models/Transaction";

/** CCTP v2 transfers into Ethereum or Base: once Circle attests the burn, Jumpa's EVM sponsor mints it. */

export type EvmBridgeDestination = "ethereum" | "base";

export interface EvmBridgeTransfer {
  burnTxHash: string;
  sourceDomain: number;
  destination: EvmBridgeDestination;
  userId: string;
  /** The amount quoted to arrive, used in the notification. */
  amount: string;
}

/** A fast transfer is attested in seconds; one that falls back to finality takes up to ~20 minutes. */
export const ATTESTATION_WAIT_MS = 25 * 60_000;
const ATTESTATION_POLL_MS = 6_000;

const DESTINATIONS = {
  ethereum: {
    chain: mainnet,
    label: "Ethereum",
    fallbackRpcUrl: "https://eth.drpc.org",
    messageTransmitter:
      CONTRACT_ADDRESSES.cctp.mainnet.ethereum.messageTransmitter,
  },
  base: {
    chain: base,
    label: "Base",
    fallbackRpcUrl: "https://mainnet.base.org",
    messageTransmitter: CONTRACT_ADDRESSES.cctp.mainnet.base.messageTransmitter,
  },
} as const;

const MESSAGE_TRANSMITTER_V2_ABI = [
  {
    type: "function",
    name: "receiveMessage",
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" },
    ],
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "usedNonces",
    inputs: [{ name: "nonce", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

interface AttestedMessage {
  message: Hex;
  attestation: Hex;
  nonce: Hex;
}

/** Circle's signed message for a burn; null while it is still being attested or Iris can't be reached. */
async function fetchAttestedMessage(
  sourceDomain: number,
  burnTxHash: string,
): Promise<AttestedMessage | null> {
  try {
    const res = await fetch(
      `${CIRCLE_IRIS_API.mainnet}/v2/messages/${sourceDomain}?transactionHash=${burnTxHash}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const msg = data.messages?.[0];
    if (
      msg?.status !== "complete" ||
      !msg.message ||
      !msg.attestation ||
      !msg.eventNonce
    ) {
      return null;
    }
    return {
      message: msg.message,
      attestation: msg.attestation,
      nonce: msg.eventNonce,
    };
  } catch {
    return null;
  }
}

/** Mints an attested message on the destination; null when it was already minted. */
async function mintAttestedMessage(
  destination: EvmBridgeDestination,
  attested: AttestedMessage,
): Promise<Hex | null> {
  const sponsor = getEvmSponsorAccount();
  if (!sponsor) throw new Error("SPONSORED_FEE_EVM_KEY is not configured");

  const { chain, fallbackRpcUrl, messageTransmitter } =
    DESTINATIONS[destination];
  const transport = fallback([
    http(getRpcUrl(destination)),
    http(fallbackRpcUrl),
  ]);
  const publicClient = createPublicClient({ chain, transport });
  const transmitter = getAddress(messageTransmitter);

  const nonceUsed = await publicClient.readContract({
    address: transmitter,
    abi: MESSAGE_TRANSMITTER_V2_ABI,
    functionName: "usedNonces",
    args: [attested.nonce],
  });
  if (nonceUsed !== BigInt(0)) return null;

  const { request } = await publicClient.simulateContract({
    account: sponsor,
    address: transmitter,
    abi: MESSAGE_TRANSMITTER_V2_ABI,
    functionName: "receiveMessage",
    args: [attested.message, attested.attestation],
  });
  const walletClient = createWalletClient({
    account: sponsor,
    chain,
    transport,
  });
  const mintTxHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: mintTxHash,
  });
  if (receipt.status !== "success") {
    throw new Error(`receiveMessage reverted on ${destination}: ${mintTxHash}`);
  }
  return mintTxHash;
}

/** Confirms the bridge row; notifies once, when this call minted it or first confirmed it. */
async function recordArrival(
  transfer: EvmBridgeTransfer,
  mintTxHash: Hex | null,
) {
  const mintFields = mintTxHash
    ? {
        "bridgeDetails.mintTxHash": mintTxHash,
        "bridgeDetails.mintExplorerUrl": getExplorerTxUrl(
          transfer.destination,
          mintTxHash,
          false,
        ),
      }
    : {};

  await connectDB();
  const before = await Transaction.findOneAndUpdate(
    { txHash: transfer.burnTxHash, type: "BRIDGE" },
    { $set: { status: "CONFIRMED", updatedAt: new Date(), ...mintFields } },
    { returnDocument: "before", projection: { status: 1 } },
  ).lean<{ status: string }>();
  if (!before || (!mintTxHash && before.status === "CONFIRMED")) return;

  invalidateBalanceCache(transfer.userId);
  await createNotification({
    userId: transfer.userId,
    tab: "transactions",
    title: "Bridge Completed",
    body: `${transfer.amount} USDC has arrived on ${DESTINATIONS[transfer.destination].label}!`,
    type: "BRIDGE_COMPLETED",
  }).catch(() => null);
}

/** Mints the transfer once Circle has attested it and confirms its row; false while still unattested. */
export async function completeCctpTransferToEvm(
  transfer: EvmBridgeTransfer,
): Promise<boolean> {
  const attested = await fetchAttestedMessage(
    transfer.sourceDomain,
    transfer.burnTxHash,
  );
  if (!attested) return false;

  const mintTxHash = await mintAttestedMessage(transfer.destination, attested);
  await recordArrival(transfer, mintTxHash);
  return true;
}

/** Waits in the background for the attestation, then completes the transfer. The resolver retries any it misses. */
export function relayCctpTransferToEvm(transfer: EvmBridgeTransfer): void {
  (async () => {
    const giveUpAt = Date.now() + ATTESTATION_WAIT_MS;
    while (Date.now() < giveUpAt) {
      await new Promise((resolve) => setTimeout(resolve, ATTESTATION_POLL_MS));
      try {
        if (await completeCctpTransferToEvm(transfer)) return;
      } catch (err) {
        console.error(
          `[CCTP Relay] Mint failed for ${transfer.burnTxHash}: ${formatOneLineError(err)}`,
        );
        return;
      }
    }
    console.warn(
      `[CCTP Relay] No attestation in time for ${transfer.burnTxHash}; the resolver will retry.`,
    );
  })();
}

/** A pending bridge burned on Ethereum or Base into Ethereum or Base, which only this relay completes. */
export function evmToEvmBridgeTransfer(tx: {
  type?: string;
  chain?: string | null;
  txHash?: string | null;
  userId: string;
  bridgeDetails?: {
    provider?: string;
    toChain?: string;
    toAmount?: string;
  } | null;
}): EvmBridgeTransfer | null {
  const source = tx.chain;
  const destination = tx.bridgeDetails?.toChain?.toLowerCase();
  if (
    tx.type !== "BRIDGE" ||
    tx.bridgeDetails?.provider !== "circle_cctp_v2" ||
    !tx.txHash ||
    (source !== "ethereum" && source !== "base") ||
    (destination !== "ethereum" && destination !== "base")
  ) {
    return null;
  }
  return {
    burnTxHash: tx.txHash,
    sourceDomain: CCTP_DOMAINS[source],
    destination,
    userId: tx.userId,
    amount: tx.bridgeDetails?.toAmount || "",
  };
}
