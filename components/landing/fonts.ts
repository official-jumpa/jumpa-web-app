import localFont from "next/font/local";

// The marketing frames set their copy in Plus Jakarta Sans, and the FAQ in
// Inter. Both are scoped to `<main>` on `/`, so the app never downloads them.
// Self-hosted (latin, variable) so a Google Fonts timeout cannot fail a build.
export const jakarta = localFont({
  src: "../../app/fonts/PlusJakartaSans-Variable.woff2",
  variable: "--font-plus-jakarta-sans",
  weight: "200 800",
  display: "swap",
});

export const inter = localFont({
  src: "../../app/fonts/Inter-Variable.woff2",
  variable: "--font-inter-sans",
  weight: "100 900",
  display: "swap",
});
