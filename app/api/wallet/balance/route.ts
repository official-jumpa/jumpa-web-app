import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { getCachedWalletBalances } from "@/lib/wallet-balances";

export const GET = withAuth(async (req, { address, userId }) => {
  try {
    const result = await getCachedWalletBalances(address || userId);

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
});
