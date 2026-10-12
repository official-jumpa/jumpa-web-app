import { HDKey } from "@scure/bip32";
import { privateKeyToAccount } from "viem/accounts";
import { sha256 } from "viem";
// @ts-expect-error untyped bs58 module
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

  try {
    const privateKey = deriveTronPrivateKey(mnemonicOrPrivateKey);
    const account = privateKeyToAccount(privateKey);

    // Derive sender's Tron Base58Check address from account
    const rawAddressBytes = Buffer.from(account.address.slice(2), "hex");
    const tronPrefix = Buffer.from([0x41]);
    const payload = Buffer.concat([tronPrefix, rawAddressBytes]);
    const hash1 = sha256(payload);
    const hash2 = sha256(hash1);
    const checksum = Buffer.from(hash2.slice(2, 10), "hex");
    const ownerTronAddress = bs58.encode(Buffer.concat([payload, checksum]));

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

    // 1. Trigger smart contract on TronGrid
    const triggerRes = await fetch(`${TRON_API_HOST}/wallet/triggersmartcontract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_address: ownerTronAddress,
        contract_address: tokenContractAddress,
        function_selector: "transfer(address,uint256)",
        parameter,
        fee_limit: 30_000_000, // 30 TRX max fee limit
      }),
    });

    const triggerData = await triggerRes.json();
    if (!triggerData.result || !triggerData.result.result) {
      const errMsg = triggerData.result?.message
        ? Buffer.from(triggerData.result.message, "hex").toString()
        : "Failed to create smart contract transaction";
      return { success: false, error: `Tron transfer trigger failed: ${errMsg}` };
    }

    const transaction = triggerData.transaction;
    const txId = transaction.txID;

    // 2. Sign transaction hash with secp256k1 private key
    // In Tron, signature is compact r + s + v (65 bytes hex string)
    const signatureHex = await account.sign({
      hash: `0x${txId}` as `0x${string}`,
    });

    // Strip 0x
    const sigClean = signatureHex.slice(2);
    transaction.signature = [sigClean];

    // 3. Broadcast signed transaction to Tron network
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
  } catch (err: any) {
    console.error("[TronTransfer] Unexpected error:", err);
    return { success: false, error: err.message || "Failed to execute Tron transfer" };
  }
}
