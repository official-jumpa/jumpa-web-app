import { randomUUID } from "node:crypto";
import {
  type Address,
  createWalletClient,
  encodeFunctionData,
  type Hex,
  keccak256,
  parseEther,
  parseSignature,
} from "viem";
import { polygon } from "viem/chains";
import { getDb } from "@/lib/db";
import { POLYGON_USDT } from "./constants";
import {
  polygonClient,
  polygonTransport,
  readAllowance,
  readRelayerGas,
  readUsdtBalance,
  relayerAccount,
  USDT0_ABI,
} from "./polygon";

const LOCK_ID = "polygon-relayer";
const LOCK_COLLECTION = "nimiq_locks";
const LEASE_MS = 120_000;
const POLL_MS = 250;
const RECEIPT_TIMEOUT_MS = 60_000;
/** Below this the relayer refuses new payments instead of failing half-way. */
export const MIN_RELAYER_GAS = parseEther("0.05");

export const RELAYER_PAUSED =
  "Payments are paused for a moment. Please try again shortly.";
const NOT_SENT = "The transfer could not be sent. No money has moved.";

/** Nothing was sent, so the same signature can be retried. */
export class RelayerUnavailableError extends Error {
  constructor(message = RELAYER_PAUSED) {
    super(message);
    this.name = "RelayerUnavailableError";
  }
}

/** Another payment holds the relayer longer than this request will wait. */
export class RelayerBusyError extends RelayerUnavailableError {
  constructor() {
    super("Payments are busy right now. Please try again in a minute.");
    this.name = "RelayerBusyError";
  }
}

/** A relay that stopped for good; nothing moved and the message is fit to show the user. */
export class RelayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelayError";
  }
}

type LockDoc = { _id: string; holder: string | null; lockedUntil: Date };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isDuplicateKey = (error: unknown) =>
  (error as { code?: number } | null)?.code === 11000;

/**
 * Serialises relays across server instances so two cash-outs never reuse a
 * relayer nonce. Resolves to the release function.
 */
