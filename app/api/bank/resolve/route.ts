import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { findPaystackBank, validateAccountNumber } from "@/lib/paystack";
import { supportedBanks } from "@/lib/constants/banks";

/**
 * GET /api/bank/resolve?accountNumber=...&bank=...
 * Live bank name enquiry via Paystack.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountNumber = searchParams.get("accountNumber") || "";
    const bankParam =
      searchParams.get("bank") ||
      searchParams.get("bankName") ||
      searchParams.get("bankCode") ||
      "";

    const cleanAccount = accountNumber.replace(/\D/g, "");
    if (cleanAccount.length !== 10) {
      return NextResponse.json(
        { error: "Account number must be exactly 10 digits" },
        { status: 400 },
      );
    }

    if (!bankParam) {
      return NextResponse.json(
        { error: "Bank name or code is required" },
        { status: 400 },
      );
    }

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
