import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { encryptMnemonic } from "@/lib/crypto";
import {
  deriveAddresses,
  deriveFromPrivateKey,
  type DerivedWallet,
} from "@/lib/derive-addresses";
import { environment } from "@/lib/environment";
import {
  listWalletsByUserId,
  getNextWalletName,
  findWalletByAddress,
  createWalletRecord,
} from "@/lib/functions/walletFunctions";
import {
  setUserActiveWallet,
  recordUserActivity,
} from "@/lib/functions/userFunctions";
import { walletSetupSchema } from "@/lib/validations/user.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = walletSetupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const {
      pin,
      phrase: providedPhrase,
      privateKey,
      chain,
      action = "create",
    } = validation.data;

    // Enforce 5 wallet limit per user
    const existingWallets = await listWalletsByUserId(session.user.id);
    if (existingWallets.length >= 5) {
      return NextResponse.json(
        { error: "Maximum limit of 5 wallets reached" },
        { status: 400 },
      );
    }

    const walletName = await getNextWalletName(session.user.id);

    let derived: DerivedWallet;
    let secretToEncrypt: string;

    if (privateKey) {
      // 1. Private Key Import
      try {
        derived = deriveFromPrivateKey(privateKey, chain || "base");
        secretToEncrypt = privateKey.trim();
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || "Invalid private key" },
          { status: 400 },
        );
      }
    } else if (providedPhrase) {
      // 2. Recovery Phrase Import
      const isValid = validateMnemonic(providedPhrase, wordlist);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid seed phrase" },
          { status: 400 },
        );
      }
      try {
        derived = deriveAddresses(providedPhrase);
        secretToEncrypt = providedPhrase;
      } catch (err: any) {
        return NextResponse.json(
          { error: err?.message || "Failed to derive addresses from phrase" },
          { status: 400 },
        );
      }
    } else {
      // 3. New Wallet Generation
      const newPhrase = generateMnemonic(wordlist);
      derived = deriveAddresses(newPhrase);
      secretToEncrypt = newPhrase;
    }

    const primaryAddress =
      derived.addresses.eth ||
      derived.addresses.sol ||
      derived.addresses.xlm;

    const duplicateWallet = await findWalletByAddress(primaryAddress);
    if (duplicateWallet) {
      return NextResponse.json(
        { error: "This wallet is already in use by another user" },
        { status: 409 },
      );
    }

    // Encrypt secret with the user's chosen transaction PIN
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

    const wallet = await createWalletRecord({
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

    // Link active wallet to user
    await setUserActiveWallet(session.user.id, wallet._id);

    // Log user activity
    recordUserActivity({
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
