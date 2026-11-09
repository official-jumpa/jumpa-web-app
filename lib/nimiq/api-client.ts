import type { ChatAnswer, ChatTurn } from "./chat-agent";
import type { PublicOrder, RampDirection } from "./order-status";
import type {
  AccountSummary,
  BillInput,
  CashOutInput,
  Quote,
  SendInput,
  TopUpInput,
} from "./orders";

const BASE = "/api/v1/nimiq";
const OFFLINE = "You're offline. Check your connection and try again.";
const UNKNOWN = "Something went wrong. Please try again.";

/** A refusal from the mini-app API; `message` is safe to show the user. */
export class NimiqApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "NimiqApiError";
  }
}

type Options = { signal?: AbortSignal };

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { cache: "no-store", ...init });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new NimiqApiError(OFFLINE, 0);
  }
  const body = (await res.json().catch(() => null)) as
    | ({ success?: boolean; error?: string } & T)
    | null;
  if (!res.ok || !body?.success) {
    throw new NimiqApiError(body?.error || UNKNOWN, res.status);
  }
  return body;
}

const post = (body: object): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** Typed calls to `/api/v1/nimiq/*` for the mini app's screens. */
export const nimiqApi = {
  account: (address: string, { signal }: Options = {}) =>
    call<AccountSummary>(`/account?${new URLSearchParams({ address })}`, {
      signal,
    }),

  quote: (direction: RampDirection, amount: number, { signal }: Options = {}) =>
    call<Quote>("/quote", { ...post({ direction, amount }), signal }),

  lookUpBank: (accountNumber: string, bank: string, { signal }: Options = {}) =>
    call<{ accountName: string; bankName: string }>(
      `/bank?${new URLSearchParams({ accountNumber, bank })}`,
      { signal },
    ),

  createCashOut: (input: CashOutInput) =>
    call<{ order: PublicOrder; typedData: string }>("/cash-out", post(input)),

  submitCashOut: (orderId: string, signature: string) =>
    call<{ order: PublicOrder }>(
      `/cash-out/${orderId}/submit`,
      post({ signature }),
    ),

  chat: (address: string, messages: ChatTurn[]) =>
    call<ChatAnswer>("/chat", post({ address, messages })),

  createBill: (input: BillInput) =>
    call<{ order: PublicOrder; typedData: string }>("/bills", post(input)),

  submitBill: (orderId: string, signature: string) =>
    call<{ order: PublicOrder }>(
      `/bills/${orderId}/submit`,
      post({ signature }),
    ),

  createSend: (input: SendInput) =>
    call<{ order: PublicOrder; typedData: string }>("/send", post(input)),

  submitSend: (orderId: string, signature: string) =>
    call<{ order: PublicOrder }>(
      `/send/${orderId}/submit`,
      post({ signature }),
    ),

  createTopUp: (input: TopUpInput) =>
    call<{ order: PublicOrder }>("/top-up", post(input)),

  order: (orderId: string, { signal }: Options = {}) =>
    call<{ order: PublicOrder }>(`/orders/${orderId}`, { signal }),

  /** Several orders in one call, newest first; unknown ids are left out. */
  orders: (orderIds: string[], { signal }: Options = {}) =>
    call<{ orders: PublicOrder[] }>(
      `/orders?${new URLSearchParams({ ids: orderIds.join(",") })}`,
      { signal },
    ),
};
