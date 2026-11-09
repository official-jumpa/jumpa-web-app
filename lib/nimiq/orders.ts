import {
  type Address,
  getAddress,
  type Hex,
  isAddress,
  isAddressEqual,
  parseUnits,
} from "viem";
import {
  AIRTIME_MAX,
  AIRTIME_MIN,
  type DataPlan,
  getNetwork,
} from "@/lib/bills";
import { connectDB } from "@/lib/db";
import { generateId } from "@/lib/schema-ids";
import {
  normalizeSwitchAsset,
  type OffRampResponse,
  type OnRampResponse,
  type QuoteResponse,
  SwitchService,
} from "@/lib/switch";
import {
  isValidNigerianPhone,
  normalizeNigerianPhone,
} from "@/lib/validations/bills.validation";
import { type INimiqOrder, NimiqOrder } from "@/models/NimiqOrder";
import { fromUnits, nairaPerUsdt, toUnits } from "./amounts";
import {
  BankLookupError,
  type ResolvedAccount,
  resolveNigerianAccount,
} from "./bank";
import {
  type BillOutcome,
  type BillPurchase,
  billProviderReady,
  buyFromProvider,
  listDataPlans,
} from "./bill-provider";
import { type NimiqConfig, nimiqConfig } from "./config";
import {
  BILL_MIN_USD,
  BILL_RATE_PROBE_USDT,
  MAX_LISTED_ORDERS,
  PERMIT_TTL_SECONDS,
  POLYGON_EXPLORER_TX,
  POLYGON_USDT,
  SIGN_MARGIN_SECONDS,
  SWITCH_ASSET,
  TOP_UP_WINDOW_SECONDS,
} from "./constants";
import { checkAmountLimits } from "./limits";
import {
  type BillDirection,
  COUNTED_STATUSES,
  FINAL_STATUSES,
  fromSwitchStatus,
  isBillDirection,
  type NimiqDirection,
  type PublicOrder,
  type RampDirection,
} from "./order-status";
import {
  buildPermitTypedData,
  isSignable,
  type PermitMessage,
  serializeTypedData,
  verifyPermitSignature,
} from "./permit";
import {
  readPermitNonce,
  readReceiptStatus,
  readRelayerGas,
  readRelayerNonce,
  readUsdtBalance,
  relayerAccount,
} from "./polygon";
import { walletAddressError } from "./recipients";
import {
  MIN_RELAYER_GAS,
  RELAYER_PAUSED,
  type RefundInput,
  type RefundResult,
  RelayError,
  RelayerUnavailableError,
  type RelayInput,
  type RelayResult,
  relayPermitTransfer,
  relayRefund,
} from "./relayer";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Status polls inside this window reuse the stored state instead of asking Switch again. */
const CHECK_INTERVAL_MS = 4_000;
/** A relay that never recorded a transfer by now died before sending anything. */
const RELAY_ABANDONED_MS = 10 * 60 * 1000;

const COPY = {
  notFound: "We couldn't find this order.",
  expired: (what: string) => `This ${what} expired. Start again.`,
  submitted: (what: string) => `This ${what} was already submitted.`,
  badSignature: (what: string) => `That signature doesn't match this ${what}.`,
  lowBalance: (what: string) =>
    `Your USDT balance is lower than this ${what}. No money has moved.`,
  amountChanged: "The amount changed while we set this up. Please try again.",
  partnerError:
    "Our payout partner sent back something unexpected. Please try again.",
  nothingMoved: "The transfer was never sent. No money has moved.",
  reverted: "The transfer failed on Polygon. No money has moved.",
  cashOutFailed:
    "The bank payout didn't go through. Your USDT is being returned to your wallet; contact support if it hasn't arrived within an hour.",
  topUpFailed:
    "This top-up didn't go through. If you sent Naira, contact support with the reference.",
  billsUnavailable:
    "Airtime and data are unavailable right now. Please try again later.",
  badPhone: "Enter a valid Nigerian phone number (e.g. 08031234567).",
  badNetwork: "Choose the network for this number.",
  airtimeRange: `Airtime must be a whole amount from ₦${AIRTIME_MIN} to ₦${AIRTIME_MAX.toLocaleString("en-NG")}.`,
  planGone: "That bundle isn't available any more. Pick another one.",
  noRate: "We couldn't get a rate. Please try again.",
  billRefunding:
    "The network didn't accept this purchase. Your USDT is on its way back to your wallet.",
  billRefunded:
    "The network didn't accept this purchase, so your USDT was sent back to your wallet.",
  ownWallet: "That's the wallet you're sending from.",
} as const;

/** How copy names an order the user is paying with a permit. */
const permitNoun = (direction: NimiqDirection) =>
  direction === "cash_out"
    ? "cash-out"
    : direction === "send"
      ? "transfer"
      : "purchase";

/** A refusal with the HTTP status the route should answer; the message is fit to show. */
export class OrderError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OrderError";
    this.status = status;
  }
}

