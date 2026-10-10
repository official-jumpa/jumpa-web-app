import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { environment } from "@/lib/environment";

// Hashing first gives equal-length buffers, so the compare leaks neither content nor length.
const digest = (value: string) => createHash("sha256").update(value).digest();

/** True when the request carries the admin dashboard's key. The /api/admin routes are server to server, never called by the app. */
export function isAdminRequest(req: NextRequest) {
  const secret = environment.ADMIN_API_SECRET;
  const key = req.headers.get("x-admin-key");
  if (!secret || !key) return false;
  return timingSafeEqual(digest(key), digest(secret));
}
