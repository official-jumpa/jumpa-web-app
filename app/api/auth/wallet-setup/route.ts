import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import { encryptMnemonic, decryptMnemonic } from "@/lib/crypto";
import {
  deriveAddresses,
  deriveFromPrivateKey,
  type DerivedWallet,
} from "@/lib/derive-addresses";
import { environment } from "@/lib/environment";
import {
  deriveStellarKeypairFromMnemonic,
  deriveStellarKeypairFromPrivateKey,
  activateAndTrustlineWallet,
} from "@/lib/chains/stellar";
import {
  listWalletsByUserId,
  getNextWalletName,
  findWalletByAddress,
  createWalletRecord,
  updateWalletPin,
  findWalletById,
  findWalletForUser,
  updateWalletById,
} from "@/lib/functions/walletFunctions";
import {
  getUserById,
  findUserByJumpaTag,
  setUserLoginPassword,
  setUserJumpaTag,
  setUserActiveWallet,
  recordUserActivity,
  logUserActivity,
} from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import {
  walletSetupSchema,
  setLoginPasswordSchema,
  setJumpaTagSchema,
  checkTagQuerySchema,
  migratePinSchema,
  isWeakPassword,
} from "@/lib/validations/user.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/** Resolves the next route a user must complete in onboarding */
function resolveNextOnboardingRoute(user: any, wallet: any): string {
  const hasPhone = Boolean(user?.phoneNumberVerified || user?.phoneSkipped);
  const hasPassword = Boolean(user?.loginPasswordHash);
  const hasTag = Boolean(user?.jumpaTag);
  const hasPin = Boolean(wallet?.pinHash);
  const needsPinMigration = Boolean(wallet && wallet.pinVersion !== "v2");

  if (!hasPhone) return "/sign-up/phone";
  if (!hasPassword) return "/sign-up/password";
  if (!hasTag) return "/sign-up/tag";
  if (!hasPin) return "/sign-up/pin";
  if (needsPinMigration) return "/migrate-pin";
  return "/home";
}

