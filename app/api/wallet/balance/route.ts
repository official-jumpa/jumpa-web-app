import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { getCachedWalletBalances } from "@/lib/wallet-balances";

export async function GET(req: NextRequest) {
  const auth = await requireActiveUser();
  if (!auth.ok) return auth.response;

  const { address, userId } = auth;

  try {
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";
    const result = await getCachedWalletBalances(
      address || userId,
      undefined,
      forceRefresh,
    );

    if (!result) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Balance API] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch balances" },
      { status: 500 },
    );
  }
}
