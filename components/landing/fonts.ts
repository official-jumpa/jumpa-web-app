import { Inter, Plus_Jakarta_Sans } from "next/font/google";

// The marketing frames set their copy in Plus Jakarta Sans, and the FAQ in
// Inter. Both are scoped to `<main>` on `/`, so the app never downloads them.
export const jakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const inter = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});
