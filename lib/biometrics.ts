/**
 * Face ID / fingerprint enrolment, through WebAuthn's platform authenticator —
 * that is what "Face ID" and "fingerprint" are on the web. Turning a switch on
 * runs the device prompt; it only stays on if the user actually passes it.
 *
 * TODO(backend): the challenge is generated here and the credential is kept in
 * localStorage, so this proves the device can do biometrics but is NOT yet an
 * authentication factor. It needs a server that issues the challenge, verifies
 * the attestation and stores the credential id against the user, plus a
 * matching assertion check at login. Until then nothing may trust this flag.
 */

export type BiometricUse = "login" | "transactions";

const STORE_KEY = "jumpa_biometrics";
/** Relying-party name shown in the OS prompt. */
const RP_NAME = "Jumpa";

type Store = Partial<Record<BiometricUse, string>>;

function read(): Store {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Private mode and blocked site data both throw; the switch just won't stick.
  }
}

/** Which uses are already enrolled on this device. Empty before hydration. */
export function readEnrolled(): Record<BiometricUse, boolean> {
  const store = read();
  return {
    login: Boolean(store.login),
    transactions: Boolean(store.transactions),
  };
}

/** True when this device has a fingerprint reader or face scanner available. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential)
    return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export class BiometricError extends Error {
  constructor(
    message: string,
    /** False when retrying cannot help — no sensor, or an unsupported browser. */
    readonly retry = true,
  ) {
    super(message);
  }
}

/**
 * Raises the device prompt and records the credential. Throws a
 * `BiometricError` carrying copy the settings screen can show as-is.
 */
export async function enrolBiometric(
  use: BiometricUse,
  account: { id: string; name: string },
): Promise<void> {
  if (!(await isBiometricAvailable())) {
    throw new BiometricError(
      "This device has no Face ID or fingerprint available.",
      false,
    );
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = new TextEncoder().encode(account.id);

  let credential: Credential | null;
  try {
    credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: RP_NAME, id: window.location.hostname },
        user: { id: userId, name: account.name, displayName: account.name },
        // ES256 then RS256 — between them every platform authenticator.
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
        attestation: "none",
      },
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "NotAllowedError") {
      throw new BiometricError("Setup was cancelled. Nothing has changed.");
    }
    if (name === "InvalidStateError") {
      // Already enrolled on this authenticator; treat it as a success.
      write({ ...read(), [use]: "existing" });
      return;
    }
    throw new BiometricError(
      "Turn on Face ID or fingerprint unlock, then try again.",
    );
  }

  if (!credential) {
    throw new BiometricError("Setup didn't complete. Please try again.");
  }

  write({ ...read(), [use]: credential.id });
}

/** Forgets the credential for one use. The switch going off is all this needs. */
export function removeBiometric(use: BiometricUse) {
  const store = read();
  delete store[use];
  write(store);
}
