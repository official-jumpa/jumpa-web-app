/**
 * Circular country marks, full-bleed like the coin logos, keyed by ISO code.
 * One map so a flag fix is one file — the currency picker and the home fiat
 * cards both resolve through it and cannot disagree.
 */
export const FLAGS: Record<string, string> = {
  US: "/images/flags/us.png",
  NG: "/images/flags/ng.png",
  GH: "/images/flags/gh.png",
  KE: "/images/flags/ke.png",
  ZA: "/images/flags/za.png",
};
