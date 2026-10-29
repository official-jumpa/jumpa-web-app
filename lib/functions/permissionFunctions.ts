import { cache } from "react";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Wallet } from "@/models/Wallet";

import {
  checkRateLimit,
  type RateLimitTier,
} from "@/lib/functions/rateLimitFunctions";
import { parseUserAgent } from "@/lib/user-agent";

export type UserStatus = "pending" | "active" | "banned" | "suspended" | "deleted";

export interface AuthenticatedUser {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  status: UserStatus;
  country?: string | null;
  jumpaTag?: string | null;
  activeWalletId?: string | null;
  [key: string]: any;
}

export interface WalletAddresses {
  eth: string;
  base: string;
  sol: string;
  xlm: string;
}

export interface AuthenticatedContext {
  userId: string;
  address: string;
  user: AuthenticatedUser;
  session: any;
  addresses?: WalletAddresses;
  requestId: string;
  clientIp: string;
  userAgent: string;
}

export interface RouteGuardOptions {
  /**
   * Whether to require a registered wallet address on the account.
   * Defaults to false (optional wallet). Set to true for financial transactions.
   */
  requireWallet?: boolean;
  /**
   * Whether to permit users with "pending" onboarding status.
   * Defaults to false in requireActiveUser, true in requireAuth.
   */
  allowPending?: boolean;
  /**
   * Optional rate limiting configuration enforced by Redis.
   */
  rateLimit?: {
    tier?: RateLimitTier;
    action: string;
    limit?: number;
    windowSec?: number;
    customMessage?: string;
  };
}

export interface StatusCheckOptions {
  allowPending?: boolean;
}

export interface StatusCheckResult {
  allowed: boolean;
  status: UserStatus;
  error?: string;
  code?: string;
  httpStatus?: number;
}

export type ActiveUserResult =
  | ({ ok: true } & AuthenticatedContext)
  | { ok: false; response: NextResponse };

export type AuthOnlyResult =
  | ({ ok: true } & AuthenticatedContext)
  | { ok: false; response: NextResponse };

/**
 * Retrieves the verified Better Auth session with request lifecycle memoization and sub-millisecond cookie caching.
 *
 * Scenario: Use in Server Components, layouts, or data fetchers when you only need to inspect the current
 * user session without returning an HTTP response or throwing an error.
 */
export const getCachedAuthSession = cache(
  async (options?: { disableCookieCache?: boolean }) => {
    try {
      const reqHeaders = await headers();
      return await auth.api.getSession({
        headers: reqHeaders,
        query: options?.disableCookieCache
          ? { disableCookieCache: true }
          : undefined,
      });
    } catch (err: any) {
      if (
        err?.digest === "DYNAMIC_SERVER_USAGE" ||
        err?.message?.includes("Dynamic server usage")
      ) {
        throw err;
      }
      console.warn("[Permission] Failed to get session:", err);
      return null;
    }
  },
);

/**
 * Validates whether a user's account status is "active", producing standardized error codes and HTTP statuses for inactive accounts.
 *
 * Scenario: Use when you already hold a user object and need to evaluate permissions against account states
 * (active, banned, suspended, deleted, or pending) before permitting an operation.
 */
