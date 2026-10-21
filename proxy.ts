import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Assign or propagate X-Request-Id (Correlation ID)
  const existingRequestId = request.headers.get("x-request-id");
  const requestId =
    existingRequestId ||
    `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // Normalize client IP across Cloudflare, reverse proxies, and local dev
  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  // Clone request headers to pass request ID & client IP downstream
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-client-ip", clientIp);

  // Helper to ensure X-Request-Id is stamped on all responses
  const withSecurityHeaders = (res: NextResponse) => {
    res.headers.set("X-Request-Id", requestId);
    return res;
  };

  // 2. Bypass standard Next.js assets, internal bundles, and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt"
  ) {
    return withSecurityHeaders(NextResponse.next());
  }

  // 3. For API routes: forward with injected security headers and return X-Request-Id
  if (pathname.startsWith("/api")) {
    return withSecurityHeaders(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      }),
    );
  }

  // 4. Fetch session token from Cookies (handling HTTPS __Secure- prefixes case-insensitively)
  const allCookies = request.cookies.getAll();
  const sessionToken = allCookies.find((c) => {
    const name = c.name.toLowerCase();
    return (
      name.includes("better-auth.session_token") ||
      name.includes("better_auth.session_token") ||
      name.endsWith("session_token")
    );
  })?.value;

  const isAuthenticated = !!sessionToken;

  // 5. Define protected dashboard & authenticated routes
  const isProtectedRoute =
    pathname.startsWith("/home") ||
    pathname.startsWith("/cards") ||
    pathname.startsWith("/transactions") ||
    pathname.startsWith("/receive") ||
    pathname.startsWith("/swap") ||
    pathname.startsWith("/savings") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/invest") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/more") ||
    pathname.startsWith("/airtime") ||
    pathname.startsWith("/data") ||
    pathname.startsWith("/kyc") ||
    pathname.startsWith("/ngn-account") ||
    pathname.startsWith("/usd-account") ||
    pathname.startsWith("/referrals") ||
    pathname.startsWith("/support");

  // Only guard against completely unauthenticated users
  if (!isAuthenticated && isProtectedRoute) {
    console.log(
      `[Proxy] [${requestId}] Redirecting unauthenticated user from ${pathname} to /onboarding (IP: ${clientIp})`,
    );
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/onboarding", request.url)),
    );
  }

  // 6. Capture referral code from URL into a 7-day cookie for unauthenticated users
  const response = withSecurityHeaders(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
  );
  const refParam = request.nextUrl.searchParams.get("ref");
  const existingRefCookie = request.cookies.get("jumpa_ref")?.value;

  if (!isAuthenticated && refParam && !existingRefCookie) {
    const cleanRef = refParam.trim().toUpperCase();
    if (cleanRef) {
      response.cookies.set("jumpa_ref", cleanRef, {
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        httpOnly: false, // Accessible to client-side form prefill as well
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  return response;
}

export const config = {
  // Catch all main route paths and API routes
  matcher: [
    "/",
    "/api/(.*)",
    "/home(.*)",
    "/cards(.*)",
    "/transactions(.*)",
    "/receive(.*)",
    "/swap(.*)",
    "/savings(.*)",
    "/profile(.*)",
    "/invest(.*)",
    "/assets(.*)",
    "/more(.*)",
    "/airtime(.*)",
    "/data(.*)",
    "/kyc(.*)",
    "/ngn-account(.*)",
    "/usd-account(.*)",
    "/referrals(.*)",
    "/support(.*)",
    "/onboarding(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/migrate-pin(.*)",
  ],
};
