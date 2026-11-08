import { environment } from "@/lib/environment";
import { getCarrierDataPlans } from "@/lib/functions/billsFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import { normalizeNigerianPhone } from "@/lib/validations/bills.validation";

export type BillKind = "airtime" | "data";

/** What SmartSMS did with a purchase; only "rejected" is safe to refund. */
export type BillOutcome =
  | { status: "delivered"; reference?: string }
  | { status: "rejected"; reason: string }
  | { status: "unknown"; reason: string };

export type BillPurchase = {
  kind: BillKind;
  phone: string;
  amountNgn: number;
  /** Data only: the bundle's product name, as SmartSMS lists it. */
  productName?: string;
  /** Our reference, sent as `ref_id`. */
  reference: string;
};

const BUY_TIMEOUT_MS = 30_000;
const REFUSED = "The network didn't accept this purchase.";

/** Only an explicit refusal is final; anything unreadable might have been delivered. */
export function readProviderReply(
  httpStatus: number,
  body: unknown,
): BillOutcome {
  const reply = (body && typeof body === "object" ? body : {}) as {
    success?: unknown;
    comment?: unknown;
    error?: unknown;
    data?: { id?: unknown };
  };
  const ok = httpStatus >= 200 && httpStatus < 300;
  if (ok && reply.success === true) {
    const id = reply.data?.id;
    return {
      status: "delivered",
      reference: id === undefined || id === null ? undefined : String(id),
    };
  }
  if (httpStatus < 500 && reply.success === false) {
    const said = reply.comment || reply.error;
    return { status: "rejected", reason: said ? String(said) : REFUSED };
  }
  return { status: "unknown", reason: `HTTP ${httpStatus}` };
}

/** True when the SmartSMS key is configured. */
export function billProviderReady(): boolean {
  return Boolean(environment.SMART_SMS_API.trim());
}

/** Buys airtime or a data bundle on Jumpa's SmartSMS float. */
export async function buyFromProvider(
  purchase: BillPurchase,
): Promise<BillOutcome> {
  const token = environment.SMART_SMS_API.trim();
  // Nothing was sent, so this is a refusal the order can refund.
  if (!token) return { status: "rejected", reason: REFUSED };

  const form = new URLSearchParams({
    phone: normalizeNigerianPhone(purchase.phone),
    token,
    ref_id: purchase.reference,
  });
  if (purchase.kind === "airtime") {
    form.append("amount", String(purchase.amountNgn));
  } else {
    form.append("product_name", purchase.productName ?? "");
  }
  const path = purchase.kind === "airtime" ? "airtime" : "internet_data";

  try {
    const res = await fetch(`${environment.SMART_SMS_BASE_URL}/${path}/buy/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(BUY_TIMEOUT_MS),
    });
    const body = await res.json().catch(() => null);
    const outcome = readProviderReply(res.status, body);
    if (outcome.status !== "delivered") {
      console.error(
        `[nimiq] SmartSMS ${outcome.status} ${purchase.reference}: ${formatOneLineError(body)}`,
      );
    }
    return outcome;
  } catch (error) {
    console.error(
      `[nimiq] SmartSMS buy ${purchase.reference} unanswered: ${formatOneLineError(error)}`,
    );
    return { status: "unknown", reason: formatOneLineError(error) };
  }
}

/** The bundles SmartSMS sells for a number, cheapest first. */
export const listDataPlans = getCarrierDataPlans;
