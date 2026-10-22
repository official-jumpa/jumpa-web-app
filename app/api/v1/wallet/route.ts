import { NextRequest, NextResponse } from "next/server";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import bcrypt from "bcryptjs";
import {
  requireActiveUser,
  requireAuth,
} from "@/lib/functions/permissionFunctions";
import {
  listWalletsByUserId,
  getNextWalletName,
  findWalletByAddress,
  createWalletRecord,
  findWalletForUser,
  updateWalletById,
} from "@/lib/functions/walletFunctions";
import {
  setUserActiveWallet,
  logUserActivity,
} from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { getCachedWalletBalances } from "@/lib/wallet-balances";
import { encryptMnemonic } from "@/lib/crypto";
import { deriveAddresses } from "@/lib/derive-addresses";
import { environment } from "@/lib/environment";
import { walletSetupSchema } from "@/lib/validations/user.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * GET /api/v1/wallet
 *
 * Query Parameters:
 * - ?fields=balance: Returns full multi-chain token balances and total USD value (supports &refresh=true for live RPC queries).
 * - Default: Returns only the user's wallet identity and multi-chain addresses without executing heavy RPC queries.
 */
export async function GET(req: NextRequest) {
  // 1. Explicit Balance Query
  const fields = req.nextUrl.searchParams.get("fields");

  if (fields === "balance") {
    const auth = await requireActiveUser({
      rateLimit: { tier: "low", action: "wallet_balance" },
    });
    if (!auth.ok) return auth.response;

    try {
      const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";
      const result = await getCachedWalletBalances(
        auth.address || auth.userId,
        undefined,
        forceRefresh,
      );

      if (!result) {
        return NextResponse.json(
          { success: false, error: "Wallet not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error(
        `[Wallet] Failed to fetch balances: ${formatOneLineError(err)}`,
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to retrieve wallet balances at this time. Please try again shortly.",
        },
        { status: 500 },
      );
    }
  }

  // 2. Default: Lean Wallet Addresses Only
  const auth = await requireActiveUser({
    rateLimit: { tier: "low", action: "wallet_info" },
  });
  if (!auth.ok) return auth.response;

  const wallet = await findWalletForUser(auth.userId);
  if (!wallet) {
    return NextResponse.json(
      { success: false, error: "Wallet not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      address: wallet.address,
      addresses: wallet.addresses,
    },
  });
}

/**
 * POST /api/v1/wallet
 *
 * Creates a new multi-chain wallet for the authenticated user, derives all addresses,
 * encrypts the mnemonic, hashes the 4-digit PIN and unlocks the user session.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth({
      rateLimit: { tier: "high", action: "wallet_create" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const body = await req.json().catch(() => ({}));
    const validation = walletSetupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { pin } = validation.data;

    // Check existing wallets for user
    const existingWallets = await listWalletsByUserId(session.user.id);
    const existingWallet = existingWallets[0];

    if (existingWallet) {
      // If wallet exists but is missing pinHash, complete setup
      if (!existingWallet.pinHash) {
        const pinHash = await bcrypt.hash(pin, 10);
        await updateWalletById(existingWallet._id, {
          pinHash,
          pinVersion: "v3",
        });

        const response = NextResponse.json({
          success: true,
          data: {
            walletId: existingWallet._id,
            address: existingWallet.address,
            addresses: existingWallet.addresses,
          },
        });

        response.cookies.set("jumpa_unlocked", "true", {
          path: "/",
          sameSite: "lax",
          secure: environment.IS_PRODUCTION,
          maxAge: 15 * 60,
        });

        return response;
      }

      return NextResponse.json(
        { success: false, error: "Maximum wallet limit reached" },
        { status: 400 },
      );
    }

    const walletName = await getNextWalletName(session.user.id);

    // Generate new wallet mnemonic & derive addresses
    const newPhrase = generateMnemonic(wordlist);
    const derived = await deriveAddresses(newPhrase);
    const secretToEncrypt = newPhrase;

    const primaryAddress =
      derived.addresses.eth ||
      derived.addresses.sol ||
      derived.addresses.xlm;

    const duplicateWallet = await findWalletByAddress(primaryAddress);
    if (duplicateWallet) {
      return NextResponse.json(
        {
          success: false,
          error: "This wallet is already in use by another user",
        },
        { status: 409 },
      );
    }

    // Encrypt secret with v3 pepper
    const { encryptedMnemonic, iv, salt } = encryptMnemonic(secretToEncrypt);
    const pinHash = await bcrypt.hash(pin, 10);
    const setupMethod = "CREATED_SEED";

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
      pinVersion: "v3",
      setupMethod,
      importedChain: null,
      lastUsedAt: new Date(),
    });

    // Link active wallet to user
    await setUserActiveWallet(session.user.id, wallet._id);

    // Log user activity
    logUserActivity({
      userId: session.user.id,
      action: "WALLET_CREATED",
      details: {
        walletId: wallet._id,
        address: wallet.address,
        setupMethod,
        chain: "multichain",
      },
      req,
    }).catch((e) =>
      console.error(`[Wallet] Error: ${formatOneLineError(e)}`),
    );

    createNotification({
      userId: session.user.id,
      tab: "activities",
      type: "WALLET_CREATED",
      title: "Wallet Created",
      body: "Your wallet was successfully created.",
      metadata: { walletId: wallet._id, address: wallet.address },
      link: "/home",
    }).catch((e) =>
      console.error(`[Wallet] error: ${formatOneLineError(e)}`),
    );

    const response = NextResponse.json(
      {
        success: true,
        data: {
          walletId: wallet._id,
          address: wallet.address,
          addresses: wallet.addresses,
        },
      },
      { status: 201 },
    );

    response.cookies.set("jumpa_unlocked", "true", {
      path: "/",
      sameSite: "lax",
      secure: environment.IS_PRODUCTION,
      maxAge: 15 * 60,
    });

    return response;
  } catch (err: any) {
    console.error(`[Wallet] Setup error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