export async function acquireRelayerLock(
  holder: string,
  waitMs = 20_000,
  leaseMs = LEASE_MS,
): Promise<() => Promise<void>> {
  const locks = getDb().collection<LockDoc>(LOCK_COLLECTION);
  const token = `${holder}:${randomUUID()}`;
  const giveUpAt = Date.now() + waitMs;

  for (;;) {
    const now = new Date();
    try {
      // Matches only a free or expired lock; a held one makes the upsert collide on _id.
      const taken = await locks.findOneAndUpdate(
        { _id: LOCK_ID, lockedUntil: { $lte: now } },
        {
          $set: {
            holder: token,
            lockedUntil: new Date(now.getTime() + leaseMs),
          },
        },
        { upsert: true, returnDocument: "after" },
      );
      if (taken?.holder === token) {
        // Renewed while held, so a slow relay never loses the lock mid-transfer.
        const renew = setInterval(() => {
          locks
            .updateOne(
              { _id: LOCK_ID, holder: token },
              { $set: { lockedUntil: new Date(Date.now() + leaseMs) } },
            )
            .catch((error) =>
              console.error("[nimiq] relayer lock renewal failed:", error),
            );
        }, leaseMs / 3);
        renew.unref?.();
        return async () => {
          clearInterval(renew);
          await locks.updateOne(
            { _id: LOCK_ID, holder: token },
            { $set: { holder: null, lockedUntil: new Date(0) } },
          );
        };
      }
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
    if (Date.now() >= giveUpAt) throw new RelayerBusyError();
    await sleep(POLL_MS);
  }
}

export function encodePermitCall(input: {
  owner: Address;
  spender: Address;
  value: bigint;
  deadline: bigint;
  signature: Hex;
}): Hex {
  const { r, s, v, yParity } = parseSignature(input.signature);
  return encodeFunctionData({
    abi: USDT0_ABI,
    functionName: "permit",
    args: [
      input.owner,
      input.spender,
      input.value,
      input.deadline,
      Number(v ?? BigInt(yParity + 27)),
      r,
      s,
    ],
  });
}

export function encodeTransferFromCall(
  from: Address,
  to: Address,
  value: bigint,
): Hex {
  return encodeFunctionData({
    abi: USDT0_ABI,
    functionName: "transferFrom",
    args: [from, to, value],
  });
}

/** Above a real USDT0 transferFrom (84,174); a fixed limit skips estimateGas on a node that may not see the permit yet. */
export const TRANSFER_GAS_LIMIT = BigInt(150_000);

export function transferFromRequest(
  owner: Address,
  to: Address,
  value: bigint,
  nonce: number,
) {
  return {
    to: POLYGON_USDT.address,
    data: encodeTransferFromCall(owner, to, value),
    nonce,
    gas: TRANSFER_GAS_LIMIT,
  };
}

const ALLOWANCE_POLL_MS = 2_000;

/**
 * Whether a broadcast permit took effect. An unreadable receipt is not a failure:
 * the allowance is polled until it covers the value or the wait runs out.
 */
export async function permitTookEffect(
  receiptStatus: () => Promise<"success" | "reverted">,
  allowanceCovers: () => Promise<boolean>,
  { timeoutMs = RECEIPT_TIMEOUT_MS, pollMs = ALLOWANCE_POLL_MS } = {},
): Promise<boolean> {
  const giveUpAt = Date.now() + timeoutMs;
  try {
    if ((await receiptStatus()) === "success") return true;
    // Reverted: someone may have submitted the same permit first.
    return await allowanceCovers();
  } catch (error) {
    console.error(
      "[nimiq] permit receipt unreadable:",
      (error as Error).message,
    );
  }
  for (;;) {
    if (await allowanceCovers().catch(() => false)) return true;
    if (Date.now() >= giveUpAt) return false;
    await sleep(pollMs);
  }
}

const BROADCAST_ATTEMPTS = 3;
const ALREADY_KNOWN = /already known|known transaction|alreadyknown/i;

/**
 * Sends signed bytes, re-sending the same bytes on a failed reply (always safe).
 * False means no node confirmed it: the outcome is unknown, never "not sent".
 */
export async function broadcastSigned(
  send: () => Promise<unknown>,
  isKnown: () => Promise<boolean>,
  attempts = BROADCAST_ATTEMPTS,
): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await send();
      return true;
    } catch (error) {
      if (ALREADY_KNOWN.test((error as Error).message ?? "")) return true;
      if (await isKnown().catch(() => false)) return true;
      console.error(
        `[nimiq] broadcast attempt ${attempt} failed:`,
        (error as Error).message,
      );
    }
  }
  return false;
}

export type RelayInput = {
  owner: Address;
  /** The deposit address stored on the order (Switch's, or the relayer for a bill); never client input. */
  to: Address;
  value: bigint;
  deadline: bigint;
  signature: Hex;
  /** Persists the transfer hash and nonce before it is broadcast. */
  onTransferSent: (hash: Hex, nonce: number) => Promise<void>;
};

export type RelayResult = {
  permitTxHash?: Hex;
  transferTxHash: Hex;
  /** False when the receipt did not arrive in time; the order settles later from the hash. */
  confirmed: boolean;
};

/**
 * Submits the owner's permit (unless an allowance already covers the value)
 * and then moves exactly `value` USDT from the owner to `to`, paying the gas.
 */
