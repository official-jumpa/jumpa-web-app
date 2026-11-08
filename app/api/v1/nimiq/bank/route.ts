import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  accountNumberField,
  guardRequest,
  handleError,
  ok,
  parse,
} from "@/lib/nimiq/api";
import { resolveNigerianAccount } from "@/lib/nimiq/bank";

const schema = z.object({
  accountNumber: accountNumberField,
  bank: z
    .string({ error: "Choose a bank." })
    .trim()
    .min(1, "Choose a bank.")
    .max(80),
});

/** Account name lookup for the cash-out form; tightly limited because it is public. */
export async function GET(req: NextRequest) {
  const stop = await guardRequest(req, {
    action: "bank",
    perMinute: 10,
    perDay: 100,
  });
  if (stop) return stop;

  const params = req.nextUrl.searchParams;
  const input = parse(schema, {
    accountNumber: params.get("accountNumber") ?? undefined,
    bank: params.get("bank") ?? undefined,
  });
  if (input.response) return input.response;

  try {
    const account = await resolveNigerianAccount(
      input.data.accountNumber,
      input.data.bank,
    );
    return ok({ accountName: account.accountName, bankName: account.bankName });
  } catch (error) {
    return handleError(error, "bank lookup");
  }
}
