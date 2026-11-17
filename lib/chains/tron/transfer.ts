import { HDKey } from "@scure/bip32";
import { privateKeyToAccount } from "viem/accounts";
import { sha256 } from "viem";
import bs58 from "bs58";
import * as bip39 from "bip39";
import { CONTRACT_ADDRESSES } from "@/lib/blockchain";

const TRON_API_HOST = process.env.TRON_API_HOST || "https://api.trongrid.io";

export interface TronTransferResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}

type TronAccount = ReturnType<typeof privateKeyToAccount>;

/** A real Tron address: 0x41 prefix, 20-byte body and a matching checksum, so a typo never receives funds. */
export function isTronAddress(address: string): boolean {
  try {
    const bytes = bs58.decode(address.trim());
    if (bytes.length !== 25 || bytes[0] !== 0x41) return false;
    const check = sha256(sha256(bytes.subarray(0, 21), "bytes"), "bytes");
    return Buffer.from(check.subarray(0, 4)).equals(Buffer.from(bytes.subarray(21)));
  } catch {
    return false;
  }
}

/** The signing account's own Tron address (Base58Check). */
function ownerAddressOf(account: TronAccount): string {
  const rawAddressBytes = Buffer.from(account.address.slice(2), "hex");
  const payload = Buffer.concat([Buffer.from([0x41]), rawAddressBytes]);
  const hash1 = sha256(payload);
  const hash2 = sha256(hash1);
  const checksum = Buffer.from(hash2.slice(2, 10), "hex");
  return bs58.encode(Buffer.concat([payload, checksum]));
}

/** Exact TRX → sun (1 TRX = 1,000,000 sun); null when the amount isn't a plain number with at most 6 decimals. */
function trxToSun(amount: string): bigint | null {
  const match = /^(\d+)(?:\.(\d{0,6}))?$/.exec(amount.trim());
  if (!match) return null;
  return BigInt(match[1]) * BigInt(1_000_000) + BigInt((match[2] ?? "").padEnd(6, "0"));
}

/**
 * Convert a Tron Base58Check address (starting with 'T') to a 20-byte hex address (0x...)
 */
export function tronAddressToHex(address: string): `0x${string}` {
  const decoded = bs58.decode(address);
  // decoded is 25 bytes: 1 byte prefix (0x41) + 20 bytes address + 4 bytes checksum
  const rawBytes = decoded.subarray(1, 21);
  return `0x${Buffer.from(rawBytes).toString("hex")}` as `0x${string}`;
}

/**
 * Convert a Tron Base58Check address to a 21-byte 41-prefixed hex string for Tron full node / TronGrid APIs
 */
export function tronAddressTo41Hex(address: string): string {
  const decoded = bs58.decode(address);
  // decoded is 25 bytes: prefix (0x41) + 20 bytes address + 4 bytes checksum
  return Buffer.from(decoded.subarray(0, 21)).toString("hex");
}

/**
 * Derive secp256k1 private key for Tron from mnemonic (m/44'/195'/0'/0/0)
 */
export function deriveTronPrivateKey(mnemonicOrPrivateKey: string): `0x${string}` {
  const trimmed = mnemonicOrPrivateKey.trim();
  const isMnemonic = trimmed.split(/\s+/).length >= 12;

  if (isMnemonic) {
    const seed = bip39.mnemonicToSeedSync(trimmed);
    const master = HDKey.fromMasterSeed(seed);
    const child = master.derive("m/44'/195'/0'/0/0");
    if (!child.privateKey) {
      throw new Error("Failed to derive Tron private key");
    }
    return `0x${Buffer.from(child.privateKey).toString("hex")}` as `0x${string}`;
  }

  return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as `0x${string}`;
}

/**
 * Executes a TRC-20 token transfer on Tron Mainnet (e.g. USDT)
 */
