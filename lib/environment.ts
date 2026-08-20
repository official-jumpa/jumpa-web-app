/**
 * Centralized Environment Configuration Manager.
 * All env access across the application should be routed through this module.
 */

export const environment = {
  // Environment Mode
  NODE_ENV: process.env.NODE_ENV || "development",
  IS_PRODUCTION: process.env.NODE_ENV === "production",

  // Database
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/jumpa",

  // BetterAuth Config
  AUTH_SECRET: process.env.AUTH_SECRET || "",
  AUTH_URL: process.env.AUTH_URL || "http://localhost:3000",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  WALLET_PEPPER_SECRET:
    process.env.WALLET_PEPPER_SECRET ||
    "default_jumpa_secure_wallet_pepper_secret_2026_key",

  // Google OAuth Credentials
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",

  // Resend Email Transport
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",

  // Solana Network RPCs
  NEXT_PUBLIC_SOLANA_RPC:
    process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com",
  SOL_MAINNET: process.env.SOL_MAINNET || "https://api.mainnet-beta.solana.com",
  SOL_DEVNET: process.env.SOL_DEVNET || "https://api.devnet.solana.com",

  // EVM & Alchemy Config
  EVM_RPC_URL: process.env.EVM_RPC_URL || "https://sepolia.drpc.org",
  ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY || "",
  ALCHEMY_MAINNET_RPC: process.env.ALCHEMY_MAINNET_RPC || "",
  ALCHEMY_DEVNET_RPC: process.env.ALCHEMY_DEVNET_RPC || "",
  ALCHEMY_BASE_MAINNET_RPC: process.env.ALCHEMY_BASE_MAINNET_RPC || "",

  // Stellar
  STELLAR_MAINNET: process.env.STELLAR_MAINNET || "https://horizon.stellar.org",
  STELLAR_TESTNET:
    process.env.STELLAR_TESTNET || "https://horizon-testnet.stellar.org",

  // Switch
  SWITCH_LIVE_KEY: process.env.SWITCH_LIVE_KEY || "",
  SWITCH_SANDBOX_KEY: process.env.SWITCH_SANDBOX_KEY || "",
  SWITCH_SANDBOX_URL:
    process.env.SWITCH_SANDBOX_URL || "https://switch-3.gitbook.io/api",

  // Paystack & Encryption Keys
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "",
  PAYSTACK_BEARER_KEY: process.env.PAYSTACK_BEARER_KEY || "",
};

export default environment;
