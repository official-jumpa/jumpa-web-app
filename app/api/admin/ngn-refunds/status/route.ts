import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-api";
import {
  checkNgnWithdrawals,
  MAX_WITHDRAWAL_CHECKS,
} from "@/lib/functions/ngnRefundFunctions";
import { enforceRateLimit } from "@/lib/functions/rateLimitFunctions";

const bodySchema = z.object({
  transactionIds: z
    .array(z.string().trim().min(1).max(64))
    .min(1)
    .max(MAX_WITHDRAWAL_CHECKS),
});

/**
 * POST /api/admin/ngn-refunds/status — called by the admin dashboard, never by the app.
 * Read-only: reports what Bellmonie says happened to each naira withdrawal.
 */
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, {
    tier: "medium",
    action: "admin_ngn_refund_status",
  });
  if (limited) return limited;

  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `transactionIds must list 1 to ${MAX_WITHDRAWAL_CHECKS} transaction IDs`,
      },
      { status: 400 },
    );
  }

  const checks = await checkNgnWithdrawals([
    ...new Set(parsed.data.transactionIds),
  ]);
  return NextResponse.json({ checks });
}