export type SwitchApi = {
  offrampQuote(usdt: number): Promise<QuoteResponse>;
  onrampQuote(ngn: number): Promise<QuoteResponse>;
  initiateOfframp(
    usdt: number,
    beneficiary: {
      holder_name: string;
      account_number: string;
      bank_code: string;
    },
    refundAddress: string,
  ): Promise<OffRampResponse>;
  initiateOnramp(ngn: number, walletAddress: string): Promise<OnRampResponse>;
  status(
    reference: string,
  ): Promise<{ success?: boolean; data?: { status?: string } } | null>;
  confirm(reference: string, hash: string): Promise<unknown>;
};

export type ChainReads = {
  relayerAddress(): Address | null;
  readRelayerGas(): Promise<bigint>;
  readUsdtBalance(owner: Address): Promise<bigint>;
  readPermitNonce(owner: Address): Promise<bigint>;
  readReceiptStatus(
    hash: Hex,
  ): Promise<"success" | "reverted" | "missing" | null>;
  /** Mined transaction count of the relayer, or null when unknown. */
  readRelayerNonce(): Promise<number | null>;
};

/** Everything the service touches outside its own collection; tests pass stubs. */
export type OrderDeps = {
  now(): number;
  connect(): Promise<unknown>;
  config(): NimiqConfig;
  resolveAccount(accountNumber: string, bank: string): Promise<ResolvedAccount>;
  switchApi: SwitchApi;
  chain: ChainReads;
  relay(input: RelayInput): Promise<RelayResult>;
  bills: BillsApi;
  /** Sends USDT from the relayer back to a wallet. */
  refund(input: RefundInput): Promise<RefundResult>;
};

export type BillsApi = {
  ready(): boolean;
  plans(phone: string): Promise<DataPlan[]>;
  buy(purchase: BillPurchase): Promise<BillOutcome>;
};

const MINI_APP = { allowMiniAppAssets: true } as const;

export const defaultDeps: OrderDeps = {
  now: Date.now,
  connect: connectDB,
  config: nimiqConfig,
  resolveAccount: resolveNigerianAccount,
  switchApi: {
    offrampQuote: (usdt) =>
      SwitchService.getOfframpQuote(usdt, SWITCH_ASSET, MINI_APP),
    onrampQuote: (ngn) => SwitchService.getQuote(ngn, SWITCH_ASSET, MINI_APP),
    initiateOfframp: (usdt, beneficiary, refundAddress) =>
      SwitchService.initiateOfframp(usdt, SWITCH_ASSET, beneficiary, {
        ...MINI_APP,
        refundAddress,
      }),
    initiateOnramp: (ngn, walletAddress) =>
      SwitchService.initiateOnRamp(ngn, SWITCH_ASSET, walletAddress, MINI_APP),
    status: (reference) => SwitchService.getTransactionStatus(reference),
    confirm: (reference, hash) => SwitchService.confirmPayment(reference, hash),
  },
  chain: {
    relayerAddress: () => relayerAccount()?.address ?? null,
    readRelayerGas,
    readUsdtBalance,
    readPermitNonce,
    readReceiptStatus,
    readRelayerNonce,
  },
  relay: relayPermitTransfer,
  bills: {
    ready: billProviderReady,
    plans: async (phone) => (await listDataPlans(phone)).plans,
    buy: buyFromProvider,
  },
  refund: relayRefund,
};

type Money = { amount: number; currency: string };
export type Quote = { rate: number; send: Money; receive: Money };

export type AccountSummary = {
  usdtBalance: string;
  spentTodayUsd: number;
  remainingTodayUsd: number;
  limits: { minUsd: number; maxTxUsd: number; dailyUsd: number };
};

export type CashOutInput = {
  address: Address;
  amount: string;
  bank: string;
  accountNumber: string;
};

/** Airtime takes a Naira amount; data takes a bundle, priced from SmartSMS's list. */
export type BillInput = { address: Address; phone: string; network: string } & (
  | { kind: "airtime"; amountNgn: number }
  | { kind: "data"; productName: string }
);

export type SendInput = {
  address: Address;
  /** The Polygon wallet that receives the USDT. */
  to: Address;
  amount: string;
};

export type TopUpInput = {
  address: Address;
  amountNgn: number;
  /** Where the USDT goes; the connected wallet when omitted. */
  recipient?: Address;
};

/**
 * USD counted toward a wallet's rolling 24-hour limit when checking `action`.
 * Unpaid top-ups only hold against other top-ups: anyone can open one for any
 * address, so they must never block that wallet's cash-out.
 */
export async function spentTodayUsd(
  address: string,
  nowMs: number,
  action: NimiqDirection,
): Promise<number> {
  const openTopUpSince = new Date(nowMs - TOP_UP_WINDOW_SECONDS * 1000);
  const counted: Record<string, unknown>[] = [
    { direction: "cash_out", status: { $in: COUNTED_STATUSES.cash_out } },
    { direction: "airtime", status: { $in: COUNTED_STATUSES.airtime } },
    { direction: "data", status: { $in: COUNTED_STATUSES.data } },
    { direction: "send", status: { $in: COUNTED_STATUSES.send } },
    {
      direction: "top_up",
      status: {
        $in: COUNTED_STATUSES.top_up.filter((s) => s !== "awaiting_deposit"),
      },
    },
  ];
  if (action === "top_up") {
    // Held only while the bank details are open.
    counted.push({
      direction: "top_up",
      status: "awaiting_deposit",
      createdAt: { $gte: openTopUpSince },
    });
  }
  const [row] = await NimiqOrder.aggregate<{ total: number }>([
    {
      $match: {
        walletAddress: address.toLowerCase(),
        createdAt: { $gte: new Date(nowMs - DAY_MS) },
        $or: counted,
      },
    },
    { $group: { _id: null, total: { $sum: "$amountUsd" } } },
  ]);
  return row?.total ?? 0;
}

