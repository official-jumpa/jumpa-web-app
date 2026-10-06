import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass standard Next.js assets, internal bundles, and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  // 2. Fetch session token from Cookies (handling HTTPS __Secure- prefixes case-insensitively)
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

  // 3. Define protected dashboard & authenticated routes
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
      `[Proxy] Redirecting unauthenticated user from ${pathname} to /onboarding`,
    );
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // 4. Capture referral code from URL into a 7-day cookie for unauthenticated users
  const response = NextResponse.next();
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
  // Catch all main route paths
  matcher: [
    "/",
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
