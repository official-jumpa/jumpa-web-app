import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { derivePath } from "ed25519-hd-key";
import * as bip39 from "bip39";
import { Keypair as SolanaKeypair } from "@solana/web3.js";
import { HDKey } from "@scure/bip32";
import { deriveStellarKeypairFromMnemonic } from "@/lib/chains/stellar";
import { auth } from "@/lib/auth";
import { decryptMnemonic } from "@/lib/crypto";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { exportKeySchema } from "@/lib/validations/wallet.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * POST /api/wallet/export-key
 * Body: { address: string, pin: string, chain?: string }
 * Returns decrypted private key or mnemonic phrase.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const validation = exportKeySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(formatZodError(validation.error), { status: 400 });
  }

  const { address, pin, chain = "eth" } = validation.data;

  const wallet = await findWalletForUser(session.user.id, address);
  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  const selectedChain = chain.toLowerCase();

  if (selectedChain === "phrase" || selectedChain === "mnemonic") {
    return NextResponse.json({
      chain: "phrase",
      phrase,
    });
  }

  const seed = bip39.mnemonicToSeedSync(phrase);
  const masterKey = HDKey.fromMasterSeed(seed);

  let privateKey = "";

  if (selectedChain === "eth" || selectedChain === "base") {
    const ethChild = masterKey.derive("m/44'/60'/0'/0/0");
    privateKey = `0x${Buffer.from(ethChild.privateKey!).toString("hex")}`;
  } else if (selectedChain === "sol") {
    const solDerived = derivePath("m/44'/501'/0'/0'", seed.toString("hex")).key;
    const solKeypair = SolanaKeypair.fromSeed(solDerived);
    privateKey = Buffer.from(solKeypair.secretKey).toString("hex");
  } else if (selectedChain === "xlm") {
    const stellarKeys = deriveStellarKeypairFromMnemonic(phrase);
    privateKey = stellarKeys.secretKey;
  } else {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }

  return NextResponse.json({
    chain: selectedChain,
    privateKey,
  });
}
