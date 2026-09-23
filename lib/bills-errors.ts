export type BillKind = "airtime" | "data";

type Friendly = { title: string; message: string; retry: boolean };

const TITLE: Record<BillKind, string> = {
  airtime: "Recharge failed",
  data: "Subscription failed",
};
const NOUN: Record<BillKind, string> = {
  airtime: "airtime recharge",
  data: "data bundle",
};

/** Nothing has moved unless the provider confirmed it, and that is the first
 *  thing anyone wants to know after a failed payment. */
const SAFE = "Nothing has left your wallet.";

const BUCKETS: {
  match: RegExp;
  title?: (k: BillKind) => string;
  message: (k: BillKind) => string;
  retry: boolean;
}[] = [
  {
    // A gateway or a Next error page is HTML, so `res.json()` throws a parser
    // error. That is the provider being down, not something the user can read.
    match:
      /not valid json|unexpected token|<!doctype|bad gateway|gateway time|service unavailable|502|503|504/i,
    message: (k) =>
      `Our ${k} provider isn't responding right now. ${SAFE} Please try again in a few minutes.`,
    retry: true,
  },
  {
    match:
      /failed to fetch|load failed|network ?error|networkerror|offline|err_internet/i,
    title: () => "No connection",
    message: () =>
      `We couldn't reach Jumpa. ${SAFE} Check your internet and try again.`,
    retry: true,
  },
  {
    match: /timed? ?out|timeout|etimedout|aborted/i,
    message: (k) =>
      `The ${NOUN[k]} took too long to confirm. ${SAFE} Check your transaction history before trying again.`,
    retry: true,
  },
  {
    match: /insufficient|not enough|low balance|underfunded|exceeds .*balance/i,
    title: () => "Not enough balance",
    message: (k) =>
      `Your wallet doesn't have enough to cover this ${NOUN[k]}. ${SAFE} Add funds and try again.`,
    retry: false,
  },
  {
    match: /invalid .*(phone|number|msisdn)|phone.*invalid|number.*not valid/i,
    title: () => "Check the number",
    message: () =>
      `That phone number doesn't look right. ${SAFE} Check it and try again.`,
    retry: false,
  },
  {
    match: /network mismatch|wrong network|does not belong|carrier mismatch/i,
    title: () => "Wrong network",
    message: () =>
      `That number isn't on the network you picked. ${SAFE} Choose the right one and try again.`,
    retry: false,
  },
  {
    match:
      /plan .*(unavailable|not found|expired)|bundle .*(unavailable|not found)|out of stock/i,
    title: () => "Plan unavailable",
    message: () =>
      `That bundle isn't available right now. ${SAFE} Pick another plan.`,
    retry: false,
  },
  {
    match: /duplicate|already (processed|submitted)|same reference/i,
    title: () => "Already sent",
    message: (k) =>
      `This ${NOUN[k]} has already been submitted. Check your transaction history before trying again.`,
    retry: false,
  },
  {
    match: /unauthor|session|sign ?in|not logged/i,
    title: () => "Session expired",
    message: () => `Please sign in again. ${SAFE}`,
    retry: false,
  },
  {
    match: /naira account|create a naira/i,
    title: () => "Naira account required",
    message: () => "Please create a Naira account first",
    retry: false,
  },
];

/**
 * Turns whatever the route, the provider or `fetch` threw into something a
 * person can act on. The raw text goes to the console so teammates keep it.
 */
export function friendlyBillError(raw: unknown, kind: BillKind): Friendly {
  const text =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
        ? raw
        : typeof raw === "object" &&
            raw !== null &&
            "error" in raw &&
            typeof (raw as Record<string, unknown>).error === "string"
          ? String((raw as Record<string, unknown>).error)
          : "";
  if (text) console.error(`[bills:${kind}]`, text);

  for (const b of BUCKETS) {
    if (b.match.test(text)) {
      return {
        title: b.title?.(kind) ?? TITLE[kind],
        message: b.message(kind),
        retry: b.retry,
      };
    }
  }
  return {
    title: TITLE[kind],
    message:
      text &&
      !text.includes("<!DOCTYPE") &&
      !text.includes("<html") &&
      text.length < 200
        ? text
        : `We couldn't complete your ${NOUN[kind]}. ${SAFE} Please try again.`,
    retry: true,
  };
}

/**
 * Reads a response body that may not be JSON at all — a gateway or a Next
 * error page is HTML, and `res.json()` throws a parser error on it that used
 * to reach the user verbatim.
 */
export async function readBillResponse(res: Response) {
  const raw = await res.text().catch(() => "");
  try {
    return { data: JSON.parse(raw) as Record<string, unknown>, raw };
  } catch {
    return { data: null, raw: raw.slice(0, 200) || `HTTP ${res.status}` };
  }
}
