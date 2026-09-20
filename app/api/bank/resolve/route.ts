import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findPaystackBank, validateAccountNumber } from "@/lib/paystack";
import { supportedBanks } from "@/lib/constants/banks";
import { findFossaPayBank } from "@/lib/constants/fossapay-banks";
import { fossapayBankNameEnquiry } from "@/lib/functions/fossapayFunctions";
import { resolveAccountQuerySchema } from "@/lib/validations/bank.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { connectDB } from "@/lib/db";
import { NgnAccount } from "@/models/NgnAccount";
import { environment } from "@/lib/environment";

/**
 * GET /api/bank/resolve?accountNumber=...&bank=...
 * Live bank name enquiry via FossaPay (with Paystack fallback) and internal wallet detection.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser();
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

    // Check if the destination account is an internal FossaPay wallet
    await connectDB();
    const internalAccount = await NgnAccount.findOne({
      accountNumber: cleanAccount,
    }).lean();

    const jumpaMasterAccount =
      environment.JUMPA_ACCOUNT_NUMBER || process.env.JUMPA_ACCOUNT_NUMBER;

    // 1. Check FossaPay supported banks first
    const fossapayBank = findFossaPayBank(bankParam);
    if (fossapayBank) {
      try {
        const fpRes = await fossapayBankNameEnquiry({
          accountNumber: cleanAccount,
          bankCode: fossapayBank.code,
        });
        if (fpRes?.accountName) {
          const isFpInternal =
            Boolean(internalAccount) ||
            cleanAccount === jumpaMasterAccount ||
            fpRes.accountName.toLowerCase().startsWith("fossapay/");
          const cleanName = fpRes.accountName
            .replace(/^fossapay\//i, "")
            .trim();

          return NextResponse.json({
            success: true,
            accountName: cleanName,
            accountNumber: fpRes.accountNumber || cleanAccount,
            bankName: fossapayBank.name,
            bankCode: fossapayBank.code,
            isInternal: isFpInternal,
          });
        }
      } catch (fpErr: any) {
        console.warn(
          `FossaPay resolution failed for ${fossapayBank.name}:`,
          fpErr.message
        );
      }
    }

    // 2. Fallback to Paystack resolution
    const bankByCode = supportedBanks.find((b) => b.code === bankParam);
    const paystackBank = bankByCode || findPaystackBank(bankParam);

    if (!paystackBank) {
      return NextResponse.json(
        { error: `Bank "${bankParam}" is not supported` },
        { status: 400 },
      );
    }

    const accountCheck = await validateAccountNumber(
      cleanAccount,
      paystackBank.code,
    );

    if (!accountCheck?.status || !accountCheck?.data?.account_name) {
      return NextResponse.json(
        {
          error:
            accountCheck?.message ||
            `Could not verify account with ${paystackBank.name}`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      accountName: accountCheck.data.account_name,
      accountNumber: accountCheck.data.account_number || cleanAccount,
      bankName: paystackBank.name,
      bankCode: paystackBank.code,
      isInternal: Boolean(internalAccount),
    });
  } catch (err: any) {
    console.error("[Bank Resolve GET] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to resolve bank account" },
      { status: 500 },
    );
  }
}
