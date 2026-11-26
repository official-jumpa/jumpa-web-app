import { connectDB } from "@/lib/db";
import { environment } from "@/lib/environment";
import { BillPayment } from "@/models/BillPayment";
import { Transaction } from "@/models/Transaction";
import { normalizeNigerianPhone } from "@/lib/validations/bills.validation";
import {
  detectCarrierFromPhone,
  detectCarrierFromProductType,
  formatDataVolume,
  formatPlanValidity,
  type DataPlan,
  type DataPlanPeriod,
} from "@/lib/bills";
import {
  transferToOfficialJumpaWallet,
  refundFromOfficialJumpaWallet,
} from "@/lib/functions/aellaFunctions";
import { generateId } from "@/lib/schema-ids";
import { hasActiveNgnAccount } from "@/lib/functions/ngnFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { formatOneLineError, isTimeoutError } from "@/lib/utils/api-best-practices";
import {
  assertDailyTransactionLimit,
  convertToUsd,
} from "@/lib/functions/transactionLimitFunctions";

/**
 * Formats a phone number to standard Nigerian 11-digit format (e.g. 08031234567).
 */
export function normalizePhoneNumber(phone: string): string {
  return normalizeNigerianPhone(phone);
}

/**
 * Categorizes a plan into Daily, Weekly, Weekend, or Monthly period tabs for the UI.
 */
export function parsePlanPeriod(
  validity: string,
  productName: string,
): DataPlanPeriod {
  const val = `${validity || ""} ${productName || ""}`.toLowerCase();
  if (val.includes("weekend")) return "weekend";
  if (
    val.includes("1 day") ||
    val.includes("2 day") ||
    val.includes("1day") ||
    val.includes("2days") ||
    val.includes("2 days") ||
    val.includes("24 hrs") ||
    val.includes("24hrs") ||
    val.includes("daily")
  ) {
    return "daily";
  }
  if (
    val.includes("7 day") ||
    val.includes("14 day") ||
    val.includes("weekly") ||
    val.includes("1 week") ||
    val.includes("2 week")
  ) {
    return "weekly";
  }
  return "monthly";
}

/** MiFi and router bundles don't work on a phone SIM, so they're never listed. */
const DEVICE_ONLY_PLAN = /mifi|router/i;

/**
 * Plans we never list, by carrier and SmartSMS's exact product name (any case). Hiding a plan also
 * refuses its purchase before any money moves. To hide another, add its name here.
 */
const HIDDEN_DATA_PLANS: Record<string, readonly string[]> = {
  airtel: [
    // SmartSMS answers HTTP 500 every time.
    "AIRTEL DATA - 1GB - 2 DAYS",
    "1GB - AIRTEL DATA - 1 DAY",
    "300MB - AIRTEL DATA - 2 DAYS",
    // Reported not working.
    "AIRTEL DATA - 75MB (1 DAY)",
    "300MB DAILY PLAN (1 DAY)",
    "AIRTEL DATA - 1GB (7 DAYS)",
    // Same size, validity and price as a plan we keep.
    "AIRTEL DATA - 100 NAIRA - 100MB - 1 DAY",
    "3GB WEEKLY PLAN + YOUTUBE & SOCIAL PLATFORM (7 DAYS)",
    "1.5GB SOCIAL PLAN - 500 NAIRA",
  ],
};

const planKey = (name: string) => name.trim().toUpperCase();
const hiddenPlanKeys = new Map(
  Object.entries(HIDDEN_DATA_PLANS).map(([carrier, names]) => [
    carrier,
    new Set(names.map(planKey)),
  ]),
);

function isListedPlan(carrier: string | null, productName = ""): boolean {
  if (DEVICE_ONLY_PLAN.test(productName)) return false;
  const hidden = carrier ? hiddenPlanKeys.get(carrier) : undefined;
  return !hidden?.has(planKey(productName));
}

/**
 * Fetches real-time carrier data bundles from SmartSMSSolutions.
 */
