import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// The design's face, for every size. Variable 100-900, so every weight the
// Figma file uses comes from the one file.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

// Kept for code blocks in chat markdown.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Jumpa",
    template: "%s · Jumpa",
  },
  description:
    "Send, swap, save, and spend across currencies and chains all in one conversation.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8f12ff",
  // Lets content sit under the notch so slides can run truly full-bleed;
  // safe-area padding is reapplied per component.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-jumpa-black">{children}</body>
    </html>
  );
}
