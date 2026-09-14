import { cache } from "react";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Wallet } from "@/models/Wallet";

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
}

export interface RouteGuardOptions {
  /**
   * Whether to require a registered wallet address on the account.
   * Defaults to false (optional wallet). Set to true for financial transactions.
   */
  requireWallet?: boolean;
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
    } catch (err) {
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
export async function checkUserStatus(user: {
  id: string;
  status?: string | null;
}): Promise<StatusCheckResult> {
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
    return {
      allowed: false,
      status: "banned",
      error: "This account has been permanently banned.",
      code: "ACCOUNT_BANNED",
      httpStatus: 403,
    };
  }

  if (status === "suspended") {
    return {
      allowed: false,
      status: "suspended",
      error: "This account is temporarily suspended.",
      code: "ACCOUNT_SUSPENDED",
      httpStatus: 403,
    };
  }

  if (status === "deleted") {
    return {
      allowed: false,
      status: "deleted",
      error: "This account has been deleted.",
      code: "ACCOUNT_DELETED",
      httpStatus: 403,
    };
  }

  if (status === "pending") {
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
 * Enforces that the incoming request has a valid session AND that the user account status is strictly "active".
 *
 * Scenario: Call at the very top of any protected API route handler (e.g. sending funds, executing swaps,
 * changing PIN, querying transactions) before executing any business logic.
 */
export async function requireActiveUser(
  options: RouteGuardOptions = {},
): Promise<ActiveUserResult> {
  const session = await getCachedAuthSession();

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      ),
    };
  }

  const statusCheck = await checkUserStatus(session.user);
  if (!statusCheck.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: statusCheck.error,
          code: statusCheck.code,
          status: statusCheck.status,
        },
        { status: statusCheck.httpStatus || 403 },
      ),
    };
  }

  const walletContext = await resolveUserWallet(session.user.id);
  if (options.requireWallet && !walletContext.address) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Wallet not found", code: "WALLET_NOT_FOUND" },
        { status: 404 },
      ),
    };
  }

  return {
    ok: true,
    userId: session.user.id,
    address: walletContext.address,
    addresses: walletContext.addresses,
    user: session.user as AuthenticatedUser,
    session,
  };
}

/**
 * Enforces that the incoming request has a valid session, permitting users regardless of whether their status is active or pending.
 *
 * Scenario: Call at the top of onboarding, recovery, or initial setup endpoints (e.g. /api/auth/wallet-setup)
 * where authenticated users must be allowed to complete configuration before their account is fully activated.
 */
export async function requireAuth(
  options: RouteGuardOptions = {},
): Promise<AuthOnlyResult> {
  const session = await getCachedAuthSession();

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      ),
    };
  }

  const walletContext = await resolveUserWallet(session.user.id);
  if (options.requireWallet && !walletContext.address) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Wallet not found", code: "WALLET_NOT_FOUND" },
        { status: 404 },
      ),
    };
  }

  return {
    ok: true,
    userId: session.user.id,
    address: walletContext.address,
    addresses: walletContext.addresses,
    user: session.user as AuthenticatedUser,
    session,
  };
}
