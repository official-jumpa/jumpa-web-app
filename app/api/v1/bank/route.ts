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
import {
  formatOneLineError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";
import { isAellaBank } from "@/lib/functions/aellaFunctions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/v1/bank?accountNumber=...&bank=...
 * Live bank name enquiry prioritizing Paystack with Bellmonie fallback and internal wallet detection.
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

    // Check if destination account is an internal Jumpa / Bellmonie / FossaPay wallet
    await connectDB();
    const internalAccount = await NgnAccount.findOne({
      accountNumber: cleanAccount,
    }).lean();

    const jumpaMasterAccount = environment.JUMPA_ACCOUNT_NUMBER;

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
            Boolean(internalAccount) || cleanAccount === jumpaMasterAccount;

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
          `[Bank] Paystack resolution attempt for ${paystackBank.name} failed: ${formatOneLineError(paystackErr)}`,
        );
      }
    }

    // 2. Aella Name Enquiry (strictly for Aella MFB accounts)
    const isTargetAella =
      isAellaBank(bankParam) ||
      isAellaBank(paystackBank?.code) ||
      isAellaBank(paystackBank?.name);

    if (isTargetAella) {
      try {
        const { aellaBankNameEnquiry } = await import("@/lib/functions/aellaFunctions");
        const aellaRes = await aellaBankNameEnquiry({
          accountNumber: cleanAccount,
          bankCode: "090614",
        });

        if (aellaRes?.accountName) {
          const isInternal =
            Boolean(internalAccount) || cleanAccount === jumpaMasterAccount;

          return NextResponse.json({
            success: true,
            accountName: aellaRes.accountName.trim(),
            accountNumber: cleanAccount,
            bankName: aellaRes.bankName || "Aella MFB",
            bankCode: "090614",
            isInternal,
          });
        }
      } catch (aellaErr: any) {
        console.warn(
          `[Bank] Aella resolution attempt failed: ${formatOneLineError(aellaErr)}`,
        );
      }
    }

    // 3. Fallback: Bellmonie Name Enquiry
    const bellmonieBank = findBellmonieBank(bankParam);
    if (bellmonieBank) {
      try {
        const bmRes = await bellmonieBankNameEnquiry({
          accountNumber: cleanAccount,
          bankCode: bellmonieBank.code,
        });
        if (bmRes?.accountName) {
          const isBmInternal =
            Boolean(internalAccount) || cleanAccount === jumpaMasterAccount;

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
          `[Bank] Bellmonie resolution attempt for ${bellmonieBank.name} failed: ${formatOneLineError(bmErr)}`,
        );
      }
    }

    if (!paystackBank && !bellmonieBank) {
      return NextResponse.json(
        { error: `The bank "${bankParam}" is not currently supported.` },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: `Could not verify account name with ${paystackBank?.name || bellmonieBank?.name || "the banking network"}. Please check the account number.`,
      },
      { status: 400 },
    );
  } catch (err: any) {
    const isTimeout = isTimeoutError(err);
    console.error(`[Bank] Resolve exception: ${formatOneLineError(err)}`);

    return NextResponse.json(
      {
        error: isTimeout
          ? "The bank verification service timed out. Please try again."
          : "Unable to verify bank account details at this time. Please try again later.",
      },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
