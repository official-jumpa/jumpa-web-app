import { NextRequest, NextResponse } from "next/server";
import {
  joinWaitlist,
  getWaitlistEntry,
  getWaitlistPosition,
  getWaitlistStats,
} from "@/lib/functions/waitlistFunctions";
import {
  joinWaitlistSchema,
  checkWaitlistSchema,
} from "@/lib/validations/waitlist.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";

/**
 * Adds an email to the waitlist with optional attribution and metadata.
 */
export async function POST(req: NextRequest) {
  try {
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

/**
 * GET /api/waitlist?email=...
 * Queries a user's status/position or returns global stats.
 * 
 * @todo : Remove this API after beta launch
 */
// export async function GET(req: NextRequest) {
//   try {
//     const auth = await requireActiveUser();
//     if (!auth.ok) return auth.response;
//     const email = req.nextUrl.searchParams.get("email");

//     if (!email) {
//       const stats = await getWaitlistStats();
//       return NextResponse.json({ success: true, stats });
//     }

//     const validation = checkWaitlistSchema.safeParse({ email });
//     if (!validation.success) {
//       return NextResponse.json(formatZodError(validation.error), { status: 400 });
//     }

//     const entry = await getWaitlistEntry(validation.data.email);
//     if (!entry) {
//       return NextResponse.json(
//         { error: "Email not found on waitlist" },
//         { status: 404 },
//       );
//     }

//     const position = await getWaitlistPosition(entry.createdAt);

//     return NextResponse.json({
//       success: true,
//       waitlist: entry,
//       position,
//     });
//   } catch (err: any) {
//     console.error("[GET /api/waitlist] Error:", err);
//     return NextResponse.json(
//       { error: err.message || "Failed to query waitlist" },
//       { status: 500 },
//     );
//   }
// }
