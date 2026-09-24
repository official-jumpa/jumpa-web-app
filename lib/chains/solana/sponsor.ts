/**
 * Jumpa — Solana Sponsored Transactions & Gas Abstraction Engine
 *
 * Enables gas abstraction for Solana SPL tokens (USDC, USDT).
 * The platform sponsor wallet pays the network SOL gas and ATA rent fees,
 * while the user reimburses the network fee directly in the asset being sent
 * (e.g., 0.05 USDC) within the exact same atomic transaction.
 */

import {
  Connection,
  PublicKey,
  Keypair as SolKeypair,
  Transaction as SolTransaction,
} from "@solana/web3.js";
import { sendAndConfirmTransactionPolling } from "./send-and-confirm";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { environment } from "@/lib/environment";
import { CONTRACT_ADDRESSES, getExplorerTxUrl, getSolanaRpcUrl } from "@/lib/blockchain";
import type { TransferResult } from "@/lib/chains/transfer-service";

/**
 * Standard SPL token fee configs on Solana
 */
export const SOLANA_SPL_MINTS: Record<
  string,
  { mint: string; decimals: number }
> = {
  USDC: CONTRACT_ADDRESSES.solana.mainnet.USDC,
  USDT: CONTRACT_ADDRESSES.solana.mainnet.USDT,
};

/**
 * Parses any Solana private key format (64-byte hex, 32-byte seed hex, JSON array, or base58).
 */
export function parseSolanaKeypair(key: string): SolKeypair {
  const trimmed = key.trim();

  // 1. JSON array format: "[1,2,3,...]"
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const arr = JSON.parse(trimmed);
      return SolKeypair.fromSecretKey(Uint8Array.from(arr));
    } catch (e: any) {
      throw new Error(`Failed to parse Solana secret key JSON array: ${e.message}`);
    }
  }

  // 2. Hex format (with or without 0x prefix)
  const cleanHex = trimmed.replace(/^0x/, "");
  if (/^[0-9a-fA-F]+$/.test(cleanHex)) {
    if (cleanHex.length === 128) {
      // 64 bytes = 32-byte secret + 32-byte public
      return SolKeypair.fromSecretKey(Buffer.from(cleanHex, "hex"));
    }
    if (cleanHex.length === 64) {
      // 32-byte seed
      return SolKeypair.fromSeed(Buffer.from(cleanHex, "hex").subarray(0, 32));
    }
  }

  // 3. Base58 format (Phantom, Solflare, Solana CLI export)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bs58 = require("bs58");
    const decoded = bs58.decode(trimmed);
    if (decoded.length === 64) {
      return SolKeypair.fromSecretKey(decoded);
    }
    if (decoded.length === 32) {
      return SolKeypair.fromSeed(decoded);
    }
    throw new Error(`Unexpected decoded base58 key length: ${decoded.length}`);
  } catch (err: any) {
    throw new Error(`Invalid Solana private key: ${err?.message || String(err)}`);
  }
}

/**
 * Retrieves the Jumpa platform sponsor keypair from environment variables.
 * Returns null if SPONSORED_FEE_SOLANA_KEY is not configured.
 */
export function getSolanaSponsorKeypair(): SolKeypair | null {
  const secret = environment.SPONSORED_FEE_SOLANA_KEY?.trim();
  if (!secret) return null;
  try {
    return parseSolanaKeypair(secret);
  } catch (err) {
    console.error("[Solana Sponsor] Invalid SPONSORED_FEE_SOLANA_KEY:", err);
    return null;
  }
}

/**
 * Returns the public key where platform fees should be collected.
 * Defaults to the sponsor keypair's public key if FEE_WALLET_SOLANA is not specified.
 */
export function getSolanaFeeCollectorPubkey(): PublicKey | null {
  const configured = environment.FEE_WALLET_SOLANA?.trim();
  if (configured) {
    try {
      return new PublicKey(configured);
    } catch (err) {
      console.error(
        "[Solana Sponsor] Invalid FEE_WALLET_SOLANA:",
        err,
      );
    }
  }
  const sponsor = getSolanaSponsorKeypair();
  return sponsor ? sponsor.publicKey : null;
}

