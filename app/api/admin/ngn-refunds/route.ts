import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-api";
import {
  RefundError,
  refundFailedNgnWithdrawal,
} from "@/lib/functions/ngnRefundFunctions";
import { enforceRateLimit } from "@/lib/functions/rateLimitFunctions";

const bodySchema = z.object({
  transactionId: z.string().trim().min(1),
  refundedBy: z.email(),
});

/**
 * POST /api/admin/ngn-refunds — called by the admin dashboard, never by the app.
 * Refunds a failed naira withdrawal (amount + fee) to the user's Naira balance.
 */
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, {
    tier: "medium",
    action: "admin_ngn_refund",
  });
  if (limited) return limited;

  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "transactionId and an operator email in refundedBy are required",
      },
      { status: 400 },
    );
  }

  try {
    const { refundAmount, newBalance } = await refundFailedNgnWithdrawal(
      parsed.data,
    );
    return NextResponse.json({ success: true, refundAmount, newBalance });
  } catch (err) {
    if (err instanceof RefundError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[Admin NGN Refund] Unexpected error:", err);
    return NextResponse.json({ error: "Refund failed" }, { status: 500 });
  }
}
