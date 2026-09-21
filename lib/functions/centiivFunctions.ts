import { environment } from "@/lib/environment";
import {
  Horizon,
  Keypair,
  Asset,
  TransactionBuilder,
  Operation,
  Networks,
  BASE_FEE,
  Memo,
} from "@stellar/stellar-sdk";

const PUBLIC_KEY = environment.CENTIIV_PUBLIC_KEY || environment.CENTIIV_API_KEY;
const SECRET_KEY = environment.CENTIIV_SECRET_KEY || environment.CENTIIV_API_KEY;
const BASE_URL = environment.CENTIIV_BASE_URL || "https://api.centiiv.io";
const ENV = "live"; // Hardcoded to live per request

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "x-api-key": PUBLIC_KEY, // The API requires public keys for order creation & quotes
    "X-Environment": ENV,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const error: any = new Error(data.message || `Centiiv HTTP ${res.status}`);
    error.status = res.status;
    error.response = data;
    throw error;
  }

  return data as T;
}

export async function getCentiivQuote(params: {
  fromAsset: string;
  toAsset: string;
  amount: number;
  network?: string;
}) {
  return request<{
    rate: string;
    estimatedReceivableAmount: string;
    fees: string;
    totalToPay: string;
  }>("/public/quote", {
    method: "POST",
    body: JSON.stringify({
      fromAsset: params.fromAsset,
      toAsset: params.toAsset,
      amount: params.amount,
      network: params.network || "STELLAR",
    }),
  });
}

export async function createCentiivOfframp(params: {
  amount: number;
  refundAddress?: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  userId: string;
}) {
  return request<{
    id: string;
    status: string;
    type: string;
    amount: number;
    temporaryWallet: {
      publicAddress: string;
      network: string;
      expiresAt: string;
    };
  }>("/requests", {
    method: "POST",
    headers: {
      "idempotency-key": `IDEM_OFFRAMP_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    },
    body: JSON.stringify({
      fromAsset: "USDC",
      toAsset: "NGN",
      amount: params.amount,
      network: "STELLAR",
      refundAddress: params.refundAddress,
      beneficiary: {
        externalId: `user_${params.userId}`,
        destination: {
          type: "BANK",
          bankCode: params.bankCode,
          accountNumber: params.accountNumber,
          accountName: params.accountName,
        },
      },
    }),
  });
}

export async function createCentiivOnramp(params: {
  fiatAmount: number;
  destinationAddress: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  userId: string;
}) {
  return request<{
    id: string;
    status: string;
    type: string;
    temporaryWallet: {
      virtualAccountNumber: string;
      virtualAccountName: string;
      virtualBankName: string;
      virtualBankCode: string;
    };
  }>("/requests", {
    method: "POST",
    body: JSON.stringify({
      fromAsset: "NGN",
      toAsset: "USDC",
      amount: params.fiatAmount,
      network: "STELLAR",
      destinationAddress: params.destinationAddress,
      sender: {
        externalId: `user_${params.userId}`,
        fullName: params.senderName,
        email: params.senderEmail,
        phone: params.senderPhone,
      },
    }),
  });
}

export async function getCentiivRequestStatus(requestId: string) {
  return request<{
    id: string;
    status: "PENDING" | "PROCESSING" | "FULFILLED" | "FAILED" | "EXPIRED" | "REFUNDED";
    txHash?: string;
  }>(`/requests/${requestId}`, {
    method: "GET",
  });
}

export async function submitCentiivStellarPayment(params: {
  userSecretKey: string;
  destinationAddress: string;
  usdcAmount: string | number;
  memo?: string;
}) {
  const horizonUrl = "https://horizon.stellar.org";
  
  const server = new Horizon.Server(horizonUrl);
  const networkPassphrase = Networks.PUBLIC;
  const usdcIssuer = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

  const userKeypair = Keypair.fromSecret(params.userSecretKey);
  const sourceAccount = await server.loadAccount(userKeypair.publicKey());
  const usdcAsset = new Asset("USDC", usdcIssuer);

  let builder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: params.destinationAddress,
        asset: usdcAsset,
        amount: Number(params.usdcAmount).toFixed(7),
      }),
    )
    .setTimeout(60);

  if (params.memo) {
    builder = builder.addMemo(Memo.text(params.memo.slice(0, 28)));
  }

  const transaction = builder.build();
  transaction.sign(userKeypair);

  return await server.submitTransaction(transaction);
}
