import { connectDB } from "@/lib/db";
import { environment } from "@/lib/environment";
import { BillPayment } from "@/models/BillPayment";
import { Transaction } from "@/models/Transaction";
import { normalizeNigerianPhone } from "@/lib/validations/bills.validation";
import {
  detectCarrierFromProductType,
  formatDataVolume,
  formatPlanValidity,
  type DataPlan,
  type DataPlanPeriod,
} from "@/lib/bills";

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
    console.error("API key is not configured");
    throw new Error("API key is not configured");
  }

  const url = `${environment.SMART_SMS_BASE_URL}/internet_data/products/?phone=${encodeURIComponent(
    normalized,
  )}&token=${encodeURIComponent(token)}`;

  console.log(`Fetching bill plans: ${normalized}`);

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`HTTP error (${res.status}): ${text}`);
    throw new Error(`Failed to fetch data plans (${res.status})`);
  }

  const json = await res.json();
  if (!json.success || !json.data?.products || !Array.isArray(json.data.products)) {
    const errMsg = json.comment || json.error || "No data products";
    console.error("Error", json);
    throw new Error(errMsg);
  }

  console.log(`Successfully retrieved ${json.data.products.length} plans for ${normalized}`);

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
        hot: p.percent && parseFloat(p.percent) < 0,
        productName: p.product_name,
        numericPrice: rawPrice,
      };
    })
    .sort((a: DataPlan, b: DataPlan) => (a.numericPrice || 0) - (b.numericPrice || 0));

  return {
    plans,
    detectedNetwork,
  };
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

  // 1. Create pre-flight record in MongoDB in PENDING status
  const order = await BillPayment.create({
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
    console.log(`Sending to SmartSMS: ref_id=${refId}, phone=${normalizedPhone}, amount=${params.amount}`);
    const res = await fetch(`${environment.SMART_SMS_BASE_URL}/airtime/buy/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const data = await res.json();
    console.log(`SmartSMS response (HTTP ${res.status}):`, data);

    if (!res.ok || !data.success) {
      const errMsg = data.comment || data.error || "Airtime recharge failed";
      console.error(`Provider rejected order ${refId}:`, errMsg, data);
      await BillPayment.updateOne(
        { _id: order._id },
        { status: "FAILED", errorMessage: errMsg, rawProviderResponse: data },
      );
      throw new Error(errMsg);
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

    // 3. Record confirmed transaction in Transaction history
    await Transaction.create({
      userId: params.userId,
      type: "AIRTIME",
      status: "CONFIRMED",
      chain: "base",
      network: "mainnet",
      fromAddress: params.walletAddress,
      toAddress: normalizedPhone,
      amount: params.amount.toString(),
      token: "NGN",
      memo: `Airtime: ${normalizedPhone} (${params.network?.toUpperCase() || "VTU"})`,
      txHash: data.data?.id || refId,
      executedAt: new Date(),
    });

    console.log(`Order ${refId} SUCCESSFUL. Provider ref: ${data.data?.id}, Balance after: ${data.data?.balance}`);

    return {
      success: true,
      type: "AIRTIME",
      orderId: order._id,
      reference: refId,
      providerData: data.data,
    };
  } catch (err: any) {
    console.error(`Order ${refId} failed:`, err?.message || err);
    await BillPayment.updateOne(
      { _id: order._id },
      { status: "FAILED", errorMessage: err.message },
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

  // 1. Create pre-flight record in MongoDB in PENDING status
  const order = await BillPayment.create({
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
    console.log(`Sending to SmartSMS: ref_id=${refId}, phone=${normalizedPhone}, product=${params.productName}`);
    const res = await fetch(
      `${environment.SMART_SMS_BASE_URL}/internet_data/buy/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      },
    );

    const data = await res.json();
    console.log(`SmartSMS response (HTTP ${res.status}):`, data);

    if (!res.ok || !data.success) {
      const errMsg = data.comment || data.error || "Data purchase failed";
      console.error(`Provider rejected order ${refId}:`, errMsg, data);
      await BillPayment.updateOne(
        { _id: order._id },
        { status: "FAILED", errorMessage: errMsg, rawProviderResponse: data },
      );
      throw new Error(errMsg);
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

    // 3. Record confirmed transaction in Transaction history
    await Transaction.create({
      userId: params.userId,
      type: "DATA",
      status: "CONFIRMED",
      chain: "base",
      network: "mainnet",
      fromAddress: params.walletAddress,
      toAddress: normalizedPhone,
      amount: params.amount.toString(),
      token: "NGN",
      memo: `Data: ${params.productName}`,
      txHash: data.data?.id || refId,
      executedAt: new Date(),
    });

    console.log(`Order ${refId} SUCCESSFUL. Provider ref: ${data.data?.id}, Balance after: ${data.data?.balance}`);

    return {
      success: true,
      type: "DATA",
      orderId: order._id,
      reference: refId,
      providerData: data.data,
    };
  } catch (err: any) {
    console.error(`Order ${refId} failed:`, err?.message || err);
    await BillPayment.updateOne(
      { _id: order._id },
      { status: "FAILED", errorMessage: err.message },
    );
    throw err;
  }
}

