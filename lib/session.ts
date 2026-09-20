import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
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

export const AUTH_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "better-auth.session_data",
  "__Secure-better-auth.session_data",
  "better-auth.csrf_token",
  "__Secure-better-auth.csrf_token",
  "better-auth.dont_remember",
  "jumpa_session",
  "selected_wallet_address",
] as const;

/**
 * Attaches expired Set-Cookie headers for all authentication and session
 * cookies to ensure they are properly deleted in the client browser.
 */
export function attachClearSessionCookies(response: NextResponse): NextResponse {
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set({
      name,
      value: "",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
    });
  }
  return response;
}

/**
 * Clear every cookie the proxy treats as a session. It gates on any name containing
 * session or better-auth, and ensures path="/" is specified so cookies are actually dropped.
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();

  for (const { name } of cookieStore.getAll()) {
    if (
      name.toLowerCase().includes("session") ||
      name.toLowerCase().includes("better-auth")
    ) {
      cookieStore.set({
        name,
        value: "",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
      cookieStore.delete(name);
    }
  }

  for (const name of AUTH_COOKIE_NAMES) {
    cookieStore.set({
      name,
      value: "",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    cookieStore.delete(name);
  }

  console.log("[Session] Session cleared");
}
