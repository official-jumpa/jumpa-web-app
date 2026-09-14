import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  formatDbTransaction,
  getTransactionById,
} from "@/lib/functions/transactionFunctions";

/**
 * GET /api/transactions/[id]
 * One entry, scoped to its owner, in the shape the detail screen renders.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireActiveUser();
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const { id } = await params;
    const transaction = await getTransactionById(id, session.user.id);
    if (!transaction) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      transaction: formatDbTransaction(transaction),
    });
  } catch (err) {
    console.error("[Transaction API Error]", err);
    return NextResponse.json(
      { error: "Failed to load the transaction" },
      { status: 500 },
    );
  }
}
