import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Nunito } from "next/font/google";
import "./globals.css";

// Big copy. Variable, so 500 and 600 both come from the one file.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Small copy falls back to this off Apple devices, where `ui-rounded` resolves
// to SF Pro Rounded itself. Variable 200–1000, so no weight is lost.
const nunito = Nunito({
  variable: "--font-nunito",
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
      className={`${inter.variable} ${nunito.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-jumpa-black">{children}</body>
    </html>
  );
}
