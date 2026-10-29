import { type NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findJumpaRecipients } from "@/lib/functions/recipientFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

const MAX_QUERY = 120;

/**
 * GET /api/v1/user/lookup?q=<tag | name | email | phone | wallet address>
 * Jumpa users to send to: an exact match, or suggestions for a partial tag or
 * name. 404 when nobody matches.
 */
export async function GET(req: NextRequest) {
  const auth = await requireActiveUser({
    requireWallet: false,
    rateLimit: { tier: "medium", action: "user_lookup" },
  });
  if (!auth.ok) return auth.response;

  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!query || query.length > MAX_QUERY) {
    return NextResponse.json(
      { success: false, error: "Enter a Jumpa tag, email, phone or wallet address" },
      { status: 400 },
    );
  }

  try {
    const recipients = await findJumpaRecipients(query, auth.userId);
    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: "No Jumpa user matches that" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: recipients });
  } catch (err) {
    console.error(`[user lookup] ${formatOneLineError(err)}`);
    return NextResponse.json(
      { success: false, error: "Could not look that up. Please try again." },
      { status: 500 },
    );
  }
}
