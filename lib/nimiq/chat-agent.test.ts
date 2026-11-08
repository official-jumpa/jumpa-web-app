import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Address } from "viem";
import type { AIStepResponse, ChatHistoryMessage } from "@/lib/ai/jumpaAgent";
import { answerChat, type ChatDeps, runNimiqTool } from "./chat-agent";

const ADDRESS: Address = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";

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
  test("airtime: normalizes the number, detects the network and keeps a valid amount", async () => {
    const result = await runNimiqTool(
      "buy_airtime",
      { phone: "+234 803 123 4567", amountNgn: 500 },
      ADDRESS,
      deps(),
    );
    assert.deepEqual(result.handoff, {
      flow: "airtime",
      phone: "08031234567",
      network: "mtn",
      amountNgn: 500,
    });
  });

  test("airtime: drops a bad number and an out-of-range amount, and says so", async () => {
    const result = await runNimiqTool(
      "buy_airtime",
      { phone: "12345", amountNgn: 90_000 },
      ADDRESS,
      deps(),
    );
    assert.deepEqual(result.handoff, { flow: "airtime" });
    assert.match(result.summary, /isn't a valid Nigerian number/);
    assert.match(result.summary, /₦50 to ₦50,000/);
  });

  test("cash-out: keeps a valid amount and a 10-digit account number", async () => {
    const result = await runNimiqTool(
      "start_cash_out",
      { amountUsdt: 20, accountNumber: "012 345 6789" },
      ADDRESS,
      deps(),
    );
    assert.deepEqual(result.handoff, {
      flow: "cash-out",
      amountUsdt: "20",
      accountNumber: "0123456789",
    });
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
    assert.equal(rates.handoff, undefined);
  });

  test("an unknown tool is refused without a handoff", async () => {
    const result = await runNimiqTool("send_funds", {}, ADDRESS, deps());
    assert.equal(result.handoff, undefined);
    assert.match(result.summary, /not available/);
  });
});

describe("answerChat", () => {
  test("a tool call then a reply returns the reply and the screen to open", async () => {
    const d = deps([
      call("buy_data", { phone: "08031234567" }),
      { mode: "chat", message: "Tap Open data to pick a plan." },
    ]);
    const answer = await answerChat(
      ADDRESS,
      [{ role: "user", content: "data for 08031234567" }],
      d,
    );
    assert.equal(answer.reply, "Tap Open data to pick a plan.");
    assert.deepEqual(answer.handoff, {
      flow: "data",
      phone: "08031234567",
      network: "mtn",
    });
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
