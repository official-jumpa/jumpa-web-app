import { authClient } from "@/lib/auth-client";

export type PinCheck = { ok: true } | { ok: false; error: string };

/** Checks the transaction PIN. The server locks it out after repeated misses. */
export async function verifyTransactionPin(pin: string): Promise<PinCheck> {
  try {
    const res = await fetch("/api/v1/wallet/pin?action=verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success !== false) return { ok: true };
    return { ok: false, error: data.error || "Incorrect PIN" };
  } catch {
    return { ok: false, error: "Check your connection and try again." };
  }
}

/** Calls an endpoint that ends the session; returns the error message if it fails. */
export async function endSession(
  endpoint: string,
  fallback: string,
  init: RequestInit = { method: "POST" },
): Promise<string | null> {
  try {
    const res = await fetch(endpoint, init);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return body?.error || fallback;
    }
  } catch {
    return fallback;
  }

  try {
    await authClient.signOut();
  } catch {
    // The server has already cleared the session.
  }
  // A full load drops Next's router cache, so no signed-in screen survives;
  // `replace` keeps the back button from landing on one.
  window.location.replace("/onboarding");
  return null;
}
