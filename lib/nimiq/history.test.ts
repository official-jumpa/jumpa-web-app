import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { historyEntry, visibleHistory } from "./history";
import type { NimiqOrderStatus, PublicOrder } from "./order-status";

const FRIEND = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";

function order(fields: Partial<PublicOrder> = {}): PublicOrder {
  return {
    id: "nimq_aaaaaaaaaaaaaaaaaaaa",
    direction: "cash_out",
    status: "completed",
    cryptoAmount: "25",
    fiatAmount: 39_500,
    rate: 1580,
    reference: "ref",
    createdAt: "2026-11-07T12:00:00.000Z",
    bank: {
      name: "Access Bank",
      accountName: "Ada Okafor",
      accountNumberMasked: "••••6789",
    },
    ...fields,
  };
}

const topUp = (fields: Partial<PublicOrder> = {}) =>
  order({
    direction: "top_up",
    cryptoAmount: "6.25",
    fiatAmount: 10_000,
    bank: undefined,
    ...fields,
  });

describe("historyEntry", () => {
  test("a cash-out is USDT out to the account holder", () => {
    const entry = historyEntry(order());
    assert.equal(entry.id, "nimq_aaaaaaaaaaaaaaaaaaaa");
    assert.equal(entry.kind, "send");
    assert.equal(entry.title, "Cash-out to Ada Okafor");
    assert.equal(entry.amount, "-25.00 USDT");
    assert.equal(entry.createdAt, Date.parse("2026-11-07T12:00:00.000Z"));
    assert.equal(entry.chain, "polygon");
  });

  test("a top-up into this wallet is USDT in", () => {
    const entry = historyEntry(topUp());
    assert.equal(entry.kind, "receive");
    assert.equal(entry.title, "Top-up with Naira");
    assert.equal(entry.amount, "+6.25 USDT");
  });

  test("a top-up to another wallet is Naira paid out, named by that wallet", () => {
    const entry = historyEntry(topUp({ recipientAddress: FRIEND }));
    assert.equal(entry.kind, "send");
    assert.equal(entry.title, "Top-up to 0x5aAe...eAed");
    assert.equal(entry.amount, "-₦10,000.00");
  });

  test("money still moving is pending; failed and expired orders are failed", () => {
    const cases: [NimiqOrderStatus, string][] = [
      ["relaying", "pending"],
      ["awaiting_deposit", "pending"],
      ["processing", "pending"],
      ["completed", "completed"],
      ["failed", "failed"],
      ["expired", "failed"],
    ];
    for (const [status, expected] of cases) {
      assert.equal(historyEntry(order({ status })).status, expected, status);
    }
  });
});

describe("visibleHistory", () => {
  test("lists newest first and leaves out orders where nothing happened", () => {
    const older = order({
      id: "nimq_older",
      createdAt: "2026-11-06T09:00:00Z",
    });
    const newer = topUp({
      id: "nimq_newer",
      createdAt: "2026-11-07T09:00:00Z",
    });
    const unsigned = order({
      id: "nimq_unsigned",
      status: "awaiting_signature",
    });
    const unpaid = topUp({ id: "nimq_unpaid", status: "expired" });
    const failed = order({
      id: "nimq_failed",
      status: "failed",
      createdAt: "2026-11-05T09:00:00Z",
    });

    assert.deepEqual(
      visibleHistory([older, unsigned, failed, newer, unpaid]).map((o) => o.id),
      ["nimq_newer", "nimq_older", "nimq_failed"],
    );
  });
});
