// The create-account flow. Every screen reads its destination from here, so
// reordering a step is one edit instead of a sweep.

export const SIGN_UP_FLOW = {
  email: "/sign-up",
  verifyEmail: "/sign-up/verify-code",
  phone: "/sign-up/phone",
  verifyPhone: "/sign-up/phone/verify",
  password: "/sign-up/password",
  confirmPassword: "/sign-up/password/confirm",
  tag: "/sign-up/tag",
  pin: "/sign-up/pin",
  confirmPin: "/sign-up/pin/confirm",
  done: "/sign-up/done",
} as const;

/** What each step leaves for the next, in `sessionStorage` like `setupPin`. */
export const SIGN_UP_KEYS = {
  email: "onboardingEmail",
  phone: "signupPhone",
  /** Held only between the set and confirm screens; cleared the moment they match. */
  password: "signupPassword",
  tag: "signupTag",
  pin: "setupPin",
} as const;

type SignUpKey = (typeof SIGN_UP_KEYS)[keyof typeof SIGN_UP_KEYS];

export function readSignUpValue(key: SignUpKey) {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(key);
}

export function writeSignUpValue(key: SignUpKey, value: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, value);
}

export function clearSignUpValue(key: SignUpKey) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(key);
}

/** Digits only, so a number typed with spaces or dashes stores the same way. */
export function normalisePhone(input: string) {
  return input.replace(/[^\d+]/g, "");
}

/** Long enough to be a real number once the country code is allowed for. */
export function isValidPhone(input: string) {
  return /^\+?\d{7,15}$/.test(normalisePhone(input));
}

export const TAG_MIN_LENGTH = 3;
export const TAG_MAX_LENGTH = 20;

/** Lowercase letters, digits and underscores — what a payable handle can hold. */
export function normaliseTag(input: string) {
  return input
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, TAG_MAX_LENGTH);
}

export function isValidTag(tag: string) {
  return normaliseTag(tag).length >= TAG_MIN_LENGTH;
}

export type TagAvailability = {
  /** Whether the tag the user typed can be claimed. */
  available: boolean;
  /** Free tags close to theirs, shown as chips under the field. */
  suggestions: string[];
};

/** Check tag availability */
export async function checkTagAvailability(
  tag: string,
): Promise<TagAvailability> {
  const handle = normaliseTag(tag);
  if (handle.length < TAG_MIN_LENGTH) {
    return { available: false, suggestions: [] };
  }

  try {
    const res = await fetch(
      `/api/auth/wallet-setup?checkTag=${encodeURIComponent(handle)}`,
    );
    if (res.ok) {
      const data = await res.json();
      return {
        available: Boolean(data.available),
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      };
    }
  } catch (e) {
    console.error("Failed to check tag availability:", e);
  }

  // Fallback if network offline
  const taken = ["jumpa", "admin", "support"];
  const available = handle.length >= TAG_MIN_LENGTH && !taken.includes(handle);
  const suggestions = available
    ? []
    : [`${handle}_`, `${handle}1`, `the${handle}`]
        .map(normaliseTag)
        .filter((option) => option.length >= TAG_MIN_LENGTH)
        .slice(0, 3);

  return { available, suggestions };
}