/** Statuses where the user's USDT transfer has mined. */
const TRANSFERRED = ["processing", "completed", "refunding", "refunded"];

export function toPublicOrder(order: INimiqOrder): PublicOrder {
  const hash = TRANSFERRED.includes(order.status)
    ? order.transferTxHash
    : undefined;
  const refunded = order.status === "refunded" ? order.refundTxHash : undefined;
  return {
    id: order._id,
    direction: order.direction,
    status: order.status,
    cryptoAmount: order.cryptoAmount,
    fiatAmount: order.fiatAmount,
    rate: order.rate,
    reference: order.switchReference,
    createdAt: order.createdAt.toISOString(),
    expiresAt: order.expiresAt?.toISOString(),
    recipientAddress: order.recipientAddress,
    bank: order.bank && {
      name: order.bank.name,
      accountName: order.bank.accountName,
      accountNumberMasked: `••••${order.bank.accountNumber.slice(-4)}`,
    },
    depositBank: order.depositBank && {
      bankName: order.depositBank.bankName,
      accountName: order.depositBank.accountName,
      accountNumber: order.depositBank.accountNumber,
      notes: [...(order.depositBank.notes ?? [])],
    },
    bill: order.bill && {
      phone: order.bill.phone,
      network: order.bill.network,
      ...(order.bill.size ? { size: order.bill.size } : {}),
      ...(order.bill.validity ? { validity: order.bill.validity } : {}),
    },
    transferTxHash: hash,
    explorerUrl: hash ? `${POLYGON_EXPLORER_TX}${hash}` : undefined,
    refundUrl: refunded ? `${POLYGON_EXPLORER_TX}${refunded}` : undefined,
    failureReason: order.failureReason,
  };
}

export async function getQuote(
  direction: RampDirection,
  amount: number,
  deps: OrderDeps = defaultDeps,
): Promise<Quote> {
  const result =
    direction === "cash_out"
      ? await deps.switchApi.offrampQuote(amount)
      : await deps.switchApi.onrampQuote(amount);
  if (!result.success || !result.data) {
    throw new OrderError(
      result.message ?? "We couldn't get a rate. Please try again.",
      400,
    );
  }
  const cashOut = direction === "cash_out";
  return {
    rate: result.data.rate,
    send: { amount, currency: cashOut ? "USDT" : "NGN" },
    receive: {
      amount: result.data.destination.amount,
      currency: cashOut ? "NGN" : "USDT",
    },
  };
}

export async function getAccountSummary(
  address: Address,
  deps: OrderDeps = defaultDeps,
): Promise<AccountSummary> {
  await deps.connect();
  const { minUsd, maxTxUsd, dailyUsd } = deps.config();
  const [balance, spent] = await Promise.all([
    deps.chain.readUsdtBalance(getAddress(address)),
    // The summary is the cash-out view; a new top-up is checked again on create.
    spentTodayUsd(address, deps.now(), "cash_out"),
  ]);
  return {
    usdtBalance: fromUnits(balance),
    spentTodayUsd: spent,
    remainingTodayUsd: Math.max(0, dailyUsd - spent),
    limits: { minUsd, maxTxUsd, dailyUsd },
  };
}

export async function createCashOutOrder(
  input: CashOutInput,
  deps: OrderDeps = defaultDeps,
): Promise<{ order: PublicOrder; typedData: string }> {
  const owner = getAddress(input.address);
  const units = parseUsdt(input.amount);
  await deps.connect();

  const relayer = await readyRelayer(deps);
  await assertWithinLimits(owner, unitsToUsd(units), "cash_out", deps);
  if ((await deps.chain.readUsdtBalance(owner)) < units) {
    throw new OrderError(
      "Your USDT balance is too low for this cash-out.",
      400,
    );
  }
  const account = await lookUpAccount(input, deps);

  const result = await deps.switchApi.initiateOfframp(
    Number(fromUnits(units)),
    {
      holder_name: account.accountName,
      account_number: input.accountNumber,
      bank_code: account.switchCode,
    },
    owner,
  );
  if (!result.success || !result.data) throw switchFailure(result);
  const { deposit, reference, rate, destination } = result.data;
  const depositAddress = checkDeposit(deposit, units, reference);

  const now = deps.now();
  const deadline = Math.floor(now / 1000) + PERMIT_TTL_SECONDS;
  const nonce = await deps.chain.readPermitNonce(owner);
  const order = await NimiqOrder.create({
    direction: "cash_out",
    walletAddress: owner,
    status: "awaiting_signature",
    amountUsd: unitsToUsd(units),
    cryptoUnits: units.toString(),
    cryptoAmount: fromUnits(units),
    fiatAmount: destination.amount,
    rate,
    switchReference: reference,
    depositAddress,
    bank: {
      name: account.bankName,
      code: account.switchCode,
      accountNumber: input.accountNumber,
      accountName: account.accountName,
    },
    permit: { spender: relayer, nonce: nonce.toString(), deadline },
    expiresAt: new Date((deadline - SIGN_MARGIN_SECONDS) * 1000),
    createdAt: new Date(now),
  });

  const typedData = serializeTypedData(
    buildPermitTypedData(permitMessage(order)),
  );
  return { order: toPublicOrder(order), typedData };
}

