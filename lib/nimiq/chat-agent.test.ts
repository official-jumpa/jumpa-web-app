import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Address } from "viem";
import type { AIStepResponse, ChatHistoryMessage } from "@/lib/ai/jumpaAgent";
import { BankLookupError } from "./bank";
import { answerChat, type ChatDeps, runNimiqTool } from "./chat-agent";
import type { PublicOrder } from "./order-status";
import { OrderError } from "./orders";

const ADDRESS: Address = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";

const TOP_UP_ORDER: PublicOrder = {
  id: "order-1",
  direction: "top_up",
  status: "awaiting_deposit",
  cryptoAmount: "10",
  fiatAmount: 16_000,
  rate: 1600,
  reference: "REF-1",
  createdAt: "2026-11-10T20:00:00.000Z",
  depositBank: {
    bankName: "Test Bank",
    accountName: "Checkout",
    accountNumber: "0123456789",
    notes: [],
  },
};

function deps(steps: AIStepResponse[] = []): ChatDeps & {
  seen: ChatHistoryMessage[][];
} {
  const seen: ChatHistoryMessage[][] = [];
  return {
    seen,
    account: async () => ({
      usdtBalance: "25.5",
      spentTodayUsd: 20,
      remainingTodayUsd: 480,
      limits: { minUsd: 1, maxTxUsd: 500, dailyUsd: 500 },
    }),
    quote: async (direction, amount) =>
      direction === "cash_out"
        ? {
            rate: 1580,
            send: { amount, currency: "USDT" },
            receive: { amount: amount * 1580, currency: "NGN" },
          }
        : {
            rate: 0.000625,
            send: { amount, currency: "NGN" },
            receive: { amount: amount / 1600, currency: "USDT" },
          },
    plans: async () => ({
      plans: [
        {
          id: "b",
          size: "2GB",
          period: "monthly",
          validity: "Monthly plan (30 days)",
          price: "₦1,500",
          productName: "MTN-2GB",
          numericPrice: 1500,
        },
        {
          id: "a",
          size: "1GB",
          period: "weekly",
          validity: "Weekly plan (7 days)",
          price: "₦500",
          productName: "MTN-1GB",
          numericPrice: 500,
        },
        // No product name: SmartSMS can't sell it, so it is never offered.
        {
          id: "c",
          size: "5GB",
          period: "monthly",
          validity: "",
          price: "₦3,000",
        },
      ],
    }),
    resolveAccount: async (accountNumber) => {
      if (accountNumber === "0000000000") {
        throw new BankLookupError("We couldn't find that account.");
      }
      return { accountName: "ADA OBI", bankName: "GTBank", switchCode: "058" };
    },
    topUp: async () => TOP_UP_ORDER,
    step: async ({ messages }) => {
      seen.push([...messages]);
      const next = steps.shift();
      assert.ok(next, "the model was asked more often than expected");
      return next;
    },
  };
}

const call = (toolName: string, toolArgs: Record<string, unknown> = {}) =>
  ({
    mode: "tool_calls",
    toolCalls: [{ toolCallId: `call_${toolName}`, toolName, toolArgs }],
    rawAssistantMessage: { role: "assistant", content: "", tool_calls: [] },
  }) satisfies AIStepResponse;

