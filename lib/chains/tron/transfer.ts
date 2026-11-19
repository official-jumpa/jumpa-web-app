import { CONTRACT_ADDRESSES } from "@/lib/blockchain";
import type { TronAccount } from "./address";
import { isTronAddress, tronAccountFromSecret } from "./address";
import {
  broadcastTronTransaction,
  buildTokenTransfer,
  buildTrxTransfer,
  signTronTransaction,
  TronNodeError,
  type TronUnsignedTx,
} from "./node";

export interface TronTransferResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
  /** What Jumpa charged for sponsoring the gas, in the token sent; absent when the user paid their own. */
  feePaid?: string;
}

/** USDT and USDC on Tron both use 6 decimals. */
export const TRON_TOKEN_DECIMALS = 6;
/** Most a self-paid token transfer may burn: 300k energy at today's 100 sun, twice a send to a new holder. */
export const DEFAULT_TOKEN_FEE_LIMIT_SUN = BigInt(30_000_000);

const GENERIC_ERROR =
  "Unable to send transaction to the Tron network. Please try again shortly.";

export const tronExplorerUrl = (txHash: string) =>
  `https://tronscan.org/#/transaction/${txHash}`;

/**
 * Exact smallest units for a decimal amount; null unless it is a positive number.
 * Digits past `decimals` round half-up, as the float maths this replaced did.
 */
export function toRawUnits(
  amount: number | string,
  decimals: number,
): bigint | null {
  const text =
    typeof amount === "number" ? amount.toFixed(decimals) : amount.trim();
  const match = /^(\d+)(?:\.(\d*))?$/.exec(text);
  if (!match) return null;
  const fraction = match[2] ?? "";
  let raw = BigInt(
    match[1] + fraction.slice(0, decimals).padEnd(decimals, "0"),
  );
  if (fraction.length > decimals && Number(fraction[decimals]) >= 5)
    raw += BigInt(1);
  return raw > BigInt(0) ? raw : null;
}

/** Signs and broadcasts a verified transaction, returning the hash. */
export async function signAndSend(
  tx: TronUnsignedTx,
  account: TronAccount,
): Promise<string> {
  const signed = await signTronTransaction(tx, account);
  await broadcastTronTransaction(signed);
  console.log(`[TronTransfer] Sent Tron transaction ${signed.txID}`);
  return signed.txID;
}

function failure(err: unknown): TronTransferResult {
  if (err instanceof TronNodeError)
    return { success: false, error: err.message };
  console.error("[TronTransfer] Unexpected error:", err);
  return { success: false, error: GENERIC_ERROR };
}

/** A TRC-20 transfer (USDT by default) paid from the sender's own TRX. */
export async function executeTronTokenTransfer(options: {
  mnemonicOrPrivateKey: string;
  toAddress: string;
  amount: number | string;
  tokenContractAddress?: string;
  feeLimitSun?: bigint;
}): Promise<TronTransferResult> {
  const {
    mnemonicOrPrivateKey,
    toAddress,
    amount,
    tokenContractAddress = CONTRACT_ADDRESSES.tron.mainnet.USDT.address,
    feeLimitSun = DEFAULT_TOKEN_FEE_LIMIT_SUN,
  } = options;

  if (!isTronAddress(toAddress)) {
    return { success: false, error: "That isn't a valid Tron address." };
  }
  const amountRaw = toRawUnits(amount, TRON_TOKEN_DECIMALS);
  if (amountRaw === null) {
    return { success: false, error: "Invalid transfer amount." };
  }

  try {
    const { account, address } = tronAccountFromSecret(mnemonicOrPrivateKey);
    const tx = await buildTokenTransfer({
      owner: address,
      token: tokenContractAddress,
      to: toAddress,
      amountRaw,
      feeLimitSun,
    });
    const txHash = await signAndSend(tx, account);
    return { success: true, txHash, explorerUrl: tronExplorerUrl(txHash) };
  } catch (err) {
    return failure(err);
  }
}

/** Sends TRX, Tron's own coin. */
export async function executeTronNativeTransfer(options: {
  mnemonicOrPrivateKey: string;
  toAddress: string;
  amount: string;
}): Promise<TronTransferResult> {
  const { mnemonicOrPrivateKey, toAddress, amount } = options;

  if (!isTronAddress(toAddress)) {
    return { success: false, error: "That isn't a valid Tron address." };
  }
  const sun = /^\d+(\.\d{0,6})?$/.test(amount.trim())
    ? toRawUnits(amount, 6)
    : null;
  if (sun === null || sun > BigInt(Number.MAX_SAFE_INTEGER)) {
    return {
      success: false,
      error: "Enter a TRX amount with up to 6 decimal places.",
    };
  }

  try {
    const { account, address } = tronAccountFromSecret(mnemonicOrPrivateKey);
    if (address === toAddress.trim()) {
      return {
        success: false,
        error: "You can't send TRX to your own address.",
      };
    }
    const tx = await buildTrxTransfer(address, toAddress.trim(), sun);
    const txHash = await signAndSend(tx, account);
    return { success: true, txHash, explorerUrl: tronExplorerUrl(txHash) };
  } catch (err) {
    return failure(err);
  }
}
