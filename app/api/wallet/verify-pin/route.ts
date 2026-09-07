import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { verifyWalletPinAndLockout } from "@/lib/functions/walletFunctions";
import { verifyPinSchema } from "@/lib/validations/user.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * POST /api/wallet/verify-pin
 * Body: { pin: string, address?: string }
 * Verifies PIN against pinHash for the selected wallet with rate limiting & lockout.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const validation = verifyPinSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(formatZodError(validation.error), { status: 400 });
  }

  const { pin, address } = validation.data;
  const cookieAddress = req.cookies.get("selected_wallet_address")?.value;
  const targetAddress = address || cookieAddress;

  const result = await verifyWalletPinAndLockout(
    session.user.id,
    pin,
    targetAddress,
  );

  if (!result.valid) {
    return NextResponse.json(
      {
        valid: false,
        error: result.error,
      },
      { status: result.statusCode || 400 },
    );
  }

  return NextResponse.json({
    valid: true,
    address: result.wallet?.address,
  });
}
