import { NextRequest, NextResponse } from "next/server";
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
import { environment } from "@/lib/environment";
import {
  formatOneLineError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/exchange/offramp
 * Initiates offramp, and if PIN is provided, executes the automated on-chain transfer
 * to the settlement address, saves the beneficiary, and confirms payment.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "high", action: "switch_offramp" },
    });
    if (!authResult.ok) return authResult.response;
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
    let offrampResult: {
      deposit: any;
      reference: string;
      destination: any;
      rate: number;
      provider: string;
    };

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
          { success: false, error: "Failed to verify wallet credentials" },
          { status: 401 },
        );
      }
    }

    if (isStellar) {
      const { centiivBanks, findCentiivBank } = await import(
        "@/lib/constants/centiiv-banks"
      );
      const { bellmonieBankNameEnquiry } = await import(
        "@/lib/functions/bellmonieFunctions"
      );

      let centiivBank =
        findCentiivBank(bankName) ||
        centiivBanks.find(
          (b) =>
            b.name.toLowerCase() === bankName.toLowerCase() ||
            b.code === bankName,
        );

      if (!centiivBank) {
        const paystackBank = findPaystackBank(bankName);
        if (paystackBank) {
          centiivBank =
            findCentiivBank(paystackBank.name) ||
            centiivBanks.find(
              (b) => b.name.toLowerCase() === paystackBank.name.toLowerCase(),
            );
        }
      }

      if (!centiivBank) {
        return NextResponse.json(
          { success: false, error: `Bank "${bankName}" is not supported` },
          { status: 400 },
        );
      }

      let verified = false;
      const paystackBank =
        findPaystackBank(bankName) ||
        (centiivBank ? findPaystackBank(centiivBank.name) : null);
      if (paystackBank) {
        try {
          const accountCheck = await validateAccountNumber(
            accountNumber,
            paystackBank.code,
          );
          if (accountCheck?.status && accountCheck?.data?.account_name) {
            verified = true;
          }
        } catch (err: any) {
          console.warn(
            `[Offramp] Paystack verification failed for ${bankName}: ${formatOneLineError(err)}`,
          );
        }
      }

      if (!verified) {
        try {
          const bmRes = await bellmonieBankNameEnquiry({
            accountNumber,
            bankCode: centiivBank.code,
          });
          if (bmRes?.accountName) verified = true;
        } catch (bmErr: any) {
          console.warn(
            `[Offramp] Bellmonie enquiry failed for ${centiivBank.name}: ${formatOneLineError(bmErr)}`,
          );
        }
      }

      if (!verified) {
        return NextResponse.json(
          {
            success: false,
            error: `Account number "${accountNumber}" could not be verified for ${centiivBank.name}.`,
          },
          { status: 400 },
        );
      }

      bankMatch = { name: centiivBank.name, code: centiivBank.code };

      // Get temporary settlement wallet from Centiiv
      const { createCentiivOfframp } = await import(
        "@/lib/functions/centiivFunctions"
      );
      const effectiveFee = environment.SWITCH_JUMPA_FEE;
      const feePct = effectiveFee / 100;
      const feeAmount = parseFloat((cryptoAmount * feePct).toFixed(4));
      const netCrypto = parseFloat((cryptoAmount - feeAmount).toFixed(4));

      try {
        const centiivOrder = await createCentiivOfframp({
          amount: netCrypto,
          bankCode: centiivBank.code,
          accountNumber: accountNumber.trim(),
          accountName: holderName.trim(),
          userId,
        });

        offrampResult = {
          provider: "centiiv",
          reference: centiivOrder.id,
          deposit: {
            amount: netCrypto,
            totalAmount: cryptoAmount,
            feeAmount,
            feeRecipient: environment.FEE_WALLET_STELLAR,
            address: centiivOrder.temporaryWallet.publicAddress,
            asset: "USDC",
          },
          destination: {
            amount: fiatAmount,
            currency: "NGN",
          },
          rate: (fiatAmount || 0) / cryptoAmount,
        };
      } catch (err: any) {
        console.error(
          `[Offramp] Centiiv Error: ${formatOneLineError(err)}`,
        );
        return NextResponse.json(
          {
            success: false,
            error:
              err?.message || "Transfer initiation could not be completed.",
          },
          { status: 502 },
        );
      }
    } else {
      // Switch Logic for EVM, Solana, Tron
      const paystackBank = findPaystackBank(bankName);
      if (!paystackBank) {
        return NextResponse.json(
          { success: false, error: `Bank "${bankName}" is not supported` },
          { status: 400 },
        );
      }

      const isAccountValid = await validateAccountNumber(
        accountNumber,
        paystackBank.code,
      );
      if (!isAccountValid?.status) {
        return NextResponse.json(
          {
            success: false,
            error: `Account number "${accountNumber}" could not be verified for ${paystackBank.name}.`,
          },
          { status: 400 },
        );
      }

      const switchBank =
        resolveBankCode(bankName) || resolveBankCode(paystackBank.name);
      bankMatch = {
        name: switchBank?.name || paystackBank.name,
        code: switchBank?.code || paystackBank.code,
      };

      const recipient = {
        holder_name: holderName.trim(),
        account_number: accountNumber.trim(),
        bank_code: bankMatch.code,
      };

      const result = await SwitchService.initiateOfframp(
        cryptoAmount,
        asset,
        recipient,
      );

      if (!result.success || !result.data) {
        console.error(
          `[Offramp] Switch Error: ${formatOneLineError(result.message)}`,
        );
        return NextResponse.json(
          {
            success: false,
            error: result.message || "Offramp initiation failed",
          },
          { status: result.status || 400 },
        );
      }

      offrampResult = {
        provider: "switch",
        reference: result.data.reference,
        deposit: result.data.deposit,
        destination: result.data.destination,
        rate: result.data.rate,
      };
    }

    const { deposit, reference, destination } = offrampResult;
    const tokenName =
      cryptoToken || asset.split(":")[1]?.toUpperCase() || "USDC";

    // Record in Transaction ledger
    const rawChain = (asset.split(":")[0] || "base").toLowerCase();
    const txChain = rawChain === "ethereum" ? "eth" : rawChain;
    const userFromAddr =
      txChain === "solana"
        ? wallet?.addresses?.sol || ""
        : txChain === "stellar"
          ? wallet?.addresses?.xlm || wallet?.address || ""
          : txChain === "tron"
            ? wallet?.addresses?.trx || ""
            : wallet?.addresses?.eth ||
              wallet?.addresses?.base ||
              wallet?.address ||
              "";

    let txRecord: any;
    try {
      txRecord = await createTransactionRecord({
        userId,
        type: "OFFRAMP",
        status: "PENDING",
        chain: txChain as any,
        network: "mainnet",
        fromAddress: userFromAddr || "USER_WALLET",
        toAddress: `${bankMatch.name} / ${accountNumber}`,
        amount: String(deposit.totalAmount || cryptoAmount),
        feePaid: deposit.feeAmount ? String(deposit.feeAmount) : "0",
        token: tokenName,
        txHash: reference,
        rampDetails: {
          provider: (offrampResult.provider || "switch") as
            | "centiiv"
            | "switch",
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
      }).catch((e) =>
        console.warn(
          `Error: ${formatOneLineError(e)}`,
        ),
      );

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
        console.warn(
          `[Offramp] Notification Error: ${formatOneLineError(e)}`,
        ),
      );
    } catch (dbErr: any) {
      console.warn(
        `[Offramp] DB Error: ${formatOneLineError(dbErr)}`,
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
      console.warn(
        `Error: ${formatOneLineError(e)}`,
      ),
    );

    // If PIN was provided, execute automated on-chain transfer
    if (phrase && deposit.address) {
      const transferResult = await executeOfframpTransfer({
        mnemonic: phrase,
        asset,
        depositAddress: deposit.address,
        amount: deposit.amount,
        feeRecipient: deposit.feeRecipient,
        feeAmount: deposit.feeAmount,
      });

      if (!transferResult.success || !transferResult.txHash) {
        console.error(
          `[Offramp] Transfer Error: ${formatOneLineError(transferResult.error)}`,
        );

        let clientError =
          transferResult.error || "Transfer could not be completed.";
        if (
          /hex string|parseexception|rpc|org\.tron|jsonformat|getlogs|timeout|revert|execution reverted/i.test(
            clientError,
          )
        ) {
          clientError =
            "Unable to send transaction. Please try again shortly.";
        }

        return NextResponse.json(
          {
            success: false,
            error: clientError,
          },
          { status: 400 },
        );
      }

      // Confirm payment with Switch asynchronously in the background
      if (offrampResult.provider === "switch") {
        SwitchService.confirmPayment(reference, transferResult.txHash).catch(
          (switchConfirmErr) => {
            console.warn(
              `[Offramp] Switch Error: ${formatOneLineError(switchConfirmErr)}`,
            );
          },
        );
      }

      const isTxPending = transferResult.txStatus === "PENDING";

      if (txRecord?._id) {
        await updateTransactionRecord(txRecord._id, {
          status: isTxPending ? "PENDING" : "CONFIRMED",
          txHash: transferResult.txHash,
          explorerUrl: transferResult.explorerUrl,
        }).catch(() => {});
      }

      if (!isTxPending) {
        invalidateBalanceCache(userId);
        if (wallet?.address) {
          invalidateBalanceCache(wallet.address);
        }
      }

      return NextResponse.json({
        success: true,
        status: isTxPending ? "PENDING" : "CONFIRMED",
        reference,
        txHash: transferResult.txHash,
        explorerUrl: transferResult.explorerUrl,
        fiatAmount: destination.amount,
        fiatCurrency: destination.currency,
        cryptoAmount: deposit.totalAmount || cryptoAmount,
        cryptoToken: tokenName,
        resolvedBank: bankMatch.name,
        resolvedBankCode: bankMatch.code,
        accountName: holderName.trim(),
        accountNumber: accountNumber.trim(),
        ...(isTxPending
          ? {
              message:
                "Your transfer has been submitted and is awaiting confirmation. Your withdrawal will be processed shortly.",
            }
          : {}),
      });
    }

    // Fallback if no PIN
    return NextResponse.json({
      success: true,
      reference,
      depositAddress: deposit.address,
      depositAsset: deposit.asset,
      depositAmount: deposit.amount,
      fiatAmount: destination.amount,
      fiatCurrency: destination.currency,
      resolvedBank: bankMatch.name,
      resolvedBankCode: bankMatch.code,
    });
  } catch (err: any) {
    const isTimeout = isTimeoutError(err);
    console.error(
      `[Offramp] Error: ${formatOneLineError(err)}`,
    );

    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? "The withdrawal request timed out. Please try again later."
          : "Unable to complete withdrawal at this time. Please try again later.",
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
