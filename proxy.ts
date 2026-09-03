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

  // Keep wallet setup and import routes open
  const isWalletSetupRoute =
    pathname.startsWith("/sign-up/pin") ||
    pathname.startsWith("/import-wallet");

  // "/" is deliberately absent: it is the splash, which resolves its own
  // destination. Redirecting it here meant the splash never rendered.
  const isProtectedRoute =
    pathname.startsWith("/home") ||
    pathname.startsWith("/cards") ||
    pathname.startsWith("/transactions");

  // Case 1: Unauthenticated Users (only protect dashboard/home routes)
  if (!isAuthenticated) {
    if (isProtectedRoute) {
      console.log(`[Proxy] Redirecting unauthenticated user from ${pathname} to /onboarding`,
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
      console.log(`[Proxy] Authenticated user without wallet. Redirecting from ${pathname} to home page`,
      );
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Case 3: Authenticated Users WITH a wallet
  if (isAuthenticated && hasSelectedWallet) {
    if (
      pathname === "/onboarding" ||
      pathname === "/sign-in" ||
      pathname === "/sign-up"
    ) {
      console.log(`[Proxy] Authenticated user with wallet. Redirecting from ${pathname} to /home`,
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