export async function checkUserStatus(
  user: {
    id: string;
    status?: string | null;
  },
  options: StatusCheckOptions = {},
): Promise<StatusCheckResult> {
  let status = (user.status || undefined) as UserStatus | undefined;

  // If status is missing from an older session cookie, query the database once
  if (!status) {
    try {
      await connectDB();
      const dbUser = await User.findById(user.id).select("status").lean();
      status = (dbUser?.status as UserStatus) || "active";
    } catch (err) {
      console.warn("[Permission] Failed to query user status from DB:", err);
      status = "active";
    }
  }

  if (status === "banned") {
    console.log("banned user- ", user)
    return {
      allowed: false,
      status: "banned",
      error: "This account has been permanently banned.",
      code: "ACCOUNT_BANNED",
      httpStatus: 403,
    };
  }

  if (status === "suspended") {
    console.log("suspended user- ", user)
    return {
      allowed: false,
      status: "suspended",
      error: "This account is temporarily suspended.",
      code: "ACCOUNT_SUSPENDED",
      httpStatus: 403,
    };
  }

  if (status === "deleted") {
    console.log("deleted user- ", user)
    return {
      allowed: false,
      status: "deleted",
      error: "This account has been deleted.",
      code: "ACCOUNT_DELETED",
      httpStatus: 403,
    };
  }

  if (status === "pending") {
    if (options.allowPending) {
      return {
        allowed: true,
        status: "pending",
      };
    }
    return {
      allowed: false,
      status: "pending",
      error: "Account onboarding is pending completion.",
      code: "ACCOUNT_PENDING",
      httpStatus: 403,
    };
  }

  return {
    allowed: true,
    status: "active",
  };
}

/**
 * Resolves the user's active wallet address from cookies or the database.
 *
 * Scenario: Internal helper used by route guards to attach primary and multi-chain wallet addresses
 * to the authenticated context.
 */
export async function resolveUserWallet(userId: string): Promise<{
  address: string;
  addresses?: WalletAddresses;
}> {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const selectedAddress = cookieStore.get("selected_wallet_address")?.value;

    let wallet = null;
    if (selectedAddress) {
      wallet = await Wallet.findOne({
        userId,
        address: selectedAddress.toLowerCase(),
      });
    }

    if (!wallet) {
      wallet = await Wallet.findOne({ userId });
    }

    return {
      address: wallet?.address || "",
      addresses: wallet?.addresses,
    };
  } catch (err) {
    console.warn("[Permission] Failed to resolve wallet for user:", userId, err);
    return { address: "" };
  }
}

/**
 * Checks if two IP addresses share the same carrier/ISP subnet (/16 for IPv4 or /64 for IPv6).
 * Cellular carriers (e.g. MTN, Airtel, Glo) routinely rotate user IPs within the same /16 or /24 CGNAT block.
 */
function isSameCarrierSubnet(ipA: string, ipB: string): boolean {
  if (!ipA || !ipB || ipA === ipB) return true;

  // IPv4: match the first 2 octets (e.g. 102.90.x.x matches 102.90.y.y)
  if (ipA.includes(".") && ipB.includes(".")) {
    const octetsA = ipA.split(".");
    const octetsB = ipB.split(".");
    if (octetsA.length === 4 && octetsB.length === 4) {
      return octetsA[0] === octetsB[0] && octetsA[1] === octetsB[1];
    }
  }

  // IPv6: match the first 4 segments (/64 standard prefix)
  if (ipA.includes(":") && ipB.includes(":")) {
    const segmentsA = ipA.split(":");
    const segmentsB = ipB.split(":");
    if (segmentsA.length >= 4 && segmentsB.length >= 4) {
      return segmentsA.slice(0, 4).join(":") === segmentsB.slice(0, 4).join(":");
    }
  }

  return false;
}

/**
 * Extracts normalized request security metadata (request ID, client IP, device user-agent)
 * and audits the request while detecting session IP drift / hijacking anomalies.
 */
