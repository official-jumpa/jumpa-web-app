/**
 * Blacklisted email addresses and patterns blocked from registration and login.
 * Canonical emails are checked in lowercase.
 */
export const EMAIL_BLACKLIST: readonly string[] = [
  "cautiousvirtue@gmail.com",
  "mattyadrien5@gmail.com",
  "lydiasong93@gmail.com",
  "winkerfortune+0183927@gmail.com",
  "gariusimbib.e@gmail.com",
  // 102.92.23.140 blacklist this IP later
];

/**
 * Checks whether an email has a plus alias (sub-addressing like user+tag@domain.com).
 */
export function hasPlusAlias(rawEmail: string): boolean {
  if (!rawEmail || typeof rawEmail !== "string") return false;
  const atIndex = rawEmail.indexOf("@");
  if (atIndex === -1) return false;
  const localPart = rawEmail.slice(0, atIndex);
  return localPart.includes("+");
}

/**
 * Checks whether an email username contains one or more dots (e.g. dev.czdamian@gmail.com).
 */
export function hasDotsInLocal(rawEmail: string): boolean {
  if (!rawEmail || typeof rawEmail !== "string") return false;
  const atIndex = rawEmail.indexOf("@");
  if (atIndex === -1) return false;
  const localPart = rawEmail.slice(0, atIndex);
  return localPart.includes(".");
}

/**
 * Normalizes an email for canonical matching:
 * - Trims and lowercases
 * - Maps googlemail.com to gmail.com
 * - Strips all dots from Gmail/Googlemail addresses
 */
export function sanitizeEmail(rawEmail: string): string {
  if (!rawEmail || typeof rawEmail !== "string") return "";
  const trimmed = rawEmail.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex === -1) return trimmed;

  let local = trimmed.slice(0, atIndex);
  let domain = trimmed.slice(atIndex + 1);

  if (domain === "googlemail.com") {
    domain = "gmail.com";
  }

  // Strip all dots for Gmail accounts
  if (domain === "gmail.com") {
    local = local.replace(/\./g, "");
  }

  return `${local}@${domain}`;
}

export const normalizeEmail = sanitizeEmail;

/**
 * Checks if an email is in the blacklist (checks exact canonical match and base address).
 */
export function isEmailBlacklisted(rawEmail: string): boolean {
  if (!rawEmail || typeof rawEmail !== "string") return false;
  const canonical = sanitizeEmail(rawEmail);
  const baseWithoutPlus = sanitizeEmail(canonical.split("@")[0].split("+")[0] + "@" + (canonical.split("@")[1] || ""));

  return EMAIL_BLACKLIST.some((banned) => {
    const bannedClean = sanitizeEmail(banned);
    return bannedClean === canonical || bannedClean === baseWithoutPlus;
  });
}
