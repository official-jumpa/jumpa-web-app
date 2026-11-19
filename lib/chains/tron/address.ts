import { HDKey } from "@scure/bip32";
import * as bip39 from "bip39";
import bs58 from "bs58";
import { sha256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export type TronAccount = ReturnType<typeof privateKeyToAccount>;

/** A real Tron address: 0x41 prefix, 20-byte body and a matching checksum, so a typo never receives funds. */
export function isTronAddress(address: string): boolean {
  try {
    const bytes = bs58.decode(address.trim());
    if (bytes.length !== 25 || bytes[0] !== 0x41) return false;
    const check = sha256(sha256(bytes.subarray(0, 21), "bytes"), "bytes");
    return Buffer.from(check.subarray(0, 4)).equals(
      Buffer.from(bytes.subarray(21)),
    );
  } catch {
    return false;
  }
}

/** Base58Check address → the 21-byte, 41-prefixed hex the full-node API and raw transactions use. */
export function tronAddressTo41Hex(address: string): string {
  return Buffer.from(bs58.decode(address.trim()).subarray(0, 21)).toString(
    "hex",
  );
}

/** 41-prefixed hex → Base58Check address. */
export function tronAddressFrom41Hex(hex41: string): string {
  const payload = Buffer.from(hex41, "hex");
  const check = sha256(sha256(payload, "bytes"), "bytes").subarray(0, 4);
  return bs58.encode(Buffer.concat([payload, Buffer.from(check)]));
}

/** An address as a 32-byte ABI word (the 20-byte body, left-padded). */
export function tronAddressAbiWord(address: string): string {
  return tronAddressTo41Hex(address).slice(2).padStart(64, "0");
}

/** secp256k1 key for Tron from a recovery phrase (m/44'/195'/0'/0/0) or a raw private key. */
export function deriveTronPrivateKey(
  mnemonicOrPrivateKey: string,
): `0x${string}` {
  const trimmed = mnemonicOrPrivateKey.trim();
  if (trimmed.split(/\s+/).length >= 12) {
    const child = HDKey.fromMasterSeed(
      bip39.mnemonicToSeedSync(trimmed),
    ).derive("m/44'/195'/0'/0/0");
    if (!child.privateKey) throw new Error("Failed to derive Tron private key");
    return `0x${Buffer.from(child.privateKey).toString("hex")}`;
  }
  return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as `0x${string}`;
}

/** The signing account for a phrase or key, with its Tron address in both encodings. */
export function tronAccountFromSecret(mnemonicOrPrivateKey: string): {
  account: TronAccount;
  address: string;
  address41: string;
} {
  const account = privateKeyToAccount(
    deriveTronPrivateKey(mnemonicOrPrivateKey),
  );
  const address41 = `41${account.address.slice(2).toLowerCase()}`;
  return { account, address: tronAddressFrom41Hex(address41), address41 };
}
