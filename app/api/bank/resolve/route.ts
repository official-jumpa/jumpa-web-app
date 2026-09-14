import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findPaystackBank, validateAccountNumber } from "@/lib/paystack";
import { supportedBanks } from "@/lib/constants/banks";
import { resolveAccountQuerySchema } from "@/lib/validations/bank.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * GET /api/bank/resolve?accountNumber=...&bank=...
 * Live bank name enquiry via Paystack.
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

    // Match by code first or fuzzy match bank name
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
    });
  } catch (err: any) {
    console.error("[Bank Resolve GET] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to resolve bank account" },
      { status: 500 },
    );
  }
}
