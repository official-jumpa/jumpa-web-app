import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { SwitchService } from "@/lib/switch";
import { resolveBankCode } from "@/lib/switch-banks";
import { findPaystackBank, validateAccountNumber } from "@/lib/paystack";
import {
  createTransactionRecord,
  updateTransactionRecord,
} from "@/lib/functions/transactionFunctions";
import { switchOfframpSchema } from "@/lib/validations/switch.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import {
  logUserActivity,
  saveOrUpdateBeneficiary,
} from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { decryptMnemonic } from "@/lib/crypto";
import { executeOfframpTransfer } from "@/lib/chains/offramp-transfer";
import { invalidateBalanceCache } from "@/lib/wallet-balances";

// Tiny helper: returns ms elapsed since a start mark
function elapsed(start: number) {
  return `${(performance.now() - start).toFixed(0)}ms`;
}

/**
 * POST /api/switch/offramp
 * Initiates offramp, and if PIN is provided, executes the automated on-chain transfer
 * to the settlement address, saves the beneficiary, and confirms payment.
 */
export async function POST(req: NextRequest) {
  const t0 = performance.now();
  console.log("[Offramp] ── START ");

  try {
    let t = performance.now();
    const authResult = await requireActiveUser();
    console.log(`[Offramp] requireActiveUser: ${elapsed(t)}`);
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;
    const userId = authResult.userId;

    const body = await req.json().catch(() => ({}));
    const validation = switchOfframpSchema.safeParse(body);
    if (!validation.success) {
      const err = formatZodError(validation.error);
      return NextResponse.json(
        { success: false, error: err.error },
        { status: 400 },
      );
    }

    const {
      cryptoAmount,
      fiatAmount,
      cryptoToken,
      asset: rawAsset,
      holderName,
      accountNumber,
      bankName,
      pin,
    } = validation.data;

    let asset = (rawAsset || "").trim();
    if (asset.toLowerCase().startsWith("eth:")) {
      asset = `ethereum:${asset.slice(4)}`;
    }

    const isStellar = asset.toLowerCase().includes("stellar");
    let bankMatch: { name: string; code: string };
    let offrampResult: { deposit: any; reference: string; destination: any; rate: number; provider: string };

    // If PIN is provided, verify it before initiating the transaction
    let phrase: string | undefined;
    let wallet: any;
    if (pin) {
      t = performance.now();
      wallet = await findWalletForUser(userId);
      console.log(`[Offramp] findWalletForUser: ${elapsed(t)}`);

      if (!wallet) {
        return NextResponse.json(
          { success: false, error: "Wallet not found" },
          { status: 404 },
        );
      }

      t = performance.now();
      const pinCheck = await verifyWalletPin(wallet, pin, { userId });
      console.log(`[Offramp] verifyWalletPin (bcrypt): ${elapsed(t)}`);
      if (!pinCheck.ok) {
        return NextResponse.json(
          { success: false, error: pinCheck.error },
          { status: pinCheck.status },
        );
      }

      try {
        t = performance.now();
        phrase = decryptMnemonic(
          wallet.encryptedMnemonic,
          wallet.iv,
          wallet.salt,
          pin,
        );
        console.log(`[Offramp] decryptMnemonic (argon2id): ${elapsed(t)}`);
      } catch {
        return NextResponse.json(
          { success: false, error: "Failed to get wallet credentials" },
          { status: 401 },
        );
      }
    }


    if (isStellar) {
      const { centiivBanks } = await import("@/lib/constants/centiiv-banks");
      const { fossapayBankNameEnquiry } = await import("@/lib/functions/fossapayFunctions");
      
      let centiivBank = centiivBanks.find((b) => b.name.toLowerCase() === bankName.toLowerCase() || b.code === bankName);
      
      // Revalidate: if bankName was preloaded from beneficiary (e.g. Paystack code), 
      // normalize via Paystack then cross-reference with FossaPay (which shares NIBSS codes with Centiiv)
      if (!centiivBank) {
        const paystackBank = findPaystackBank(bankName);
        if (paystackBank) {
          const { findFossaPayBank } = await import("@/lib/constants/fossapay-banks");
          const fPayBank = findFossaPayBank(paystackBank.name);
          if (fPayBank) {
            centiivBank = { name: fPayBank.name, code: fPayBank.code };
          }
        }
      }

      if (!centiivBank) {
        return NextResponse.json({ success: false, error: `Bank "${bankName}" is not supported` }, { status: 400 });
      }
      
      try {
        t = performance.now();
        const fpRes = await fossapayBankNameEnquiry({ accountNumber, bankCode: centiivBank.code });
        console.log(`[Offramp] fossapayBankNameEnquiry: ${elapsed(t)}`);
        if (!fpRes?.accountName) throw new Error("Verification failed");
      } catch {
        return NextResponse.json({ success: false, error: `Account number "${accountNumber}" could not be verified for ${centiivBank.name}.` }, { status: 400 });
      }
      
      bankMatch = { name: centiivBank.name, code: centiivBank.code };

      // Get temporary wallet from Centiiv
      const { createCentiivOfframp } = await import("@/lib/functions/centiivFunctions");
      try {
        t = performance.now();
        const centiivOrder = await createCentiivOfframp({
          amount: cryptoAmount,
          bankCode: centiivBank.code,
          accountNumber: accountNumber.trim(),
          accountName: holderName.trim(),
          userId,
        });
        console.log(`[Offramp] createCentiivOfframp (API): ${elapsed(t)}`);
        
        offrampResult = {
          provider: "centiiv",
          reference: centiivOrder.id,
          deposit: {
            amount: cryptoAmount,
            address: centiivOrder.temporaryWallet.publicAddress,
            asset: "USDC",
          },
          destination: {
            amount: fiatAmount,
            currency: "NGN",
          },
          rate: (fiatAmount || 0) / cryptoAmount, // Approximate rate
        };
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || "Centiiv offramp initiation failed" }, { status: 500 });
      }
    } else {
      // Switch Logic
      const paystackBank = findPaystackBank(bankName);
      if (!paystackBank) {
        return NextResponse.json({ success: false, error: `Bank "${bankName}" is not supported` }, { status: 400 });
      }

      t = performance.now();
      const isAccountValid = await validateAccountNumber(accountNumber, paystackBank.code);
      console.log(`[Offramp] validateAccountNumber (Paystack): ${elapsed(t)}`);
      if (!isAccountValid) {
        return NextResponse.json({ success: false, error: `Account number "${accountNumber}" could not be verified for ${paystackBank.name}.` }, { status: 400 });
      }

      const switchBank = resolveBankCode(paystackBank.name);
      bankMatch = {
        name: switchBank?.name || paystackBank.name,
        code: switchBank?.code || paystackBank.code,
      };

      const recipient = {
        holder_name: holderName.trim(),
        account_number: accountNumber.trim(),
        bank_code: bankMatch.code,
      };

      t = performance.now();
      const result = await SwitchService.initiateOfframp(cryptoAmount, asset, recipient);
      console.log(`[Offramp] SwitchService.initiateOfframp: ${elapsed(t)}`);

      if (!result.success || !result.data) {
        return NextResponse.json({ success: false, error: result.message || "Offramp initiation failed" }, { status: result.status || 500 });
      }

      offrampResult = {
        provider: "switch",
        reference: result.data.reference,
        deposit: result.data.deposit,
        destination: result.data.destination,
        rate: result.data.rate,
      };
    }

    const { deposit, reference, destination, rate, provider } = offrampResult;
    const tokenName =
      cryptoToken || asset.split(":")[1]?.toUpperCase() || "USDC";

    // Record in Transaction ledger
    const rawChain = (asset.split(":")[0] || "base").toLowerCase();
    const txChain = rawChain === "ethereum" ? "eth" : rawChain;
    const userFromAddr =
      txChain === "solana"
        ? (wallet?.addresses?.sol || "")
        : txChain === "stellar"
          ? (wallet?.addresses?.xlm || wallet?.address || "")
          : (wallet?.addresses?.eth || wallet?.addresses?.base || wallet?.address || "");

    let txRecord: any;
    try {
      t = performance.now();
      txRecord = await createTransactionRecord({
        userId,
        type: "OFFRAMP",
        status: "PENDING",
        chain: txChain as any,
        network: "mainnet",
        fromAddress: userFromAddr || "USER_WALLET",
        toAddress: `${bankMatch.name} / ${accountNumber}`,
        amount: String(deposit.amount),
        token: tokenName,
        txHash: reference,
        rampDetails: {
          provider: (provider || "switch") as "centiiv" | "switch",
          fiatCurrency: "NGN",
          fiatAmount: destination?.amount || fiatAmount || 0,
          reference,
        },
        executedAt: new Date(),
      });
      console.log(`[Offramp] createTransactionRecord (DB): ${elapsed(t)}`);

      logUserActivity({
        userId,
        action: "OFFRAMP_INITIATED",
        details: {
          reference,
          fiatAmount: destination?.amount || fiatAmount || 0,
          fiatCurrency: destination?.currency || "NGN",
          cryptoAmount,
          cryptoToken: tokenName,
          bankName: bankMatch.name,
          accountNumber,
        },
        req,
      }).catch((e) => console.error("[Switch Offramp] ActivityLog error:", e));

      createNotification({
        userId,
        tab: "transactions",
        type: "OFFRAMP_INITIATED",
        title: "Withdrawal Requested",
        body: `Requested withdrawal of ₦${destination.amount.toLocaleString()} to ${bankMatch.name} (${accountNumber}).`,
        metadata: {
          reference,
          fiatAmount: destination.amount,
          cryptoAmount,
          token: tokenName,
          bankName: bankMatch.name,
        },
        link: "/transactions",
      }).catch((e) =>
        console.error("[Switch Offramp] Notification error:", e),
      );
    } catch (dbErr: any) {
      console.warn(
        `[Switch Offramp API] [User: ${userId}] DB record notice:`,
        dbErr.message,
      );
    }

    // Auto-save beneficiary for future one-tap transfers
    saveOrUpdateBeneficiary(userId, {
      type: "bank",
      name: holderName.trim(),
      identifier: `${bankMatch.code}:${accountNumber.trim()}`,
      details: {
        accountNumber: accountNumber.trim(),
        bankName: bankMatch.name,
        bankCode: bankMatch.code,
        country: "Nigeria",
        currency: "NGN",
      },
    }).catch((e) =>
      console.error("[Switch Offramp] Beneficiary save error:", e),
    );

    // If PIN was provided, execute automated on-chain transfer
    if (phrase && deposit.address) {
      t = performance.now();
      const transferResult = await executeOfframpTransfer({
        mnemonic: phrase,
        asset,
        depositAddress: deposit.address,
        amount: deposit.amount,
      });
      console.log(`[Offramp] executeOfframpTransfer (${txChain} tx): ${elapsed(t)}`);

      if (!transferResult.success || !transferResult.txHash) {
        console.error(
          "[Switch Offramp] On-chain transfer failed:",
          transferResult.error,
        );
        return NextResponse.json(
          {
            success: false,
            error:
              transferResult.error ||
              "On-chain crypto transfer to settlement provider failed.",
          },
          { status: 400 },
        );
      }

      // Confirm payment with Switch
      if (provider === "switch") {
        try {
          t = performance.now();
          await SwitchService.confirmPayment(reference, transferResult.txHash);
          console.log(`[Offramp] SwitchService.confirmPayment: ${elapsed(t)}`);
        } catch (switchConfirmErr) {
          console.warn(
            "[Switch Offramp] Switch confirmPayment notice:",
            switchConfirmErr,
          );
        }
      }

      const isTxPending = transferResult.txStatus === "PENDING";

      // Update Transaction in DB
      if (txRecord?._id) {
        await updateTransactionRecord(txRecord._id, {
          status: isTxPending ? "PENDING" : "CONFIRMED",
          txHash: transferResult.txHash,
          explorerUrl: transferResult.explorerUrl,
        }).catch(() => {});
      }

      // Invalidate balance cache (skip on PENDING — balance unchanged until confirmed)
      if (!isTxPending) {
        invalidateBalanceCache(userId);
        if (wallet?.address) {
          invalidateBalanceCache(wallet.address);
        }
      }

      console.log(`[Offramp] ── TOTAL: ${elapsed(t0)} `);
      return NextResponse.json({
        success: true,
        status: isTxPending ? "PENDING" : "CONFIRMED",
        reference,
        txHash: transferResult.txHash,
        explorerUrl: transferResult.explorerUrl,
        fiatAmount: destination.amount,
        fiatCurrency: destination.currency,
        cryptoAmount: deposit.amount,
        cryptoToken: tokenName,
        resolvedBank: bankMatch.name,
        resolvedBankCode: bankMatch.code,
        accountName: holderName.trim(),
        accountNumber: accountNumber.trim(),
        ...(isTxPending
          ? {
              message:
                "Your transfer has been submitted to the blockchain and is awaiting confirmation. Your withdrawal will be processed shortly.",
            }
          : {}),
      });
    }

    // Fallback: 2-step flow without PIN
    console.log(`[Offramp] ── TOTAL (no-PIN): ${elapsed(t0)} `);
    return NextResponse.json({
      success: true,
      reference,
      depositAddress: deposit.address,
      depositAsset: deposit.asset,
      depositAmount: deposit.amount,
      depositNotes: deposit.note,
      rate,
      fiatAmount: destination.amount,
      fiatCurrency: destination.currency,
      resolvedBank: bankMatch.name,
      resolvedBankCode: bankMatch.code,
    });
  } catch (err: any) {
    console.error("[Switch Offramp API] ✗ Unhandled error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
