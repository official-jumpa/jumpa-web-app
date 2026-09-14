/** Export Private Key and Export Seed Phrase: one flow, two payloads. */

export type ExportKind = "private-key" | "seed-phrase";

export type ExportChainId = "stellar" | "base" | "ethereum" | "solana";

export interface ExportChainOption {
  id: ExportChainId;
  name: string;
  symbol: string;
  badge: string;
}

export const EXPORT_CHAINS: ExportChainOption[] = [
  {
    id: "stellar",
    name: "Stellar",
    symbol: "XLM",
    badge: "Stellar (XLM)",
  },
  {
    id: "base",
    name: "Base",
    symbol: "BASE",
    badge: "Base (EVM)",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    badge: "Ethereum (EVM)",
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    badge: "Solana (SPL)",
  },
];

interface ExportCopy {
  /** Centred title in the header. */
  bar: string;
  heading: string;
  /** Rendered around the bolded middle clause. */
  lead: string;
  strong: string;
  tail: string;
  /** Default `chain` for POST /api/wallet/export-key. */
  chain: string;
}

export const EXPORT_COPY: Record<ExportKind, ExportCopy> = {
  "private-key": {
    bar: "Export Private key",
    heading: "Export Private Key",
    lead: "Export your ",
    strong: "private key",
    tail: " to import this wallet into another app. Anyone who has it controls the wallet.",
    chain: "stellar",
  },
  "seed-phrase": {
    bar: "Export Seed Phrase",
    heading: "Export Seed Phrase",
    lead: "Export your ",
    strong: "12 or 24-word",
    tail: " recovery phrase to securely regain access to your wallet.",
    chain: "phrase",
  },
};

/** The warning under both payloads, straight from the frame. */
export const EXPORT_WARNING =
  "Jumpa can't recover this for you, anyone with the PIN controls the account";

/** Hides a key without revealing its length. */
export const SECRET_MASK = "•".repeat(48);
