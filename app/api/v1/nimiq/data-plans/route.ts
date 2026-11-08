import type { NextRequest } from "next/server";
import { z } from "zod";
import { guardRequest, handleError, ok, parse } from "@/lib/nimiq/api";
import { listDataPlans } from "@/lib/nimiq/bill-provider";
import { isValidNigerianPhone } from "@/lib/validations/bills.validation";

const schema = z.object({
  phone: z
    .string({ error: "Enter the phone number." })
    .trim()
    .refine(isValidNigerianPhone, "Enter a valid Nigerian phone number."),
});

/** The bundles SmartSMS sells for a number, in the shape the bills plan list reads. */
export async function GET(req: NextRequest) {
  const stop = await guardRequest(req, { action: "data_plans", perMinute: 20 });
  if (stop) return stop;

  const input = parse(schema, {
    phone: req.nextUrl.searchParams.get("phone") ?? undefined,
  });
  if (input.response) return input.response;

  try {
    return ok(await listDataPlans(input.data.phone));
  } catch (error) {
    return handleError(error, "data plans");
  }
}
