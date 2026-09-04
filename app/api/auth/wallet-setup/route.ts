import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { encryptMnemonic } from "@/lib/crypto";
import {
  deriveAddresses,
  deriveFromPrivateKey,
  type DerivedWallet,
} from "@/lib/derive-addresses";
import { environment } from "@/lib/environment";
import { Wallet } from "@/models/Wallet";
import { User } from "@/models/User";
import { UserActivityLog } from "@/models/UserActivityLog";

const WALLET_PIN_REGEX = /^\d{6}$/;

/**
 * POST /api/auth/wallet-setup
 *
 * Sets the user's transaction PIN and creates their multi-chain wallet
 * via new seed phrase generation, seed phrase import, or private key import.
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

    console.log("[WalletSetup] Session verified:", {
      userId: session.user.id,
      isAnonymous: (session.user as any).isAnonymous,
    });

    const body = await req.json().catch((err) => {
      console.error("[WalletSetup] Failed to parse JSON body:", err);
      return {};
    });

    const {
      pin,
      phrase: providedPhrase,
      privateKey,
      chain,
      action,
    } = body as {
      pin?: string;
      phrase?: string;
      privateKey?: string;
      chain?: string;
      action?: "create" | "import";
    };

    console.log("[WalletSetup] Request payload summary:", {
      action,
      hasPin: Boolean(pin),
      pinValidFormat: pin ? WALLET_PIN_REGEX.test(pin) : false,
      hasPhrase: Boolean(providedPhrase),
      phraseWordCount: providedPhrase
        ? providedPhrase.trim().split(/\s+/).length
        : 0,
      hasPrivateKey: Boolean(privateKey),
      chain,
    });

    if (!pin || !WALLET_PIN_REGEX.test(pin)) {
      console.warn("[WalletSetup] ❌ PIN validation failed:", {
        pin: pin ? `len(${pin.length})` : "empty",
      });
      return NextResponse.json(
        { error: "Valid PIN required" },
        { status: 400 },
      );
    }

    await connectDB();

    // Enforce 5 wallet limit per user
    const existingWallets = await Wallet.find({ userId: session.user.id });
    console.log(
      `[WalletSetup] User currently has ${existingWallets.length} existing wallets`,
    );
    if (existingWallets.length >= 5) {
      console.warn("[WalletSetup] ❌ User reached 5-wallet limit");
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

    let derived: DerivedWallet;
    let secretToEncrypt: string;

    if (privateKey) {
      // 1. Private Key Import
      console.log(
        `[WalletSetup] Deriving addresses from private key for chain: ${chain || "base"}`,
      );
      try {
        derived = deriveFromPrivateKey(privateKey, chain || "base");
        secretToEncrypt = privateKey.trim();
        console.log(
          "[WalletSetup] ✅ Private key derivation successful:",
          derived.addresses,
        );
      } catch (err: any) {
        console.error("[WalletSetup] ❌ Private key derivation failed:", err);
        return NextResponse.json(
          { error: err.message || "Invalid private key" },
          { status: 400 },
        );
      }
    } else if (providedPhrase) {
      // 2. Recovery Phrase Import
      console.log(
        "[WalletSetup] Validating and deriving addresses from recovery phrase",
      );
      const isValid = validateMnemonic(providedPhrase, wordlist);
      if (!isValid) {
        console.warn(
          "[WalletSetup] ❌ Provided phrase failed BIP-39 validation",
        );
        return NextResponse.json(
          { error: "Invalid seed phrase" },
          { status: 400 },
        );
      }
      try {
        derived = deriveAddresses(providedPhrase);
        secretToEncrypt = providedPhrase;
        console.log(
          "[WalletSetup] ✅ Recovery phrase derivation successful:",
          derived.addresses,
        );
      } catch (err: any) {
        console.error(
          "[WalletSetup] ❌ Failed to derive addresses from phrase:",
          err,
        );
        return NextResponse.json(
          { error: err?.message || "Failed to derive addresses from phrase" },
          { status: 400 },
        );
      }
    } else {
      // 3. New Wallet Generation
      console.log(
        "[WalletSetup] Generating new seed phrase for wallet creation",
      );
      const newPhrase = generateMnemonic(wordlist);
      derived = deriveAddresses(newPhrase);
      secretToEncrypt = newPhrase;
      console.log(
        "[WalletSetup] ✅ New phrase generated and derived:",
        derived.addresses,
      );
    }

    const primaryAddress =
      derived.addresses.eth ||
      derived.addresses.sol ||
      derived.addresses.xlm;

    console.log(`[WalletSetup] Primary address: ${primaryAddress}`);

    const duplicateWallet = await Wallet.findOne({
      address: primaryAddress.toLowerCase(),
    });

    if (duplicateWallet) {
      console.warn(`[WalletSetup] ⚠️ Duplicate wallet detected: ${primaryAddress}`);
      return NextResponse.json(
        { error: "This wallet is already in use by another user" },
        { status: 409 },
      );
    }

    // Encrypt secret with the user's chosen transaction PIN
    console.log("[WalletSetup] Encrypting secret and hashing PIN");
    const { encryptedMnemonic, iv, salt } = encryptMnemonic(
      secretToEncrypt,
      pin,
    );
    const pinHash = await bcrypt.hash(pin, 10);

    const setupMethod =
      action === "import"
        ? providedPhrase
          ? "IMPORTED_SEED"
          : "IMPORTED_PRIVATE_KEY"
        : "CREATED_SEED";

    const wallet = await Wallet.create({
      userId: session.user.id,
      name: walletName,
      address: primaryAddress,
      addresses: derived.addresses,
      publicKeys: derived.publicKeys,
      encryptedMnemonic,
      iv,
      salt,
      pinHash,
      setupMethod,
      importedChain: chain || null,
      lastUsedAt: new Date(),
    });

    console.log(`[WalletSetup] Wallet created for user "${session.user.id}": ${wallet.address} (method: ${setupMethod})`);

    // Link active wallet to user
    await User.updateOne(
      { _id: session.user.id },
      { $set: { activeWalletId: wallet._id } },
    );

    // Log activity
    UserActivityLog.create({
      userId: session.user.id,
      action: action === "import" ? "WALLET_IMPORTED" : "WALLET_CREATED",
      details: {
        walletId: wallet._id,
        address: wallet.address,
        setupMethod,
        chain: chain || "multichain",
      },
    }).catch((e) => console.error("[WalletSetup] ActivityLog error:", e));

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
      maxAge: 7 * 24 * 60 * 60, // 7 days
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
