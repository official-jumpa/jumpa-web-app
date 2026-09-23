import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import {
  sendMyazaPhoneOtp,
  verifyMyazaPhoneOtp,
  skipPhoneVerification,
} from "@/lib/functions/kycFunctions";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const action = body.action || (body.code ? "verify" : "send");

    if (action === "send") {
      const phone = body.phone;
      if (!phone || typeof phone !== "string") {
        return NextResponse.json(
          { error: "Please enter your phone number" },
          { status: 400 },
        );
      }

      const result = await sendMyazaPhoneOtp({ phone });
      return NextResponse.json(result, { status: 200 });
    }

    if (action === "verify") {
      const { phone, code, challengeId } = body;
      if (!phone || !code || !challengeId) {
        return NextResponse.json(
          { error: "Phone number, verification code, and challenge ID are required" },
          { status: 400 },
        );
      }

      const result = await verifyMyazaPhoneOtp({
        phone,
        code,
        challengeId,
        userId: auth.userId,
      });

      return NextResponse.json(result, { status: 200 });
    }

    if (action === "skip") {
      const phone = typeof body.phone === "string" ? body.phone.trim() : null;
      const result = await skipPhoneVerification({
        userId: auth.userId,
        phone,
      });

      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: 'send', 'verify', 'skip'" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("[Verify Phone API] Error:", error);
    const message = error?.message || "Failed to process phone verification";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
