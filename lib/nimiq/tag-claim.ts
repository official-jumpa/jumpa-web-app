import { type Address, type Hex, verifyTypedData } from "viem";
import { POLYGON_CHAIN_ID } from "./constants";
import { serializeTypedData } from "./permit";

/** How long a signed claim stays good, and how far ahead a phone's clock may run. */
export const TAG_CLAIM_TTL_SECONDS = 10 * 60;
export const TAG_CLAIM_SKEW_SECONDS = 60;

const TAG_CLAIM_DOMAIN = {
  name: "Jumpa",
  version: "1",
  chainId: POLYGON_CHAIN_ID,
} as const;

const TAG_CLAIM_TYPES = {
  ClaimJumpaTag: [
    { name: "tag", type: "string" },
    { name: "wallet", type: "address" },
    { name: "issuedAt", type: "uint256" },
  ],
} as const;

export type TagClaim = { wallet: Address; handle: string; issuedAt: number };

const typedData = ({ wallet, handle, issuedAt }: TagClaim) => ({
  domain: TAG_CLAIM_DOMAIN,
  types: TAG_CLAIM_TYPES,
  primaryType: "ClaimJumpaTag" as const,
  message: { tag: `${handle}@jumpa`, wallet, issuedAt: BigInt(issuedAt) },
});

/** JSON for Nimiq Pay to sign, proving the wallet asked for this tag. */
export function serializeTagClaim(claim: TagClaim): string {
  return serializeTypedData(typedData(claim));
}

/** True only when `signature` is the wallet's own approval of exactly this claim. */
export async function verifyTagClaim(
  claim: TagClaim,
  signature: Hex,
): Promise<boolean> {
  try {
    return await verifyTypedData({
      ...typedData(claim),
      address: claim.wallet,
      signature,
    });
  } catch {
    return false;
  }
}
