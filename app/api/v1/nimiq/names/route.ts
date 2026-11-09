import type { NextRequest } from "next/server";
import type { Hex } from "viem";
import { z } from "zod";
import {
  addressField,
  guardRequest,
  handleError,
  ok,
  parse,
  readJson,
} from "@/lib/nimiq/api";
import { SIGNATURE_PATTERN } from "@/lib/nimiq/constants";
import { claimTag, tagOfWallet } from "@/lib/nimiq/names";

const walletSchema = z.object({ address: addressField });

const claimSchema = z.object({
  address: addressField,
  tag: z.string({ error: "Enter a Jumpa tag." }).trim().max(40),
  issuedAt: z.number().int().positive(),
  signature: z
    .string({ error: "Approve the tag in Nimiq Pay first." })
    .regex(SIGNATURE_PATTERN, "That signature isn't valid.")
    .transform((value) => value as Hex),
});

/** The Jumpa tag a wallet claimed, or null. */
export async function GET(req: NextRequest) {
  const stop = await guardRequest(req, { action: "name", perMinute: 30 });
  if (stop) return stop;

  const input = parse(walletSchema, {
    address: req.nextUrl.searchParams.get("address") ?? undefined,
  });
  if (input.response) return input.response;

  try {
    return ok({ tag: await tagOfWallet(input.data.address) });
  } catch (error) {
    return handleError(error, "name read");
  }
}

/** Claims a Jumpa tag for the wallet that signed for it. */
export async function POST(req: NextRequest) {
  const stop = await guardRequest(req, {
    action: "name_claim",
    perMinute: 5,
    perDay: 20,
  });
  if (stop) return stop;

  const input = parse(claimSchema, await readJson(req));
  if (input.response) return input.response;

  try {
    return ok(await claimTag(input.data));
  } catch (error) {
    return handleError(error, "name claim");
  }
}
