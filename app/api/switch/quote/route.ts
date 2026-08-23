import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SwitchService } from "@/lib/switch";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { amount, asset, direction = "onramp", isExactOut = false } = body;

    console.log(`[Switch Quote API] [User: ${userId}] → Request:`, {
      amount,
      asset,
      direction,
      isExactOut,
    });

    if (!amount || !asset) {
      return NextResponse.json(
        { success: false, error: "amount and asset are required" },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
    }

    const result =
      direction === "offramp"
        ? await SwitchService.getOfframpQuote(numAmount, asset, isExactOut)
        : await SwitchService.getQuote(numAmount, asset, isExactOut);

    console.log(`[Switch Quote API] [User: ${userId}] ← Raw response:`, result);

    if (!result.success) {
      console.error(`[Switch Quote API] [User: ${userId}] ✗ Error:`, result.message);
      return NextResponse.json(
        { success: false, error: result.message || "Quote failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      rate: result.data?.rate,
      source: result.data?.source,
      destination: result.data?.destination,
    });
  } catch (err: any) {
    console.error("[Switch Quote API] ✗ Unhandled error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
