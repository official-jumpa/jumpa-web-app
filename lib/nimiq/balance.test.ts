import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isBalanceMove, movesOwnBalance, waitForChange } from "./balance";
import type { NimiqOrderStatus, PublicOrder } from "./order-status";

const FAST = { intervalMs: 5, timeoutMs: 60 };

function order(fields: Partial<PublicOrder> = {}): PublicOrder {
  return {
    id: "nimq_aaaaaaaaaaaaaaaaaaaa",
    direction: "top_up",
    status: "completed",
    cryptoAmount: "6.25",
    fiatAmount: 10_000,
    rate: 1600,
    reference: "ref",
    createdAt: "2026-11-08T04:00:00.000Z",
    ...fields,
  };
}

function reads(values: (string | Error)[]) {
  let calls = 0;
  const read = async () => {
    const value = values[Math.min(calls, values.length - 1)];
    calls += 1;
    if (value instanceof Error) throw value;
    return value;
  };
  return { read, calls: () => calls };
}

describe("movesOwnBalance", () => {
  test("a completed top-up into this wallet moves the balance", () => {
    assert.equal(movesOwnBalance(order()), true);
  });

  test("a top-up paid out to another wallet leaves this balance alone", () => {
    assert.equal(
      movesOwnBalance(
        order({
          recipientAddress: "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
        }),
      ),
      false,
    );
  });

  test("a cash-out moves the balance once its transfer is on chain", () => {
    const cases: [NimiqOrderStatus, boolean][] = [
      ["awaiting_signature", false],
      ["relaying", false],
      ["processing", true],
      ["completed", true],
      ["failed", false],
    ];
    for (const [status, expected] of cases) {
      assert.equal(
        movesOwnBalance(order({ direction: "cash_out", status })),
        expected,
        status,
      );
    }
  });

  test("a bill moves the balance once its USDT has left, refunded or not", () => {
    for (const direction of ["airtime", "data"] as const) {
      assert.equal(
        movesOwnBalance(order({ direction, status: "relaying" })),
        false,
      );
      for (const status of [
        "processing",
        "completed",
        "refunding",
        "refunded",
      ] as const) {
        assert.equal(
          movesOwnBalance(order({ direction, status })),
          true,
          status,
        );
      }
    }
  });

  test("a top-up still waiting for Naira moves nothing", () => {
    assert.equal(movesOwnBalance(order({ status: "awaiting_deposit" })), false);
    assert.equal(movesOwnBalance(order({ status: "processing" })), false);
  });
});

describe("isBalanceMove", () => {
  test("counts an order seen pending and now done", () => {
    assert.equal(isBalanceMove(false, order()), true);
  });

  test("an order first seen already done (opened from history) is not a new move", () => {
    assert.equal(isBalanceMove(undefined, order()), false);
  });

  test("counts the move once", () => {
    assert.equal(isBalanceMove(true, order()), false);
  });
});

describe("waitForChange", () => {
  test("stops at the first read that differs", async () => {
    const node = reads(["1.4", "2.4"]);
    assert.equal(await waitForChange(node.read, "1.4", FAST), "2.4");
    assert.equal(node.calls(), 2);
  });

  test("a balance that already moved is returned after one read", async () => {
    const node = reads(["2.4"]);
    assert.equal(await waitForChange(node.read, "1.4", FAST), "2.4");
    assert.equal(node.calls(), 1);
  });

  test("a failed read counts as unchanged and the check goes on", async () => {
    const node = reads([new Error("rpc down"), "2.4"]);
    assert.equal(await waitForChange(node.read, "1.4", FAST), "2.4");
  });

  test("gives up after the timeout with the last value read", async () => {
    const node = reads(["1.4"]);
    assert.equal(await waitForChange(node.read, "1.4", FAST), "1.4");
    assert.ok(node.calls() > 1 && node.calls() < 30, String(node.calls()));
  });

  test("stops once aborted", async () => {
    const controller = new AbortController();
    const node = reads(["1.4"]);
    setTimeout(() => controller.abort(), 12);
    await waitForChange(node.read, "1.4", {
      ...FAST,
      signal: controller.signal,
    });
    assert.ok(node.calls() < 6, String(node.calls()));
  });
});