/** Opens an airtime or data purchase and returns the permit for Nimiq Pay to sign. */
export async function createBillOrder(
  input: BillInput,
  deps: OrderDeps = defaultDeps,
): Promise<{ order: PublicOrder; typedData: string }> {
  const owner = getAddress(input.address);
  if (!isValidNigerianPhone(input.phone))
    throw new OrderError(COPY.badPhone, 400);
  if (!getNetwork(input.network)) throw new OrderError(COPY.badNetwork, 400);
  const phone = normalizeNigerianPhone(input.phone);
  if (!deps.bills.ready()) throw new OrderError(COPY.billsUnavailable, 503);
  await deps.connect();

  let amountNgn: number;
  let plan: DataPlan | undefined;
  if (input.kind === "airtime") {
    amountNgn = input.amountNgn;
    if (
      !Number.isInteger(amountNgn) ||
      amountNgn < AIRTIME_MIN ||
      amountNgn > AIRTIME_MAX
    ) {
      throw new OrderError(COPY.airtimeRange, 400);
    }
  } else {
    // The price comes from SmartSMS's own list, never from the client.
    plan = (await deps.bills.plans(phone)).find(
      (entry) => entry.productName === input.productName,
    );
    if (!plan?.numericPrice) throw new OrderError(COPY.planGone, 400);
    amountNgn = plan.numericPrice;
  }

  const relayer = await readyRelayer(deps);
  const rate = nairaPerUsdt(
    await getQuote("cash_out", BILL_RATE_PROBE_USDT, deps),
  );
  if (!rate) throw new OrderError(COPY.noRate, 502);
  // Rounded up to the next base unit so Jumpa is never short.
  const units = BigInt(
    Math.ceil((amountNgn / rate) * 10 ** POLYGON_USDT.decimals - 1e-9),
  );
  await assertWithinLimits(owner, unitsToUsd(units), input.kind, deps);
  if ((await deps.chain.readUsdtBalance(owner)) < units) {
    throw new OrderError("Your USDT balance is too low for this.", 400);
  }

  const now = deps.now();
  const deadline = Math.floor(now / 1000) + PERMIT_TTL_SECONDS;
  const nonce = await deps.chain.readPermitNonce(owner);
  const id = generateId("nimq");
  const order = await NimiqOrder.create({
    _id: id,
    direction: input.kind,
    walletAddress: owner,
    status: "awaiting_signature",
    amountUsd: unitsToUsd(units),
    cryptoUnits: units.toString(),
    cryptoAmount: fromUnits(units),
    fiatAmount: amountNgn,
    rate,
    // Sent to SmartSMS as ref_id.
    switchReference: id,
    depositAddress: relayer,
    bill: {
      phone,
      network: input.network,
      ...(plan
        ? {
            productName: plan.productName,
            size: plan.size,
            validity: plan.validity,
          }
        : {}),
    },
    permit: { spender: relayer, nonce: nonce.toString(), deadline },
    expiresAt: new Date((deadline - SIGN_MARGIN_SECONDS) * 1000),
    createdAt: new Date(now),
  });

  const typedData = serializeTypedData(
    buildPermitTypedData(permitMessage(order)),
  );
  return { order: toPublicOrder(order), typedData };
}

/** Opens a USDT transfer to another Polygon wallet and returns the permit for Nimiq Pay to sign. */
export async function createSendOrder(
  input: SendInput,
  deps: OrderDeps = defaultDeps,
): Promise<{ order: PublicOrder; typedData: string }> {
  const owner = getAddress(input.address);
  const problem = walletAddressError(input.to);
  if (problem) throw new OrderError(problem, 400);
  const to = getAddress(input.to);
  if (isAddressEqual(to, owner)) throw new OrderError(COPY.ownWallet, 400);
  const units = parseUsdt(input.amount);
  await deps.connect();

  const relayer = await readyRelayer(deps);
  await assertWithinLimits(owner, unitsToUsd(units), "send", deps);
  if ((await deps.chain.readUsdtBalance(owner)) < units) {
    throw new OrderError(
      "Your USDT balance is too low for this transfer.",
      400,
    );
  }

  const now = deps.now();
  const deadline = Math.floor(now / 1000) + PERMIT_TTL_SECONDS;
  const nonce = await deps.chain.readPermitNonce(owner);
  const id = generateId("nimq");
  const order = await NimiqOrder.create({
    _id: id,
    direction: "send",
    walletAddress: owner,
    recipientAddress: to,
    status: "awaiting_signature",
    amountUsd: unitsToUsd(units),
    cryptoUnits: units.toString(),
    cryptoAmount: fromUnits(units),
    // No Naira side and no partner: the order id is the reference.
    fiatAmount: 0,
    rate: 0,
    switchReference: id,
    depositAddress: to,
    permit: { spender: relayer, nonce: nonce.toString(), deadline },
    expiresAt: new Date((deadline - SIGN_MARGIN_SECONDS) * 1000),
    createdAt: new Date(now),
  });

  const typedData = serializeTypedData(
    buildPermitTypedData(permitMessage(order)),
  );
  return { order: toPublicOrder(order), typedData };
}

