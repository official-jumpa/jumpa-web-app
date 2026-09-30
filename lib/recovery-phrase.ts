export const PHRASE_LENGTHS = [
  { value: "12", label: "12 WORDS" },
  { value: "24", label: "24 WORDS" },
] as const;

export type PhraseLength = (typeof PHRASE_LENGTHS)[number]["value"];