export interface SolanaFeeCalculation {
  feeAmount: number;
  feeRaw: bigint;
  finalDestAddress: PublicKey;
  ataNeedsCreation: boolean;
  isSponsored: boolean;
}

/**
 * Computes the required fee for an SPL token transfer.
 * If the destination ATA does not exist on-chain, accounts for rent-exemption surcharge (~0.30 USD)
 * so Jumpa is fully compensated for funding the ATA creation.
 */
export async function calculateSolanaSponsoredFee(params: {
  connection: Connection;
  mintPubkey: PublicKey;
  recipientPubkey: PublicKey;
  tokenDecimals: number;
}): Promise<SolanaFeeCalculation> {
  const { connection, mintPubkey, recipientPubkey, tokenDecimals } = params;

  let finalDestAddress = recipientPubkey;
  let ataNeedsCreation = false;

  // Check if destination is already a Token Account
  const accountInfo = await connection.getAccountInfo(recipientPubkey);
  if (
    accountInfo &&
    accountInfo.owner.toBase58() === TOKEN_PROGRAM_ID.toBase58()
  ) {
    finalDestAddress = recipientPubkey;
    ataNeedsCreation = false;
  } else {
    // Derive Associated Token Address (ATA)
    const destATA = getAssociatedTokenAddressSync(
      mintPubkey,
      recipientPubkey,
      true, // allowOwnerOffCurve: supports PDAs & contract deposit vaults
    );
    finalDestAddress = destATA;

    const ataInfo = await connection.getAccountInfo(destATA);
    if (!ataInfo) {
      ataNeedsCreation = true;
    }
  }

  // Base platform fee
  const baseFeeUsd = environment.FEE_USD_AMOUNT_SOLANA;

  // ATA rent creation surcharge (~0.30 USD to reimburse 0.00204 SOL rent paid by Jumpa)
  const ataRentSurchargeUsd = ataNeedsCreation ? 0.3 : 0.0;
  const totalFeeAmount = baseFeeUsd + ataRentSurchargeUsd;

  const feeRaw = BigInt(
    Math.round(totalFeeAmount * Math.pow(10, tokenDecimals)),
  );

  return {
    feeAmount: totalFeeAmount,
    feeRaw,
    finalDestAddress,
    ataNeedsCreation,
    isSponsored: true,
  };
}

/**
 * Builds, signs, and executes an atomic sponsored SPL token transfer on Solana.
 *
 * Transaction Structure:
 * - feePayer: SponsorKeypair (pays the SOL gas)
 * - Instruction 0 (Conditional): Sponsor creates destination ATA if it does not exist
 * - Instruction 1 (Conditional): Sponsor creates fee collector ATA if it does not exist
 * - Instruction 2: User transfers `amount` tokens to destination ATA
 * - Instruction 3: User transfers `feeAmount` tokens to Jumpa fee collector ATA
 *
 * Signers: [userKeypair, sponsorKeypair]
 */
