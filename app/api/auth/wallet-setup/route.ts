import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { encryptMnemonic } from "@/lib/crypto";
import { deriveAddresses } from "@/lib/derive-addresses";
import { environment } from "@/lib/environment";
import { Wallet } from "@/models/Wallet";

const WALLET_PIN_REGEX = /^\d{6}$/;

/**
 * POST /api/auth/wallet-setup
 *
 * Unified wallet creation for any authenticated user
 * (email OTP or Google social login).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      console.error("[WalletSetup] No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch((err) => {
      console.error("[WalletSetup] Failed to parse JSON body:", err);
      return {};
    });

    const {
      pin,
      phrase: providedPhrase,
      action,
    } = body as {
      pin?: string;
      phrase?: string;
      action?: "create" | "import";
    };

    if (!pin || !WALLET_PIN_REGEX.test(pin)) {
      return NextResponse.json(
        { error: "Valid 6-digit PIN required" },
        { status: 400 },
      );
    }

    await connectDB();

    // Enforce 5 wallet limit per user
    const existingWallets = await Wallet.find({ userId: session.user.id });
    if (existingWallets.length >= 5) {
      return NextResponse.json(
        { error: "Maximum limit of 5 wallets reached" },
        { status: 400 },
      );
    }

    // Sequential naming (Wallet 1, Wallet 2...)
    const existingNames = existingWallets.map((w) => w.name);
    let walletIndex = 1;
    while (existingNames.includes(`Wallet ${walletIndex}`)) {
      walletIndex++;
    }
    const walletName = `Wallet ${walletIndex}`;

    let phrase: string;
    if (providedPhrase) {
      if (!validateMnemonic(providedPhrase, wordlist)) {
        return NextResponse.json(
          { error: "Invalid seed phrase" },
          { status: 400 },
        );
      }
      phrase = providedPhrase;
    } else {
      phrase = generateMnemonic(wordlist);
    }

    const { addresses, publicKeys } = deriveAddresses(phrase);
    const ethAddress = addresses.eth;

    const duplicateWallet = await Wallet.findOne({
      address: ethAddress.toLowerCase(),
    });

    if (duplicateWallet) {
      return NextResponse.json(
        { error: "A wallet with this seed phrase already exists" },
        { status: 409 },
      );
    }

    const { encryptedMnemonic, iv, salt } = encryptMnemonic(phrase, pin);
    const pinHash = await bcrypt.hash(pin, 10);

    const wallet = await Wallet.create({
      userId: session.user.id,
      name: walletName,
      address: ethAddress,
      addresses,
      publicKeys,
      encryptedMnemonic,
      iv,
      salt,
      pinHash,
    });

    console.log(`[WalletSetup] Wallet created: ${wallet._id}`);

    const response = NextResponse.json(
      {
        message: action === "import" ? "Wallet imported" : "Wallet created",
        address: wallet.address,
        addresses: wallet.addresses,
      },
      { status: 201 },
    );

    response.cookies.set("selected_wallet_address", wallet.address, {
      path: "/",
      httpOnly: true,
      secure: environment.IS_PRODUCTION,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("[WalletSetup]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
