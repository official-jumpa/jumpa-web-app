import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypasses standard Next.js assets, internal bundles, and API routes
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

  // 2. Fetch session and wallet tokens from Cookies (handling HTTPS __Secure- prefixes case-insensitively)
  const allCookies = request.cookies.getAll();
  const sessionToken = allCookies.find((c) => {
    const name = c.name.toLowerCase();
    return (
      name.includes("better-auth.session_token") ||
      name.includes("better_auth.session_token") ||
      name.endsWith("session_token")
    );
  })?.value;

  const hasWallet = allCookies.find((c) =>
    c.name.toLowerCase().includes("selected_wallet_address"),
  )?.value;

  const isAuthenticated = !!sessionToken;
  const hasSelectedWallet = !!hasWallet;

  // 3. Define route classifications
  const isAuthRoute =
    pathname === "/onboarding" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/import-wallet");

  // Keep wallet setup routes open if they don't have a wallet yet
  const isWalletSetupRoute =
    pathname.startsWith("/sign-up/secure-wallet") ||
    pathname.startsWith("/sign-up/recovery-phrase") ||
    pathname.startsWith("/sign-up/pin") ||
    pathname.startsWith("/import-wallet");

  const isProtectedRoute =
    pathname.startsWith("/home") ||
    pathname.startsWith("/cards") ||
    pathname.startsWith("/transactions") ||
    pathname === "/";

  // Case 1: Unauthenticated Users
  if (!isAuthenticated) {
    if (isProtectedRoute || isWalletSetupRoute) {
      console.log(
        `[Proxy] Redirecting unauthenticated user from ${pathname} to /onboarding`,
      );
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return NextResponse.next();
  }

  // Case 2: Authenticated Users WITHOUT a wallet
  if (isAuthenticated && !hasSelectedWallet) {
    // Exclude /sign-up/done success screen to allow it to render right after confirmation
    if (pathname === "/sign-up/done") {
      return NextResponse.next();
    }

    // Redirect away from home/dashboard pages back to setup
    if (isProtectedRoute) {
      console.log(
        `[Proxy] Authenticated user without wallet. Redirecting from ${pathname} to /sign-up/secure-wallet`,
      );
      return NextResponse.redirect(
        new URL("/sign-up/secure-wallet", request.url),
      );
    }
    return NextResponse.next();
  }

  // Case 3: Authenticated Users WITH a wallet
  if (isAuthenticated && hasSelectedWallet) {
    // Exclude /sign-up/done to allow viewing completion
    if (isAuthRoute && pathname !== "/sign-up/done") {
      console.log(
        `[Proxy] Authenticated user with wallet. Redirecting from auth route ${pathname} to /home`,
      );
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Catch all main route paths
  matcher: [
    "/",
    "/home(.*)",
    "/cards(.*)",
    "/transactions(.*)",
    "/onboarding(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/import-wallet(.*)",
  ],
};
