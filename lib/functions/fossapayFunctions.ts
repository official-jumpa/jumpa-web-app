import { connectDB } from "@/lib/db";
import { NgnAccount, type INgnAccount } from "@/models/NgnAccount";
import { mapCountryCodeToName } from "@/lib/ngn-account";

const FOSSAPAY_BASE_URL = process.env.FOSSAPAY_BASE_URL;

function getApiKey(): string {
  const key = process.env.FOSSAPAY_API_KEY;
  if (!key) {
    console.error("[FossaPay] Missing API_KEY");
    throw new Error("Server configuration error: API_KEY is missing");
  }
  return key;
}

export { mapCountryCodeToName };

/**
 * Base HTTP helper for FossaPay API
 */
async function fossapayRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  const url = `${FOSSAPAY_BASE_URL}${endpoint}`;
  const method = options.method || "GET";

  console.log(`[FossaPay] API Request: ${method} ${url}`);

  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const duration = Date.now() - startTime;
    const responseText = await res.text();
    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!res.ok) {
      console.error(`[FossaPay] API Error [${res.status}] (${duration}ms):`, {
        url,
        method,
        status: res.status,
        response: data,
      });

      const message =
        data?.message ||
        data?.error ||
        `FossaPay request failed with status ${res.status}`;
      const err: any = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    console.log(`[FossaPay] API Success [${res.status}] (${duration}ms): ${method} ${url}`);
    return data as T;
  } catch (error: any) {
    if (error.status) throw error;
    console.error(`[FossaPay] Network / Unexpected Error on ${method} ${url}:`, error.message);
    throw error;
  }
}

export interface CreateCustomerPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  emailAddress: string;
  mobileNumber: string;
  dateOfBirth: string; // YYYY-MM-DD
  address: string;
  city: string;
  country: string;
}

export interface FossaPayCustomerResponse {
  status: string;
  statusCode: number;
  message: string;
  data: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    emailAddress: string;
    mobileNumber: string;
    dob: string;
    address: string;
    customerType: "individual";
    businessId?: string;
    createdAt?: string;
  };
}

export interface CreateWalletPayload {
  customerId: string;
  walletName: string;
  walletReference: string;
}

export interface FossaPayWalletResponse {
  status: string;
  statusCode: number;
  message: string;
  data: {
    walletId: string;
    bankName: string;
    bankCode: string;
    accountName: string;
    accountNumber: string;
  };
}

export interface FossaPayWalletDetailsResponse {
  status: string;
  statusCode: number;
  message: string;
  data: {
    id: string;
    walletName: string;
    currency: string;
    availableBalance: number;
    ledgerBalance: number;
    bankDetails?: {
      bankName: string;
      bankCode: string;
      accountName: string;
      accountNumber: string;
    };
  };
}

/**
 * 1. Creates an individual customer on FossaPay
 * Strictly constructs payload to avoid unknown properties that FossaPay rejects.
 */