export async function relayPermitTransfer(
  input: RelayInput,
): Promise<RelayResult> {
  const account = relayerAccount();
  if (!account || (await readRelayerGas()) < MIN_RELAYER_GAS) {
    throw new RelayerUnavailableError();
  }

  const client = polygonClient();
  const wallet = createWalletClient({
    account,
    chain: polygon,
    transport: polygonTransport(),
  });
  const release = await acquireRelayerLock(input.owner);

  try {
    let nonce = await client.getTransactionCount({
      address: account.address,
      blockTag: "pending",
    });
    let permitTxHash: Hex | undefined;

    const allowanceCovers = async () =>
      (await readAllowance(input.owner, account.address)) >= input.value;

    if (!(await allowanceCovers())) {
      try {
        permitTxHash = await wallet.sendTransaction({
          to: POLYGON_USDT.address,
          data: encodePermitCall({ ...input, spender: account.address }),
          nonce,
        });
        nonce += 1;
      } catch (error) {
        console.error("[nimiq] permit failed:", (error as Error).message);
      }
      const hash = permitTxHash;
      // Someone may have submitted the same permit first; the allowance is what matters.
      const permitted = hash
        ? await permitTookEffect(
            () =>
              client
                .waitForTransactionReceipt({
                  hash,
                  timeout: RECEIPT_TIMEOUT_MS,
                })
                .then((receipt) => receipt.status),
            allowanceCovers,
          )
        : await allowanceCovers();
      if (!permitted) {
        throw new RelayError(
          "Your signature could not be used. No money has moved.",
        );
      }
    }

    if ((await readUsdtBalance(input.owner)) < input.value) {
      throw new RelayError(
        "Your USDT balance is lower than this cash-out. No money has moved.",
      );
    }

    // Signed and recorded before broadcast, so a lost RPC reply never hides a sent transfer.
    let signedTransfer: Hex;
    try {
      const request = await wallet.prepareTransactionRequest(
        transferFromRequest(input.owner, input.to, input.value, nonce),
      );
      signedTransfer = await wallet.signTransaction(request);
    } catch (error) {
      console.error("[nimiq] transferFrom rejected:", (error as Error).message);
      throw new RelayError(NOT_SENT);
    }
    const transferTxHash = keccak256(signedTransfer);
    await input.onTransferSent(transferTxHash, nonce);

    const accepted = await broadcastSigned(
      () =>
        client.sendRawTransaction({ serializedTransaction: signedTransfer }),
      () =>
        client
          .getTransaction({ hash: transferTxHash })
          .then(() => true)
          .catch(() => false),
    );
    // Outcome unknown: the order keeps its hash and nonce, and refreshOrder settles it.
    if (!accepted) return { permitTxHash, transferTxHash, confirmed: false };

    const receipt = await client
      .waitForTransactionReceipt({
        hash: transferTxHash,
        timeout: RECEIPT_TIMEOUT_MS,
      })
      .catch(() => null);
    if (receipt?.status === "reverted") {
      throw new RelayError(
        "The transfer failed on Polygon. No money has moved.",
      );
    }
    return { permitTxHash, transferTxHash, confirmed: receipt !== null };
  } finally {
    await release();
  }
}

export type RefundInput = {
  to: Address;
  value: bigint;
  /** Persists the refund hash and nonce before it is broadcast. */
  onSent: (hash: Hex, nonce: number) => Promise<void>;
};

export type RefundResult = {
  txHash: Hex;
  /** False when the receipt did not arrive in time; the order settles later from the hash. */
  confirmed: boolean;
};

/**
 * Returns a refused bill's USDT from the relayer to the wallet that paid it.
 * Throws before sending anything when the relayer can't cover it.
 */
export async function relayRefund(input: RefundInput): Promise<RefundResult> {
  const account = relayerAccount();
  if (
    !account ||
    (await readRelayerGas()) < MIN_RELAYER_GAS ||
    (await readUsdtBalance(account.address)) < input.value
  ) {
    throw new RelayerUnavailableError();
  }

  const client = polygonClient();
  const wallet = createWalletClient({
    account,
    chain: polygon,
    transport: polygonTransport(),
  });
  const release = await acquireRelayerLock(input.to);

  try {
    const nonce = await client.getTransactionCount({
      address: account.address,
      blockTag: "pending",
    });
    const request = await wallet.prepareTransactionRequest({
      to: POLYGON_USDT.address,
      data: encodeFunctionData({
        abi: USDT0_ABI,
        functionName: "transfer",
        args: [input.to, input.value],
      }),
      nonce,
      gas: TRANSFER_GAS_LIMIT,
    });
    const signed = await wallet.signTransaction(request);
    const txHash = keccak256(signed);
    await input.onSent(txHash, nonce);

    const accepted = await broadcastSigned(
      () => client.sendRawTransaction({ serializedTransaction: signed }),
      () =>
        client
          .getTransaction({ hash: txHash })
          .then(() => true)
          .catch(() => false),
    );
    if (!accepted) return { txHash, confirmed: false };
    const receipt = await client
      .waitForTransactionReceipt({ hash: txHash, timeout: RECEIPT_TIMEOUT_MS })
      .catch(() => null);
    return { txHash, confirmed: receipt?.status === "success" };
  } finally {
    await release();
  }
}
