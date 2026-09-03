import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { environment } from "@/lib/environment";
import { Wallet } from "@/models/Wallet";

/**
 * GET /api/wallet/list
 * Returns all wallets owned by the authenticated user, with an isSelected flag.
 */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const wallets = await Wallet.find(
    { userId: session.user.id },
    "address name addresses publicKeys createdAt",
  );

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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { address, name: newName } = body as {
    address?: string;
    name?: string;
  };

  if (!address || !newName || !newName.trim()) {
    return NextResponse.json(
      { error: "Address and new name are required" },
      { status: 400 },
    );
  }

  const trimmedName = newName.trim();

  await connectDB();

  const wallet = await Wallet.findOne({
    userId: session.user.id,
    address: address.toLowerCase(),
  });
  if (!wallet) {
    return NextResponse.json(
      { error: "Wallet not found or not owned by user" },
      { status: 404 },
    );
  }

  const duplicate = await Wallet.findOne({
    userId: session.user.id,
    name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    address: { $ne: address.toLowerCase() },
  });

  if (duplicate) {
    return NextResponse.json(
      { error: "A wallet with this name already exists" },
      { status: 400 },
    );
  }

  wallet.name = trimmedName;
  await wallet.save();

  return NextResponse.json({
    message: "Wallet renamed successfully",
    name: wallet.name,
  });
}

/**
 * PUT /api/wallet/list
 * Select the active wallet. Body: { address: string }
 * Sets selected_wallet_address httpOnly cookie.
 */
export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { address } = body as { address?: string };

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  await connectDB();

  const wallet = await Wallet.findOne({
    userId: session.user.id,
    address: address.toLowerCase(),
  });
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
