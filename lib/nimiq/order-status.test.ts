import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { fromSwitchStatus, isInFlight } from "./order-status";

describe("fromSwitchStatus", () => {
  const cases: [string, ReturnType<typeof fromSwitchStatus>][] = [
    ["AWAITING_DEPOSIT", "awaiting_deposit"],
    ["PENDING", "awaiting_deposit"],
    ["INITIATED", "awaiting_deposit"],
    ["PROCESSING", "processing"],
    ["CONFIRMING", "processing"],
    ["COMPLETED", "completed"],
    ["SUCCESS", "completed"],
    ["SETTLED", "completed"],
    ["FAILED", "failed"],
    ["EXPIRED", "failed"],
    ["CANCELLED", "failed"],
    ["REFUNDED", "failed"],
    ["weird", null],
    ["", null],
  ];

  for (const [raw, expected] of cases) {
    test(`${JSON.stringify(raw)} → ${expected}`, () => {
      assert.equal(fromSwitchStatus(raw), expected);
    });
  }

  test("ignores case and surrounding space", () => {
    assert.equal(fromSwitchStatus(" completed "), "completed");
  });
});

describe("isInFlight", () => {
  test("is true once money is moving and until it settles", () => {
    for (const status of [
      "relaying",
      "awaiting_deposit",
      "processing",
    ] as const) {
      assert.equal(isInFlight({ status }), true, status);
    }
  });

  test("is false for an unsigned cash-out and every final status", () => {
    for (const status of [
      "awaiting_signature",
      "completed",
      "failed",
      "expired",
    ] as const) {
      assert.equal(isInFlight({ status }), false, status);
    }
  });
});
