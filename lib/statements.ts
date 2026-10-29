/**
 * Supported account statement currencies and duration ranges.
 */
export const STATEMENT_KINDS = {
  all: { label: "All Transactions", chip: "All" },
  crypto: { label: "Crypto", chip: "Crypto" },
  fiat: { label: "Fiat (NGN)", chip: "Fiat" },
  // Backward compatibility aliases
  general: { label: "All Transactions", chip: "All" },
  usd: { label: "Crypto", chip: "Crypto" },
  ngn: { label: "Fiat (NGN)", chip: "Fiat" },
} as const;

export type StatementKind = "all" | "crypto" | "fiat" | "general" | "usd" | "ngn";

export const STATEMENT_CHIPS: StatementKind[] = ["all", "crypto", "fiat"];

export const MAX_STATEMENT_DAYS = 92; // 3 months max duration

export function isStatementKind(value: string): value is StatementKind {
  return value in STATEMENT_KINDS;
}

// export function statementTitle(kind: StatementKind): string {
//   const norm = kind === "general" ? "all" : kind === "usd" ? "crypto" : kind === "ngn" ? "fiat" : kind;
//   return `${STATEMENT_KINDS[norm]?.label || "Account"} Statement`;
// }

export function statementHref(kind: StatementKind = "all"): string {
  const norm = kind === "general" ? "all" : kind === "usd" ? "crypto" : kind === "ngn" ? "fiat" : kind;
  return `/profile/settings?section=statements&kind=${norm}`;
}

export const STATEMENT_DURATIONS = [
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "3 Months" },
  { id: "custom", label: "Custom" },
] as const;

export type StatementDuration = (typeof STATEMENT_DURATIONS)[number]["id"];