export async function getCarrierDataPlans(phone: string): Promise<{
  plans: DataPlan[];
  detectedNetwork: string | null;
}> {
  const token = environment.SMART_SMS_API.trim();
  const normalized = normalizePhoneNumber(phone);

  if (!token) {
    console.error("[SmartSMS] Missing API key configuration");
    throw new Error("Data bundle service is currently unavailable");
  }

  const url = `${environment.SMART_SMS_BASE_URL}/internet_data/products/?phone=${encodeURIComponent(
    normalized,
  )}&token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[SmartSMS] Failed to fetch plans | Status: ${res.status} | Payload: ${formatOneLineError(text)}`
      );
      throw new Error("Unable to retrieve data plans at this time");
    }

    const json = await res.json();
    if (!json.success || !json.data?.products || !Array.isArray(json.data.products)) {
      const errMsg = json.comment || json.error || "No data products returned";
      console.error(
        `[SmartSMS] Provider returned no products | Payload: ${formatOneLineError(json)}`
      );
      throw new Error(errMsg);
    }

    const detectedNetwork = detectCarrierFromProductType(json.data?.product_type);

    const plans = json.data.products
      .filter((p: { product_name?: string }) =>
        isListedPlan(detectedNetwork, p.product_name),
      )
      .map((p: any, idx: number): DataPlan => {
        const rawPrice =
          parseFloat(String(p.value || "").replace(/[^0-9.]/g, "")) || 0;
        const period = parsePlanPeriod(p.validity, p.product_name);
        return {
          id: `smart_${idx}_${String(p.volume || "").replace(/\s/g, "")}`,
          size: formatDataVolume(p.volume, p.product_name),
          period,
          validity: formatPlanValidity(p.product_name, p.validity),
          price: `₦${rawPrice.toLocaleString()}`,
          productName: p.product_name,
          numericPrice: rawPrice,
        };
      })
      .sort((a: DataPlan, b: DataPlan) => (a.numericPrice || 0) - (b.numericPrice || 0));

    return {
      plans,
      detectedNetwork,
    };
  } catch (err: any) {
    if (isTimeoutError(err)) {
      console.error(`[SmartSMS] query timed out after 8000ms: ${formatOneLineError(err)}`);
      throw new Error("Carrier data query timed out. Please try again.");
    }
    throw err;
  }
}

/** A bill stopped before any money moved, so the user can safely try again. */
export class BillNotChargedError extends Error {}

/** SmartSMS's live price for a plan; the amount the app sends is never trusted. */
async function liveDataPlanPrice(
  phone: string,
  productName: string,
): Promise<number> {
  const { plans } = await getCarrierDataPlans(phone).catch((err) => {
    console.error(
      `[Data] Could not price ${productName}: ${formatOneLineError(err)}`,
    );
    throw new BillNotChargedError("Data provider service unavailable");
  });
  const price = plans.find(
    (plan) => plan.productName === productName,
  )?.numericPrice;
  if (!price) throw new BillNotChargedError("Data plan unavailable");
  return price;
}

export {
  transferToOfficialJumpaWallet,
  refundFromOfficialJumpaWallet,
};

/**
 * Safely refunds a confirmed failed bill payment back to the user's Naira account.
 * Atomically marks `refundedAt` on the BillPayment document to prevent double-refunding.
 */
export async function safeRefundBillPayment({
  billId,
  userId,
  amount,
  narration,
}: {
  billId: string;
  userId: string;
  amount: number;
  narration: string;
}): Promise<boolean> {
  await connectDB();
  const refundRef = `ref_${billId}`;

  // Atomic claim lock: only claim if refundedAt is null
  const claimed = await BillPayment.findOneAndUpdate(
    { _id: billId, refundedAt: null },
    {
      $set: {
        status: "FAILED",
        refundedAt: new Date(),
        refundedBy: "system",
        refundReference: refundRef,
      },
    },
    { returnDocument: "after" },
  );

  if (!claimed) {
    console.warn(
      `[Bills] Bill ${billId} was already refunded or does not exist. Skipping duplicate refund.`,
    );
    return false;
  }

  const success = await refundFromOfficialJumpaWallet({
    userId,
    amount,
    narration,
    reference: refundRef,
  });

  if (!success) {
    // If credit failed, release the lock so it can be safely retried
    await BillPayment.updateOne(
      { _id: billId, refundReference: refundRef },
      { $set: { refundedAt: null, refundReference: null } },
    );
    throw new Error(`Failed to credit refund back to user account for bill ${billId}`);
  }

  return true;
}

/**
 * Reconciles a stalled PENDING bill payment.
 */
export async function reconcilePendingBill(billId: string) {
  await connectDB();
  const bill = await BillPayment.findById(billId);
  if (!bill) throw new Error("Bill payment not found");
  return {
    id: bill._id,
    status: bill.status,
    refundedAt: bill.refundedAt,
    refundReference: bill.refundReference,
    isPending: bill.status === "PENDING",
  };
}

