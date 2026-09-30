import { NextRequest, NextResponse } from "next/server";
import { joinWaitlist } from "@/lib/functions/waitlistFunctions";
import { joinWaitlistSchema } from "@/lib/validations/waitlist.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { enforceRateLimit } from "@/lib/functions/rateLimitFunctions";
import { sendWaitlistWelcomeEmail } from "@/lib/email-notifications";

/**
 * Adds an email to the waitlist with optional attribution and metadata.
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await enforceRateLimit(req, {
      tier: "medium",
      action: "waitlist_join",
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json().catch(() => ({}));
    const validation = joinWaitlistSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    // Extract request metadata for attribution and auditing
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;
    const headerReferer = req.headers.get("referer") || undefined;

    const result = await joinWaitlist(validation.data, {
      ipAddress,
      userAgent,
      headerReferer,
    });

    if (result.isNew) {
      // Dispatch waitlist welcome email asynchronously
      sendWaitlistWelcomeEmail(validation.data.email, {
        email: validation.data.email,
        customerName: validation.data.name,
      }).catch((err) => {
        console.error("[waitlist] error:", err);
      });
    }

    return NextResponse.json(
      {
        success: true,
        isNew: result.isNew,
        message: result.isNew
          ? "Successfully joined the waitlist"
          : "You are already on the waitlist",
      },
      { status: result.isNew ? 201 : 200 },
    );
  } catch (err: any) {
    console.error("[waitlist] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to join waitlist" },
      { status: 500 },
    );
  }
}
