import { type NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

export type RateLimitTier = "critical" | "high" | "medium" | "low";

export interface TierConfig {
  limit: number;
  windowSec: number;
}

export const RATE_LIMIT_TIERS: Record<RateLimitTier, TierConfig> = {
  critical: { limit: 5, windowSec: 60 },
  high: { limit: 10, windowSec: 60 },
  medium: { limit: 30, windowSec: 60 },
  low: { limit: 120, windowSec: 60 },
};

export interface CheckRateLimitParams {
  identifier: string; // userId or clientIp
  tier?: RateLimitTier;
  action: string;
  customLimit?: number;
  customWindowSec?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
  current: number;
}

/**
 * Atomic Lua script to increment counter, set TTL on creation, and return current count & TTL.
 */
const RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
if ttl == -1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {current, ttl}
`;

/**
 * Extracts client IP address with proxy header precedence.
 */
export function getClientIp(req: NextRequest | Request): string {
  const headers = req.headers;
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return "127.0.0.1";
}

/**
 * Builds standard namespaced Redis key:
 * - Authenticated: rl:user_gb2yu2ma:critical:verify_password
 * - Public: rl:102.89.34.12:medium:waitlist
 */
export function buildRateLimitKey(params: {
  identifier: string;
  tier: RateLimitTier;
  action: string;
}): string {
  const sanitizedId = params.identifier.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const sanitizedAction = params.action.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return `rl:${sanitizedId}:${params.tier}:${sanitizedAction}`;
}

/**
 * Evaluates rate limit against Redis. Fails open on connection errors.
 */
export async function checkRateLimit(
  params: CheckRateLimitParams,
): Promise<RateLimitResult> {
  const tier = params.tier || "medium";
  const tierConfig = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.medium;
  const limit = params.customLimit || tierConfig.limit;
  const windowSec = params.customWindowSec || tierConfig.windowSec;

  const key = buildRateLimitKey({
    identifier: params.identifier,
    tier,
    action: params.action,
  });

  const redis = getRedisClient();

  // Fail-open if Redis is not configured or available
  if (!redis) {
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetInSeconds: windowSec,
      current: 1,
    };
  }

  try {
    // Connect if not already connected
    if (redis.status !== "ready" && redis.status !== "connecting") {
      await redis.connect().catch(() => {});
    }

    const evalResult = (await redis.eval(
      RATE_LIMIT_LUA,
      1,
      key,
      windowSec,
    )) as [number, number];

    const current = Number(evalResult[0]) || 1;
    const ttl = Number(evalResult[1]) || windowSec;
    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);

    return {
      allowed,
      limit,
      remaining,
      resetInSeconds: Math.max(1, ttl),
      current,
    };
  } catch (err: any) {
    console.warn(`[RateLimit] Redis check error for ${key}:`, err.message);
    // Fail-open: allow request if Redis temporarily errors
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetInSeconds: windowSec,
      current: 1,
    };
  }
}

export interface EnforceRateLimitOptions {
  tier?: RateLimitTier;
  action: string;
  userId?: string | null;
  limit?: number;
  windowSec?: number;
  customMessage?: string;
}

/**
 * High-level guard to enforce rate limiting on any API route.
 * Automatically chooses userId if available, otherwise falls back to client IP.
 *
 * @returns NextResponse with status 429 if limit exceeded, or null if allowed.
 */
export async function enforceRateLimit(
  req: NextRequest,
  options: EnforceRateLimitOptions,
): Promise<NextResponse | null> {
  const identifier = options.userId || getClientIp(req);
  const tier = options.tier || (options.userId ? "high" : "medium");

  const result = await checkRateLimit({
    identifier,
    tier,
    action: options.action,
    customLimit: options.limit,
    customWindowSec: options.windowSec,
  });

  if (!result.allowed) {
    const errorMsg =
      options.customMessage ||
      `Too many requests. Please try again in ${result.resetInSeconds} second${result.resetInSeconds === 1 ? "" : "s"}.`;

    return NextResponse.json(
      {
        error: errorMsg,
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: result.resetInSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": result.resetInSeconds.toString(),
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": result.resetInSeconds.toString(),
        },
      },
    );
  }

  return null;
}

/**
 * Attaches X-RateLimit headers to any successful NextResponse.
 */
export function attachRateLimitHeaders(
  res: NextResponse,
  result: RateLimitResult,
): NextResponse {
  res.headers.set("X-RateLimit-Limit", result.limit.toString());
  res.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  res.headers.set("X-RateLimit-Reset", result.resetInSeconds.toString());
  return res;
}
