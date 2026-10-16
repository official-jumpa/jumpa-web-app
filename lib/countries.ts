/**
 * Canonical country resolver and validator using native Intl.DisplayNames.
 * Zero external dependencies. Works on both server and client runtimes.
 */

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
const CANONICAL_COUNTRIES = new Map<string, string>();

// Index all 2-letter ISO country pairs (AA-ZZ) to their official English names
for (let i = 65; i <= 90; i++) {
  for (let j = 65; j <= 90; j++) {
    const code = String.fromCharCode(i, j);
    try {
      const name = displayNames.of(code);
      if (
        name &&
        name !== code &&
        name !== "Unknown Region" &&
        name !== "Pseudo-Accents" &&
        name !== "Pseudo-Bidi"
      ) {
        // Map lowercase name -> Canonical Title ("nigeria" -> "Nigeria")
        CANONICAL_COUNTRIES.set(name.toLowerCase(), name);
        // Map lowercase code -> Canonical Title ("ng" -> "Nigeria")
        CANONICAL_COUNTRIES.set(code.toLowerCase(), name);
      }
    } catch {
      // Ignored for invalid codes
    }
  }
}

// Common aliases
CANONICAL_COUNTRIES.set("usa", "United States");
CANONICAL_COUNTRIES.set("uk", "United Kingdom");
CANONICAL_COUNTRIES.set("uae", "United Arab Emirates");

/**
 * Returns the canonical English country name if valid, or null if invalid.
 * Accepts full country names (case-insensitive) or 2-letter ISO codes.
 * E.g.: "nigeria" -> "Nigeria", "NG" -> "Nigeria", "USA" -> "United States", "Wakanda" -> null
 */
export function getCanonicalCountryName(input?: string | null): string | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase();
  return CANONICAL_COUNTRIES.get(clean) || null;
}

/**
 * Checks if a string represents a recognized real country or ISO code.
 */
export function isValidCountry(input?: string | null): boolean {
  return Boolean(getCanonicalCountryName(input));
}
