import { NextRequest, NextResponse } from "next/server";
import { environment } from "@/lib/environment";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  listWalletsByUserId,
  findWalletForUser,
  renameUserWallet,
} from "@/lib/functions/walletFunctions";
import {
  renameWalletSchema,
  selectWalletSchema,
} from "@/lib/validations/wallet.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * GET /api/wallet/list
 * Returns all wallets owned by the authenticated user, with an isSelected flag.
 */
export async function GET(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "low", action: "wallet_list_get" },
  });
  if (!auth.ok) return auth.response;

  const wallets = await listWalletsByUserId(auth.userId);
  const selectedAddress = req.cookies.get("selected_wallet_address")?.value;

  const result = wallets.map((w, index) => ({
    address: w.address,
    name: w.name || `Wallet ${index + 1}`,
    addresses: w.addresses,
    publicKeys: w.publicKeys,
    createdAt: w.createdAt,
    isSelected: selectedAddress
      ? w.address.toLowerCase() === selectedAddress.toLowerCase()
      : index === 0,
  }));

  const response = NextResponse.json(result);

  if (wallets.length > 0 && !selectedAddress) {
    response.cookies.set("selected_wallet_address", wallets[0].address, {
      path: "/",
      httpOnly: true,
      secure: environment.IS_PRODUCTION,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }

  return response;
}

/**
 * PATCH /api/wallet/list
 * Rename a wallet. Body: { address: string, name: string }
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "medium", action: "wallet_rename" },
  });
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const validation = renameWalletSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(formatZodError(validation.error), { status: 400 });
  }

  const { address, name } = validation.data;
  const result = await renameUserWallet(auth.userId, address, name);

  if (!result.success) {
    const status = result.error?.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    message: "Wallet renamed successfully",
    name: result.wallet?.name,
  });
}

/**
 * PUT /api/wallet/list
 * Select the active wallet. Body: { address: string }
 * Sets selected_wallet_address httpOnly cookie.
 */
export async function PUT(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "medium", action: "wallet_select" },
  });
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const validation = selectWalletSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(formatZodError(validation.error), { status: 400 });
  }

  const { address } = validation.data;
  const wallet = await findWalletForUser(auth.userId, address);
  if (!wallet) {
    return NextResponse.json(
      { error: "Wallet not found or not owned by user" },
      { status: 404 },
    );
  }

  const response = NextResponse.json({
    message: "Wallet selected",
    address: wallet.address,
  });

  response.cookies.set("selected_wallet_address", wallet.address, {
    path: "/",
    httpOnly: true,
    secure: environment.IS_PRODUCTION,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}
