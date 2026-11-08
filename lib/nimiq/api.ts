import { type NextRequest, NextResponse } from "next/server";
import { type Address, isAddress } from "viem";
import { type ZodType, z } from "zod";
import { enforceRateLimit } from "@/lib/functions/rateLimitFunctions";
import { formatZodError } from "@/lib/validations/validation-helper";
import { AMOUNT_PATTERN } from "./amounts";
import { BankLookupError } from "./bank";
import { nimiqConfig } from "./config";
import { MAX_LISTED_ORDERS, ORDER_ID_PATTERN } from "./constants";
import { OrderError } from "./orders";
import { walletAddressError } from "./recipients";

export const addressField = z
  .string({ error: "Connect your wallet first." })
  .trim()
  .refine((value) => isAddress(value), "Connect a valid wallet.")
  .transform((value) => value as `0x${string}`);

/** A wallet to pay; refuses addresses that would burn the USDT. */
export const recipientField = z
  .string({ error: "Enter a wallet address." })
  .trim()
  .superRefine((value, ctx) => {
    const problem = walletAddressError(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  })
  .transform((value) => value as Address);

export const usdtAmountField = z
  .string({ error: "Enter an amount." })
  .trim()
  .regex(AMOUNT_PATTERN, "Enter a valid amount.");

export const accountNumberField = z
  .string({ error: "Enter the account number." })
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value.length === 10, "Account number must be 10 digits.");

export const orderIdField = z
  .string()
  .regex(ORDER_ID_PATTERN, "We couldn't find this order.");

/** Comma-separated order ids, de-duplicated. */
export const orderIdsField = z
  .string({ error: "Choose the orders to load." })
  .transform((value) => [
    ...new Set(
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ])
  .pipe(
    z
      .array(orderIdField)
      .min(1, "Choose the orders to load.")
      .max(MAX_LISTED_ORDERS, "Ask for fewer orders at a time."),
  );

type Guard = {
  /** Rate-limit bucket, prefixed with `nimiq_`. */
  action: string;
  perMinute: number;
  perDay?: number;
};

/** Flag check and per-IP limits; returns the response to send when the request must stop. */
export async function guardRequest(
  req: NextRequest,
  { action, perMinute, perDay }: Guard,
): Promise<NextResponse | null> {
  if (!nimiqConfig().enabled) return fail("Not found.", 404);
  const minute = await enforceRateLimit(req, {
    action: `nimiq_${action}`,
    limit: perMinute,
    windowSec: 60,
  });
  if (minute || !perDay) return minute;
  return enforceRateLimit(req, {
    action: `nimiq_${action}_day`,
    limit: perDay,
    windowSec: 24 * 60 * 60,
  });
}

export function ok(body: object): NextResponse {
  return NextResponse.json({ success: true, ...body });
}

export function fail(error: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error }, { status });
}

/** Validates input with zod; the first issue becomes the response. */
export function parse<T>(
  schema: ZodType<T>,
  input: unknown,
): { data: T; response?: never } | { data?: never; response: NextResponse } {
  const result = schema.safeParse(input);
  if (result.success) return { data: result.data };
  return { response: fail(formatZodError(result.error).error, 400) };
}

export async function readJson(req: NextRequest): Promise<unknown> {
  return req.json().catch(() => ({}));
}

/** Known refusals keep their status and copy; anything else is logged and kept vague. */
export function handleError(error: unknown, context: string): NextResponse {
  if (error instanceof OrderError) return fail(error.message, error.status);
  if (error instanceof BankLookupError) return fail(error.message, 400);
  console.error(`[nimiq] ${context} failed:`, error);
  return fail("Something went wrong. Please try again.", 500);
}
