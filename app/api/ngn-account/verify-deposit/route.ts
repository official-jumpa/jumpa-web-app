import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { verifyDepositSession } from "@/lib/functions/importapayFunctions";

/**
 * POST /api/ngn-account/verify-deposit
 * Verifies a deposit session directly with ImportaPay and credits confirmed funds.
 * Body: { sessionId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveUser({ requireWallet: false });
    if (!auth.ok) return auth.response;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Optional body
    }

    const result = await verifyDepositSession(auth.userId, body?.sessionId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify deposit" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ngn-account/verify-deposit?sessionId=...
 * Convenience endpoint for polling deposit status.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser({ requireWallet: false });
    if (!auth.ok) return auth.response;

    const sessionId = req.nextUrl.searchParams.get("sessionId") || undefined;
    const result = await verifyDepositSession(auth.userId, sessionId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify deposit" },
      { status: 500 }
    );
  }
}
