import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair as SolanaKeypair } from "@solana/web3.js";
import { HDKey } from "@scure/bip32";
import { auth } from "@/lib/auth";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { createTransactionRecord } from "@/lib/functions/transactionFunctions";
import { sendTokenSchema } from "@/lib/validations/wallet.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { decryptMnemonic } from "@/lib/crypto";
import { deriveStellarKeypairFromMnemonic } from "@/lib/chains/stellar";
import { NETWORK_CONFIGS } from "@/lib/transfer";
import {
  sendStellar,
  sendSolana,
  sendEvm,
  type TransferResult,
} from "@/lib/chains/transfer-service";

function resolveChainPrivateKey(
  secret: string,
  chain: "stellar" | "solana" | "base" | "eth",
): string {
  const trimmed = secret.trim();
  const isMnemonic = trimmed.split(/\s+/).length >= 12;

  if (isMnemonic) {
    if (chain === "stellar") {
      return deriveStellarKeypairFromMnemonic(trimmed).secretKey;
    }

    const seed = bip39.mnemonicToSeedSync(trimmed);

    if (chain === "solana") {
      const derived = derivePath("m/44'/501'/0'/0'", seed.toString("hex")).key;
      const keypair = SolanaKeypair.fromSeed(derived);
      return Buffer.from(keypair.secretKey).toString("hex");
    }

    if (chain === "base" || chain === "eth") {
      const hdKey = HDKey.fromMasterSeed(seed);
      const child = hdKey.derive("m/44'/60'/0'/0/0");
      if (!child.privateKey) throw new Error("Could not derive EVM private key");
      return `0x${Buffer.from(child.privateKey).toString("hex")}`;
    }
  }

  // Already a raw private key
  return trimmed;
}

/**
 * POST /api/wallet/send
 * Body: { recipient: string, amount: string, asset: string, network: string, memo?: string, pin: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const validation = sendTokenSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(formatZodError(validation.error), { status: 400 });
  }

  const { recipient, amount, asset, network: networkName, memo, pin } =
    validation.data;

  const config = NETWORK_CONFIGS[networkName];
  if (!config) {
    return NextResponse.json(
      { error: `Unsupported network "${networkName}"` },
      { status: 400 },
    );
  }

  if (!config.assets.includes(asset)) {
    return NextResponse.json(
      { error: `Asset "${asset}" is not supported on ${networkName}` },
      { status: 400 },
    );
  }

  const selectedCookie = req.cookies.get("selected_wallet_address")?.value;
  const wallet = await findWalletForUser(session.user.id, selectedCookie);

  if (!wallet) {
    return NextResponse.json(
      { error: "No wallet found for user." },
      { status: 404 },
    );
  }

  // Verify PIN
  const isPinValid = await bcrypt.compare(pin, wallet.pinHash);
  if (!isPinValid) {
    return NextResponse.json(
      { error: "Incorrect PIN. Please try again." },
      { status: 401 },
    );
  }

  // Decrypt secret
  let rawSecret: string;
  try {
    rawSecret = decryptMnemonic(
      wallet.encryptedMnemonic,
      wallet.iv,
      wallet.salt,
      pin,
    );
  } catch (err) {
    console.error("[Wallet Send] Failed to decrypt mnemonic:", err);
    return NextResponse.json(
      { error: "Failed to decrypt wallet credentials." },
      { status: 500 },
    );
  }

  let privateKey: string;
  try {
    privateKey = resolveChainPrivateKey(rawSecret, config.chain);
  } catch (err: any) {
    console.error("[Wallet Send] Key derivation error:", err);
    return NextResponse.json(
      { error: `Key derivation failed for ${config.chain}: ${err?.message}` },
      { status: 500 },
    );
  }

  let result: TransferResult;

  try {
    if (config.chain === "stellar") {
      result = await sendStellar({
        privateKey,
        destination: recipient.trim(),
        amount: String(amount),
        asset,
        network: config.network,
        memo: memo?.trim(),
      });
    } else if (config.chain === "solana") {
      result = await sendSolana({
        privateKey,
        destination: recipient.trim(),
        amount: String(amount),
        asset,
      });
    } else if (config.chain === "base" || config.chain === "eth") {
      result = await sendEvm({
        privateKey,
        destination: recipient.trim(),
        amount: String(amount),
        asset,
        chain: config.chain,
      });
    } else {


      return NextResponse.json(
        { error: `Chain ${config.chain} is not supported for transfer` },
        { status: 400 },
      );
    }
  } catch (txErr: any) {
    console.error("[Wallet Send] Execution error:", txErr);
    return NextResponse.json(
      { error: txErr?.message || "On-chain transfer failed." },
      { status: 400 },
    );
  }

  // Record Transaction in MongoDB via transactionFunctions
  try {
    const tx = await createTransactionRecord({
      userId: session.user.id,
      walletId: wallet._id,
      type: "TRANSFER",
      status: "CONFIRMED",
      chain: config.chain,
      network: config.network,
      fromAddress: result.fromAddress,
      toAddress: recipient.trim(),
      amount: String(amount),
      token: asset,
      memo: memo?.trim() || undefined,
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
      feePaid: result.feePaid || undefined,
      executedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
      transactionId: tx?._id,
    });
  } catch (dbErr) {
    console.error("[Wallet Send] DB record error:", dbErr);
    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
    });
  }
}