describe("runNimiqTool", () => {
  test("airtime: a full request is priced into a card to confirm", async () => {
    const result = await runNimiqTool(
      "buy_airtime",
      { phone: "+234 803 123 4567", amountNgn: 500 },
      ADDRESS,
      deps(),
    );
    assert.deepEqual(result.card, {
      type: "confirm",
      proposal: {
        kind: "airtime",
        phone: "08031234567",
        network: "mtn",
        amountNgn: 500,
        usdt: 0.32,
      },
    });
  });

  test("airtime: a bad number and a missing amount are asked for, with no card", async () => {
    const result = await runNimiqTool(
      "buy_airtime",
      { phone: "12345" },
      ADDRESS,
      deps(),
    );
    assert.equal(result.card, undefined);
    assert.match(result.summary, /isn't a valid Nigerian number/);
    assert.match(result.summary, /the phone number and the amount in Naira/);
  });

  test("airtime: more than the balance is refused before any card", async () => {
    const result = await runNimiqTool(
      "buy_airtime",
      { phone: "08031234567", amountNgn: 50_000 },
      ADDRESS,
      deps(),
    );
    assert.equal(result.card, undefined);
    assert.match(result.summary, /balance is 25\.50 USDT/);
  });

  test("data: lists the sellable plans, cheapest first, narrowed by size", async () => {
    const all = await runNimiqTool(
      "buy_data",
      { phone: "08031234567" },
      ADDRESS,
      deps(),
    );
    assert.equal(all.card?.type, "plans");
    if (all.card?.type !== "plans") return;
    assert.deepEqual(
      all.card.plans.map((plan) => plan.productName),
      ["MTN-1GB", "MTN-2GB"],
    );
    assert.equal(all.card.perUsdt, 1580);

    const sized = await runNimiqTool(
      "buy_data",
      { phone: "08031234567", size: "2 gb" },
      ADDRESS,
      deps(),
    );
    assert.deepEqual(
      sized.card?.type === "plans" && sized.card.plans.map((p) => p.size),
      ["2GB"],
    );
  });

  test("cash-out: confirms the account holder and prices the payout", async () => {
    const result = await runNimiqTool(
      "cash_out",
      { amountUsdt: 20, accountNumber: "012 345 6789", bank: "gtb" },
      ADDRESS,
      deps(),
    );
    assert.deepEqual(result.card, {
      type: "confirm",
      proposal: {
        kind: "cash-out",
        amountUsdt: "20",
        bank: "GTBank",
        accountNumber: "0123456789",
        accountName: "ADA OBI",
        amountNgn: 31_600,
      },
    });
  });

  test("cash-out: missing details, the balance and a failed lookup stop before a card", async () => {
    const asked = await runNimiqTool(
      "cash_out",
      { amountUsdt: 20 },
      ADDRESS,
      deps(),
    );
    assert.match(asked.summary, /the account number and the bank/);
    const over = await runNimiqTool(
      "cash_out",
      { amountUsdt: 30, accountNumber: "0123456789", bank: "gtb" },
      ADDRESS,
      deps(),
    );
    assert.match(over.summary, /less than 30/);
    const unknown = await runNimiqTool(
      "cash_out",
      { amountUsdt: 20, accountNumber: "0000000000", bank: "gtb" },
      ADDRESS,
      deps(),
    );
    assert.match(unknown.summary, /couldn't find that account/);
    for (const result of [asked, over, unknown]) {
      assert.equal(result.card, undefined);
    }
  });

  test("top-up: opens straight away, so the card shows the account before Confirm", async () => {
    const opened: [Address, number][] = [];
    const result = await runNimiqTool(
      "top_up",
      { amountNgn: 16_000 },
      ADDRESS,
      {
        ...deps(),
        topUp: async (address, amountNgn) => {
          opened.push([address, amountNgn]);
          return TOP_UP_ORDER;
        },
      },
    );
    assert.deepEqual(opened, [[ADDRESS, 16_000]]);
    assert.deepEqual(result.card, { type: "order", order: TOP_UP_ORDER });
    assert.match(result.summary, /10\.00 USDT/);
    assert.match(result.summary, /account/);
    assert.match(result.summary, /Confirm.*I've sent the money/);
  });

  test("top-up: a refusal is explained, with no card", async () => {
    const result = await runNimiqTool(
      "top_up",
      { amountNgn: 16_000 },
      ADDRESS,
      {
        ...deps(),
        topUp: async () => {
          throw new OrderError("Top-ups are paused right now.", 503);
        },
      },
    );
    assert.equal(result.card, undefined);
    assert.match(result.summary, /Top-ups are paused right now\./);
  });

  test("balance and rates come from the tools, in Naira per USDT", async () => {
    const balance = await runNimiqTool("check_balance", {}, ADDRESS, deps());
    assert.match(balance.summary, /25\.50 USDT/);
    assert.match(balance.summary, /\$480/);
    const rates = await runNimiqTool(
      "get_rate",
      { direction: "both" },
      ADDRESS,
      deps(),
    );
    assert.match(rates.summary, /₦1,580\.00/);
    assert.match(rates.summary, /₦1,600\.00/);
    assert.equal(rates.card, undefined);
  });

  test("an unknown tool is refused without a card", async () => {
    const result = await runNimiqTool("send_funds", {}, ADDRESS, deps());
    assert.equal(result.card, undefined);
    assert.match(result.summary, /not available/);
  });
});

describe("answerChat", () => {
  test("a tool call then a reply returns the reply and the card under it", async () => {
    const d = deps([
      call("buy_data", { phone: "08031234567" }),
      { mode: "chat", message: "Pick a plan below." },
    ]);
    const answer = await answerChat(
      ADDRESS,
      [{ role: "user", content: "data for 08031234567" }],
      d,
    );
    assert.equal(answer.reply, "Pick a plan below.");
    assert.equal(answer.card?.type, "plans");
    // The second step saw the tool's result.
    assert.equal(d.seen[1].at(-1)?.role, "tool");
  });

  test("a model that keeps calling tools still ends with a reply", async () => {
    const answer = await answerChat(
      ADDRESS,
      [{ role: "user", content: "balance" }],
      deps([
        call("check_balance"),
        call("check_balance"),
        { mode: "chat", message: "You have 25.50 USDT." },
      ]),
    );
    assert.equal(answer.reply, "You have 25.50 USDT.");
  });
});
