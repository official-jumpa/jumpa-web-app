import { NextResponse } from "next/server";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

/**
 * GET /api/wallet/generate-phrase
 * Returns a fresh 12-word BIP39 mnemonic phrase.
 * Nothing is saved to DB until user confirms and sets up their PIN.
 */
export async function GET() {
  // 128 bits entropy → 12-word phrase
  const phrase = generateMnemonic(wordlist, 128);
  return NextResponse.json({ phrase });
}