async function resolveSecurityContext(
  session: any,
  action?: string,
): Promise<{ requestId: string; clientIp: string; userAgent: string }> {
  let requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  let clientIp = "127.0.0.1";
  let userAgent = "unknown";

  try {
    const reqHeaders = await headers();
    requestId = reqHeaders.get("x-request-id") || requestId;
    clientIp =
      reqHeaders.get("x-client-ip") ||
      reqHeaders.get("cf-connecting-ip") ||
      reqHeaders.get("x-real-ip") ||
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";
    userAgent = reqHeaders.get("user-agent") || "unknown";
  } catch {
    // If called outside request header context
  }

  // Parse clean device names for client request and login session
  const currentDevice = parseUserAgent(userAgent);
  const sessionUa = session?.session?.userAgent;
  const sessionDevice = sessionUa ? parseUserAgent(sessionUa) : null;

  // 1. Genuine Device/Browser Hijacking Detection
  // Only alert if BOTH the session and incoming request have known, identifiable client devices
  // (ignores internal server-to-server fetches or missing User-Agent headers)
  const isKnownSessionDevice = sessionDevice && sessionDevice.os !== "Unknown OS";
  const isKnownCurrentDevice =
    Boolean(userAgent) &&
    userAgent !== "unknown" &&
    currentDevice.os !== "Unknown OS";

  const isDeviceDrift =
    isKnownSessionDevice &&
    isKnownCurrentDevice &&
    (sessionDevice.os !== currentDevice.os ||
      sessionDevice.deviceType !== currentDevice.deviceType ||
      (sessionDevice.browser !== "un" &&
        currentDevice.browser !== "un" &&
        sessionDevice.browser !== currentDevice.browser));

  if (isDeviceDrift) {
    console.log(
      `[🔴 DEVICE MISMATCH] [${requestId}] ${session?.user?.id} | Login Device: "${sessionDevice?.deviceLabel}" | Request Device: "${currentDevice.deviceLabel}" | IP: ${clientIp}`,
    );
  }

  // 2. IP Drift across different networks (e.g. Wi-Fi to cellular)
  const sessionIp = session?.session?.ipAddress;
  if (
    sessionIp &&
    sessionIp !== "0000:0000:0000:0000:0000:0000:0000:0000" &&
    sessionIp !== "127.0.0.1" &&
    clientIp !== "127.0.0.1" &&
    sessionIp !== clientIp &&
    !isSameCarrierSubnet(sessionIp, clientIp)
  ) {
    console.log(
      `[🟡 IP CHANGE] [${requestId}] ${session?.user?.id} IP changed across subnets on ${currentDevice.deviceLabel} | Login IP: ${sessionIp} -> Request IP: ${clientIp}`,
    );
  }

  const actionLabel = action || "api_request";

  console.log(
    `[🟣 AUDIT] [${requestId}] action=${actionLabel} from ${session?.user?.id || "unauthenticated"} ip=${clientIp} device="${currentDevice.deviceLabel}"`,
  );

  return { requestId, clientIp, userAgent };
}

/**
 * Enforces that the incoming request has a valid session AND that the user account status is strictly "active".
 *
 * Scenario: Call at the very top of any protected API route handler (e.g. sending funds, executing swaps,
 * changing PIN, querying transactions) before executing any business logic.
 */
export async function requireActiveUser(
  options: RouteGuardOptions = {},
): Promise<ActiveUserResult> {
  const session = await getCachedAuthSession();
  const { requestId, clientIp, userAgent } = await resolveSecurityContext(
    session,
    options.rateLimit?.action,
  );

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        {
          status: 401,
          headers: { "X-Request-Id": requestId },
        },
      ),
    };
  }

  const statusCheck = await checkUserStatus(session.user, {
    allowPending: options.allowPending ?? false,
  });
  if (!statusCheck.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: statusCheck.error,
          code: statusCheck.code,
          status: statusCheck.status,
        },
        {
          status: statusCheck.httpStatus || 403,
          headers: { "X-Request-Id": requestId },
        },
      ),
    };
  }

  const walletContext = await resolveUserWallet(session.user.id);
  if (options.requireWallet && !walletContext.address) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Wallet not found", code: "WALLET_NOT_FOUND" },
        {
          status: 404,
          headers: { "X-Request-Id": requestId },
        },
      ),
    };
  }

  if (options.rateLimit) {
    const rateLimit = await checkRateLimit({
      identifier: session.user.id,
      tier: options.rateLimit.tier || "high",
      action: options.rateLimit.action,
      customLimit: options.rateLimit.limit,
      customWindowSec: options.rateLimit.windowSec,
    });

    if (!rateLimit.allowed) {
      const errorMsg =
        options.rateLimit.customMessage ||
        `Too many requests. Please try again in ${rateLimit.resetInSeconds} second${rateLimit.resetInSeconds === 1 ? "" : "s"}.`;

      return {
        ok: false,
        response: NextResponse.json(
          {
            error: errorMsg,
            code: "RATE_LIMIT_EXCEEDED",
            retryAfter: rateLimit.resetInSeconds,
          },
          {
            status: 429,
            headers: {
              "X-Request-Id": requestId,
              "Retry-After": rateLimit.resetInSeconds.toString(),
              "X-RateLimit-Limit": rateLimit.limit.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": rateLimit.resetInSeconds.toString(),
            },
          },
        ),
      };
    }
  }

  return {
    ok: true,
    userId: session.user.id,
    address: walletContext.address,
    addresses: walletContext.addresses,
    user: session.user as AuthenticatedUser,
    session,
    requestId,
    clientIp,
    userAgent,
  };
}

