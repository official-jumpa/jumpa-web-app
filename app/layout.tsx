import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { IosInputZoom } from "@/components/ios-input-zoom";
import { ServiceWorker } from "@/components/service-worker";
import { CookieChoicesBanner } from "@/components/ui/cookie-choices-banner";
import localFont from "next/font/local";
import "./globals.css";

// The design's face, for every size. Variable 100-900, so every weight the
// Figma file uses comes from the one file.
const geist = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist",
  display: "swap",
});

// Kept for code blocks in chat markdown.
const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://usejumpa.com"),
  title: {
    default: "Jumpa - Move Money the way you Chat",
    template: "%s | Jumpa",
  },
  description:
    "Move Money the way you Chat. Send, swap, save, and spend across currencies and chains all in one conversation.",
  applicationName: "Jumpa",
  category: "finance",
  keywords: [
    "Jumpa",
    "crypto wallet",
    "cross-chain wallet",
    "crypto messenger",
    "AI financial assistant",
    "conversational crypto",
    "send crypto",
    "receive crypto",
    "save crypto",
    "stablecoins",
    "USDC",
    "USDT",
    "non-custodial crypto wallet",
    "web3 wallet",
    "global payments",
    "borderless money",
    "buy crypto with fiat",
    "sell crypto for fiat",
    "crypto payments",
    "peer-to-peer payments",
    "Stellar",
    "Solana",
    "Base",
    "Ethereum",
  ],
  authors: [{ name: "Jumpa" }],
  creator: "Jumpa",
  publisher: "Jumpa",
  alternates: {
    canonical: "https://usejumpa.com",
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "https://usejumpa.com/favicon.ico" },
      {
        url: "https://usejumpa.com/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "https://usejumpa.com/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "https://usejumpa.com/icons/apple-icon-180.png",
  },
  appleWebApp: {
    capable: true,
    title: "Jumpa",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: {
      default: "Jumpa",
      template: "%s | Jumpa",
    },
    description:
      "Send, swap, save, and spend across currencies and chains all in one conversation.",
    siteName: "Jumpa",
    images: [
      {
        url: "https://usejumpa.com/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Jumpa - Move Money the way you Chat",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: {
      default: "Jumpa",
      template: "%s | Jumpa",
    },
    description:
      "Send, swap, save, and spend across currencies and chains all in one conversation.",
    images: ["https://usejumpa.com/icons/icon-512.png"],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8f12ff",
  // Lets content sit under the notch so slides can run truly full-bleed;
  // safe-area padding is reapplied per component.
  viewportFit: "cover",
};

const gaId = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-jumpa-black">
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
        <ServiceWorker />
        <IosInputZoom />
        <CookieChoicesBanner />
        {children}
      </body>
    </html>
  );
}