export function submitCashOutSignature(
  orderId: string,
  signature: Hex,
  deps: OrderDeps = defaultDeps,
): Promise<PublicOrder> {
  return submitPermit(orderId, signature, ["cash_out"], deps);
}

/** Relays the send's permit; the transfer landing in the recipient's wallet completes it. */
export function submitSendSignature(
  orderId: string,
  signature: Hex,
  deps: OrderDeps = defaultDeps,
): Promise<PublicOrder> {
  return submitPermit(orderId, signature, ["send"], deps);
}

/** Relays the bill's permit, then buys it once the USDT has arrived. */
export function submitBillSignature(
  orderId: string,
  signature: Hex,
  deps: OrderDeps = defaultDeps,
): Promise<PublicOrder> {
  return submitPermit(orderId, signature, ["airtime", "data"], deps);
}

async function submitPermit(
  orderId: string,
  signature: Hex,
  directions: NimiqDirection[],
  deps: OrderDeps,
): Promise<PublicOrder> {
  await deps.connect();
  const order = await NimiqOrder.findById(orderId).lean();
  if (
    !order ||
    !directions.includes(order.direction) ||
    !order.permit ||
    !order.depositAddress
  ) {
    throw new OrderError(COPY.notFound, 404);
  }
  const what = permitNoun(order.direction);
  if (order.status !== "awaiting_signature")
    throw new OrderError(COPY.submitted(what), 409);

  const relayer = deps.chain.relayerAddress();
  const signable = isSignable(
    { deadline: order.permit.deadline, createdAt: order.createdAt },
    deps.now(),
  );
  // A rotated relayer key can never use a permit naming the old spender.
  if (!signable || (relayer && getAddress(order.permit.spender) !== relayer)) {
    await NimiqOrder.updateOne(
      { _id: order._id, status: "awaiting_signature" },
      { $set: { status: "expired" } },
    );
    throw new OrderError(COPY.expired(what), 410);
  }

  const message = permitMessage(order);
  if (!(await verifyPermitSignature(message, signature))) {
    throw new OrderError(COPY.badSignature(what), 400);
  }
  await readyRelayer(deps);
  await assertWithinLimits(
    message.owner,
    order.amountUsd,
    order.direction,
    deps,
  );
  if ((await deps.chain.readUsdtBalance(message.owner)) < message.value) {
    throw new OrderError(COPY.lowBalance(what), 400);
  }

  const claimed = await NimiqOrder.findOneAndUpdate(
    { _id: order._id, status: "awaiting_signature" },
    { $set: { status: "relaying", relayStartedAt: new Date(deps.now()) } },
  );
  if (!claimed) throw new OrderError(COPY.submitted(what), 409);

  try {
    const result = await deps.relay({
      owner: message.owner,
      to: getAddress(order.depositAddress),
      value: message.value,
      deadline: message.deadline,
      signature,
      onTransferSent: async (hash, nonce) => {
        await NimiqOrder.updateOne(
          { _id: order._id },
          { $set: { transferTxHash: hash, transferNonce: nonce } },
        );
      },
    });
    await NimiqOrder.updateOne(
      { _id: order._id },
      {
        $set: {
          transferTxHash: result.transferTxHash,
          ...(result.permitTxHash ? { permitTxHash: result.permitTxHash } : {}),
          ...(result.confirmed ? { status: settledStatus(order) } : {}),
        },
      },
    );
    if (result.confirmed && order.direction !== "send") {
      if (isBillDirection(order.direction)) {
        return advanceBill(await mustFind(order._id), deps);
      }
      await notifySwitch(order.switchReference, result.transferTxHash, deps);
    }
  } catch (error) {
    if (error instanceof RelayError) {
      await NimiqOrder.updateOne(
        { _id: order._id },
        { $set: { status: "failed", failureReason: error.message } },
      );
      return toPublicOrder(await mustFind(order._id));
    }
    // No transfer hash yet means nothing was broadcast: hand the order back for the same signature.
    const handedBack = await NimiqOrder.updateOne(
      {
        _id: order._id,
        status: "relaying",
        transferTxHash: { $exists: false },
      },
      { $set: { status: "awaiting_signature" } },
    );
    if (handedBack.modifiedCount === 1) {
      if (!(error instanceof RelayerUnavailableError)) {
        console.error(`[nimiq] relay for ${order._id} stopped early:`, error);
      }
      throw new OrderError(
        error instanceof RelayerUnavailableError
          ? error.message
          : RELAYER_PAUSED,
        503,
      );
    }
    // Outcome unknown: the order stays "relaying" and refreshOrder settles it.
    console.error(`[nimiq] relay for ${order._id} threw:`, error);
  }
  return toPublicOrder(await mustFind(order._id));
}