export async function createFossapayCustomer(
  params: CreateCustomerPayload
): Promise<FossaPayCustomerResponse["data"]> {
  console.log("[FossaPay] Creating individual customer for email:", params.emailAddress);

  // FossaPay strictly rejects unknown fields. Build strictly required keys.
  const payload: Record<string, any> = {
    firstName: params.firstName,
    lastName: params.lastName,
    emailAddress: params.emailAddress,
    mobileNumber: params.mobileNumber,
    dateOfBirth: params.dateOfBirth,
    address: params.address,
    city: params.city,
    country: params.country,
    type: "individual",
  };

  if (params.middleName && params.middleName.trim()) {
    payload.middleName = params.middleName.trim();
  }

  console.log("[FossaPay] Customer payload prepared:", {
    ...payload,
    mobileNumber: payload.mobileNumber ? `${payload.mobileNumber.slice(0, 5)}***` : "",
  });

  const response = await fossapayRequest<FossaPayCustomerResponse>(
    "/api/v1/customers",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  if (!response?.data?.id) {
    console.error("[FossaPay] Invalid response format on customer create:", response);
    throw new Error("FossaPay customer creation did not return a valid customer ID");
  }

  console.log("[FossaPay] Customer created successfully with ID:", response.data.id);
  return response.data;
}

/**
 * 2. Creates a dedicated NGN fiat wallet for an existing customer
 */
export async function createFossapayNgnWallet(
  params: CreateWalletPayload
): Promise<FossaPayWalletResponse["data"]> {
  console.log("[FossaPay] Provisioning NGN wallet for customerId:", params.customerId, "ref:", params.walletReference);

  const payload = {
    customerId: params.customerId,
    walletName: params.walletName,
    walletReference: params.walletReference,
  };

  const response = await fossapayRequest<FossaPayWalletResponse>(
    "/api/v1/wallets/fiat/create",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  if (!response?.data?.accountNumber) {
    console.error("[FossaPay] Wallet create response missing account number:", response);
    throw new Error("FossaPay wallet creation did not return bank account details");
  }

  console.log("[FossaPay] NGN Wallet provisioned successfully:", {
    walletId: response.data.walletId,
    bankName: response.data.bankName,
    accountNumber: response.data.accountNumber,
  });

  return response.data;
}

/**
 * 3. Retrieves customer details by FossaPay customer UUID
 */
export async function getFossapayCustomer(
  customerId: string
): Promise<FossaPayCustomerResponse["data"]> {
  console.log("[FossaPay] Fetching customer details for ID:", customerId);
  const response = await fossapayRequest<FossaPayCustomerResponse>(
    `/api/v1/customers/${customerId}`
  );
  return response.data;
}

/**
 * 4. Retrieves wallet details and balance by FossaPay wallet UUID
 */
export async function getFossapayWallet(
  walletId: string
): Promise<FossaPayWalletDetailsResponse["data"]> {
  console.log("[FossaPay] Fetching wallet details for walletId:", walletId);
  const response = await fossapayRequest<FossaPayWalletDetailsResponse>(
    `/api/v1/wallets/fiat/${walletId}`
  );
  return response.data;
}

/**
 * 5. Lists transaction history for an NGN wallet
 */
export async function getFossapayWalletTransactions(
  walletId: string,
  opts?: { page?: number; limit?: number }
): Promise<any> {
  const page = opts?.page || 1;
  const limit = opts?.limit || 50;
  console.log(`[FossaPay] Fetching wallet transactions for ${walletId} (page ${page}, limit ${limit})`);
  return fossapayRequest(
    `/api/v1/wallets/fiat/${walletId}/transactions?page=${page}&limit=${limit}`
  );
}

// ── Local Database Operations (NgnAccount model)

/**
 * 6. Find a user's NGN account record
 */
export async function getNgnAccountByUserId(
  userId: string,
  provider = "fossapay"
): Promise<INgnAccount | null> {
  await connectDB();
  return NgnAccount.findOne({ userId, provider }).lean();
}

/**
 * 7. Create an NGN account record in MongoDB
 */
export async function createNgnAccountRecord(
  data: Partial<INgnAccount>
): Promise<INgnAccount> {
  await connectDB();
  console.log("[FossaPay DB] Creating NgnAccount record for userId:", data.userId);

  const account = await NgnAccount.create({
    currency: "NGN",
    provider: "fossapay",
    ...data,
  });
  return account.toObject();
}

/**
 * 8. Update NGN account with provisioned wallet and bank details
 */
export async function updateNgnAccountWallet(
  ngnAccountId: string,
  walletData: {
    providerAccountId: string;
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    providerReference: string;
    providerMetadata?: Record<string, any>;
  }
): Promise<INgnAccount | null> {
  await connectDB();
  console.log("[FossaPay DB] Updating NgnAccount with wallet info:", ngnAccountId, {
    bankName: walletData.bankName,
    accountNumber: walletData.accountNumber,
  });

  return NgnAccount.findByIdAndUpdate(
    ngnAccountId,
    {
      $set: {
        ...walletData,
        status: "active",
      },
    },
    { new: true }
  ).lean();
}

/**
 * 9. Find an NGN account by provider customer UUID (for webhooks or reconciliation)
 */
export async function getNgnAccountByCustomerId(
  customerId: string
): Promise<INgnAccount | null> {
  await connectDB();
  return NgnAccount.findOne({ providerCustomerId: customerId }).lean();
}

/**
 * 10. Find an NGN account by bank account number
 */
export async function getNgnAccountByAccountNumber(
  accountNumber: string
): Promise<INgnAccount | null> {
  await connectDB();
  return NgnAccount.findOne({ accountNumber }).lean();
}
