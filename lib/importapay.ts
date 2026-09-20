import { environment } from "@/lib/environment";
import { generateId } from "@/lib/schema-ids";

/**
 * Executes an authenticated HTTP request against ImportaPay's live REST API with automatic 423 lock-retry handling.
 */
async function importaPayRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = environment.IMPORTAPAY_API_KEY;
  const baseUrl = (
    environment.IMPORTAPAY_BASE_URL ||
    "https://importa-pay-payments-x72y4.ondigitalocean.app"
  ).replace(/\/+$/, "");

  if (!apiKey) {
    throw new Error("API_KEY is missing");
  }

  const url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 423) {
    const waitTime = parseInt(response.headers.get("Retry-After") || "3", 10);
    console.warn(`[ImportaPay 423 Locked] Waiting ${waitTime}s to retry request to ${endpoint}...`);
    await new Promise((r) => setTimeout(r, waitTime * 1000));
    return importaPayRequest<T>(endpoint, options);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error: any = new Error(
      data?.message || `ImportaPay request failed with status ${response.status}`
    );
    error.status = response.status;
    error.response = data;
    throw error;
  }

  return data;
}

/**
 * Generates a 30-minute temporary Nigerian virtual bank account assigned to a customer name for an exact deposit amount.
 */
export async function createDynamicVirtualAccount(params: {
  accountName: string;
  amount: number;
  idempotencyKey?: string;
}) {
  const key = params.idempotencyKey || generateId("idem");
  const res = await importaPayRequest("/api/merchant/virtual-account/dynamic", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify({
      accountName: params.accountName,
      amount: params.amount,
    }),
  });
  return res.response;
}

/**
 * Retrieves the current payment and reconciliation status of an issued dynamic virtual account.
 */
export async function getDynamicVirtualAccount(accountId: string) {
  const res = await importaPayRequest(`/api/merchant/virtual-account/dynamic/${accountId}`, {
    method: "GET",
  });
  return res.response;
}

/**
 * Creates a static payment intent linked to a unique merchant reference for invoice or user tracking.
 */
export async function createStaticPaymentIntent(params: {
  merchantReference: string;
  amount?: number;
  expectedSenderBankName?: string;
  expectedSenderAccountNumber?: string;
  description?: string;
  idempotencyKey?: string;
}) {
  const key = params.idempotencyKey || generateId("idem");
  const res = await importaPayRequest("/api/merchant/payment-intents", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify({
      merchantReference: params.merchantReference,
      amount: params.amount || 0,
      expectedSenderBankName: params.expectedSenderBankName,
      expectedSenderAccountNumber: params.expectedSenderAccountNumber,
      description: params.description,
    }),
  });
  return res.response;
}

/**
 * Submits the customer's sending bank details to trigger manual or automated reconciliation of a payment intent.
 */
export async function confirmPaymentIntent(params: {
  paymentIntentId: string;
  senderAccountNumber: string;
  senderBankCode: string;
  idempotencyKey?: string;
}) {
  const key = params.idempotencyKey || generateId("idem");
  const res = await importaPayRequest("/api/merchant/payment-intents/confirm", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify({
      paymentIntentId: params.paymentIntentId,
      senderAccountNumber: params.senderAccountNumber,
      senderBankCode: params.senderBankCode,
    }),
  });
  return res.response;
}

/**
 * Fetches the complete list of supported Nigerian commercial and microfinance banks along with their unique bank codes.
 */
export async function listBanks() {
  const res = await importaPayRequest("/api/merchant/banks", { method: "GET" });
  return res.response;
}

/**
 * Verifies a destination Nigerian bank account number and resolves the account holder's registered legal name.
 */
export async function validateBankAccount(accountNumber: string, bankCode: string) {
  const res = await importaPayRequest("/api/merchant/banks/validate", {
    method: "POST",
    body: JSON.stringify({ accountNumber, bankCode }),
  });
  return res.response;
}

/**
 * Initiates an outbound bank transfer from the merchant balance and sends an authorization OTP to the merchant email.
 */
export async function initiateWithdrawal(params: {
  amount: number;
  bankCode: string;
  accountNumber: string;
  idempotencyKey?: string;
}) {
  const key = params.idempotencyKey || generateId("idem");
  const res = await importaPayRequest("/api/merchant/withdrawals", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify(params),
  });
  return res.response;
}

/**
 * Submits the received OTP to authorize and dispatch the outbound bank payout to the destination account.
 */
export async function verifyWithdrawal(params: {
  withdrawalId: string;
  otp: string;
  idempotencyKey?: string;
}) {
  const key = params.idempotencyKey || generateId("idem");
  const res = await importaPayRequest("/api/merchant/withdrawals/verify", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify(params),
  });
  return res.response;
}

export const importaPay = {
  createDynamicVirtualAccount,
  getDynamicVirtualAccount,
  createStaticPaymentIntent,
  confirmPaymentIntent,
  listBanks,
  validateBankAccount,
  initiateWithdrawal,
  verifyWithdrawal,
};