export async function createTopUpOrder(
  input: TopUpInput,
  deps: OrderDeps = defaultDeps,
): Promise<PublicOrder> {
  const owner = getAddress(input.address);
  const payee = topUpPayee(owner, input.recipient);
  await deps.connect();
  const quote = await getQuote("top_up", input.amountNgn, deps);
  // The limit belongs to the wallet opening the top-up, wherever the USDT goes.
  await assertWithinLimits(owner, quote.receive.amount, "top_up", deps);

  const result = await deps.switchApi.initiateOnramp(input.amountNgn, payee);
  if (!result.success || !result.data) throw switchFailure(result);
  const { reference, deposit, destination } = result.data;
  // Switch documents these on the bank deposit; the shared response type predates them.
  const extra = deposit as typeof deposit & {
    amount?: number;
    expires_at?: string;
  };
  const units = parseUnits(
    Number(destination.amount).toFixed(POLYGON_USDT.decimals),
    POLYGON_USDT.decimals,
  );
  const now = deps.now();
  const switchExpiry = extra.expires_at ? new Date(extra.expires_at) : null;

  const order = await NimiqOrder.create({
    direction: "top_up",
    walletAddress: owner,
    recipientAddress: payee === owner ? undefined : payee,
    status: "awaiting_deposit",
    amountUsd: unitsToUsd(units),
    cryptoUnits: units.toString(),
    cryptoAmount: fromUnits(units),
    fiatAmount: Number(extra.amount) || input.amountNgn,
    rate: quote.rate,
    switchReference: reference,
    depositBank: {
      bankName: deposit.bank_name,
      accountName: deposit.account_name,
      accountNumber: deposit.account_number,
      notes: deposit.note ?? [],
    },
    expiresAt:
      switchExpiry && !Number.isNaN(switchExpiry.getTime())
        ? switchExpiry
        : new Date(now + TOP_UP_WINDOW_SECONDS * 1000),
    createdAt: new Date(now),
  });
  return toPublicOrder(order);
}

/** The order's current state, settling it from the chain or Switch when it is not final. */
export async function refreshOrder(
  orderId: string,
  deps: OrderDeps = defaultDeps,
): Promise<PublicOrder> {
  await deps.connect();
  return settle(await mustFind(orderId), deps);
}

/**
 * The orders a device remembers, newest first; ids the server doesn't know are left out.
 * Orders still moving are settled first; one that can't be is listed as last stored.
 */
export async function listOrders(
  orderIds: string[],
  deps: OrderDeps = defaultDeps,
): Promise<PublicOrder[]> {
  await deps.connect();
  const orders = await NimiqOrder.find({
    _id: { $in: orderIds.slice(0, MAX_LISTED_ORDERS) },
  })
    .sort({ createdAt: -1 })
    .lean();
  return Promise.all(
    orders.map((order) =>
      settle(order, deps).catch((error) => {
        console.error(`[nimiq] refresh of ${order._id} failed:`, error);
        return toPublicOrder(order);
      }),
    ),
  );
}

async function settle(
  order: INimiqOrder,
  deps: OrderDeps,
): Promise<PublicOrder> {
  const now = deps.now();
  if (
    FINAL_STATUSES.includes(order.status) ||
    (order.checkedAt && now - order.checkedAt.getTime() < CHECK_INTERVAL_MS)
  ) {
    return toPublicOrder(order);
  }

  const next = await nextState(order, now, deps);
  const updated = await NimiqOrder.findOneAndUpdate(
    { _id: order._id, status: order.status },
    { $set: { ...next, checkedAt: new Date(now) } },
    { returnDocument: "after" },
  ).lean();
  const current = updated ?? (await mustFind(order._id));
  if (isBillDirection(order.direction)) return advanceBill(current, deps);
  if (
    updated &&
    order.status === "relaying" &&
    next.status === "processing" &&
    order.transferTxHash
  ) {
    await notifySwitch(order.switchReference, order.transferTxHash, deps);
  }
  return toPublicOrder(current);
}

/** Buys a paid bill, or carries on returning the USDT for a refused one. */
async function advanceBill(
  order: INimiqOrder,
  deps: OrderDeps,
): Promise<PublicOrder> {
  if (order.status === "processing" && !order.buyStartedAt) {
    return deliverBill(order, deps);
  }
  if (order.status === "refunding") return refundBill(order, deps);
  return toPublicOrder(order);
}

