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

export const SIGN_UP_KEYS = {
  email: "onboardingEmail",
  phone: "signupPhone",
  phoneChallengeId: "signupPhoneChallengeId",
  /** When the last phone code went out (ms epoch); drives the resend countdown. */
  phoneSentAt: "signupPhoneSentAt",
  /** Held only between the set and confirm screens; cleared the moment they match. */
  password: "signupPassword",
  tag: "signupTag",
  pin: "setupPin",
  referralCode: "signupReferralCode",
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

/** Seconds before "Resend Code" works again; Toden allows only 5 codes per number an hour. */
export const PHONE_RESEND_COOLDOWN_SEC = 60;

/** Toden codes live 5 minutes; reuse one for 4, leaving time to type it. */
const PHONE_CODE_REUSE_MS = 4 * 60_000;

export function recordPhoneCodeSent(phone: string, challengeId: string) {
  writeSignUpValue(SIGN_UP_KEYS.phone, phone);
  writeSignUpValue(SIGN_UP_KEYS.phoneChallengeId, challengeId);
  writeSignUpValue(SIGN_UP_KEYS.phoneSentAt, String(Date.now()));
}

/** Forget a verified code so it's never reused. */
export function clearPhoneCode() {
  clearSignUpValue(SIGN_UP_KEYS.phoneChallengeId);
  clearSignUpValue(SIGN_UP_KEYS.phoneSentAt);
}

function msSincePhoneCodeSent() {
  const sentAt = Number(readSignUpValue(SIGN_UP_KEYS.phoneSentAt));
  return sentAt > 0 ? Date.now() - sentAt : Number.POSITIVE_INFINITY;
}

/** Seconds left before another code may be requested; 0 when it may. */
export function phoneResendWait() {
  const left = Math.ceil(PHONE_RESEND_COOLDOWN_SEC - msSincePhoneCodeSent() / 1000);
  return Math.min(PHONE_RESEND_COOLDOWN_SEC, Math.max(0, left));
}

/** A code sent to this number is still usable, so sending another would only spend the hourly cap. */
export function hasLivePhoneCode(phone: string) {
  return (
    readSignUpValue(SIGN_UP_KEYS.phone) === phone &&
    Boolean(readSignUpValue(SIGN_UP_KEYS.phoneChallengeId)) &&
    msSincePhoneCodeSent() < PHONE_CODE_REUSE_MS
  );
}

/**
 * The email is the one value that has to survive the tab being restored: on a
 * phone you leave the browser to read the code, and the browser can discard
 * and reload the tab, which empties `sessionStorage` and left the verification
 * screen with nothing to verify. Mirrored into `localStorage` and cleared the
 * moment the code is accepted.
 */
export function writeSignUpEmail(email: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SIGN_UP_KEYS.email, email);
  localStorage.setItem(SIGN_UP_KEYS.email, email);
}

export function readSignUpEmail() {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem(SIGN_UP_KEYS.email) ||
    localStorage.getItem(SIGN_UP_KEYS.email)
  );
}

export function clearSignUpEmail() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SIGN_UP_KEYS.email);
  localStorage.removeItem(SIGN_UP_KEYS.email);
}

export function writeSignUpReferral(code: string) {
  if (typeof window === "undefined") return;
  const clean = code.trim().toUpperCase();
  sessionStorage.setItem(SIGN_UP_KEYS.referralCode, clean);
  localStorage.setItem(SIGN_UP_KEYS.referralCode, clean);
}

export function readSignUpReferral() {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem(SIGN_UP_KEYS.referralCode) ||
    localStorage.getItem(SIGN_UP_KEYS.referralCode)
  );
}

export function clearSignUpReferral() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SIGN_UP_KEYS.referralCode);
  localStorage.removeItem(SIGN_UP_KEYS.referralCode);
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
      `/api/v1/user/tag?check=${encodeURIComponent(handle)}`,
    );
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const payload = data.data ?? data;
      return {
        available: Boolean(payload.available),
        suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
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
