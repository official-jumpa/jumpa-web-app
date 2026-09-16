import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ServiceWorker } from "@/components/service-worker";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://usejumpa.com'
  ),
  title: {
    default: 'Jumpa',
    template: '%s | Jumpa',
  },
  description: 'Send, swap, save, and spend across currencies and chains all in one conversation.',
  icons: {
    // icon: '/logo.png', // its affecting the main favicon
    // The home-screen icon has to be square — /logo.png is the 803x381 mark and
    // iOS letterboxes it. Generated with the PWA icons; see app/manifest.ts.
    apple: '/icons/apple-icon-180.png',
  },
  openGraph: {
    title: {
      default: 'Jumpa',
      template: '%s | Jumpa',
    },
    description: 'Send, swap, save, and spend across currencies and chains all in one conversation.',
    siteName: 'Jumpa',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Jumpa Logo',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: {
      default: 'Jumpa',
      template: '%s | Jumpa',
    },
    description: 'Send, swap, save, and spend across currencies and chains all in one conversation.',
    images: ['/logo.png'],
  },
  // Safari PWA: opens as standalone app with no browser chrome.
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Jumpa',
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

export default function RootLayout({ children }: LayoutProps<"/">) {
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
        {children}
      </body>
    </html>
  );
}
