import type { Metadata, Viewport } from "next";
import { Geist_Mono, Host_Grotesk } from "next/font/google";
import "./globals.css";

// Variable 300–800, so every weight the UI asks for comes from one file.
const hostGrotesk = Host_Grotesk({
  variable: "--font-host-grotesk",
  subsets: ["latin"],
});

// Kept for code blocks in chat markdown; Host Grotesk has no monospace cut.
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
      className={`${hostGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-jumpa-black">{children}</body>
    </html>
  );
}
