import {
  type Address,
  createPublicClient,
  type Hex,
  http,
  type PrivateKeyAccount,
  type PublicClient,
  parseAbi,
  TransactionReceiptNotFoundError,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { environment } from "@/lib/environment";
import { POLYGON_USDT } from "./constants";

/** The USDT0 functions the mini app reads and relays. */
export const USDT0_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function nonces(address owner) view returns (uint256)",
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
]);

let client: PublicClient | undefined;

export function polygonTransport() {
  return http(environment.POLYGON_RPC_URL, { timeout: 10_000, retryCount: 2 });
}

export function polygonClient(): PublicClient {
  client ??= createPublicClient({
    chain: polygon,
    transport: polygonTransport(),
  });
  return client;
}

/** The gas-paying relayer, or null when no valid key is configured. */
export function relayerAccount(): PrivateKeyAccount | null {
  const raw = environment.NIMIQ_RELAYER_KEY.trim();
  if (!raw) return null;
  try {
    return privateKeyToAccount(
      (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex,
    );
  } catch {
    console.error("[nimiq] NIMIQ_RELAYER_KEY is not a valid private key");
    return null;
  }
}

export function readUsdtBalance(owner: Address): Promise<bigint> {
  return polygonClient().readContract({
    address: POLYGON_USDT.address,
    abi: USDT0_ABI,
    functionName: "balanceOf",
    args: [owner],
  });
}

export function readPermitNonce(owner: Address): Promise<bigint> {
  return polygonClient().readContract({
    address: POLYGON_USDT.address,
    abi: USDT0_ABI,
    functionName: "nonces",
    args: [owner],
  });
}

export function readAllowance(
  owner: Address,
  spender: Address,
): Promise<bigint> {
  return polygonClient().readContract({
    address: POLYGON_USDT.address,
    abi: USDT0_ABI,
    functionName: "allowance",
    args: [owner, spender],
  });
}

/** POL left on the relayer for gas; 0 when none is configured. */
export async function readRelayerGas(): Promise<bigint> {
  const account = relayerAccount();
  if (!account) return BigInt(0);
  return polygonClient().getBalance({ address: account.address });
}

/** Mined outcome of a transaction; "missing" when the node has no receipt, null when it couldn't be asked. */
export async function readReceiptStatus(
  hash: Hex,
): Promise<"success" | "reverted" | "missing" | null> {
  try {
    const receipt = await polygonClient().getTransactionReceipt({ hash });
    return receipt.status;
  } catch (error) {
    return error instanceof TransactionReceiptNotFoundError ? "missing" : null;
  }
}

/** How many of the relayer's transactions have mined, or null when unknown. */
export async function readRelayerNonce(): Promise<number | null> {
  const account = relayerAccount();
  if (!account) return null;
  try {
    return await polygonClient().getTransactionCount({
      address: account.address,
      blockTag: "latest",
    });
  } catch {
    return null;
  }
}
