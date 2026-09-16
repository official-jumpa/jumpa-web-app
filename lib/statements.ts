/**
 * The four statements the design offers. `?section=statements&kind=` picks one;
 * with no `kind` the same list renders as its own screen.
 */
export const STATEMENT_KINDS = {
  cards: { label: "Cards", chip: "Cards" },
  usd: { label: "USD", chip: "USD" },
  ngn: { label: "NGN", chip: "NGN" },
  // The whole history, so the chip reads "All" where the title reads "General".
  general: { label: "General", chip: "All" },
} as const;

export type StatementKind = keyof typeof STATEMENT_KINDS;

export const STATEMENT_ORDER = Object.keys(STATEMENT_KINDS) as StatementKind[];

/** Chip order on the statement screen, which leads with the whole history. */
export const STATEMENT_CHIPS: StatementKind[] = [
  "general",
  "usd",
  "ngn",
  "cards",
];

export function isStatementKind(value: string): value is StatementKind {
  return value in STATEMENT_KINDS;
}

export function statementTitle(kind: StatementKind): string {
  return `${STATEMENT_KINDS[kind].label} Statement`;
}

export function statementHref(kind: StatementKind): string {
  return `/profile/settings?section=statements&kind=${kind}`;
}

/**
 * Ranges the request sheet offers. `custom` has no range of its own — it hands
 * over to the statement screens, where a start and end date are picked.
 */
export const STATEMENT_DURATIONS = [
  { id: "all", label: "Show All" },
  { id: "week", label: "7 Days Ago" },
  { id: "month", label: "1 Month Ago" },
  { id: "custom", label: "Custom Duration" },
] as const;

export type StatementDuration = (typeof STATEMENT_DURATIONS)[number]["id"];
