import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { type Address, type Hex, parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { OffRampResponse, OnRampResponse } from "@/lib/switch";
import { type INimiqOrder, NimiqOrder } from "@/models/NimiqOrder";
import type { BillOutcome, BillPurchase } from "./bill-provider";
import { POLYGON_USDT } from "./constants";
import {
  cancelTopUp,
  createBillOrder,
  createCashOutOrder,
  createSendOrder,
  createTopUpOrder,
  listOrders,
  type OrderDeps,
  OrderError,
  refreshOrder,
  spentTodayUsd,
  submitBillSignature,
  submitCashOutSignature,
  submitSendSignature,
} from "./orders";
import { buildPermitTypedData } from "./permit";
import { RelayError, RelayerUnavailableError } from "./relayer";
import { connectTestDb, dropTestDb, skipWithoutDb } from "./test-db";

const owner = privateKeyToAccount(generatePrivateKey());
const RELAYER: Address = "0x1111111111111111111111111111111111111111";
const DEPOSIT: Address = "0x2222222222222222222222222222222222222222";
const FRIEND: Address = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
const TRANSFER_HASH: Hex = `0x${"ab".repeat(32)}`;
const TRANSFER_NONCE = 7;
const REFUND_HASH: Hex = `0x${"cd".repeat(32)}`;
const START = Date.parse("2026-11-07T12:00:00Z");
const MINUTE = 60_000;

const cashOut = {
  address: owner.address,
  amount: "10",
  bank: "044",
  accountNumber: "0123456789",
};

const send = { address: owner.address, to: FRIEND, amount: "10" };

function harness() {
  let seq = 0;
  const state = {
    now: START,
    balance: BigInt(1_000_000_000),
    receipt: "success" as "success" | "reverted" | "missing" | null,
    relayerNonce: null as number | null,
    switchStatus: "PROCESSING",
    relayCalls: 0,
    relayTo: [] as Address[],
    relayConfirmed: true,
    relayError: undefined as Error | undefined,
    billsReady: true,
    plans: [
      {
        id: "smart_0_1GB",
        size: "1GB",
        period: "monthly" as const,
        validity: "30 days",
        price: "₦3,000",
        productName: "MTN 1GB 30 days",
        numericPrice: 3000,
      },
    ],
    purchases: [] as BillPurchase[],
    billOutcome: { status: "delivered", reference: "sms_1" } as BillOutcome,
    refunds: [] as { to: Address; value: bigint }[],
    refundError: undefined as Error | undefined,
    offramps: [] as { amount: number; holder: string; refund: string }[],
    onramps: [] as { ngn: number; wallet: string }[],
    confirms: [] as string[],
  };
  const deps: OrderDeps = {
    now: () => state.now,
    connect: async () => {},
    config: () => ({ enabled: true, dailyUsd: 500, maxTxUsd: 500, minUsd: 1 }),
    resolveAccount: async () => ({
      accountName: "ADA OBI",
      bankName: "Access Bank",
      switchCode: "044",
    }),
    switchApi: {
      offrampQuote: async (usdt) => ({
        success: true,
        data: {
          rate: 1500,
          destination: { amount: usdt * 1500, currency: "NGN" },
        },
      }),
      onrampQuote: async (ngn) => ({
        success: true,
        data: {
          rate: 1600,
          destination: { amount: ngn / 1600, currency: "USDT" },
        },
      }),
      initiateOfframp: async (usdt, beneficiary, refund) => {
        state.offramps.push({
          amount: usdt,
          holder: beneficiary.holder_name,
          refund,
        });
        seq += 1;
        return {
          success: true,
          message: "ok",
          data: {
            status: "AWAITING_DEPOSIT",
            type: "OFFRAMP",
            reference: `ref_out_${seq}`,
            rate: 1500,
            destination: { amount: usdt * 1500, currency: "NGN" },
            deposit: { amount: usdt, address: DEPOSIT, asset: "polygon:usdt" },
          },
        } satisfies OffRampResponse;
      },
      initiateOnramp: async (ngn, wallet) => {
        state.onramps.push({ ngn, wallet });
        seq += 1;
        return {
          success: true,
          status: 200,
          message: "ok",
          data: {
            reference: `ref_in_${seq}`,
            deposit: {
              bank_name: "Switch Bank",
              bank_code: "999",
              account_name: "SWITCH / JUMPA",
              account_number: "9876543210",
              note: ["Send the exact amount."],
            },
            destination: { amount: ngn / 1600, currency: "USDT" },
          },
        } satisfies OnRampResponse;
      },
      status: async () => ({
        success: true,
        data: { status: state.switchStatus },
      }),
      confirm: async (reference) => {
        state.confirms.push(reference);
      },
    },
    chain: {
      relayerAddress: () => RELAYER,
      readRelayerGas: async () => parseEther("1"),
      readUsdtBalance: async () => state.balance,
      readPermitNonce: async () => BigInt(0),
      readReceiptStatus: async () => state.receipt,
      readRelayerNonce: async () => state.relayerNonce,
    },
    relay: async (input) => {
      state.relayCalls += 1;
      state.relayTo.push(input.to);
      if (state.relayError) throw state.relayError;
      await input.onTransferSent(TRANSFER_HASH, TRANSFER_NONCE);
      return { transferTxHash: TRANSFER_HASH, confirmed: state.relayConfirmed };
    },
    bills: {
      ready: () => state.billsReady,
      plans: async () => state.plans,
      buy: async (purchase) => {
        state.purchases.push(purchase);
        return state.billOutcome;
      },
    },
    refund: async (input) => {
      state.refunds.push({ to: input.to, value: input.value });
      if (state.refundError) throw state.refundError;
      await input.onSent(REFUND_HASH, 9);
      return { txHash: REFUND_HASH, confirmed: true };
    },
  };
  return { deps, state };
}

async function signFor(orderId: string) {
  const order = await NimiqOrder.findById(orderId).lean();
  assert.ok(order?.permit);
  return owner.signTypedData(
    buildPermitTypedData({
      owner: owner.address,
      spender: order.permit.spender as Address,
      value: BigInt(order.cryptoUnits),
      nonce: BigInt(order.permit.nonce),
      deadline: BigInt(order.permit.deadline),
    }),
  );
}

async function seedOrder(fields: Partial<INimiqOrder>) {
  return NimiqOrder.create({
    direction: "cash_out",
    walletAddress: owner.address,
    status: "completed",
    amountUsd: 10,
    cryptoUnits: "10000000",
    cryptoAmount: "10",
    fiatAmount: 15000,
    rate: 1500,
    switchReference: `seed_${Math.random()}`,
    createdAt: new Date(START - 60_000),
    ...fields,
  });
}

async function rejectsWith(
  promise: Promise<unknown>,
  status: number,
  message?: string,
) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof OrderError, `expected OrderError, got ${error}`);
    assert.equal(error.status, status);
    if (message) assert.equal(error.message, message);
    return true;
  });
}

