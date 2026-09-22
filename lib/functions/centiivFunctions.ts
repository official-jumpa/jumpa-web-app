import { environment } from "@/lib/environment";
import { generateId } from "@/lib/schema-ids";
import { sponsoredSubmit } from "@/lib/chains/stellar/sponsor";
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
const ENV = "live";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "x-api-key": PUBLIC_KEY,
    "X-Environment": ENV,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    let errorMsg = data.message || `Centiiv HTTP ${res.status}`;
    
    // Custom error parsing
    if (errorMsg.toLowerCase().includes("below the minimum transaction amount")) {
      const match = errorMsg.match(/minimum transaction amount of ([\d.]+)/i);
      if (match && match[1]) {
        errorMsg = `The minimum transfer amount is ${match[1]}.`;
      } else {
        errorMsg = "Amount is below the minimum allowed limit for this transfer.";
      }
    } else if (errorMsg.toLowerCase().includes("exceeds the maximum")) {
      const match = errorMsg.match(/maximum transaction amount of ([\d.]+)/i);
      if (match && match[1]) {
        errorMsg = `The maximum transfer amount is ${match[1]}.`;
      } else {
        errorMsg = "Amount exceeds the maximum allowed limit for this transfer.";
      }
    }

    const error: any = new Error(errorMsg);
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
      "idempotency-key": generateId("idem"),
    },
    body: JSON.stringify({
      fromAsset: "USDC",
      toAsset: "NGN",
      amount: params.amount,
      network: "STELLAR",
      description: "Jumpa", // Add jumpa name to the description while making offramps
      refundAddress: params.refundAddress,
      beneficiary: {
        externalId: params.userId,
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
        externalId: params.userId,
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
}): Promise<{ hash: string; status: "confirmed" | "pending" }> {
  const horizonUrl = "https://horizon.stellar.org";
  
  const server = new Horizon.Server(horizonUrl);
  const networkPassphrase = Networks.PUBLIC;
  // move this later to a centralised file
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

  const result = await sponsoredSubmit(transaction as any, "mainnet");

  if (result.status === "pending") {
    return { hash: result.txHash, status: "pending" };
  }

  return { hash: result.response.hash, status: "confirmed" };
}
