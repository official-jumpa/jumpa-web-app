/**
 * The four statements the design offers. `?section=statements&kind=` picks one;
 * with no `kind` the same list renders as its own screen.
 */
export const STATEMENT_KINDS = {
  cards: { label: "Cards" },
  usd: { label: "USD" },
  ngn: { label: "NGN" },
  general: { label: "General" },
} as const;

export type StatementKind = keyof typeof STATEMENT_KINDS;

export const STATEMENT_ORDER = Object.keys(STATEMENT_KINDS) as StatementKind[];

export function isStatementKind(value: string): value is StatementKind {
  return value in STATEMENT_KINDS;
}

export function statementTitle(kind: StatementKind): string {
  return `${STATEMENT_KINDS[kind].label} Statement`;
}

export function statementHref(kind: StatementKind): string {
  return `/profile/settings?section=statements&kind=${kind}`;
}
