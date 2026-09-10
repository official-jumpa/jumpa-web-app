import { LOGIN_PIN_LENGTH, TRANSACTION_PIN_LENGTH } from "@/lib/pin";

/** Which code the flow sets: the one that signs in, or the one that pays. */
export type PinKind = "login" | "transaction";

/** `change` asks for the current PIN first; `forgot` verifies by emailed code. */
export type PinMode = "change" | "forgot";

type Step = { heading: string; description: string; label: string };

export type PinFlow = {
  kind: PinKind;
  mode: PinMode;
  /** Bar title, the same on every step of the flow. */
  title: string;
  length: number;
  /** `forgot` only — the standing screen the flow opens on. */
  intro?: { heading: string; description: string };
  /** `change` only — the PIN in force today. */
  current?: Step;
  create: Step;
  confirm: Step;
  /** Self-custody note under the box, where the design draws one. */
  note?: { heading: string; body: string };
  success: { title: string; description: string };
};

const SIGNING_NOTE = {
  heading: "PIN is different from your password.",
  body: "A PIN is used to sign transactions on your device. It's never sent to Jumpa servers.",
};

const TRANSACTION_SUBTITLE = `${TRANSACTION_PIN_LENGTH}-digit code to authorize payments`;
const LOGIN_SUBTITLE = `${LOGIN_PIN_LENGTH}-digit code to sign in to Jumpa`;

/** `?section=` values that open a PIN flow. */
export type PinFlowName =
  | "transaction-pin"
  | "login-pin"
  | "forgot-transaction-pin"
  | "forgot-login-pin";

/** Every PIN screen under Settings. The section name is the key. */
export const PIN_FLOWS: Record<PinFlowName, PinFlow> = {
  "transaction-pin": {
    kind: "transaction",
    mode: "change",
    title: "Change Transaction PIN",
    length: TRANSACTION_PIN_LENGTH,
    current: {
      heading: "Enter your current PIN",
      description: TRANSACTION_SUBTITLE,
      label: "Enter your pin",
    },
    create: {
      heading: "Set new transaction PIN",
      description: TRANSACTION_SUBTITLE,
      label: "Enter your pin",
    },
    confirm: {
      heading: "Confirm new transaction PIN",
      description: TRANSACTION_SUBTITLE,
      label: "Re-enter your pin",
    },
    note: SIGNING_NOTE,
    success: {
      title: "Transaction PIN updated",
      description: "Your new PIN will authorise your next payment.",
    },
  },

  "login-pin": {
    kind: "login",
    mode: "change",
    title: "Change Login PIN",
    length: LOGIN_PIN_LENGTH,
    current: {
      heading: "Enter your current PIN",
      description: LOGIN_SUBTITLE,
      label: "Enter your pin",
    },
    create: {
      heading: "Set new login PIN",
      description: LOGIN_SUBTITLE,
      label: "Enter your pin",
    },
    confirm: {
      heading: "Confirm new login PIN",
      description: LOGIN_SUBTITLE,
      label: "Re-enter your pin",
    },
    success: {
      title: "Login PIN updated",
      description: "Use your new PIN the next time you sign in.",
    },
  },

  "forgot-transaction-pin": {
    kind: "transaction",
    mode: "forgot",
    title: "Forgot Transaction PIN",
    length: TRANSACTION_PIN_LENGTH,
    intro: {
      heading: "Forgot your Transaction PIN?",
      description: "Verify your identity to create a new transaction PIN.",
    },
    create: {
      heading: "Set New Transaction PIN",
      description: `Please enter a ${TRANSACTION_PIN_LENGTH}-digit PIN. Avoid using simple ones like 1234.`,
      label: "Enter new transaction PIN",
    },
    confirm: {
      heading: "Confirm New Transaction PIN",
      description: `Please enter a ${TRANSACTION_PIN_LENGTH}-digit PIN. Avoid using simple ones like 1234.`,
      label: "Re-enter new transaction PIN",
    },
    note: SIGNING_NOTE,
    success: {
      title: "Transaction PIN updated",
      description: "Your new PIN will authorise your next payment.",
    },
  },

  "forgot-login-pin": {
    kind: "login",
    mode: "forgot",
    title: "Forgot Login PIN",
    length: LOGIN_PIN_LENGTH,
    intro: {
      heading: "Forgot your Login PIN?",
      description: "Verify your identity to create a new Login PIN.",
    },
    create: {
      heading: "Set New Login PIN",
      description: `Please enter a ${LOGIN_PIN_LENGTH}-digit PIN. Avoid using simple ones like 123456.`,
      label: "Enter your login PIN",
    },
    confirm: {
      heading: "Confirm New Login PIN",
      description: `Please enter a ${LOGIN_PIN_LENGTH}-digit PIN. Avoid using simple ones like 123456.`,
      label: "Re-enter your login PIN",
    },
    success: {
      title: "Login PIN updated",
      description: "Use your new PIN the next time you sign in.",
    },
  },
};

export function isPinFlow(value: string): value is PinFlowName {
  return value in PIN_FLOWS;
}

/** The emailed code that unlocks a `forgot` flow. */
export const RESET_CODE_LENGTH = 4;

/** Countdown the design prints beside "Resend Code", in seconds. */
export const RESEND_SECONDS = 260;