describe("nimiq orders", () => {
  before(connectTestDb);
  after(dropTestDb);
  beforeEach(async () => {
    if (NimiqOrderReady()) await NimiqOrder.deleteMany({});
  });

  test("cash-out create stores Switch's deposit, the relayer as spender and a 15-minute deadline", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();

    const { order, typedData } = await createCashOutOrder(cashOut, deps);

    const stored = await NimiqOrder.findById(order.id).lean();
    assert.equal(stored?.status, "awaiting_signature");
    assert.equal(stored?.createdAt.getTime(), START);
    assert.equal(stored?.depositAddress, DEPOSIT);
    assert.equal(stored?.cryptoUnits, "10000000");
    assert.equal(stored?.permit?.spender, RELAYER);
    assert.equal(stored?.permit?.deadline, START / 1000 + 900);
    assert.deepEqual(state.offramps, [
      { amount: 10, holder: "ADA OBI", refund: owner.address },
    ]);
    const json = JSON.parse(typedData);
    assert.equal(json.message.spender, RELAYER);
    assert.equal(json.message.value, "10000000");
    assert.equal(order.bank?.accountNumberMasked, "••••6789");
  });

  test("cash-out create refuses an amount over what is left today", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps } = harness();
    await seedOrder({ amountUsd: 450 });

    await rejectsWith(
      createCashOutOrder({ ...cashOut, amount: "60" }, deps),
      400,
      "You can move $50.00 more today.",
    );
  });

  test("cash-out create refuses more than the wallet holds", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.balance = BigInt(9_000_000);

    await rejectsWith(createCashOutOrder(cashOut, deps), 400);
    assert.equal(state.offramps.length, 0);
  });

  test("unsigned cash-outs do not count toward the daily limit", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps } = harness();
    await createCashOutOrder({ ...cashOut, amount: "400" }, deps);
    await createCashOutOrder({ ...cashOut, amount: "400" }, deps);

    await createCashOutOrder({ ...cashOut, amount: "400" }, deps);
    assert.equal(await spentTodayUsd(owner.address, START, "cash_out"), 0);
  });

  test("submit relays a valid signature once and confirms it with Switch", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    const { order } = await createCashOutOrder(cashOut, deps);

    const submitted = await submitCashOutSignature(
      order.id,
      await signFor(order.id),
      deps,
    );

    assert.equal(submitted.status, "processing");
    assert.equal(submitted.transferTxHash, TRANSFER_HASH);
    assert.equal(state.relayCalls, 1);
    assert.deepEqual(state.confirms, [order.reference]);
    assert.equal(await spentTodayUsd(owner.address, START, "cash_out"), 10);
  });

  test("submit is idempotent: a second submit is refused and relays nothing", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    const { order } = await createCashOutOrder(cashOut, deps);
    const signature = await signFor(order.id);
    await submitCashOutSignature(order.id, signature, deps);

    await rejectsWith(submitCashOutSignature(order.id, signature, deps), 409);
    assert.equal(state.relayCalls, 1);
  });

  test("submit refuses an expired order with 410 and moves nothing", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    const { order } = await createCashOutOrder(cashOut, deps);
    const signature = await signFor(order.id);
    state.now = START + 1501 * 1000;

    await rejectsWith(
      submitCashOutSignature(order.id, signature, deps),
      410,
      "This cash-out expired. Start again.",
    );
    assert.equal(state.relayCalls, 0);
    assert.equal(
      (await NimiqOrder.findById(order.id).lean())?.status,
      "expired",
    );
  });

  test("submit refuses a signature that is not the owner's permit", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    const { order } = await createCashOutOrder(cashOut, deps);
    const stranger = privateKeyToAccount(generatePrivateKey());
    const forged = await stranger.signMessage({ message: "hello" });

    await rejectsWith(submitCashOutSignature(order.id, forged, deps), 400);
    assert.equal(state.relayCalls, 0);
  });

  test("submit refuses when the balance dropped after the quote", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    const { order } = await createCashOutOrder(cashOut, deps);
    const signature = await signFor(order.id);
    state.balance = BigInt(5_000_000);

    await rejectsWith(submitCashOutSignature(order.id, signature, deps), 400);
    assert.equal(state.relayCalls, 0);
    assert.equal(
      (await NimiqOrder.findById(order.id).lean())?.status,
      "awaiting_signature",
    );
  });

  test("a relay that stops for good fails the order with its reason", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    const { order } = await createCashOutOrder(cashOut, deps);
    state.relayError = new RelayError(
      "The transfer failed on Polygon. No money has moved.",
    );

    const result = await submitCashOutSignature(
      order.id,
      await signFor(order.id),
      deps,
    );

    assert.equal(result.status, "failed");
    assert.equal(
      result.failureReason,
      "The transfer failed on Polygon. No money has moved.",
    );
    assert.equal(result.explorerUrl, undefined);
  });

  test("refreshOrder settles a relaying order from its stored hash", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    const mined = await seedOrder({
      status: "relaying",
      transferTxHash: TRANSFER_HASH,
    });
    const reverted = await seedOrder({
      status: "relaying",
      transferTxHash: TRANSFER_HASH,
    });

    assert.equal((await refreshOrder(mined._id, deps)).status, "processing");
    state.receipt = "reverted";
    const failed = await refreshOrder(reverted._id, deps);
    assert.equal(failed.status, "failed");
    assert.match(failed.failureReason ?? "", /No money has moved/);
  });

  test("refreshOrder leaves a relaying order alone while its receipt is pending", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.receipt = null;
    const pending = await seedOrder({
      status: "relaying",
      transferTxHash: TRANSFER_HASH,
    });

    assert.equal((await refreshOrder(pending._id, deps)).status, "relaying");
  });

  test("refreshOrder follows Switch to completion", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    const processing = await seedOrder({ status: "processing" });
    state.switchStatus = "COMPLETED";

    assert.equal(
      (await refreshOrder(processing._id, deps)).status,
      "completed",
    );
  });

  test("top-up create pays the connected address and holds its amount against other top-ups", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();

    const order = await createTopUpOrder(
      { address: owner.address, amountNgn: 640_000 },
      deps,
    );

    assert.equal(order.status, "awaiting_deposit");
    assert.deepEqual(state.onramps, [{ ngn: 640_000, wallet: owner.address }]);
    assert.equal(order.depositBank?.accountNumber, "9876543210");
    assert.equal(await spentTodayUsd(owner.address, START, "top_up"), 400);
    await rejectsWith(
      createTopUpOrder({ address: owner.address, amountNgn: 320_000 }, deps),
      400,
    );
  });

  test("top-up to another wallet pays that wallet and counts against the connected one", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();

    const order = await createTopUpOrder(
      {
        address: owner.address,
        amountNgn: 640_000,
        recipient: FRIEND.toLowerCase() as Address,
      },
      deps,
    );

    assert.deepEqual(state.onramps, [{ ngn: 640_000, wallet: FRIEND }]);
    assert.equal(order.recipientAddress, FRIEND);
    assert.equal(await spentTodayUsd(owner.address, START, "top_up"), 400);
    assert.equal(await spentTodayUsd(FRIEND, START, "top_up"), 0);
  });

  test("a top-up addressed to the connected wallet itself has no separate recipient", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();

    const order = await createTopUpOrder(
      { address: owner.address, amountNgn: 16_000, recipient: owner.address },
      deps,
    );

    assert.equal(order.recipientAddress, undefined);
    assert.deepEqual(state.onramps, [{ ngn: 16_000, wallet: owner.address }]);
  });

  test("top-up refuses a recipient that would burn the USDT before asking Switch", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();

    await rejectsWith(
      createTopUpOrder(
        {
          address: owner.address,
          amountNgn: 16_000,
          recipient: POLYGON_USDT.address,
        },
        deps,
      ),
      400,
      "This address can't receive USDT.",
    );
    assert.deepEqual(state.onramps, []);
  });

  test("listOrders returns known orders newest first and skips unknown ids", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps } = harness();
    const older = await seedOrder({ createdAt: new Date(START - 2 * MINUTE) });
    const newer = await seedOrder({ createdAt: new Date(START - MINUTE) });

    const listed = await listOrders(
      [older._id, "nimq_doesnotexist0000000", newer._id],
      deps,
    );

    assert.deepEqual(
      listed.map((o) => o.id),
      [newer._id, older._id],
    );
  });

  test("listOrders settles orders still moving, as a single refresh does", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    const processing = await seedOrder({ status: "processing" });
    state.switchStatus = "COMPLETED";

    const [listed] = await listOrders([processing._id], deps);
    assert.equal(listed.status, "completed");
  });

  test("an order that can't be refreshed is still listed as last known", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps } = harness();
    const processing = await seedOrder({ status: "processing" });
    deps.switchApi = {
      ...deps.switchApi,
      status: async () => {
        throw new Error("Switch is down");
      },
    };

    const [listed] = await listOrders([processing._id], deps);
    assert.equal(listed.status, "processing");
  });

  test("an unpaid top-up never blocks a cash-out, so a stranger can't use up someone's limit", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps } = harness();
    await createTopUpOrder(
      { address: owner.address, amountNgn: 800_000 },
      deps,
    );

    assert.equal(await spentTodayUsd(owner.address, START, "cash_out"), 0);
    const { order } = await createCashOutOrder(
      { ...cashOut, amount: "200" },
      deps,
    );
    assert.equal(order.status, "awaiting_signature");
  });

  test("submit records the transfer's nonce with its hash", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps } = harness();
    const { order } = await createCashOutOrder(cashOut, deps);

    await submitCashOutSignature(order.id, await signFor(order.id), deps);

    const stored = await NimiqOrder.findById(order.id).lean();
    assert.equal(stored?.transferNonce, TRANSFER_NONCE);
    assert.equal(stored?.relayStartedAt?.getTime(), START);
  });

  test("a relay that breaks before broadcasting hands the order back for the same signature", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    const { order } = await createCashOutOrder(cashOut, deps);
    const signature = await signFor(order.id);
    state.relayError = new Error("socket hang up");

    await rejectsWith(submitCashOutSignature(order.id, signature, deps), 503);
    assert.equal(
      (await NimiqOrder.findById(order.id).lean())?.status,
      "awaiting_signature",
    );

    state.relayError = undefined;
    const retried = await submitCashOutSignature(order.id, signature, deps);
    assert.equal(retried.status, "processing");
  });

  test("a relaying order with no hash fails once the relay is old, even while it is being polled", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.now = Date.now();
    // Created just now, as if a poll had touched it a moment ago.
    const stuck = await seedOrder({
      status: "relaying",
      relayStartedAt: new Date(state.now - 11 * MINUTE),
    });

    const result = await refreshOrder(stuck._id, deps);
    assert.equal(result.status, "failed");
    assert.match(result.failureReason ?? "", /No money has moved/);
  });

  test("refreshOrder fails a transfer that can no longer mine once its nonce is used", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.now = START;
    state.receipt = "missing";
    const seed = {
      status: "relaying" as const,
      transferTxHash: TRANSFER_HASH,
      transferNonce: TRANSFER_NONCE,
      relayStartedAt: new Date(START - 11 * MINUTE),
    };
    const dropped = await seedOrder(seed);
    const waiting = await seedOrder(seed);
    const recent = await seedOrder({
      ...seed,
      relayStartedAt: new Date(START - MINUTE),
    });

    state.relayerNonce = TRANSFER_NONCE;
    assert.equal((await refreshOrder(waiting._id, deps)).status, "relaying");
    state.relayerNonce = TRANSFER_NONCE + 1;
    const failed = await refreshOrder(dropped._id, deps);
    assert.equal(failed.status, "failed");
    assert.match(failed.failureReason ?? "", /No money has moved/);
    // A fresh relay may just be on a lagging node; give it time first.
    assert.equal((await refreshOrder(recent._id, deps)).status, "relaying");
  });

  test("refreshOrder never fails a transfer while its receipt can't be read", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.receipt = null;
    state.relayerNonce = TRANSFER_NONCE + 5;
    const order = await seedOrder({
      status: "relaying",
      transferTxHash: TRANSFER_HASH,
      transferNonce: TRANSFER_NONCE,
      relayStartedAt: new Date(START - 60 * MINUTE),
    });

    assert.equal((await refreshOrder(order._id, deps)).status, "relaying");
  });

  test("an unpaid top-up stops counting once its bank details expire", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps } = harness();
    await createTopUpOrder(
      { address: owner.address, amountNgn: 640_000 },
      deps,
    );

    assert.equal(
      await spentTodayUsd(owner.address, START + 1801 * 1000, "top_up"),
      0,
    );
  });

  test("cancel closes an unpaid top-up for its own wallet only", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.switchStatus = "AWAITING_DEPOSIT";
    const order = await createTopUpOrder(
      { address: owner.address, amountNgn: 16_000 },
      deps,
    );

    await rejectsWith(cancelTopUp(order.id, FRIEND, deps), 404);
    const cancelled = await cancelTopUp(order.id, owner.address, deps);

    assert.equal(cancelled.status, "cancelled");
    assert.equal(await spentTodayUsd(owner.address, START, "top_up"), 0);
    // Cancelling twice is harmless.
    state.now += 5_000;
    assert.equal(
      (await cancelTopUp(order.id, owner.address, deps)).status,
      "cancelled",
    );
  });

  test("cancel refuses a top-up whose Naira has already arrived", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.switchStatus = "AWAITING_DEPOSIT";
    const order = await createTopUpOrder(
      { address: owner.address, amountNgn: 16_000 },
      deps,
    );
    state.switchStatus = "PROCESSING";
    state.now += 5_000;

    await rejectsWith(cancelTopUp(order.id, owner.address, deps), 409);
    assert.equal((await refreshOrder(order.id, deps)).status, "processing");
  });

  test("a cancelled top-up paid anyway still completes", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.switchStatus = "AWAITING_DEPOSIT";
    const order = await createTopUpOrder(
      { address: owner.address, amountNgn: 16_000 },
      deps,
    );
    await cancelTopUp(order.id, owner.address, deps);
    state.switchStatus = "COMPLETED";
    state.now += 10 * 60 * 1000;

    assert.equal((await refreshOrder(order.id, deps)).status, "completed");
  });

  test("an unpaid top-up Switch never closes expires after its window and grace", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.switchStatus = "PENDING";
    const order = await createTopUpOrder(
      { address: owner.address, amountNgn: 16_000 },
      deps,
    );

    state.now = START + 59 * 60 * 1000;
    assert.equal(
      (await refreshOrder(order.id, deps)).status,
      "awaiting_deposit",
    );
    state.now = START + 61 * 60 * 1000;
    assert.equal((await refreshOrder(order.id, deps)).status, "expired");
  });
  const airtime = {
    kind: "airtime" as const,
    address: owner.address,
    phone: "+234 803 123 4567",
    network: "mtn",
    amountNgn: 1000,
  };

  async function paidBill(deps: OrderDeps) {
    const { order } = await createBillOrder(airtime, deps);
    return submitBillSignature(order.id, await signFor(order.id), deps);
  }

  test("airtime is priced at the cash-out rate, rounded up, with the relayer taking the USDT", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps } = harness();

    // ₦1,000 at ₦1,500 a USDT is under the $1 cash-out minimum; bills have their own floor.
    const { order, typedData } = await createBillOrder(airtime, deps);

    const stored = await NimiqOrder.findById(order.id).lean();
    assert.equal(stored?.direction, "airtime");
    assert.equal(stored?.status, "awaiting_signature");
    assert.equal(stored?.cryptoUnits, "666667");
    assert.equal(stored?.fiatAmount, 1000);
    assert.equal(stored?.depositAddress, RELAYER);
    assert.equal(stored?.permit?.spender, RELAYER);
    assert.deepEqual(order.bill, { phone: "08031234567", network: "mtn" });
    assert.equal(JSON.parse(typedData).message.value, "666667");
  });

  test("data is charged at the bundle's listed price, never one the client sends", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps } = harness();
    const data = {
      kind: "data" as const,
      address: owner.address,
      phone: "08031234567",
      network: "mtn",
      productName: "MTN 1GB 30 days",
    };

    const { order } = await createBillOrder(data, deps);

    assert.equal(order.fiatAmount, 3000);
    assert.equal(order.cryptoAmount, "2");
    assert.equal(order.bill?.size, "1GB");
    await rejectsWith(
      createBillOrder({ ...data, productName: "MTN 100GB free" }, deps),
      400,
    );
  });

  test("bills are refused before any signature when SmartSMS isn't set up", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.billsReady = false;

    await rejectsWith(createBillOrder(airtime, deps), 503);
  });

  test("a paid bill is bought once, after the USDT reaches the relayer", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    const { order } = await createBillOrder(airtime, deps);
    const signature = await signFor(order.id);

    await rejectsWith(submitCashOutSignature(order.id, signature, deps), 404);
    const done = await submitBillSignature(order.id, signature, deps);

    assert.equal(done.status, "completed");
    assert.deepEqual(state.relayTo, [RELAYER]);
    assert.deepEqual(state.purchases, [
      {
        kind: "airtime",
        phone: "08031234567",
        amountNgn: 1000,
        productName: undefined,
        reference: order.reference,
      },
    ]);
    assert.equal(state.confirms.length, 0);
    const stored = await NimiqOrder.findById(order.id).lean();
    assert.equal(stored?.providerReference, "sms_1");
    assert.equal(
      await spentTodayUsd(owner.address, START, "airtime"),
      0.666667,
    );
  });

  test("a bill the network refuses sends the USDT back to the wallet", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.billOutcome = { status: "rejected", reason: "Invalid number" };

    const done = await paidBill(deps);

    assert.equal(done.status, "refunded");
    assert.deepEqual(state.refunds, [
      { to: owner.address, value: BigInt(666667) },
    ]);
    assert.ok(done.refundUrl?.endsWith(REFUND_HASH));
    assert.ok(done.failureReason);
    assert.equal(await spentTodayUsd(owner.address, START, "airtime"), 0);
  });

  test("an unanswered purchase stays processing: never bought again, never refunded", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.billOutcome = { status: "unknown", reason: "timeout" };

    const first = await paidBill(deps);
    state.now += MINUTE;
    const later = await refreshOrder(first.id, deps);

    assert.equal(later.status, "processing");
    assert.equal(state.purchases.length, 1);
    assert.equal(state.refunds.length, 0);
  });

  test("a transfer confirmed after the request ends is bought on the next poll", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.relayConfirmed = false;

    const pending = await paidBill(deps);
    assert.equal(pending.status, "relaying");
    assert.equal(state.purchases.length, 0);

    state.now += MINUTE;
    const done = await refreshOrder(pending.id, deps);
    assert.equal(done.status, "completed");
    assert.equal(state.purchases.length, 1);
  });

  test("a refund that couldn't be sent is tried again on the next poll", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.billOutcome = { status: "rejected", reason: "Low float" };
    state.refundError = new RelayerUnavailableError();

    const stuck = await paidBill(deps);
    assert.equal(stuck.status, "refunding");

    state.refundError = undefined;
    state.now += MINUTE;
    const done = await refreshOrder(stuck.id, deps);
    assert.equal(done.status, "refunded");
    assert.equal(state.refunds.length, 2);
  });

  test("a send stores the recipient as the deposit and never calls Switch", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();

    const { order, typedData } = await createSendOrder(send, deps);

    const stored = await NimiqOrder.findById(order.id).lean();
    assert.equal(stored?.status, "awaiting_signature");
    assert.equal(stored?.depositAddress, FRIEND);
    assert.equal(order.recipientAddress, FRIEND);
    assert.equal(stored?.permit?.spender, RELAYER);
    assert.equal(JSON.parse(typedData).message.value, "10000000");
    assert.equal(state.offramps.length + state.onramps.length, 0);
  });

  test("a send refuses its own wallet and addresses that would burn the USDT", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps } = harness();

    await rejectsWith(
      createSendOrder({ ...send, to: owner.address }, deps),
      400,
      "That's the wallet you're sending from.",
    );
    await rejectsWith(
      createSendOrder({ ...send, to: POLYGON_USDT.address }, deps),
      400,
    );
    assert.equal(await NimiqOrder.countDocuments(), 0);
  });

  test("a signed send moves the USDT to the recipient, completes and counts toward today", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    const { order } = await createSendOrder(send, deps);

    const done = await submitSendSignature(
      order.id,
      await signFor(order.id),
      deps,
    );

    assert.equal(done.status, "completed");
    assert.deepEqual(state.relayTo, [FRIEND]);
    assert.ok(done.explorerUrl?.endsWith(TRANSFER_HASH));
    assert.deepEqual(state.confirms, []);
    assert.equal(await spentTodayUsd(owner.address, START, "cash_out"), 10);
  });

  test("a send confirmed after the request ends completes on the next poll", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps, state } = harness();
    state.relayConfirmed = false;
    state.switchStatus = "FAILED";
    const { order } = await createSendOrder(send, deps);

    const pending = await submitSendSignature(
      order.id,
      await signFor(order.id),
      deps,
    );
    assert.equal(pending.status, "relaying");

    state.now += MINUTE;
    const done = await refreshOrder(order.id, deps);
    assert.equal(done.status, "completed");
    assert.deepEqual(state.confirms, []);
  });

  test("a cash-out signature can't be submitted as a send", async (t) => {
    if (skipWithoutDb(t)) return;
    const { deps } = harness();
    const { order } = await createCashOutOrder(cashOut, deps);

    await rejectsWith(
      submitSendSignature(order.id, await signFor(order.id), deps),
      404,
    );
  });
});

function NimiqOrderReady() {
  return NimiqOrder.db.readyState === 1;
}
