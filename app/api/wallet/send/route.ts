import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair as SolanaKeypair } from "@solana/web3.js";
import { HDKey } from "@scure/bip32";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Wallet } from "@/models/Wallet";
import { Transaction } from "@/models/Transaction";
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
  const { recipient, amount, asset, network: networkName, memo, pin } = body;

  if (!recipient || !amount || !asset || !networkName || !pin) {
    return NextResponse.json(
      { error: "Recipient, amount, asset, network, and PIN are required." },
      { status: 400 },
    );
  }

  const config = NETWORK_CONFIGS[networkName];
  if (!config) {
    return NextResponse.json(
      { error: `Unsupported network "${networkName}"` },
      { status: 400 },
    );
  }

  // If asset is not in config.assets
  if (!config.assets.includes(asset.toUpperCase())) {
    return NextResponse.json(
      { error: `Asset "${asset}" is not supported on ${networkName}` },
      { status: 400 },
    );
  }

  await connectDB();

  // Load user's wallet
  const selectedCookie = req.cookies.get("selected_wallet_address")?.value;
  let wallet = null;

  if (selectedCookie) {
    wallet = await Wallet.findOne({
      userId: session.user.id,
      address: selectedCookie.toLowerCase(),
    });
  }

  if (!wallet) {
    wallet = await Wallet.findOne({ userId: session.user.id });
  }

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
      { error: "Incorrect PIN" },
      { status: 401 },
    );
  }

  let secret: string;
  try {
    secret = decryptMnemonic(
      wallet.encryptedMnemonic,
      wallet.iv,
      wallet.salt,
      pin,
    );
  } catch (decErr) {
    console.error("[Wallet Send] Decryption failure:", decErr);
    return NextResponse.json(
      { error: "Invalid or incorrect pin" },
      { status: 401 },
    );
  }

  // Execute transfer based on chain
  let result: TransferResult;
  try {
    const privateKey = resolveChainPrivateKey(secret, config.chain);

    if (config.chain === "stellar") {
      result = await sendStellar({
        privateKey,
        destination: recipient.trim(),
        amount: String(amount),
        asset: asset.toUpperCase(),
        network: config.network,
        memo: memo?.trim(),
      });
    } else if (config.chain === "solana") {
      result = await sendSolana({
        privateKey,
        destination: recipient.trim(),
        amount: String(amount),
        asset: asset.toUpperCase(),
      });
    } else if (config.chain === "base" || config.chain === "eth") {
      result = await sendEvm({
        privateKey,
        destination: recipient.trim(),
        amount: String(amount),
        asset: asset.toUpperCase(),
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

  // Record Transaction in MongoDB
  try {
    const tx: any = await Transaction.create({
      userId: session.user.id,
      walletId: wallet._id,
      type: "TRANSFER",
      status: "CONFIRMED",
      chain: config.chain,
      network: config.network,
      fromAddress: result.fromAddress,
      toAddress: recipient.trim(),
      amount: String(amount),
      token: asset.toUpperCase(),
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
    // Even if DB save fails, transaction succeeded on chain
    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
    });
  }
}
