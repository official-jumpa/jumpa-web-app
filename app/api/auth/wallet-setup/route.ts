import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { encryptMnemonic, decryptMnemonic } from "@/lib/crypto";
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
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Wallet } from "@/models/Wallet";
import { walletSetupSchema } from "@/lib/validations/user.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/** Detect weak 6-digit passwords (repeated digits or consecutive sequences) */
function isWeakPassword(value: string): boolean {
  if (/^(\d)\1+$/.test(value)) return true;
  const digits = value.split("").map(Number);
  const step = digits[1] - digits[0];
  return (
    Math.abs(step) === 1 &&
    digits.every((digit, index) => index === 0 || digit - digits[index - 1] === step)
  );
}

/** Resolves the next route a user must complete in onboarding */
function resolveNextOnboardingRoute(user: any, wallet: any): string {
  const hasPassword = Boolean(user?.loginPasswordHash);
  const hasTag = Boolean(user?.jumpaTag);
  const hasPin = Boolean(wallet?.pinHash);
  const needsPinMigration = Boolean(wallet && wallet.pinVersion !== "v2");

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
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const checkTag = req.nextUrl.searchParams.get("checkTag");

    if (checkTag !== null) {
      const handle = checkTag
        .replace(/^@+/, "")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 20);

      if (handle.length < 3) {
        return NextResponse.json({
          available: false,
          suggestions: [],
        });
      }

      const candidate = `${handle}@jumpa`;
      const existing = await User.findOne({ jumpaTag: candidate });

      const available = !existing || existing._id === session.user.id;
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
    const user = await User.findById(session.user.id);
    const wallet = user?.activeWalletId
      ? await Wallet.findById(user.activeWalletId)
      : await Wallet.findOne({
          userId: session.user.id,
          pinHash: { $exists: true, $ne: "" },
        });

    const hasPassword = Boolean(user?.loginPasswordHash);
    const hasTag = Boolean(user?.jumpaTag);
    const hasPin = Boolean(wallet?.pinHash);
    const needsPinMigration = Boolean(wallet && wallet.pinVersion !== "v2");
    const nextRoute = resolveNextOnboardingRoute(user, wallet);

    return NextResponse.json({
      hasPassword,
      hasTag,
      hasPin,
      needsPinMigration,
      nextRoute,
      isComplete: hasPassword && hasTag && hasPin && !needsPinMigration,//delete once everyone has migrated to v2
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
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const step = req.nextUrl.searchParams.get("step") || body.step || body.action;

    await connectDB();

    // Step 1: Set Login Password (6 digits)
    if (step === "password") {
      const password = String(body.password || "").trim();
      if (!/^\d{6}$/.test(password)) {
        return NextResponse.json(
          { error: "Password must be exactly 6 digits" },
          { status: 400 },
        );
      }
      if (isWeakPassword(password)) {
        return NextResponse.json(
          { error: "Avoid sequences and repeated digits. Pick another password." },
          { status: 400 },
        );
      }

      const loginPasswordHash = await bcrypt.hash(password, 10);
      const updatedUser = await User.findByIdAndUpdate(
        session.user.id,
        { $set: { loginPasswordHash } },
        { new: true },
      );

      const wallet = updatedUser?.activeWalletId
        ? await Wallet.findById(updatedUser.activeWalletId)
        : await Wallet.findOne({
            userId: session.user.id,
            pinHash: { $exists: true, $ne: "" },
          });

      const nextRoute = resolveNextOnboardingRoute(updatedUser, wallet);

      return NextResponse.json({
        success: true,
        message: "Login password set successfully",
        nextRoute,
      });
    }

    // Step 2: Set Jumpa Tag
    if (step === "tag") {
      const rawTag = String(body.tag || "").trim();
      const handle = rawTag
        .replace(/^@+/, "")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 20);

      if (handle.length < 3) {
        return NextResponse.json(
          { error: "Jumpa tag must be at least 3 characters" },
          { status: 400 },
        );
      }

      const fullTag = `${handle}@jumpa`;
      const duplicate = await User.findOne({
        jumpaTag: fullTag,
        _id: { $ne: session.user.id },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "That Jumpa tag is already taken" },
          { status: 409 },
        );
      }

      const updatedUser = await User.findByIdAndUpdate(
        session.user.id,
        { $set: { jumpaTag: fullTag } },
        { new: true },
      );

      const wallet = updatedUser?.activeWalletId
        ? await Wallet.findById(updatedUser.activeWalletId)
        : await Wallet.findOne({
            userId: session.user.id,
            pinHash: { $exists: true, $ne: "" },
          });

      const nextRoute = resolveNextOnboardingRoute(updatedUser, wallet);

      return NextResponse.json({
        success: true,
        jumpaTag: fullTag,
        nextRoute,
      });
    }

    // ‼️ delete once everyone has migrated to v2
    // Step: Migrate legacy PIN to 4-digit PIN (v1 -> v2)
    if (step === "migrate-pin") {
      const isConfirmExisting =
        body.action === "confirm-existing" ||
        Boolean(body.existing4DigitPin) ||
        (!body.oldPin && Boolean(body.pin));

      console.log(`[MigratePIN] 📥 Received request for user ${session.user.id}:`, {
        action: body.action,
        isConfirmExisting,
        hasOldPin: Boolean(body.oldPin),
        oldPinLength: body.oldPin ? String(body.oldPin).length : 0,
        hasNewPin: Boolean(body.newPin),
        newPinLength: body.newPin ? String(body.newPin).length : 0,
        hasPin: Boolean(body.pin),
        pinLength: body.pin ? String(body.pin).length : 0,
        hasExisting4DigitPin: Boolean(body.existing4DigitPin),
      });
      // If the user already has a wallet:
      const existingWallets = await listWalletsByUserId(session.user.id);
      console.log("🟢🟢🟢 Existig user wallets", existingWallets)
      
      // Pre-validation path: Verify current 6-digit PIN before prompting for new PIN
      if (body.action === "validate-current" || body.action === "verify-current") {
        const oldPin = String(body.oldPin || body.pin || "").trim();
        if (!/^\d{6}$/.test(oldPin)) {
          return NextResponse.json(
            { error: "Current PIN must be exactly 6 digits" },
            { status: 400 },
          );
        }

        const user = await User.findById(session.user.id);
        const wallet = user?.activeWalletId
          ? await Wallet.findById(user.activeWalletId)
          : await Wallet.findOne({ userId: session.user.id });

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
        const pinCandidate = String(body.existing4DigitPin || body.pin || "").trim();
        if (!/^\d{4}$/.test(pinCandidate)) {
          console.warn(`[MigratePIN][ConfirmExisting] ⚠️ Validation failed: PIN candidate length is ${pinCandidate.length}, expected 4 digits.`);
          return NextResponse.json(
            { error: "PIN must be exactly 4 digits" },
            { status: 400 },
          );
        }

        const user = await User.findById(session.user.id);
        const wallet = user?.activeWalletId
          ? await Wallet.findById(user.activeWalletId)
          : await Wallet.findOne({ userId: session.user.id });

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

        await Wallet.findByIdAndUpdate(wallet._id, {
          $set: {
            pinVersion: "v2",
            pinAttempts: 0,
            pinLockedUntil: null,
          },
        });

        console.log(`[MigratePIN][ConfirmExisting] 🎉 Successfully upgraded wallet ${wallet._id} to pinVersion v2.`);

        return NextResponse.json({
          success: true,
          message: "Existing 4-digit PIN confirmed and updated successfully",
        });
      }

      // Standard path: Migrating from 6-digit old PIN to new 4-digit PIN
      const oldPin = String(body.oldPin || "").trim();
      const newPin = String(body.newPin || "").trim();

      if (!/^\d{6}$/.test(oldPin)) {
        console.warn(`[MigratePIN][Standard] ⚠️ Validation failed: oldPin length is ${oldPin.length}, expected 6 digits.`);
        return NextResponse.json(
          { error: "Current PIN must be exactly 6 digits" },
          { status: 400 },
        );
      }
      if (!/^\d{4}$/.test(newPin)) {
        console.warn(`[MigratePIN][Standard] ⚠️ Validation failed: newPin length is ${newPin.length}, expected 4 digits.`);
        return NextResponse.json(
          { error: "New PIN must be exactly 4 digits" },
          { status: 400 },
        );
      }
      if (isWeakPassword(newPin)) {
        console.warn(`[MigratePIN][Standard] ⚠️ Validation failed: newPin is weak (consecutive or repeated).`);
        return NextResponse.json(
          { error: "Avoid sequences and repeated digits for your new PIN." },
          { status: 400 },
        );
      }

      const user = await User.findById(session.user.id);
      const wallet = user?.activeWalletId
        ? await Wallet.findById(user.activeWalletId)
        : await Wallet.findOne({ userId: session.user.id });

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

      const { encryptedMnemonic, iv, salt } = encryptMnemonic(
        rawSecret,
        newPin,
      );
      const newPinHash = await bcrypt.hash(newPin, 10);

      await Wallet.findByIdAndUpdate(wallet._id, {
        $set: {
          encryptedMnemonic,
          iv,
          salt,
          pinHash: newPinHash,
          pinVersion: "v2",
          pinAttempts: 0,
          pinLockedUntil: null,
        },
      });

      console.log(`[MigratePIN][Standard] 🎉 Wallet ${wallet._id} re-encrypted and upgraded to pinVersion v2 successfully!`);

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
    console.log("🟢🟢🟢 Existig user wallets", existingWallets)
    
    if (existingWallet) {
      // If the wallet exists but is missing pinHash, complete the setup instead of throwing error:
      if (!existingWallet.pinHash) {
        const pinHash = await bcrypt.hash(pin, 10);
        await Wallet.findByIdAndUpdate(existingWallet._id, {
          $set: { pinHash, pinVersion: "v2" }
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