/**
 * Enforces that the incoming request has a valid session, permitting users regardless of whether their status is active or pending.
 *
 * Scenario: Call at the top of onboarding, recovery, or initial setup endpoints (e.g. /api/v1/user/onboarding, /api/v1/wallet)
 * where authenticated users must be allowed to complete configuration before their account is fully activated.
 */
export async function requireAuth(
  options: RouteGuardOptions = {},
): Promise<AuthOnlyResult> {
  const session = await getCachedAuthSession();
  const { requestId, clientIp, userAgent } = await resolveSecurityContext(
    session,
    options.rateLimit?.action,
  );

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "You are currently not logged in", code: "UNAUTHORIZED" },
        {
          status: 401,
          headers: { "X-Request-Id": requestId },
        },
      ),
    };
  }

  const statusCheck = await checkUserStatus(session.user, {
    allowPending: options.allowPending ?? true,
  });
  if (!statusCheck.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: statusCheck.error,
          code: statusCheck.code,
          status: statusCheck.status,
        },
        {
          status: statusCheck.httpStatus || 403,
          headers: { "X-Request-Id": requestId },
        },
      ),
    };
  }

  const walletContext = await resolveUserWallet(session.user.id);
  if (options.requireWallet && !walletContext.address) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Wallet not found", code: "WALLET_NOT_FOUND" },
        {
          status: 404,
          headers: { "X-Request-Id": requestId },
        },
      ),
    };
  }

  if (options.rateLimit) {
    const rateLimit = await checkRateLimit({
      identifier: session.user.id,
      tier: options.rateLimit.tier || "high",
      action: options.rateLimit.action,
      customLimit: options.rateLimit.limit,
      customWindowSec: options.rateLimit.windowSec,
    });

    if (!rateLimit.allowed) {
      const errorMsg =
        options.rateLimit.customMessage ||
        `Too many requests. Please try again in ${rateLimit.resetInSeconds} second${rateLimit.resetInSeconds === 1 ? "" : "s"}.`;

      return {
        ok: false,
        response: NextResponse.json(
          {
            error: errorMsg,
            code: "RATE_LIMIT_EXCEEDED",
            retryAfter: rateLimit.resetInSeconds,
          },
          {
            status: 429,
            headers: {
              "X-Request-Id": requestId,
              "Retry-After": rateLimit.resetInSeconds.toString(),
              "X-RateLimit-Limit": rateLimit.limit.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": rateLimit.resetInSeconds.toString(),
            },
          },
        ),
      };
    }
  }

  return {
    ok: true,
    userId: session.user.id,
    address: walletContext.address,
    addresses: walletContext.addresses,
    user: session.user as AuthenticatedUser,
    session,
    requestId,
    clientIp,
    userAgent,
  };
}
