import { HDKey } from "@scure/bip32";
import { privateKeyToAccount } from "viem/accounts";
// @ts-expect-error untyped bs58 module
import bs58 from "bs58";
import { sha256 } from "viem";

/**
 * Derives a Tron (TRC-20 / TRX) address and public key from BIP39 master seed.
 * Standard Tron path: m/44'/195'/0'/0/0
 * Address format: 0x41 prefix + 20-byte Keccak-256/Ethereum address bytes, Base58Check encoded (starts with 'T').
 */
export function deriveTronAddress(masterSeed: Uint8Array): {
  address: string;
  publicKey: string;
  path: string;
} {
  const path = "m/44'/195'/0'/0/0";
  const master = HDKey.fromMasterSeed(masterSeed);
  const child = master.derive(path);

  if (!child.privateKey || !child.publicKey) {
    throw new Error("Failed to derive Tron private key");
  }

  // Tron shares secp256k1 key generation with Ethereum.
  // The raw 20-byte address is derived from the uncompressed public key.
  const privateKeyHex = `0x${Buffer.from(child.privateKey).toString("hex")}` as `0x${string}`;
  const ethAccount = privateKeyToAccount(privateKeyHex);

  // Strip 0x prefix to get 20 raw bytes
  const rawAddressBytes = Buffer.from(ethAccount.address.slice(2), "hex");

  // Prepend Tron mainnet prefix (0x41)
  const tronPrefix = Buffer.from([0x41]);
  const payload = Buffer.concat([tronPrefix, rawAddressBytes]);

  // Compute double SHA256 checksum (first 4 bytes)
  const hash1 = sha256(payload);
  const hash2 = sha256(hash1);
  const checksum = Buffer.from(hash2.slice(2, 10), "hex"); // 4 bytes

  // Base58Check encode
  const tronAddress = (bs58 as any).encode(Buffer.concat([payload, checksum]));

  return {
    address: tronAddress,
    publicKey: Buffer.from(child.publicKey).toString("hex"),
    path,
  };
}
