import { checkRateLimit } from "@/lib/functions/rateLimitFunctions";
import { getRedisClient } from "@/lib/redis";

/** Global hourly cap on sponsored Stellar account/trustline activations (40/hr = max 60 XLM locked/hr). */
export const STELLAR_ACTIVATION_HOURLY_LIMIT = 40;
export const STELLAR_ACTIVATION_WINDOW_SEC = 3600;

declare global {
  var __stellarActivationTimestamps: number[] | undefined;
}

export interface ActivationQuotaResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  limit: number;
}

/**
 * Consumes 1 slot from the global hourly Stellar activation quota.
 * Uses Redis across instances when configured, with an in-memory sliding window fallback.
 *
 * Kept in its own server-only module so client-reachable imports of `sponsor.ts`
 * never pull `ioredis` into Turbopack browser bundles.
 */
export async function consumeStellarActivationQuota(
  limit = STELLAR_ACTIVATION_HOURLY_LIMIT,
  windowSec = STELLAR_ACTIVATION_WINDOW_SEC,
): Promise<ActivationQuotaResult> {
  const redis = getRedisClient();
  if (redis) {
    const res = await checkRateLimit({
      identifier: "global",
      tier: "critical",
      action: "stellar_sponsored_activation",
      customLimit: limit,
      customWindowSec: windowSec,
    });
    return {
      allowed: res.allowed,
      remaining: res.remaining,
      resetInSeconds: res.resetInSeconds,
      limit,
    };
  }

  const now = Date.now();
  const windowMs = windowSec * 1000;
  const cutoff = now - windowMs;
  const timestamps = (globalThis.__stellarActivationTimestamps ?? []).filter(
    (ts) => ts > cutoff,
  );

  if (timestamps.length >= limit) {
    globalThis.__stellarActivationTimestamps = timestamps;
    const oldest = timestamps[0] ?? now;
    const resetInSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000),
    );
    return { allowed: false, remaining: 0, resetInSeconds, limit };
  }

  timestamps.push(now);
  globalThis.__stellarActivationTimestamps = timestamps;
  return {
    allowed: true,
    remaining: Math.max(0, limit - timestamps.length),
    resetInSeconds: windowSec,
    limit,
  };
}

/** Resets the in-memory fallback activation quota (intended for tests). */
export function resetLocalStellarActivationQuota(): void {
  globalThis.__stellarActivationTimestamps = [];
}
