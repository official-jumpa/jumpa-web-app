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


/**
 * POST /api/switch/offramp
 * Initiates offramp, and if PIN is provided, executes the automated on-chain transfer
 * to the settlement address, saves the beneficiary, and confirms payment.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser();
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
      asset,
      holderName,
      accountNumber,
      bankName,
      pin,
    } = validation.data;

    const isStellar = asset.toLowerCase().includes("stellar");
    let bankMatch: { name: string; code: string };
    let offrampResult: { deposit: any; reference: string; destination: any; rate: number; provider: string };

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
        const fpRes = await fossapayBankNameEnquiry({ accountNumber, bankCode: centiivBank.code });
        if (!fpRes?.accountName) throw new Error("Verification failed");
      } catch {
        return NextResponse.json({ success: false, error: `Account number "${accountNumber}" could not be verified for ${centiivBank.name}.` }, { status: 400 });
      }
      
      bankMatch = { name: centiivBank.name, code: centiivBank.code };

      // Get temporary wallet from Centiiv
      const { createCentiivOfframp } = await import("@/lib/functions/centiivFunctions");
      try {
        const centiivOrder = await createCentiivOfframp({
          amount: cryptoAmount,
          bankCode: centiivBank.code,
          accountNumber: accountNumber.trim(),
          accountName: holderName.trim(),
          userId,
        });
        
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

      const isAccountValid = await validateAccountNumber(accountNumber, paystackBank.code);
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

      const result = await SwitchService.initiateOfframp(cryptoAmount, asset, recipient);

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

    // If PIN is provided, verify it before initiating the transaction
    let phrase: string | undefined;
    let wallet: any;
    if (pin) {
      wallet = await findWalletForUser(userId);
      if (!wallet) {
        return NextResponse.json(
          { success: false, error: "Wallet not found" },
          { status: 404 },
        );
      }

      const pinCheck = await verifyWalletPin(wallet, pin, { userId });
      if (!pinCheck.ok) {
        return NextResponse.json(
          { success: false, error: pinCheck.error },
          { status: pinCheck.status },
        );
      }

      try {
        phrase = decryptMnemonic(
          wallet.encryptedMnemonic,
          wallet.iv,
          wallet.salt,
          pin,
        );
      } catch {
        return NextResponse.json(
          { success: false, error: "Failed to get wallet credentials" },
          { status: 401 },
        );
      }
    }

    const { deposit, reference, destination, rate, provider } = offrampResult;
    const tokenName =
      cryptoToken || asset.split(":")[1]?.toUpperCase() || "USDC";

    // Record in Transaction ledger
    let txRecord: any;
    try {
      txRecord = await createTransactionRecord({
        userId,
        type: "OFFRAMP",
        status: "PENDING",
        chain: (asset.split(":")[0] || "base") as any,
        network: "mainnet",
        fromAddress: "USER_WALLET",
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
      const transferResult = await executeOfframpTransfer({
        mnemonic: phrase,
        asset,
        depositAddress: deposit.address,
        amount: deposit.amount,
      });

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
      try {
        await SwitchService.confirmPayment(reference, transferResult.txHash);
      } catch (switchConfirmErr) {
        console.warn(
          "[Switch Offramp] Switch confirmPayment notice:",
          switchConfirmErr,
        );
      }

      // Update Transaction in DB
      if (txRecord?._id) {
        await updateTransactionRecord(txRecord._id, {
          status: "CONFIRMED",
          txHash: transferResult.txHash,
          explorerUrl: transferResult.explorerUrl,
        }).catch(() => {});
      }

      // Invalidate balance cache
      invalidateBalanceCache(userId);
      if (wallet?.address) {
        invalidateBalanceCache(wallet.address);
      }

      return NextResponse.json({
        success: true,
        status: "CONFIRMED",
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
      });
    }

    // Fallback: 2-step flow without PIN
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
