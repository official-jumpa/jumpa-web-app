import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { SwitchService } from "@/lib/switch";
import { switchQuoteSchema } from "@/lib/validations/switch.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveUser();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const validation = switchQuoteSchema.safeParse(body);
    if (!validation.success) {
      const err = formatZodError(validation.error);
      return NextResponse.json({ success: false, error: err.error }, { status: 400 });
    }

    const { amount, asset, direction = "onramp" } =
      validation.data;

    let result;
    if (asset.toLowerCase().includes("stellar")) {
      const { getCentiivQuote } = await import("@/lib/functions/centiivFunctions");
      try {
        const centiivQuote = await getCentiivQuote({
          fromAsset: "USDC",
          toAsset: "NGN",
          amount,
          network: "STELLAR"
        });
        result = {
          success: true,
          data: {
            rate: parseFloat(centiivQuote.rate),
            source: {
              amount: parseFloat(centiivQuote.totalToPay),
              currency: "USDC"
            },
            destination: {
              amount: parseFloat(centiivQuote.estimatedReceivableAmount),
              currency: "NGN"
            }
          }
        };
      } catch (err: any) {
        result = { success: false, message: err.message || "Failed to fetch Centiiv quote" };
      }
    } else {
      result =
        direction === "offramp"
          ? await SwitchService.getOfframpQuote(amount, asset)
          : await SwitchService.getQuote(amount, asset);
    }

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