async function deliverBill(
  order: INimiqOrder,
  deps: OrderDeps,
): Promise<PublicOrder> {
  const id = order._id;
  // Claimed before SmartSMS is called, so no poll can buy it a second time.
  const claimed = await NimiqOrder.findOneAndUpdate(
    { _id: id, status: "processing", buyStartedAt: { $exists: false } },
    { $set: { buyStartedAt: new Date(deps.now()) } },
    { returnDocument: "after" },
  ).lean();
  if (!claimed?.bill) return toPublicOrder(await mustFind(id));

  const outcome = await deps.bills.buy({
    kind: claimed.direction as BillDirection,
    phone: claimed.bill.phone,
    amountNgn: claimed.fiatAmount,
    productName: claimed.bill.productName,
    reference: claimed.switchReference,
  });
  if (outcome.status === "delivered") {
    await NimiqOrder.updateOne(
      { _id: id, status: "processing" },
      {
        $set: {
          status: "completed",
          ...(outcome.reference
            ? { providerReference: outcome.reference }
            : {}),
        },
      },
    );
  } else if (outcome.status === "rejected") {
    console.error(`[nimiq] bill ${id} refused: ${outcome.reason}`);
    await NimiqOrder.updateOne(
      { _id: id, status: "processing" },
      { $set: { status: "refunding", failureReason: COPY.billRefunding } },
    );
    return refundBill(await mustFind(id), deps);
  } else {
    // Might have been delivered: support checks SmartSMS before any refund.
    console.error(
      `[nimiq] bill ${id} outcome unknown, needs a manual check: ${outcome.reason}`,
    );
  }
  return toPublicOrder(await mustFind(id));
}

async function refundBill(
  order: INimiqOrder,
  deps: OrderDeps,
): Promise<PublicOrder> {
  const id = order._id;
  const now = deps.now();
  const markRefunded = (hash: string) =>
    NimiqOrder.updateOne(
      { _id: id, status: "refunding" },
      {
        $set: {
          status: "refunded",
          refundTxHash: hash,
          failureReason: COPY.billRefunded,
        },
      },
    );

  if (order.refundTxHash) {
    const receipt = await deps.chain.readReceiptStatus(
      order.refundTxHash as Hex,
    );
    const old =
      now - (order.refundStartedAt?.getTime() ?? 0) > RELAY_ABANDONED_MS;
    if (receipt === "success") {
      await markRefunded(order.refundTxHash);
    } else if (
      receipt === "reverted" ||
      (receipt === "missing" &&
        old &&
        (await nonceTaken(order.refundNonce, deps)))
    ) {
      // It never moved anything, so the next poll may send it again.
      console.error(`[nimiq] refund ${order.refundTxHash} for ${id} dropped`);
      await NimiqOrder.updateOne(
        { _id: id, refundTxHash: order.refundTxHash },
        { $unset: { refundTxHash: 1, refundNonce: 1, refundStartedAt: 1 } },
      );
    }
    return toPublicOrder(await mustFind(id));
  }

  // Claimed before sending, so two polls never refund twice.
  const claimed = await NimiqOrder.findOneAndUpdate(
    {
      _id: id,
      status: "refunding",
      refundTxHash: { $exists: false },
      $or: [
        { refundStartedAt: { $exists: false } },
        { refundStartedAt: { $lt: new Date(now - RELAY_ABANDONED_MS) } },
      ],
    },
    { $set: { refundStartedAt: new Date(now) } },
    { returnDocument: "after" },
  ).lean();
  if (!claimed) return toPublicOrder(await mustFind(id));

  try {
    const result = await deps.refund({
      to: getAddress(claimed.walletAddress),
      value: BigInt(claimed.cryptoUnits),
      onSent: async (hash, nonce) => {
        await NimiqOrder.updateOne(
          { _id: id },
          { $set: { refundTxHash: hash, refundNonce: nonce } },
        );
      },
    });
    if (result.confirmed) await markRefunded(result.txHash);
  } catch (error) {
    console.error(`[nimiq] refund for ${id} stopped:`, error);
    // Nothing was sent: release the claim so the next poll tries again.
    await NimiqOrder.updateOne(
      { _id: id, refundTxHash: { $exists: false } },
      { $unset: { refundStartedAt: 1 } },
    );
  }
  return toPublicOrder(await mustFind(id));
}

/** Another relayer transaction used this nonce, so one signed with it can never mine. */
async function nonceTaken(nonce: number | undefined, deps: OrderDeps) {
  if (nonce === undefined) return false;
  const mined = await deps.chain.readRelayerNonce();
  return mined !== null && mined > nonce;
}