/**
 * GET /api/auth/wallet-setup
 * - If ?checkTag=<handle>: checks Jumpa tag availability & returns suggestions
 * - Otherwise: returns user onboarding & security status (hasPassword, hasTag, hasPin, isComplete, nextRoute)
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth({
      rateLimit: { tier: "medium", action: "wallet_setup_status" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const checkTag = req.nextUrl.searchParams.get("checkTag");

    if (checkTag !== null) {
      const validation = checkTagQuerySchema.safeParse({ checkTag });
      if (!validation.success) {
        return NextResponse.json({
          available: false,
          suggestions: [],
        });
      }

      const handle = validation.data.checkTag;
      const candidate = `${handle}@jumpa`;
      const existing = await findUserByJumpaTag(candidate);

      const available = !existing || existing._id.toString() === session.user.id;
      const suggestions = available
        ? []
        : [`${handle}_`, `${handle}1`, `the${handle}`]
          .map((opt) =>
            opt.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20),
          )
          .filter((opt) => opt.length >= 3)
          .slice(0, 3);

      return NextResponse.json({ available, suggestions });
    }

    // Default: Check onboarding completion status
    const user = await getUserById(session.user.id);
    const wallet = user?.activeWalletId
      ? await findWalletById(user.activeWalletId)
      : await findWalletForUser(session.user.id);

    const hasPhone = Boolean(user?.phoneNumberVerified || user?.phoneSkipped);
    const hasPassword = Boolean(user?.loginPasswordHash);
    const hasTag = Boolean(user?.jumpaTag);
    const hasPin = Boolean(wallet?.pinHash);
    const needsPinMigration = Boolean(wallet && wallet.pinVersion !== "v2");
    const nextRoute = resolveNextOnboardingRoute(user, wallet);

    return NextResponse.json({
      hasPhone,
      hasPassword,
      hasTag,
      hasPin,
      needsPinMigration,
      nextRoute,
      userStatus: user?.status || "active",
      nickname: user?.nickname ?? null,
      jumpaTag: user?.jumpaTag ?? null,
      isComplete: hasPhone && hasPassword && hasTag && hasPin && !needsPinMigration,//delete once everyone has migrated to v2
    });
  } catch (err) {
    console.error("[WalletSetup GET]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/auth/wallet-setup
 *
 * Supports sequential onboarding via query parameter or body step:
 * - ?step=password: Hashes and stores 6-digit loginPasswordHash
 * - ?step=tag: Validates and claims unique Jumpa tag
 * - Default: Sets the user's transaction PIN and creates multi-chain wallet
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth({
      rateLimit: { tier: "high", action: "wallet_setup" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const body = await req.json().catch(() => ({}));
    const step = req.nextUrl.searchParams.get("step") || body.step || body.action;

    // Step 1: Set Login Password (6 digits)
    if (step === "password") {
      const validation = setLoginPasswordSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(formatZodError(validation.error), {
          status: 400,
        });
      }

      const { password } = validation.data;
      const loginPasswordHash = await bcrypt.hash(password, 10);
      const updatedUser = await setUserLoginPassword(
        session.user.id,
        loginPasswordHash,
      );

      const wallet = updatedUser?.activeWalletId
        ? await findWalletById(updatedUser.activeWalletId)
        : await findWalletForUser(session.user.id);

      const nextRoute = resolveNextOnboardingRoute(updatedUser, wallet);

      logUserActivity({
        userId: session.user.id,
        action: "LOGIN_PASSWORD_SET",
        req,
      }).catch((e) => console.error("[WalletSetup] ActivityLog error:", e));

      const response = NextResponse.json({
        success: true,
        message: "Login password set successfully",
        nextRoute,
      });

      response.cookies.set("jumpa_unlocked", "true", {
        path: "/",
        sameSite: "lax",
        secure: environment.IS_PRODUCTION,
        maxAge: 15 * 60,
      });

      return response;
    }

    // Step 2: Set Jumpa Tag
    if (step === "tag") {
      const validation = setJumpaTagSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(formatZodError(validation.error), {
          status: 400,
        });
      }

      const handle = validation.data.tag;
      const fullTag = `${handle}@jumpa`;
      const duplicate = await findUserByJumpaTag(fullTag);

      if (duplicate && duplicate._id.toString() !== session.user.id) {
        return NextResponse.json(
          { error: "That Jumpa tag is already taken" },
          { status: 409 },
        );
      }

      const updatedUser = await setUserJumpaTag(session.user.id, fullTag);

      const wallet = updatedUser?.activeWalletId
        ? await findWalletById(updatedUser.activeWalletId)
        : await findWalletForUser(session.user.id);

      const nextRoute = resolveNextOnboardingRoute(updatedUser, wallet);

      logUserActivity({
        userId: session.user.id,
        action: "JUMPA_TAG_SET",
        details: { jumpaTag: fullTag },
        req,
      }).catch((e) => console.error("[WalletSetup] ActivityLog error:", e));

      createNotification({
        userId: session.user.id,
        tab: "activities",
        type: "JUMPA_TAG_SET",
        title: "Jumpa Tag Updated",
        body: `Your Jumpa tag was updated to ${fullTag}`,
        metadata: { jumpaTag: fullTag },
        link: "/profile",
      }).catch((e) => console.error("[WalletSetup] Notification error:", e));

      return NextResponse.json({
        success: true,
        jumpaTag: fullTag,
        nextRoute,
      });
    }

    // ‼️ delete once everyone has migrated to v2
    // Step: Migrate legacy PIN to 4-digit PIN (v1 -> v2)
    if (step === "migrate-pin") {
      const validation = migratePinSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(formatZodError(validation.error), {
          status: 400,
        });
      }

      const isConfirmExisting =
        validation.data.action === "confirm-existing" ||
        Boolean(body.existing4DigitPin) ||
        (!validation.data.oldPin && Boolean(validation.data.pin));

      console.log("[MigratePIN] Triggered with action:", body.action, {
        hasOldPin: Boolean(body.oldPin),
        hasNewPin: Boolean(body.newPin),
        hasPin: Boolean(body.pin),
        hasExisting4DigitPin: Boolean(body.existing4DigitPin),
      });
      // If the user already has a wallet:
      const existingWallets = await listWalletsByUserId(session.user.id);
      console.log("🟢🟢🟢 Total user wallets", existingWallets.length)

      // Pre-validation path: Verify current 6-digit PIN before prompting for new PIN
      if (body.action === "validate-current" || body.action === "verify-current") {
        const oldPin = (validation.data.oldPin || body.pin)!;

        const user = await getUserById(session.user.id);
        const wallet = user?.activeWalletId
          ? await findWalletById(user.activeWalletId)
          : await findWalletForUser(session.user.id);

        if (!wallet) {
          return NextResponse.json(
            { error: "No active wallet found" },
            { status: 404 },
          );
        }

        const isMatch = await bcrypt.compare(oldPin, wallet.pinHash);
        if (!isMatch) {
          console.warn(`[MigratePIN][ValidateCurrent] ❌ WRONG CURRENT PIN! bcrypt.compare returned false for wallet ${wallet._id} (User: ${session.user.id})`);
          return NextResponse.json(
            { error: "Incorrect current PIN. Please try again." },
            { status: 400 },
          );
        }

        try {
          decryptMnemonic(
            wallet.encryptedMnemonic,
            wallet.iv,
            wallet.salt,
            oldPin,
          );
        } catch (decryptErr) {
          console.error(
            `[MigratePIN][ValidateCurrent] ❌ Decryption failed for wallet ${wallet._id}:`,
            decryptErr,
          );
          return NextResponse.json(
            { error: "PIN verified, but unable to decrypt wallet. Please contact support." },
            { status: 400 },
          );
        }

        console.log(`[MigratePIN][ValidateCurrent] ✅ Current PIN verified successfully for wallet ${wallet._id}.`);
        return NextResponse.json({
          success: true,
          message: "Current PIN verified successfully",
        });
      }

      // Fallback path: User already has a 4-digit PIN and wants to confirm it
      if (isConfirmExisting) {
        const pinCandidate = (validation.data.existing4DigitPin || validation.data.pin || validation.data.oldPin)!;

        const user = await getUserById(session.user.id);
        const wallet = user?.activeWalletId
          ? await findWalletById(user.activeWalletId)
          : await findWalletForUser(session.user.id);

        if (!wallet) {
          console.warn(`[MigratePIN][ConfirmExisting] ⚠️ No active wallet found for user ${session.user.id}`);
          return NextResponse.json(
            { error: "No active wallet found" },
            { status: 404 },
          );
        }

        console.log(`[MigratePIN][ConfirmExisting] Wallet found (${wallet._id}), checking pinHash...`, {
          walletId: wallet._id.toString(),
          hasPinHash: Boolean(wallet.pinHash),
          pinVersion: wallet.pinVersion,
          hasEncryptedMnemonic: Boolean(wallet.encryptedMnemonic),
        });

        const isMatch = await bcrypt.compare(pinCandidate, wallet.pinHash);
        if (!isMatch) {
          console.warn(`[MigratePIN][ConfirmExisting] ❌ WRONG PIN! bcrypt.compare returned false for wallet ${wallet._id} (User: ${session.user.id})`);
          return NextResponse.json(
            { error: "Incorrect PIN. Please try again or update your PIN." },
            { status: 400 },
          );
        }

        console.log(`[MigratePIN][ConfirmExisting] ✅ PIN matches hash! Testing decryption of mnemonic for wallet ${wallet._id}...`);

        try {
          decryptMnemonic(
            wallet.encryptedMnemonic,
            wallet.iv,
            wallet.salt,
            pinCandidate,
          );
          console.log(`[MigratePIN][ConfirmExisting] ✅ Decryption test succeeded! Updating pinVersion to v2 for wallet ${wallet._id}...`);
        } catch (decryptErr) {
          console.error(
            `[MigratePIN][ConfirmExisting] ❌ Decryption failed for wallet ${wallet._id} with provided 4-digit PIN:`,
            decryptErr,
          );
          return NextResponse.json(
            { error: "PIN verified, but unable to decrypt wallet. Please contact support." },
            { status: 400 },
          );
        }

        await updateWalletById(wallet._id, {
          pinVersion: "v2",
          pinAttempts: 0,
          pinLockedUntil: null,
        });

        console.log(`[MigratePIN][ConfirmExisting] 🎉 Successfully upgraded wallet ${wallet._id} to pinVersion v2.`);

        return NextResponse.json({
          success: true,
          message: "Existing 4-digit PIN confirmed and updated successfully",
        });
      }

      // Standard path: Migrating from 6-digit old PIN to new 4-digit PIN
      const oldPin = validation.data.oldPin!;
      const newPin = validation.data.newPin!;

      const user = await getUserById(session.user.id);
      const wallet = user?.activeWalletId
        ? await findWalletById(user.activeWalletId)
        : await findWalletForUser(session.user.id);

      if (!wallet) {
        console.warn(`[MigratePIN][Standard] ⚠️ No active wallet found to migrate for user ${session.user.id}`);
        return NextResponse.json(
          { error: "No active wallet found to migrate" },
          { status: 404 },
        );
      }

      console.log(`[MigratePIN][Standard] Wallet found (${wallet._id}), checking oldPin against pinHash...`);

      const isMatch = await bcrypt.compare(oldPin, wallet.pinHash);
      if (!isMatch) {
        console.warn(`[MigratePIN][Standard] ❌ WRONG CURRENT PIN! bcrypt.compare returned false for wallet ${wallet._id} (User: ${session.user.id})`);
        return NextResponse.json(
          { error: "Incorrect current PIN. Please try again." },
          { status: 400 },
        );
      }

      console.log(`[MigratePIN][Standard] ✅ Current PIN matches! Decrypting mnemonic for wallet ${wallet._id}...`);

      let rawSecret: string;
      try {
        rawSecret = decryptMnemonic(
          wallet.encryptedMnemonic,
          wallet.iv,
          wallet.salt,
          oldPin,
        );
        console.log(`[MigratePIN][Standard] ✅ Mnemonic decrypted successfully! Re-encrypting with new 4-digit PIN...`);
      } catch (decryptErr) {
        console.error(
          `[MigratePIN][Standard] ❌ Failed to decrypt active wallet ${wallet._id}:`,
          decryptErr,
        );
        return NextResponse.json(
          { error: "Failed to decrypt wallet with provided PIN." },
          { status: 400 },
        );
      }

      const updatedWallet = await updateWalletPin({
        userId: session.user.id,
        walletId: wallet._id,
        newPin,
        rawSecret,
      });

      if (!updatedWallet) {
        return NextResponse.json(
          { error: "Failed to update wallet PIN" },
          { status: 500 },
        );
      }

      console.log(`[MigratePIN][Standard] 🎉 Wallet ${wallet._id} re-encrypted and upgraded to pinVersion v2 successfully!`);

      logUserActivity({
        userId: session.user.id,
        action: "PIN_MIGRATED",
        details: { walletId: wallet._id },
        req,
      }).catch((e) => console.error("[MigratePIN] ActivityLog error:", e));

      createNotification({
        userId: session.user.id,
        tab: "activities",
        type: "PIN_MIGRATED",
        title: "Transaction PIN Updated",
        body: "Your transaction PIN was updated",
        metadata: { walletId: wallet._id },
        link: "/profile/settings?section=security",
      }).catch((e) => console.error("[MigratePIN] Notification error:", e));

      return NextResponse.json({
        success: true,
        message: "Active wallet PIN migrated to 4-digit version successfully",
      });
    }

    // Step 3 (Default): Transaction PIN & Wallet Creation/Import
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

    // If the user already has a wallet:
    const existingWallets = await listWalletsByUserId(session.user.id);
    const existingWallet = existingWallets[0];
    console.log("🟢🟢🟢 Total user wallets", existingWallets.length)

    if (existingWallet) {
      // If the wallet exists but is missing pinHash, complete the setup instead of throwing error:
      if (!existingWallet.pinHash) {
        const pinHash = await bcrypt.hash(pin, 10);
        await updateWalletById(existingWallet._id, {
          pinHash,
          pinVersion: "v2",
        });
        return NextResponse.json({ success: true, walletId: existingWallet._id });
      }

      // Otherwise, block creating a duplicate
      return NextResponse.json(
        { error: "Maximum wallet limit reached" },
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
      pinVersion: "v2",
      setupMethod,
      importedChain: chain || null,
      lastUsedAt: new Date(),
    });

    // Link active wallet to user
    await setUserActiveWallet(session.user.id, wallet._id);

    // Auto-activate Stellar account & USDC trustline if sponsor key is configured
    if (environment.SPONSORED_FEE_STELLAR_KEY && derived.addresses.xlm) {
      try {
        const stellarKeypair =
          setupMethod === "IMPORTED_PRIVATE_KEY"
            ? deriveStellarKeypairFromPrivateKey(secretToEncrypt)
            : deriveStellarKeypairFromMnemonic(secretToEncrypt);

        activateAndTrustlineWallet(stellarKeypair)
          .then((res) => {
            console.log(
              `[WalletSetup] Stellar activation for ${wallet._id} (${derived.addresses.xlm}): activated=${res.activated}, trustlined=${res.trustlined}`,
            );
          })
          .catch((err) => {
            console.error(
              `[WalletSetup] Stellar activation failed for ${wallet._id}:`,
              err,
            );
          });
      } catch (stellarErr) {
        console.warn(
          "[WalletSetup] Could not derive Stellar keypair for auto-activation:",
          stellarErr,
        );
      }
    }

    // Log user activity
    logUserActivity({
      userId: session.user.id,
      action: action === "import" ? "WALLET_IMPORTED" : "WALLET_CREATED",
      details: {
        walletId: wallet._id,
        address: wallet.address,
        setupMethod,
        chain: chain || "multichain",
      },
      req,
    }).catch((e) => console.error("[WalletSetup] ActivityLog error:", e));

    createNotification({
      userId: session.user.id,
      tab: "activities",
      type: action === "import" ? "WALLET_IMPORTED" : "WALLET_CREATED",
      title: action === "import" ? "Wallet Imported" : "Wallet Created",
      body:
        action === "import"
          ? "Your wallet was successfully imported."
          : "Your wallet was successfully created.",
      metadata: { walletId: wallet._id, address: wallet.address },
      link: "/home",
    }).catch((e) => console.error("[WalletSetup] Notification error:", e));

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

    response.cookies.set("jumpa_unlocked", "true", {
      path: "/",
      sameSite: "lax",
      secure: environment.IS_PRODUCTION,
      maxAge: 15 * 60,
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
