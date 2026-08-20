import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { NextRequest } from "next/server";
import { connectDB } from "./db";
import { Wallet } from "@/models/Wallet";

export interface SessionPayload {
  address: string;
  userId?: string;
}

/** Verify the BetterAuth session from the incoming request or headers */
export async function getSession(
  req?: NextRequest,
): Promise<SessionPayload | null> {
  try {
    await connectDB();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      console.log("[Session] No session found");
      return null;
    }

    const cookieStore = await cookies();
    const selectedAddress = cookieStore.get("selected_wallet_address")?.value;

    let wallet = null;
    if (selectedAddress) {
      wallet = await Wallet.findOne({
        userId: session.user.id,
        address: selectedAddress.toLowerCase(),
      });
    }

    if (!wallet) {
      wallet = await Wallet.findOne({ userId: session.user.id });
    }

    if (!wallet) {
      console.warn("[Session] No wallet linked to user:", session.user.id);
      return { address: "", userId: session.user.id };
    }

    return {
      address: wallet.address,
      userId: session.user.id,
    };
  } catch (err) {
    console.warn("[Session] Failed to retrieve session:", err);
    return null;
  }
}

/** Clear the session cookie */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("jumpa_session");
  console.log("[Session] Session cleared");
}