export async function executeSponsoredSplTransfer(params: {
  userKeypair: SolKeypair;
  destination: string;
  amount: string | number;
  asset: string;
  connection?: Connection;
}): Promise<TransferResult> {
  const { userKeypair, destination, amount, asset } = params;

  const sponsorKeypair = getSolanaSponsorKeypair();
  if (!sponsorKeypair) {
    throw new Error(
      "Solana transaction sponsorship is not configured on this server.",
    );
  }

  const feeCollectorPubkey = getSolanaFeeCollectorPubkey();
  if (!feeCollectorPubkey) {
    throw new Error("Solana fee collection address could not be resolved.");
  }

  const upperAsset = asset.toUpperCase();
  const tokenInfo = SOLANA_SPL_MINTS[upperAsset];
  if (!tokenInfo) {
    throw new Error(
      `Asset ${asset} is not a supported sponsored SPL token on Solana.`,
    );
  }

  const numAmount = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Invalid transfer amount");
  }

  const connection =
    params.connection || new Connection(getSolanaRpcUrl(), "confirmed");
  const mintPubkey = new PublicKey(tokenInfo.mint);
  const recipientPubkey = new PublicKey(destination);

  console.log(
    `[Solana Sponsor] Preparing sponsored ${upperAsset} transfer of ${numAmount} to ${destination}...`,
  );

  // 1. Calculate Fee & ATA status
  const feeCalc = await calculateSolanaSponsoredFee({
    connection,
    mintPubkey,
    recipientPubkey,
    tokenDecimals: tokenInfo.decimals,
  });

  console.log(
    `[Solana Sponsor] Fee: ${feeCalc.feeAmount} ${upperAsset} (ATA creation needed: ${feeCalc.ataNeedsCreation})`,
  );

  // 2. Derive User's Source ATA & verify balance
  const sourceATA = getAssociatedTokenAddressSync(
    mintPubkey,
    userKeypair.publicKey,
    true,
  );

  const sourceAccountInfo = await connection.getAccountInfo(sourceATA);
  if (!sourceAccountInfo) {
    throw new Error(
      `Insufficient ${upperAsset} balance. You need at least ${numAmount.toFixed(4)} ${upperAsset}.`,
    );
  }

  const tokenBalanceRes = await connection.getTokenAccountBalance(sourceATA);
  const tokenBalance = tokenBalanceRes.value.uiAmount ?? 0;
  const totalRequired = numAmount + feeCalc.feeAmount;

  if (tokenBalance < totalRequired) {
    throw new Error(
      `Insufficient ${upperAsset} balance to complete the transaction. You need at least ${totalRequired.toFixed(4)} ${upperAsset}.`,
    );
  }

  // 3. Assemble Atomic Transaction
  const transaction = new SolTransaction();
  transaction.feePayer = sponsorKeypair.publicKey;

  // 3a. If destination ATA needs creation, sponsor creates it
  if (feeCalc.ataNeedsCreation) {
    console.log(
      `[Solana Sponsor] Prepending ATA creation instruction for recipient: ${feeCalc.finalDestAddress.toBase58()}`,
    );
    transaction.add(
      createAssociatedTokenAccountInstruction(
        sponsorKeypair.publicKey, // Payer of rent-exempt reserve
        feeCalc.finalDestAddress,
        recipientPubkey,
        mintPubkey,
      ),
    );
  }

  // 3b. Derive Jumpa fee collection ATA and ensure it exists
  const feeCollectorATA = getAssociatedTokenAddressSync(
    mintPubkey,
    feeCollectorPubkey,
    true,
  );
  const feeCollectorAtaInfo = await connection.getAccountInfo(feeCollectorATA);
  if (!feeCollectorAtaInfo) {
    console.log(
      `[Solana Sponsor] Prepending ATA creation instruction for Jumpa fee collector: ${feeCollectorATA.toBase58()}`,
    );
    transaction.add(
      createAssociatedTokenAccountInstruction(
        sponsorKeypair.publicKey, // Payer of rent
        feeCollectorATA,
        feeCollectorPubkey,
        mintPubkey,
      ),
    );
  }

  // 3c. Instruction 1: User -> Destination
  const rawTransferAmount = BigInt(
    Math.round(numAmount * Math.pow(10, tokenInfo.decimals)),
  );
  transaction.add(
    createTransferInstruction(
      sourceATA,
      feeCalc.finalDestAddress,
      userKeypair.publicKey,
      rawTransferAmount,
    ),
  );

  // 3d. Instruction 2: User -> Jumpa Fee Collector
  transaction.add(
    createTransferInstruction(
      sourceATA,
      feeCollectorATA,
      userKeypair.publicKey,
      feeCalc.feeRaw,
    ),
  );

  // 4. Submit & Confirm Transaction
  console.log(
    `[Solana Sponsor] Broadcasting sponsored transaction with fee payer ${sponsorKeypair.publicKey.toBase58()}...`,
  );

  const txHash = await sendAndConfirmTransactionPolling(
    connection,
    transaction,
    [userKeypair, sponsorKeypair],
    {
      commitment: "confirmed",
    },
  );

  const explorerUrl = getExplorerTxUrl("solana", txHash);
  console.log(
    `[Solana Sponsor] Transfer confirmed! TxHash: ${txHash} (Fee: ${feeCalc.feeAmount} ${upperAsset})`,
  );

  return {
    success: true,
    txHash,
    explorerUrl,
    feePaid: `${feeCalc.feeAmount} ${upperAsset}`,
    fromAddress: userKeypair.publicKey.toBase58(),
  };
}
