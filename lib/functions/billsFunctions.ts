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
  transferToOfficialJumpaBlocAccount,
  refundFromOfficialJumpaBlocAccount,
} from "@/lib/functions/bellmonieFunctions";
import { generateId } from "@/lib/schema-ids";
import { hasActiveNgnAccount } from "@/lib/functions/ngnFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { formatOneLineError, isTimeoutError } from "@/lib/utils/api-best-practices";

/**
 * Formats a phone number to standard Nigerian 11-digit format (e.g. 08031234567).
 */
export function normalizePhoneNumber(phone: string): string {
  return normalizeNigerianPhone(phone);
}

/**
 * Categorizes a plan into Daily, Weekly, or Monthly period tabs for the UI.
 */
export function parsePlanPeriod(
  validity: string,
  productName: string,
): DataPlanPeriod {
  const val = `${validity || ""} ${productName || ""}`.toLowerCase();
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

export {
  transferToOfficialJumpaBlocAccount,
  refundFromOfficialJumpaBlocAccount,
  transferToOfficialJumpaBlocAccount as transferToOfficialJumpaWallet,
  refundFromOfficialJumpaBlocAccount as refundFromOfficialJumpaWallet,
};

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

  const billRef = generateId("bill");

  // 2. Transfer equivalent funds from user's Bloc MFB account to official Jumpa account
  const transfer = await transferToOfficialJumpaBlocAccount({
    userId: params.userId,
    amount: params.amount,
    narration: `Airtime: ${normalizedPhone} (${params.network || "VTU"})`,
    reference: billRef,
  });

  // 2. Create pre-flight record in MongoDB in PENDING status
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

  const formData = new URLSearchParams();
  formData.append("phone", normalizedPhone);
  formData.append("amount", params.amount.toString());
  formData.append("token", token);
  formData.append("ref_id", refId);

  try {
    const res = await fetch(`${environment.SMART_SMS_BASE_URL}/airtime/buy/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      signal: AbortSignal.timeout(30000), // allow up to 30 seconds
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      const rawErr = data?.comment || data?.error || `HTTP ${res.status}`;
      console.error(
        `[SmartSMS:Airtime] Rejected order ${refId} | Status: ${res.status} | Payload: ${formatOneLineError(data || rawErr)}`
      );
      await BillPayment.updateOne(
        { _id: order._id },
        { status: "FAILED", errorMessage: rawErr, rawProviderResponse: data },
      );
      throw new Error(rawErr || "Airtime recharge failed");
    }

    // 2. Mark BillPayment SUCCESS
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

    const carrier = (params.network || detectCarrierFromPhone(normalizedPhone) || "").toLowerCase();

    // 3. Record confirmed transaction in Transaction history
    await Transaction.create({
      userId: params.userId,
      type: "AIRTIME",
      status: "CONFIRMED",
      chain: "fiat",
      network: "mainnet",
      carrier,
      fromAddress: transfer.fromAccount,
      toAddress: normalizedPhone,
      amount: params.amount.toString(),
      token: "NGN",
      bankDetails: {
        bankName: environment.JUMPA_BANK_NAME,
        accountNumber: environment.JUMPA_ACCOUNT_NUMBER,
        accountName: environment.JUMPA_ACCOUNT_NAME,
        reference: billRef,
      },
      memo: `Airtime: ${normalizedPhone} (${carrier ? carrier.toUpperCase() : "VTU"})`,
      txHash: data.data?.id || refId,
      executedAt: new Date(),
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
  } catch (err: any) {
    const isTimeout = isTimeoutError(err);
    console.error(
      `[SmartSMS:Airtime] Order ${refId} failed | ${isTimeout ? "Timed out (15s)" : "Error"}: ${formatOneLineError(err)}`
    );
    await BillPayment.updateOne(
      { _id: order._id },
      { status: "FAILED", errorMessage: isTimeout ? "Timeout" : err.message },
    );
    // Refund debited amount from official Jumpa wallet back to user's Bloc MFB account on downstream failure
    await refundFromOfficialJumpaBlocAccount({
      userId: params.userId,
      amount: params.amount,
      narration: `Refund for failed airtime (${normalizedPhone})`,
      reference: `ref_${refId}`,
    }).catch((refundErr) =>
      console.error(`[SmartSMS] Refund failed for ${refId}: ${formatOneLineError(refundErr)}`)
    );
    throw err;
  }
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

  const billRef = generateId("bill");

  // 2. Transfer equivalent funds from user's Bloc MFB account to official Jumpa account
  const transfer = await transferToOfficialJumpaBlocAccount({
    userId: params.userId,
    amount: params.amount,
    narration: `Data: ${params.productName} (${normalizedPhone})`,
    reference: billRef,
  });

  // 2. Create pre-flight record in MongoDB in PENDING status
  const order = await BillPayment.create({
    _id: billRef,
    userId: params.userId,
    walletAddress: params.walletAddress,
    kind: "DATA",
    phone: normalizedPhone,
    network: params.network || "unknown",
    amount: params.amount,
    productName: params.productName,
    packageSize: params.packageSize,
    validity: params.validity,
    provider: "smartsmssolutions",
    status: "PENDING",
  });

  const refId = order._id;
  console.log(`Pre-flight order created: ${refId} (User: ${params.userId}, Phone: ${normalizedPhone}, Product: ${params.productName}, Amount: ₦${params.amount}, Network: ${params.network})`);

  const formData = new URLSearchParams();
  formData.append("phone", normalizedPhone);
  formData.append("product_name", params.productName);
  formData.append("token", token);
  formData.append("ref_id", refId);

  try {
    const res = await fetch(
      `${environment.SMART_SMS_BASE_URL}/internet_data/buy/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
        signal: AbortSignal.timeout(15000),
      },
    );

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      const rawErr = data?.comment || data?.error || `HTTP ${res.status}`;
      console.error(
        `[SmartSMS:Data] Rejected order ${refId} | Status: ${res.status} | Payload: ${formatOneLineError(data || rawErr)}`
      );
      await BillPayment.updateOne(
        { _id: order._id },
        { status: "FAILED", errorMessage: rawErr, rawProviderResponse: data },
      );
      throw new Error(rawErr || "Data purchase failed");
    }

    // 2. Mark BillPayment SUCCESS
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

    const carrier = (params.network || detectCarrierFromPhone(normalizedPhone) || "").toLowerCase();

    // 3. Record confirmed transaction in Transaction history
    await Transaction.create({
      userId: params.userId,
      type: "DATA",
      status: "CONFIRMED",
      chain: "fiat",
      network: "mainnet",
      carrier,
      fromAddress: transfer.fromAccount,
      toAddress: normalizedPhone,
      amount: params.amount.toString(),
      token: "NGN",
      bankDetails: {
        bankName: environment.JUMPA_BANK_NAME,
        accountNumber: environment.JUMPA_ACCOUNT_NUMBER,
        accountName: environment.JUMPA_ACCOUNT_NAME,
        reference: billRef,
      },
      memo: `Data: ${params.productName}${carrier ? ` (${carrier.toUpperCase()})` : ""}`,
      txHash: data.data?.id || refId,
      executedAt: new Date(),
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
  } catch (err: any) {
    const isTimeout = isTimeoutError(err);
    console.error(
      `[SmartSMS:Data] Order ${refId} failed | ${isTimeout ? "Timed out (15s)" : "Error"}: ${formatOneLineError(err)}`
    );
    await BillPayment.updateOne(
      { _id: order._id },
      { status: "FAILED", errorMessage: isTimeout ? "Timeout" : err.message },
    );
    // Refund debited amount from official Jumpa wallet back to user's Bloc MFB account on downstream failure
    await refundFromOfficialJumpaBlocAccount({
      userId: params.userId,
      amount: params.amount,
      narration: `Refund for failed data (${params.productName})`,
      reference: `ref_${refId}`,
    }).catch((refundErr) =>
      console.error(`[SmartSMS:Data] Refund failed for ${refId}: ${formatOneLineError(refundErr)}`)
    );
    throw err;
  }
}

