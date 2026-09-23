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
  metadataBase: new URL("https://usejumpa.com"),
  title: {
    default: 'Jumpa - Move Money the way you Chat',
    template: '%s | Jumpa',
  },
  description: 'Move Money the way you Chat. Send, swap, save, and spend across currencies and chains all in one conversation.',
  applicationName: 'Jumpa',
  category: 'finance',
  keywords: [
    'Jumpa', 'crypto wallet', 'cross-chain', 'crypto messenger', 'swap tokens', 'web3',
    'AI financial assistant', 'conversational AI', 'crypto chat', 'secure messaging',
    'crypto chat app', 'crypto messaging app', 'crypto wallet chat', 'web3 assistant',
    'blockchain assistant', 'crypto AI bot', 'conversational crypto',
    'Stellar', 'XLM', 'Soroban', 'Soroswap DEX', 'Soroswap', 'DeFindex', 'DeFindex vaults',
    'Solana', 'Solana Wallet', 'EVM', 'EVM Wallet', 'Base', 'Base Wallet', 'Ethereum', 'ETH',
    'multi-chain portfolio', 'Stellar Testnet', 'Stellar Mainnet', 'Stellar Horizon',
    'non-custodial security', 'BIP-39', 'BIP-39 mnemonic', 'non-custodial crypto wallet',
    'smart contracts', 'blockchain wallet',
    'DeFi yield', 'target savings', 'crypto savings account', 'yield farming', 'staking',
    'crypto rewards', 'decentralized finance', 'send crypto', 'receive crypto', 'save crypto',
    'crypto payments', 'peer-to-peer payments', 'send USDC', 'swap XLM to USDC',
    'fiat onramp', 'Mercuryo', 'MoneyGram', 'Switch fiat', 'Allbridge Core', 'stablecoins',
    'USDC', 'USDT', 'bridge tokens', 'cross-chain bridge', 'cross-chain bridge USDC',
    'crypto exchange', 'social wallet', 'crypto onboarding', 'crypto offramp',
    'global payments', 'borderless money', 'crypto on-ramp', 'fiat off-ramp',
    'buy crypto with fiat', 'sell crypto for fiat'
  ],
  authors: [{ name: 'Jumpa' }],
  creator: 'Jumpa',
  publisher: 'Jumpa',
  alternates: {
    canonical: 'https://usejumpa.com',
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
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: 'https://usejumpa.com/favicon.ico' },
      { url: 'https://usejumpa.com/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: 'https://usejumpa.com/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: 'https://usejumpa.com/icons/apple-icon-180.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Jumpa',
    statusBarStyle: 'black-translucent',
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
        url: 'https://usejumpa.com/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Jumpa - Move Money the way you Chat',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: {
      default: 'Jumpa',
      template: '%s | Jumpa',
    },
    description: 'Send, swap, save, and spend across currencies and chains all in one conversation.',
    images: ['https://usejumpa.com/icons/icon-512.png'],
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
      {/* Black frames the column on desktop. On a phone the column is capped
          just under the widest viewports, so black there is a thin sliver that
          reads as a rendering fault — keep it white until the gap is clearly a frame. */}
      <body className="min-h-full bg-jumpa-white md:bg-jumpa-black">
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
