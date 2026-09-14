/** The Your Devices screen: what `GET /api/auth/sessions` returns, and how it reads. */

export interface SessionItem {
  id: string;
  isCurrent: boolean;
  ipAddress: string;
  userAgent: string;
  os: string;
  browser: string;
  deviceType: "desktop" | "mobile" | "tablet";
  /** "Mac via Chrome" — already carries the browser. */
  deviceLabel: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

/** "11 Sep 2026, 6:08 PM". A sign-in is a fact, so it gets a date, not "3d ago". */
export function formatSignIn(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return `${date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}, ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;
}

/** What names the device in a list of them. */
export function deviceName(session: SessionItem): string {
  return session.deviceLabel || session.os || "Unknown device";
}

/** The line under it: when it signed in, and from where. */
export function deviceTrace(session: SessionItem): string {
  const stamp = formatSignIn(session.createdAt);
  return session.ipAddress ? `${stamp} · ${session.ipAddress}` : stamp;
}
