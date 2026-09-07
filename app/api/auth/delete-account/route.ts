import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clearSession } from "@/lib/session";
import { deleteUserAndAccountData } from "@/lib/functions/userFunctions";
import { deleteAccountSchema } from "@/lib/validations/user.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * POST /api/auth/delete-account — removes the signed-in user and everything
 * keyed to them, then ends the session.
 *
 * Wallets are self-custodial: deleting the record drops Jumpa's copy of the
 * address, not the funds. Recovering them needs the user's recovery phrase.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const validation = deleteAccountSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(formatZodError(validation.error), { status: 400 });
  }

  const userId = session.user.id;

  try {
    await deleteUserAndAccountData(userId);
  } catch (err) {
    console.error("[DeleteAccount] Failed to delete user data:", err);
    return NextResponse.json(
      { error: "Could not delete the account. Please try again." },
      { status: 500 },
    );
  }

  // The user row is already gone, so a failure here only leaves a dead session.
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (err) {
    console.warn("[DeleteAccount] signOut error:", err);
  }

  await clearSession();

  return NextResponse.json({ message: "Account deleted" });
}
