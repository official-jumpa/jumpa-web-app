import { NextRequest, NextResponse } from "next/server";
import { joinWaitlist } from "@/lib/functions/waitlistFunctions";
import { joinWaitlistSchema } from "@/lib/validations/waitlist.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { enforceRateLimit } from "@/lib/functions/rateLimitFunctions";
import { sendWaitlistWelcomeEmail } from "@/lib/email-notifications";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * POST /api/v1/waitlist
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
      const formatted = formatZodError(validation.error);
      return NextResponse.json(
        { success: false, error: formatted.error },
        { status: 400 },
      );
    }

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
      sendWaitlistWelcomeEmail(validation.data.email, {
        email: validation.data.email,
        customerName: validation.data.name,
      }).catch((err) => {
        console.error(
          `[Waitlist:WelcomeEmail] Failed: ${formatOneLineError(err)}`,
        );
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
    console.error(
      `[WaitlistAPI] Error: ${formatOneLineError(err)}`,
    );
    return NextResponse.json(
      { success: false, error: "Failed to join waitlist. Please try again later." },
      { status: 500 },
    );
  }
}
