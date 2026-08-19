/** Placeholder until the wallet can generate keys. Never a usable mnemonic. */
export const DEMO_RECOVERY_PHRASE = Array.from({ length: 24 }, () => "Dehli");

export const PHRASE_LENGTHS = [
  { value: "12", label: "12 WORDS" },
  { value: "24", label: "24 WORDS" },
] as const;

export type PhraseLength = (typeof PHRASE_LENGTHS)[number]["value"];
