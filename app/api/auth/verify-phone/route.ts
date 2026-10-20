import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import {
  sendMyazaPhoneOtp,
  verifyMyazaPhoneOtp,
  skipPhoneVerification,
} from "@/lib/functions/kycFunctions";
import { formatZodError } from "@/lib/validations/validation-helper";
import {
  formatOneLineError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";

import { verifyPhoneActionSchema } from "@/lib/validations/kyc.validation";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({
      rateLimit: { tier: "critical", action: "verify_phone" },
    });
    if (!auth.ok) return auth.response;

    const rawBody = await req.json().catch(() => ({}));
    if (!rawBody.action && rawBody.code) {
      rawBody.action = "verify";
    }

    const validation = verifyPhoneActionSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const data = validation.data;

    if (data.action === "send") {
      const result = await sendMyazaPhoneOtp({
        phone: data.phone,
        userId: auth.userId,
      });
      return NextResponse.json(
        {
          success: true,
          data: {
            challengeId: result.challengeId,
            phone: result.phone,
            expiresAt: result.expiresAt,
            deliveryChannel: result.deliveryChannel,
          },
        },
        { status: 200 },
      );
    }

    if (data.action === "verify") {
      const result = await verifyMyazaPhoneOtp({
        phone: data.phone,
        code: data.code,
        challengeId: data.challengeId,
        userId: auth.userId,
      });
      return NextResponse.json(
        {
          success: true,
          data: {
            verified: result.verified,
            phone: result.phone,
          },
        },
        { status: 200 },
      );
    }

    if (data.action === "skip") {
      const result = await skipPhoneVerification({
        userId: auth.userId,
        phone: data.phone || null,
      });
      return NextResponse.json(
        {
          success: true,
          data: {
            skipped: true,
            phone: (result as any)?.phone || data.phone || null,
          },
        },
        { status: 200 },
      );
    }

    if (data.action === "reset-skip") {
      const { connectDB } = await import("@/lib/db");
      const { User } = await import("@/models/User");
      await connectDB();
      await User.findByIdAndUpdate(auth.userId, {
        $set: { phoneSkipped: false },
      });
      return NextResponse.json(
        {
          success: true,
          data: { reset: true },
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid or unsupported action",
      },
      { status: 400 },
    );
  } catch (error: any) {
    const isTimeout = isTimeoutError(error);
    console.error(
      `[verify_phone] ${isTimeout ? "Timeout" : "Error"}: ${formatOneLineError(error)}`,
    );

    const message = isTimeout
      ? "Phone verification service timed out. Please try again."
      : error?.message || "Failed to process phone verification";

    return NextResponse.json(
      { success: false, error: message },
      { status: isTimeout ? 504 : 400 },
    );
  }
}
