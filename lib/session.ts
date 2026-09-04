import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Wallet } from "@/models/Wallet";
import { connectDB } from "./db";

export interface SessionPayload {
  address: string;
  userId?: string;
  /** Full per-chain address map — mirrors IWallet.addresses. Populated when a wallet is found. */
  addresses?: {
    eth: string;
    base: string;
    sol: string;
    xlm: string;
  };
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
      addresses: wallet.addresses,
    };
  } catch (err) {
    console.warn("[Session] Failed to retrieve session:", err);
    return null;
  }
}

/**
 * Clear every cookie the proxy treats as a session. It gates on any name ending
 * in `session_token`, and BetterAuth prefixes that with `__Secure-` over HTTPS,
 * so deleting a literal name is not enough to sign someone out.
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();

  for (const { name } of cookieStore.getAll()) {
    if (name.toLowerCase().includes("session_token")) {
      cookieStore.delete(name);
    }
  }

  cookieStore.delete("jumpa_session");
  cookieStore.delete("selected_wallet_address");
  console.log("[Session] Session cleared");
}