/** A bill's debit as it appears in the user's transaction history. */
interface BillDebit {
  userId: string;
  type: "AIRTIME" | "DATA";
  billRef: string;
  phone: string;
  carrier: string;
  amount: number;
  fromAccount: string;
  memo: string;
}

/** Logs the debit as Pending the moment money leaves, so refused or unconfirmed orders still show. */
async function recordBillDebit(debit: BillDebit): Promise<string | null> {
  try {
    const tx = await Transaction.create({
      userId: debit.userId,
      type: debit.type,
      status: "PENDING",
      chain: "fiat",
      network: "mainnet",
      carrier: debit.carrier,
      fromAddress: debit.fromAccount,
      toAddress: debit.phone,
      amount: debit.amount.toString(),
      amountInUsd: await convertToUsd(debit.amount, "NGN"),
      token: "NGN",
      bankDetails: {
        bankName: environment.JUMPA_BANK_NAME,
        accountNumber: environment.JUMPA_ACCOUNT_NUMBER,
        accountName: environment.JUMPA_ACCOUNT_NAME,
        reference: debit.billRef,
      },
      memo: debit.memo,
    });
    return tx._id;
  } catch (err) {
    console.error(
      `[Bills] Could not record the debit for ${debit.billRef}:`,
      err,
    );
    return null;
  }
}

/** Moves a bill's history row out of Pending once the provider answers; timeouts stay Pending. */
async function settleBillDebit(
  historyId: string | null,
  outcome: { status: "FAILED" } | { status: "CONFIRMED"; txHash: string },
): Promise<void> {
  if (!historyId) return;
  const update =
    outcome.status === "CONFIRMED"
      ? { ...outcome, executedAt: new Date() }
      : outcome;
  try {
    await Transaction.updateOne({ _id: historyId }, { $set: update });
  } catch (err) {
    console.error(`[Bills] Could not update history row ${historyId}:`, err);
  }
}

/**
 * Executes an airtime purchase.
 * Pre-creates a BillPayment record in PENDING state, passes its _id as ref_id, and updates status upon completion.
 */
