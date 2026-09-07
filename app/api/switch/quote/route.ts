import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SwitchService } from "@/lib/switch";
import { switchQuoteSchema } from "@/lib/validations/switch.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = switchQuoteSchema.safeParse(body);
    if (!validation.success) {
      const err = formatZodError(validation.error);
      return NextResponse.json({ success: false, error: err.error }, { status: 400 });
    }

    const { amount, asset, direction = "onramp", isExactOut = false } =
      validation.data;

    const result =
      direction === "offramp"
        ? await SwitchService.getOfframpQuote(amount, asset, isExactOut)
        : await SwitchService.getQuote(amount, asset, isExactOut);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message || "Quote failed" },
        { status: 400 },
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
