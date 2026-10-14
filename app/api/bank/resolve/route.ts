import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findPaystackBank, validateAccountNumber } from "@/lib/paystack";
import { supportedBanks } from "@/lib/constants/banks";
import { findBellmonieBank } from "@/lib/constants/bellmonie-banks";
import { bellmonieBankNameEnquiry } from "@/lib/functions/bellmonieFunctions";
import { resolveAccountQuerySchema } from "@/lib/validations/bank.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { connectDB } from "@/lib/db";
import { NgnAccount } from "@/models/NgnAccount";
import { environment } from "@/lib/environment";

/**
 * GET /api/bank/resolve?accountNumber=...&bank=...
 * Live bank name enquiry prioritizing Bellmonie (with Paystack fallback) and internal wallet detection.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "medium", action: "bank_resolve" },
    });
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const validation = resolveAccountQuerySchema.safeParse({
      accountNumber: searchParams.get("accountNumber") || "",
      bank:
        searchParams.get("bank") ||
        searchParams.get("bankName") ||
        searchParams.get("bankCode") ||
        "",
    });

    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { accountNumber: cleanAccount, bank: bankParam } = validation.data;

    // Check if the destination account is an internal Jumpa / Bellmonie / FossaPay wallet
    await connectDB();
    const internalAccount = await NgnAccount.findOne({
      accountNumber: cleanAccount,
    }).lean();

    const jumpaMasterAccount =
      environment.JUMPA_ACCOUNT_NUMBER || process.env.JUMPA_ACCOUNT_NUMBER;

    // 1. Primary: Paystack resolution (Fast, resilient, reliable)
    const bankByCode = supportedBanks.find((b) => b.code === bankParam);
    const paystackBank = bankByCode || findPaystackBank(bankParam);

    if (paystackBank) {
      try {
        const accountCheck = await validateAccountNumber(
          cleanAccount,
          paystackBank.code,
        );

        if (accountCheck?.status && accountCheck?.data?.account_name) {
          const isInternal =
            Boolean(internalAccount) ||
            cleanAccount === jumpaMasterAccount;

          return NextResponse.json({
            success: true,
            accountName: accountCheck.data.account_name.trim(),
            accountNumber: accountCheck.data.account_number || cleanAccount,
            bankName: paystackBank.name,
            bankCode: paystackBank.code,
            isInternal,
          });
        }
      } catch (paystackErr: any) {
        console.warn(
          `Paystack resolution attempt for ${paystackBank.name} failed:`,
          paystackErr.message,
        );
      }
    }

    // 2. Fallback: Bellmonie Name Enquiry (only if not paused)
    if (!environment.BELLMONIE_PAUSED) {
      const bellmonieBank = findBellmonieBank(bankParam);
      if (bellmonieBank) {
        try {
          const bmRes = await bellmonieBankNameEnquiry({
            accountNumber: cleanAccount,
            bankCode: bellmonieBank.code,
          });
          if (bmRes?.accountName) {
            const isBmInternal =
              Boolean(internalAccount) ||
              cleanAccount === jumpaMasterAccount;

            return NextResponse.json({
              success: true,
              accountName: bmRes.accountName.trim(),
              accountNumber: bmRes.accountNumber || cleanAccount,
              bankName: bellmonieBank.name,
              bankCode: bellmonieBank.code,
              isInternal: isBmInternal,
            });
          }
        } catch (bmErr: any) {
          console.warn(
            `Bellmonie resolution attempt for ${bellmonieBank.name} failed:`,
            bmErr.message,
          );
        }
      }
    }

    if (!paystackBank) {
      return NextResponse.json(
        { error: `Bank "${bankParam}" is not supported` },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: `Could not verify account with ${paystackBank.name}` },
      { status: 400 },
    );
  } catch (err: any) {
    console.error("[Bank Resolve GET] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to resolve bank account" },
      { status: 500 },
    );
  }
}