export async function purchaseAirtime(params: {
  phone: string;
  amount: number;
  network?: string;
  userId: string;
  walletAddress: string;
}) {
  await connectDB();
  const token = environment.SMART_SMS_API.trim();
  const normalizedPhone = normalizePhoneNumber(params.phone);

  if (!token) {
    console.error("Missing API key");
    throw new Error("API key not configured");
  }

  // 1. Verify user has an active Naira account
  const hasAccount = await hasActiveNgnAccount(params.userId);
  if (!hasAccount) {
    throw new Error("Please create a Naira account first");
  }

  // 2. Enforce daily transaction limits before debiting user's account
  await assertDailyTransactionLimit({
    userId: params.userId,
    amount: params.amount,
    tokenOrCurrency: "NGN",
  });

  const billRef = generateId("bill");

  // Create the idempotency/reconciliation record before any provider or wallet call.
  const order = await BillPayment.create({
    _id: billRef,
    userId: params.userId,
    walletAddress: params.walletAddress,
    kind: "AIRTIME",
    phone: normalizedPhone,
    network: params.network || "unknown",
    amount: params.amount,
    provider: "smartsmssolutions",
    status: "PENDING",
  });

  const refId = order._id;
  console.log(`Pre-flight order created: ${refId} (User: ${params.userId}, Phone: ${normalizedPhone}, Amount: ₦${params.amount}, Network: ${params.network})`);

  // Transfer equivalent funds from user's NGN wallet to official Jumpa account.
  // A failure remains PENDING
  let transfer: Awaited<ReturnType<typeof transferToOfficialJumpaWallet>>;
  try {
    transfer = await transferToOfficialJumpaWallet({
      userId: params.userId,
      amount: params.amount,
      narration: `Airtime: ${normalizedPhone} (${params.network || "VTU"})`,
      reference: billRef,
    });
  } catch (err: any) {
    await BillPayment.updateOne({ _id: order._id }, { $set: { errorMessage: err?.message || "Funding transfer pending verification" } });
    throw err;
  }

  const carrier = (
    params.network ||
    detectCarrierFromPhone(normalizedPhone) ||
    ""
  ).toLowerCase();
  const historyId = await recordBillDebit({
    userId: params.userId,
    type: "AIRTIME",
    billRef,
    phone: normalizedPhone,
    carrier,
    amount: params.amount,
    fromAccount: transfer.fromAccount,
    memo: `Airtime: ${normalizedPhone} (${carrier ? carrier.toUpperCase() : "VTU"})`,
  });

  const formData = new URLSearchParams();
  formData.append("phone", normalizedPhone);
  formData.append("amount", params.amount.toString());
  formData.append("token", token);
  formData.append("ref_id", refId);

  // 4. Downstream Provider Call (Isolated provider boundary)
  let res: Response;
  let data: any = null;

  try {
    res = await fetch(`${environment.SMART_SMS_BASE_URL}/airtime/buy/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });
    data = await res.json().catch(() => null);
  } catch (fetchErr: any) {
    const isTimeout = isTimeoutError(fetchErr);
    console.error(
      `[Airtime] Order ${refId} network exception | ${isTimeout ? "Timed out (20s)" : "Error"}: ${formatOneLineError(fetchErr)}`,
    );
    // Tier 3: Ambiguous Failure / Timeout -> DO NOT REFUND!
    // Leave status in PENDING, record error message for user and support audit
    await BillPayment.updateOne(
      { _id: order._id },
      {
        errorMessage: isTimeout
          ? "Response timed out - pending verification"
          : (fetchErr.message || "Network error"),
      },
    );
    throw fetchErr;
  }

  // 5. Tier 2: Confirmed Provider Rejection
  if (!res.ok || !data?.success) {
    const rawErr = data?.comment || data?.error || `HTTP ${res.status}`;
    console.error(
      `[Airtime] Rejected order ${refId} | Status: ${res.status} | Payload: ${formatOneLineError(data || rawErr)}`,
    );
    await BillPayment.updateOne(
      { _id: order._id },
      { status: "FAILED", errorMessage: rawErr, rawProviderResponse: data },
    );
    console.error(
      `[Bills:Airtime] Order ${refId} failed at provider: ${formatOneLineError(rawErr)}. Automatic refund disabled - marked FAILED for manual review.`,
    );
    await settleBillDebit(historyId, { status: "FAILED" });
    throw new Error(rawErr || "Airtime recharge failed");
  }

  // 6. Tier 1: Confirmed Provider Success
  await BillPayment.updateOne(
    { _id: order._id },
    {
      status: "SUCCESS",
      providerReference: data.data?.id,
      providerDescription: data.data?.description,
      providerBalanceAfter: data.data?.balance,
      rawProviderResponse: data,
    },
  );

  // Post-success steps must never throw: the airtime is already delivered
  await settleBillDebit(historyId, {
    status: "CONFIRMED",
    txHash: data.data?.id || refId,
  });
  logUserActivity({
    userId: params.userId,
    action: "AIRTIME_PURCHASED",
    details: {
      orderId: order._id,
      phone: normalizedPhone,
      amount: params.amount,
      carrier,
      refId,
    },
  }).catch(() => {});

  // Minimal client-safe return: only success and reference for receipt
  return {
    success: true,
    reference: refId,
  };
}

/**
 * Executes an internet data purchase.
 * Pre-creates a BillPayment record in PENDING state, passes its _id as ref_id,
 * and updates status upon completion.
 */
export async function purchaseData(params: {
  phone: string;
  productName: string;
  amount: number;
  packageSize?: string;
  validity?: string;
  network?: string;
  userId: string;
  walletAddress: string;
}) {
  await connectDB();
  const token = environment.SMART_SMS_API.trim();
  const normalizedPhone = normalizePhoneNumber(params.phone);

  if (!token) {
    console.error("Missing API key");
    throw new Error("API key is not configured");
  }

  // 1. Verify user has an active Naira account
  const hasAccount = await hasActiveNgnAccount(params.userId);
  if (!hasAccount) {
    throw new Error("Please create a Naira account first");
  }

  // Charge the live price; a stale or edited amount stops here, before any debit
  const amount = await liveDataPlanPrice(normalizedPhone, params.productName);
  if (Math.abs(amount - params.amount) > 0.005) {
    throw new BillNotChargedError("Data plan unavailable at that price");
  }

  // 2. Enforce daily transaction limits before debiting user's account
  await assertDailyTransactionLimit({
    userId: params.userId,
    amount,
    tokenOrCurrency: "NGN",
  });

  const billRef = generateId("bill");

  // Create the idempotency/reconciliation record before any provider or wallet call.
  const order = await BillPayment.create({
    _id: billRef,
    userId: params.userId,
    walletAddress: params.walletAddress,
    kind: "DATA",
    phone: normalizedPhone,
    network: params.network || "unknown",
    amount,
    productName: params.productName,
    packageSize: params.packageSize,
    validity: params.validity,
    provider: "smartsmssolutions",
    status: "PENDING",
  });

  const refId = order._id;
  console.log(`Pre-flight order created: ${refId} (User: ${params.userId}, Phone: ${normalizedPhone}, Product: ${params.productName}, Amount: ₦${amount}, Network: ${params.network})`);

  let transfer: Awaited<ReturnType<typeof transferToOfficialJumpaWallet>>;
  try {
    transfer = await transferToOfficialJumpaWallet({
      userId: params.userId,
      amount,
      narration: `Data: ${params.productName} (${normalizedPhone})`,
      reference: billRef,
    });
  } catch (err: any) {
    await BillPayment.updateOne({ _id: order._id }, { $set: { errorMessage: err?.message || "Funding transfer pending verification" } });
    throw err;
  }

  const carrier = (
    params.network ||
    detectCarrierFromPhone(normalizedPhone) ||
    ""
  ).toLowerCase();
  const historyId = await recordBillDebit({
    userId: params.userId,
    type: "DATA",
    billRef,
    phone: normalizedPhone,
    carrier,
    amount,
    fromAccount: transfer.fromAccount,
    memo: `Data: ${params.productName}${carrier ? ` (${carrier.toUpperCase()})` : ""}`,
  });

  const formData = new URLSearchParams();
  formData.append("phone", normalizedPhone);
  formData.append("product_name", params.productName);
  formData.append("token", token);
  formData.append("ref_id", refId);

  // 4. Downstream Provider Call (Isolated provider boundary)
  let res: Response;
  let data: any = null;

  try {
    res = await fetch(
      `${environment.SMART_SMS_BASE_URL}/internet_data/buy/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
        signal: AbortSignal.timeout(20000), // 20s timeout
      },
    );
    data = await res.json().catch(() => null);
  } catch (fetchErr: any) {
    const isTimeout = isTimeoutError(fetchErr);
    console.error(
      `[Data] Order ${refId} network exception | ${isTimeout ? "Timed out (20s)" : "Error"}: ${formatOneLineError(fetchErr)}`,
    );
    // Tier 3: Ambiguous Failure / Timeout -> DO NOT REFUND!
    // Leave status in PENDING, record error message for user and support audit
    await BillPayment.updateOne(
      { _id: order._id },
      {
        errorMessage: isTimeout
          ? "Response timed out - pending verification"
          : (fetchErr.message || "Network error"),
      },
    );
    throw fetchErr;
  }

  // 5. Tier 2: Confirmed Provider Rejection
  if (!res.ok || !data?.success) {
    const rawErr = data?.comment || data?.error || `HTTP ${res.status}`;
    console.error(
      `[Data] Order ${refId} | Status: ${res.status} | Payload: ${formatOneLineError(data || rawErr)}`,
    );
    await BillPayment.updateOne(
      { _id: order._id },
      { status: "FAILED", errorMessage: rawErr, rawProviderResponse: data },
    );
    console.error(
      `[Bills:Data] Order ${refId} failed at provider: ${formatOneLineError(rawErr)}. Automatic refund disabled - marked FAILED for manual review.`,
    );
    await settleBillDebit(historyId, { status: "FAILED" });
    throw new Error(rawErr || "Data purchase failed");
  }

  // 6. Tier 1: Confirmed Provider Success
  await BillPayment.updateOne(
    { _id: order._id },
    {
      status: "SUCCESS",
      providerReference: data.data?.id,
      providerDescription: data.data?.description,
      providerBalanceAfter: data.data?.balance,
      rawProviderResponse: data,
    },
  );

  // Post-success steps must never throw: the data is already delivered
  await settleBillDebit(historyId, {
    status: "CONFIRMED",
    txHash: data.data?.id || refId,
  });
  logUserActivity({
    userId: params.userId,
    action: "DATA_PURCHASED",
    details: {
      orderId: order._id,
      phone: normalizedPhone,
      productName: params.productName,
      packageSize: params.packageSize,
      validity: params.validity,
      amount,
      carrier,
      refId,
    },
  }).catch(() => {});

  // Minimal client-safe return: only success and reference for receipt
  return {
    success: true,
    reference: refId,
  };
}
