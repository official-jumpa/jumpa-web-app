import { NextRequest, NextResponse } from "next/server";
import { derivePath } from "ed25519-hd-key";
import * as bip39 from "bip39";
import { Keypair as SolanaKeypair } from "@solana/web3.js";
import { HDKey } from "@scure/bip32";
import { deriveStellarKeypairFromMnemonic } from "@/lib/chains/stellar";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { decryptMnemonic } from "@/lib/crypto";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { exportKeySchema } from "@/lib/validations/wallet.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * POST /api/v1/wallet/export
 * Body: { pin: string, chain?: string, address?: string }
 *
 * Securely decrypts and returns the mnemonic phrase or chain-specific private key.
 * Memory-only execution: secrets are never written to disk or logged.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireActiveUser({
    rateLimit: { tier: "critical", action: "export_key" },
  });
  if (!authResult.ok) return authResult.response;
  const session = authResult.session;

  const body = await req.json().catch(() => ({}));
  const validation = exportKeySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(formatZodError(validation.error), { status: 400 });
  }

  const { pin, chain = "eth", address } = validation.data;

  const wallet = await findWalletForUser(session.user.id, address);
  if (!wallet) {
    return NextResponse.json(
      { success: false, error: "Wallet not found" },
      { status: 404 },
    );
  }

  const pinCheck = await verifyWalletPin(wallet, pin, { userId: session.user.id });
  if (!pinCheck.ok) {
    return NextResponse.json(
      { success: false, error: pinCheck.error },
      { status: pinCheck.status },
    );
  }

  let phrase: string;
  try {
    phrase = decryptMnemonic(
      wallet.encryptedMnemonic,
      wallet.iv,
      wallet.salt,
      pin,
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Incorrect PIN" },
      { status: 401 },
    );
  }

  const selectedChain = chain.toLowerCase();

  if (selectedChain === "phrase" || selectedChain === "mnemonic") {
    logUserActivity({
      userId: session.user.id,
      action: "SEED_PHRASE_EXPORTED",
      details: { address: wallet.address },
      req,
    }).catch((e) =>
      console.error(`[Wallet] Log error: ${formatOneLineError(e)}`),
    );

    return NextResponse.json({
      success: true,
      data: {
        type: "phrase",
        value: phrase,
        network: "phrase",
      },
    });
  }

  const seed = bip39.mnemonicToSeedSync(phrase);
  const masterKey = HDKey.fromMasterSeed(seed);

  let privateKey = "";

  if (
    selectedChain === "eth" ||
    selectedChain === "base" ||
    selectedChain === "ethereum"
  ) {
    const ethChild = masterKey.derive("m/44'/60'/0'/0/0");
    privateKey = `0x${Buffer.from(ethChild.privateKey!).toString("hex")}`;
  } else if (selectedChain === "sol" || selectedChain === "solana") {
    const solDerived = derivePath("m/44'/501'/0'/0'", seed.toString("hex")).key;
    const solKeypair = await SolanaKeypair.fromSeed(solDerived);
    try {
      const bs58 = (await import("bs58")).default;
      privateKey = bs58.encode(Buffer.from(solKeypair.secretKey));
    } catch {
      privateKey = Buffer.from(solKeypair.secretKey).toString("hex");
    }
  } else if (selectedChain === "xlm" || selectedChain === "stellar") {
    const stellarKeys = deriveStellarKeypairFromMnemonic(phrase);
    privateKey = stellarKeys.secretKey;
  } else if (selectedChain === "trx" || selectedChain === "tron") {
    const tronChild = masterKey.derive("m/44'/195'/0'/0/0");
    if (!tronChild.privateKey) {
      return NextResponse.json(
        { success: false, error: "Failed to derive Tron private key" },
        { status: 500 },
      );
    }
    privateKey = `0x${Buffer.from(tronChild.privateKey).toString("hex")}`;
  } else {
    return NextResponse.json(
      { success: false, error: `Unsupported chain: ${selectedChain}` },
      { status: 400 },
    );
  }

  logUserActivity({
    userId: session.user.id,
    action: "PRIVATE_KEY_EXPORTED",
    details: { chain: selectedChain, address: wallet.address },
    req,
  }).catch((e) =>
    console.error(`[Wallet] Log error: ${formatOneLineError(e)}`),
  );

  return NextResponse.json({
    success: true,
    data: {
      type: "private_key",
      value: privateKey,
      network: selectedChain,
    },
  });
}
