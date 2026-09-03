<p align="center" style="margin-bottom: 40px;">
  <img src="public/logo/wordmark/purple.png" alt="Jumpa Logo" width="180" />
</p>

<p align="center">
  <strong>Jumpa is a non-custodial financial assistant that abstracts blockchain complexity through an AI-driven conversational interface. Users can manage funds, query live balances, swap digital assets, and bridge fiat currencies simply by chatting naturally in plain English.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3.1-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2.8-blue?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Stellar-Horizon_%26_Soroban-black?style=flat-square&logo=stellar" alt="Stellar" />
  <img src="https://img.shields.io/badge/Linter-Biome-60a5fa?style=flat-square" alt="Biome" />
</p>

---

## Quick Navigation

- [Project Summary](#project-summary)
- [Documentation & Tranche Verification](#documentation--tranche-verification)
- [Frontend Design System & Architecture](#frontend-design-system--architecture)
- [Environment Configuration (`.env`)](#environment-configuration-env)
- [Getting Started & Local Development](#getting-started--local-development)
- [Project Layout & Directory Structure](#project-layout--directory-structure)
- [Core Architecture & Tech Stack](#core-architecture--tech-stack)

---

## Project Summary

**Jumpa** is a non-custodial financial assistant that abstracts blockchain complexity through an AI-driven conversational interface. Users can manage funds, query live balances, swap digital assets, and bridge fiat currencies simply by chatting naturally in plain English.

### Key Capabilities
- **Conversational Financial Engine:** Process intents such as *"Swap 10 XLM to USDC on testnet"*, *"What's my balance?"*, or *"Claim test tokens"* into on-chain actions.
- **Sovereign Non-Custodial Security:** BIP-39 mnemonic seeds generated in the background, encrypted locally via AES-256-GCM + PIN, deriving standardized Stellar (`m/44'/148'/0'`), EVM, Solana, and Bitcoin addresses.
- **Soroswap DEX Liquidity Aggregation:** Real-time quote routing (`/quote`) and unsigned transaction XDR construction (`/quote/build`) across Stellar Soroban liquidity pools.
- **Multi-Chain Portfolio Aggregation:** Concurrent balance synchronization across Stellar Horizon (Testnet & Mainnet), Base/EVM, Solana, and Bitcoin.
- **Integrated Hosted Ramps:** Responsive checkout bottom sheets for fiat deposit and withdrawal gateways (Switch, MoneyGram, Mercuryo).

---

## Documentation & Tranche Verification

| Guide | Description |
| :--- | :--- |
| 📖 **[Tranche 1 Completion Guide](docs/TRANCHE_1_COMPLETE.md)** | Comprehensive technical architecture, Soroswap REST integration, Stellar Horizon synchronization, SEP-24 ramps staging, and proof of deliverables. |
| 🧪 **[Step-by-Step Testing Guide](docs/HOW_TO_TEST.md)** | Walkthrough on sign-up OTP, PIN setup, Friendbot faucet activation, and executing conversational DEX swaps. |

---

## Frontend Design System & Architecture

Jumpa is crafted around a strict mobile-first design system optimized for modern mobile viewports (baseline **393 × 852 px**) and centred with a responsive maximum container width (`--container-app: 450px`).

### 1. The Single Styling Rule: Global Static Tokens
Every color, font, radius, shadow, and gradient is declared once in [`app/globals.css`](app/globals.css) inside `@theme static`.

```css
@theme static {
  --color-jumpa-primary-600: #8f12ff; /* Brand core purple */
  --color-jumpa-alt-400: #d5ff19;     /* Vibrant lime accent */
  --color-jumpa-warm-50: #fffbf4;     /* Conversational money card canvas */
  --container-app: 450px;             /* Standardized container width */
}
```

### 2. Tailored Color Palette
- **Brand Primary (Purple):** Ranging from `jumpa-primary-50` (`#f5f0ff`) up to deep `jumpa-primary-950` (`#370078`), with `jumpa-primary-600` (`#8f12ff`) powering primary actions, CTA buttons, and brand backdrops.
- **Alt Highlight (Lime Accent):** Vibrant accent `jumpa-alt-400` (`#d5ff19`) used for active indicators, badges, and attention-grabbing cues.
- **Warm Money Paper Palette:** `jumpa-warm-50` (`#fffbf4`) to `jumpa-warm-200` (`#f4e5d2`) used for conversational transaction cards (`QuoteCard`, `TransferCard`, `ReceiptCard`) to deliver a warm, approachable financial UI rather than sterile grey boxes.
- **Neutral & Surface Hierarchy:** `jumpa-neutral-25` through `jumpa-neutral-900` for hairline borders, card surfaces, and readable typography contrast.

### 3. Typography
- **Small Copy (under 20px):** **SF Pro Rounded**, reached through the `ui-rounded` generic so Apple devices use the real face; **Nunito** (variable, 200–1000) is the self-hosted fallback everywhere else.
- **Big Copy (20px and up):** **Inter**, loaded as a single variable Google font in `app/layout.tsx`. The switch is one size-keyed rule in `@layer base` in `app/globals.css` — no component tags it by hand, so add a selector there when you introduce a size above 20px.
- **Code Blocks & Monospace:** **Geist Mono** for developer logs, addresses, and transaction hashes.
- **Semantic Tokens:**
  | Token | Utility | Usage |
  | :--- | :--- | :--- |
  | `--font-sans` | `font-sans` | Small UI copy — labels, body, captions |
  | `--font-display` | `font-display` | Headings, oversized currency and hero numbers |
  | `--font-numeric` | `font-numeric` | PIN digits, keypads, and counters |
  | `--font-mono` | `font-mono` | Explorer hashes, addresses, and code blocks |

### 4. Interactive Components & Micro-Animations
- **Bottom Sheets:** [`components/ui/bottom-sheet.tsx`](components/ui/bottom-sheet.tsx) provides animated spring overlays (`animate-sheet-up`, `animate-fade`) with safe-area inset padding for PIN verification and balance breakdowns.
- **Conversational Cards:** Interactive components in [`components/chat/`](components/chat/) for live quotes ([`quote-card.tsx`](components/chat/quote-card.tsx)), payment checkouts ([`onramp-checkout-card.tsx`](components/chat/onramp-checkout-card.tsx)), and confirmed receipts ([`receipt-card.tsx`](components/chat/receipt-card.tsx)).
- **Staggered Entry Transitions:** [`components/ui/rise-in.tsx`](components/ui/rise-in.tsx) animates dashboard sections sequentially from top to bottom.

---

## Environment Configuration (.env)

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

### Environment Variables Reference

| Variable | Required | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `MONGO_URI` | **Yes** | MongoDB connection string for users, wallets, and logs | `mongodb://localhost:27017/jumpa` |
| `AUTH_SECRET` | **Yes** | 32+ character random secret for BetterAuth session encryption | `openssl rand -hex 32` |
| `AUTH_URL` / `BETTER_AUTH_URL` | **Yes** | Base application URL | `http://localhost:3000` |
| `WALLET_PEPPER_SECRET` | **Yes** | Server pepper used for salt derivation | Random 32+ character string |
| `ENCRYPTION_KEY` | **Yes** | Encryption key for securing sensitive records | Random 32+ character string |
| `STELLAR_TESTNET` | **Yes** | Stellar Testnet Horizon RPC endpoint | `https://horizon-testnet.stellar.org` |
| `STELLAR_MAINNET` | **Yes** | Stellar Mainnet Horizon RPC endpoint | `https://horizon.stellar.org` |
| `SOROSWAP_API_URL` | **Yes** | Soroswap REST API base URL | `https://api.soroswap.finance` |
| `SOROSWAP_API_KEY` | **Yes** | Soroswap API key for quote routing and building XDR | Your Soroswap API Key |
| `RESEND_API_KEY` | Optional | Resend API key for sending email OTP codes | `re_123456789` |
| `RESEND_FROM_EMAIL` | Optional | Sender email address for OTP transport | `onboarding@resend.dev` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID for social sign-in | `your_google_client_id` |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret | `your_google_client_secret` |
| `SWITCH_SANDBOX_URL` | Optional | Sandbox base URL for Switch fiat ramps | `https://switch-3.gitbook.io/api` |
| `SWITCH_SANDBOX_KEY` | Optional | Switch sandbox authentication API key | `sandbox_key_...` |
| `NEXT_PUBLIC_SOLANA_RPC` | Optional | Solana RPC endpoint for balance lookups | `https://api.mainnet-beta.solana.com` |
| `EVM_RPC_URL` | Optional | EVM RPC endpoint (Sepolia / Base) | `https://sepolia.drpc.org` |

---

## Getting Started & Local Development

### Prerequisites
- **Node.js**: v20.0 or higher (v20+ recommended)
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or MongoDB Atlas cluster

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/official-jumpa/jumpa-web-app.git
cd jumpa-web-app

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Start the development server
npm run dev
```

The application will be live at **`http://localhost:3000`**.

### Scripts & Tooling

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts the Next.js local development server |
| `npm run build` | Compiles production bundle — **must pass before merging PRs** |
| `npm run start` | Starts the Next.js production server |
| `npm run lint` | Runs Biome checks (linting + format verification) |
| `npm run format` | Automatically applies Biome formatting across the workspace |
---

## Project Layout & Directory Structure

```
jumpa-web-app/
├── app/                      # Next.js 16 App Router pages, layouts, and API routes
│   ├── (app)/                # Authenticated application screens (home, chat, settings, cards)
│   ├── (auth)/               # Authentication & onboarding flows (login, OTP, PIN)
│   ├── api/                  # REST backend handlers
│   │   ├── auth/             # BetterAuth handlers & session verification
│   │   ├── chat/             # Chat prompt dispatch (/send) & transaction confirmation (/confirm)
│   │   ├── swap/             # Soroswap DEX proxy routes (/quote & /build)
│   │   ├── switch/           # Fiat on/off-ramp webhook & status routes
│   │   └── wallet/           # Wallet balance sync & faucet funding
│   └── globals.css           # Global static design tokens & Tailwind theme
├── components/               # React 19 UI component library
│   ├── auth/                 # OTP verification, PIN inputs, and recovery phrase components
│   ├── chat/                 # Conversational UI, QuoteCard, ReceiptCard, PIN Sheet
│   ├── home/                 # Asset list, balance panels, quick actions, bottom nav
│   └── ui/                   # Generic primitives (Button, TextField, BottomSheet, Icons)
├── docs/                     # Technical specifications and testing guides
│   ├── HOW_TO_TEST.md        # Step-by-step testnet walkthrough
│   └── TRANCHE_1_COMPLETE.md # Tranche 1 architecture & verification proofs
├── lib/                      # Core business logic & blockchain integration
│   ├── ai/                   # AI intent engine, tool schemas, and tool execution dispatcher
│   ├── chains/               # Chain integrations (Stellar Horizon, Solana, EVM, Bitcoin)
│   │   └── stellar/          # BIP-39 m/44'/148'/0' key derivation, Horizon client, state sync
│   ├── dex/                  # Decentralized exchange connectors (Soroswap REST API client)
│   └── crypto.ts             # AES-256-GCM encryption & secure mnemonic hashing
├── models/                   # Mongoose database schemas (User, Wallet, Transaction, ChatLog)
└── public/                   # Static assets, SVG coin badges, and brand marks
```

---

## Core Architecture & Tech Stack

```mermaid
flowchart LR
    subgraph Client ["Client (React 19 / Next.js 16)"]
        UI["Mobile-First UI (393px)"]
        ChatUI["Conversational Chat"]
        PinSheet["PIN Verification Sheet"]
    end

    subgraph Backend ["Next.js Server & AI"]
        API["API Routes (/api/*)"]
        AIEngine["AI Intent Engine"]
        ToolExec["Tool Executor"]
    end

    subgraph External ["Protocols & Networks"]
        Soroswap["Soroswap DEX API"]
        Horizon["Stellar Horizon Node"]
        Mongo[(MongoDB)]
    end

    UI --> API
    ChatUI --> AIEngine
    AIEngine --> ToolExec
    ToolExec --> Soroswap
    PinSheet --> API
    API --> Horizon
    API --> Mongo
```

- **Framework:** Next.js 16 (App Router, Server Components)
- **Language:** TypeScript 5 (Strict mode)
- **Styling:** Tailwind CSS v4 + Static Design Tokens
- **Blockchain SDKs:** `@stellar/stellar-sdk`, `ed25519-hd-key`, `bip39`, `viem`, `@solana/web3.js`
- **Database & Auth:** MongoDB with Mongoose, BetterAuth
- **Code Quality:** Biome Linter & Formatter