export async function executeTronTokenTransfer(options: {
  mnemonicOrPrivateKey: string;
  toAddress: string;
  amount: number | string;
  tokenContractAddress?: string; // Defaults to TRC-20 USDT
}): Promise<TronTransferResult> {
  const {
    mnemonicOrPrivateKey,
    toAddress,
    amount,
    tokenContractAddress = CONTRACT_ADDRESSES.tron.mainnet.USDT.address,
  } = options;

  if (!isTronAddress(toAddress)) {
    return { success: false, error: "That isn't a valid Tron address." };
  }

  try {
    const privateKey = deriveTronPrivateKey(mnemonicOrPrivateKey);
    const account = privateKeyToAccount(privateKey);
    const ownerTronAddress = ownerAddressOf(account);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, error: "Invalid transfer amount." };
    }

    // USDT TRC-20 has 6 decimals
    const rawUnits = BigInt(Math.round(numAmount * 1_000_000));
    const toHexAddr = tronAddressToHex(toAddress).slice(2).padStart(64, "0");
    const amountHex = rawUnits.toString(16).padStart(64, "0");
    const parameter = `${toHexAddr}${amountHex}`;

    console.log(`[TronTransfer] Triggering TRC-20 transfer from ${ownerTronAddress} to ${toAddress}: ${amount} (units: ${rawUnits})`);

    // TronGrid's /wallet/triggersmartcontract HTTP API expects 41-prefixed hex addresses
    const owner41Hex = tronAddressTo41Hex(ownerTronAddress);
    const contract41Hex = tronAddressTo41Hex(tokenContractAddress);

    // 1. Trigger smart contract on TronGrid
    const triggerRes = await fetch(`${TRON_API_HOST}/wallet/triggersmartcontract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_address: owner41Hex,
        contract_address: contract41Hex,
        function_selector: "transfer(address,uint256)",
        parameter,
        fee_limit: 30_000_000, // 30 TRX max fee limit
      }),
    });

    const triggerData = await triggerRes.json();
    if (!triggerData.result || !triggerData.result.result) {
      const rawMsg = triggerData.result?.message
        ? Buffer.from(triggerData.result.message, "hex").toString()
        : JSON.stringify(triggerData);
      console.error("[TronTransfer] Trigger smart contract failed:", rawMsg);
      return { success: false, error: "Unable to send transaction to the Tron network. Please try again shortly." };
    }

    // 2–3. Sign and broadcast
    return await signAndBroadcast(triggerData.transaction, account);
  } catch (err: any) {
    console.error("[TronTransfer] Unexpected error:", err);
    return { success: false, error: err.message || "Failed to execute Tron transfer" };
  }
}

/**
 * Sends TRX, Tron's own coin. The node builds the transaction; it is only
 * signed if it moves exactly this amount from this wallet to this recipient.
 */
export async function executeTronNativeTransfer(options: {
  mnemonicOrPrivateKey: string;
  toAddress: string;
  amount: string;
}): Promise<TronTransferResult> {
  const { mnemonicOrPrivateKey, toAddress, amount } = options;

  if (!isTronAddress(toAddress)) {
    return { success: false, error: "That isn't a valid Tron address." };
  }
  const sun = trxToSun(amount);
  if (sun === null || sun <= BigInt(0) || sun > BigInt(Number.MAX_SAFE_INTEGER)) {
    return { success: false, error: "Enter a TRX amount with up to 6 decimal places." };
  }

  try {
    const account = privateKeyToAccount(deriveTronPrivateKey(mnemonicOrPrivateKey));
    const owner41Hex = tronAddressTo41Hex(ownerAddressOf(account));
    const to41Hex = tronAddressTo41Hex(toAddress);
    if (owner41Hex === to41Hex) {
      return { success: false, error: "You can't send TRX to your own address." };
    }

    const createRes = await fetch(`${TRON_API_HOST}/wallet/createtransaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_address: owner41Hex,
        to_address: to41Hex,
        amount: Number(sun),
      }),
    });
    const transaction = await createRes.json();
    if (!transaction?.txID) {
      const reason = String(transaction?.Error ?? JSON.stringify(transaction));
      console.error("[TronTransfer] Create TRX transfer failed:", reason);
      return {
        success: false,
        error: reason.includes("balance is not sufficient")
          ? "Not enough TRX for this amount."
          : "Unable to send transaction to the Tron network. Please try again shortly.",
      };
    }

    const contracts = transaction.raw_data?.contract;
    const value = contracts?.[0]?.parameter?.value;
    const matches =
      contracts?.length === 1 &&
      contracts[0].type === "TransferContract" &&
      String(value?.owner_address).toLowerCase() === owner41Hex &&
      String(value?.to_address).toLowerCase() === to41Hex &&
      String(value?.amount) === sun.toString() &&
      sha256(`0x${transaction.raw_data_hex}`).slice(2) === transaction.txID;
    if (!matches) {
      console.error("[TronTransfer] Node returned a TRX transfer that doesn't match the request; not signing.");
      return {
        success: false,
        error: "Unable to send transaction to the Tron network. Please try again shortly.",
      };
    }

    return await signAndBroadcast(transaction, account);
  } catch (err) {
    console.error("[TronTransfer] Unexpected error:", err);
    return {
      success: false,
      error: (err instanceof Error && err.message) || "Failed to execute Tron transfer",
    };
  }
}

/** Signs a node-built transaction's id (r + s + v, 65 bytes) and broadcasts it. */
async function signAndBroadcast(
  // biome-ignore lint/suspicious/noExplicitAny: TronGrid's transaction JSON, passed back as-is
  transaction: any,
  account: TronAccount,
): Promise<TronTransferResult> {
  const txId: string = transaction.txID;
  const signatureHex = await account.sign({ hash: `0x${txId}` as `0x${string}` });
  transaction.signature = [signatureHex.slice(2)];

  const broadcastRes = await fetch(`${TRON_API_HOST}/wallet/broadcasttransaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });
  const broadcastData = await broadcastRes.json();

  if (!broadcastData.result) {
    const errMsg = broadcastData.message
      ? Buffer.from(broadcastData.message, "hex").toString()
      : JSON.stringify(broadcastData);
    return { success: false, error: `Tron broadcast failed: ${errMsg}` };
  }

  console.log(`[TronTransfer] ✅ Successfully sent Tron transaction: ${txId}`);

  return {
    success: true,
    txHash: txId,
    explorerUrl: `https://tronscan.org/#/transaction/${txId}`,
  };
}