async function nextState(
  order: INimiqOrder,
  now: number,
  deps: OrderDeps,
): Promise<Partial<INimiqOrder>> {
  switch (order.status) {
    case "awaiting_signature": {
      const live =
        order.permit &&
        isSignable(
          { deadline: order.permit.deadline, createdAt: order.createdAt },
          now,
        );
      return live ? {} : { status: "expired" };
    }
    case "relaying": {
      const startedAt = (order.relayStartedAt ?? order.updatedAt).getTime();
      const old = now - startedAt > RELAY_ABANDONED_MS;
      if (!order.transferTxHash) {
        return old
          ? { status: "failed", failureReason: COPY.nothingMoved }
          : {};
      }
      const receipt = await deps.chain.readReceiptStatus(
        order.transferTxHash as Hex,
      );
      if (receipt === "success") return { status: settledStatus(order) };
      if (receipt === "reverted")
        return { status: "failed", failureReason: COPY.reverted };
      // Another transaction took this nonce, so the transfer can never mine.
      if (receipt === "missing" && old && order.transferNonce !== undefined) {
        const mined = await deps.chain.readRelayerNonce();
        if (mined !== null && mined > order.transferNonce) {
          return { status: "failed", failureReason: COPY.nothingMoved };
        }
      }
      return {};
    }
    case "awaiting_deposit":
    case "processing": {
      // A bill is bought by advanceBill and a send has no partner: neither is tracked by Switch.
      if (isBillDirection(order.direction) || order.direction === "send")
        return {};
      const raw = (await deps.switchApi.status(order.switchReference))?.data
        ?.status;
      const mapped = typeof raw === "string" ? fromSwitchStatus(raw) : null;
      if (!mapped || mapped === order.status || mapped === "awaiting_deposit")
        return {};
      if (mapped !== "failed") return { status: mapped };
      if (
        order.direction === "top_up" &&
        order.status === "awaiting_deposit" &&
        raw?.trim().toUpperCase() === "EXPIRED"
      ) {
        return { status: "expired" };
      }
      return {
        status: "failed",
        failureReason:
          order.direction === "cash_out"
            ? COPY.cashOutFailed
            : COPY.topUpFailed,
      };
    }
    default:
      return {};
  }
}

/** Where an order goes once its transfer mines: a send is done, the rest still have a payout. */
const settledStatus = (order: Pick<INimiqOrder, "direction">) =>
  order.direction === "send" ? "completed" : "processing";

function parseUsdt(amount: string): bigint {
  try {
    return toUnits(amount);
  } catch (error) {
    throw new OrderError((error as Error).message, 400);
  }
}

const unitsToUsd = (units: bigint) => Number(fromUnits(units));

async function readyRelayer(deps: OrderDeps): Promise<Address> {
  const relayer = deps.chain.relayerAddress();
  if (!relayer || (await deps.chain.readRelayerGas()) < MIN_RELAYER_GAS) {
    throw new OrderError(RELAYER_PAUSED, 503);
  }
  return relayer;
}

async function assertWithinLimits(
  owner: Address,
  usd: number,
  action: NimiqDirection,
  deps: OrderDeps,
) {
  const { minUsd, maxTxUsd, dailyUsd } = deps.config();
  const reason = checkAmountLimits({
    usd,
    spentTodayUsd: await spentTodayUsd(owner, deps.now(), action),
    // Airtime starts at ₦50, far under the cash-out minimum.
    minUsd: isBillDirection(action) ? BILL_MIN_USD : minUsd,
    maxTxUsd,
    dailyUsd,
  });
  if (reason) throw new OrderError(reason, 400);
}

/** The wallet a top-up pays; refuses addresses that would burn the USDT. */
function topUpPayee(owner: Address, recipient?: Address): Address {
  if (!recipient) return owner;
  const problem = walletAddressError(recipient);
  if (problem) throw new OrderError(problem, 400);
  return getAddress(recipient);
}

async function lookUpAccount(input: CashOutInput, deps: OrderDeps) {
  try {
    return await deps.resolveAccount(input.accountNumber, input.bank);
  } catch (error) {
    if (error instanceof BankLookupError)
      throw new OrderError(error.message, 400);
    throw error;
  }
}

function switchFailure(result: { status?: number; message?: string }) {
  const status = result.status && result.status < 500 ? 400 : 502;
  return new OrderError(result.message || COPY.partnerError, status);
}

/** The deposit Switch asked for must be exactly what the user agreed to send. */
function checkDeposit(
  deposit: { amount: number; address: string; asset: string },
  units: bigint,
  reference: string,
): Address {
  const assetOk =
    !deposit.asset || normalizeSwitchAsset(deposit.asset) === SWITCH_ASSET;
  if (!assetOk || !isAddress(deposit.address)) {
    console.error(
      `[nimiq] unexpected Switch deposit for ${reference}:`,
      deposit,
    );
    throw new OrderError(COPY.partnerError, 502);
  }
  const depositUnits = parseUnits(
    Number(deposit.amount).toFixed(POLYGON_USDT.decimals),
    POLYGON_USDT.decimals,
  );
  if (depositUnits !== units) {
    console.error(
      `[nimiq] Switch asked ${deposit.amount} for ${fromUnits(units)} (${reference})`,
    );
    throw new OrderError(COPY.amountChanged, 502);
  }
  return getAddress(deposit.address);
}

function permitMessage(order: INimiqOrder): PermitMessage {
  if (!order.permit) throw new Error(`order ${order._id} has no permit`);
  return {
    owner: getAddress(order.walletAddress),
    spender: getAddress(order.permit.spender),
    value: BigInt(order.cryptoUnits),
    nonce: BigInt(order.permit.nonce),
    deadline: BigInt(order.permit.deadline),
  };
}

async function notifySwitch(reference: string, hash: string, deps: OrderDeps) {
  try {
    await deps.switchApi.confirm(reference, hash);
  } catch (error) {
    console.warn(`[nimiq] Switch confirm for ${reference} failed:`, error);
  }
}

async function mustFind(orderId: string): Promise<INimiqOrder> {
  const order = await NimiqOrder.findById(orderId).lean();
  if (!order) throw new OrderError(COPY.notFound, 404);
  return order;
}
