import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { cashOutCeiling, checkAmountLimits, topUpBounds } from "./limits";

const limits = { minUsd: 1, maxTxUsd: 500, dailyUsd: 500 };

describe("checkAmountLimits", () => {
  test("refuses an amount under the minimum", () => {
    assert.equal(
      checkAmountLimits({ ...limits, usd: 0.5, spentTodayUsd: 0 }),
      "The smallest amount is $1.",
    );
  });

  test("refuses an amount over the per-transaction maximum", () => {
    assert.equal(
      checkAmountLimits({
        ...limits,
        maxTxUsd: 300,
        usd: 301,
        spentTodayUsd: 0,
      }),
      "The most you can move at once is $300.",
    );
  });

  test("refuses an amount that would pass the daily limit, saying what is left", () => {
    assert.equal(
      checkAmountLimits({ ...limits, usd: 60, spentTodayUsd: 450 }),
      "You can move $50.00 more today.",
    );
  });

  test("says the limit is used up when nothing is left today", () => {
    assert.equal(
      checkAmountLimits({ ...limits, usd: 5, spentTodayUsd: 500 }),
      "You've reached today's $500 limit. Try again tomorrow.",
    );
  });

  test("allows exactly the maximum with nothing spent", () => {
    assert.equal(
      checkAmountLimits({ ...limits, usd: 500, spentTodayUsd: 0 }),
      null,
    );
  });
});

describe("cashOutCeiling", () => {
  test("is the balance, floored to cents, when it fits every limit", () => {
    assert.equal(
      cashOutCeiling({
        balance: "463.690445",
        maxTxUsd: 500,
        remainingTodayUsd: 480,
      }),
      "463.69",
    );
  });

  test("stops at what is left today, floored to the cent", () => {
    assert.equal(
      cashOutCeiling({
        balance: "900",
        maxTxUsd: 500,
        remainingTodayUsd: 100.129,
      }),
      "100.12",
    );
  });

  test("stops at the per-transaction limit", () => {
    assert.equal(
      cashOutCeiling({ balance: "900", maxTxUsd: 300, remainingTodayUsd: 500 }),
      "300",
    );
  });

  test("is zero when nothing can move", () => {
    assert.equal(
      cashOutCeiling({ balance: "0", maxTxUsd: 500, remainingTodayUsd: 0 }),
      "0",
    );
  });
});

describe("topUpBounds", () => {
  test("converts the dollar limits to whole Naira, rounded inward", () => {
    assert.deepEqual(
      topUpBounds({
        minUsd: 1,
        maxTxUsd: 500,
        remainingTodayUsd: 480,
        perUsdt: 1601.5,
      }),
      { min: 1602, max: 768_720 },
    );
  });

  test("caps the most at today's remainder when it is lower", () => {
    assert.deepEqual(
      topUpBounds({
        minUsd: 1,
        maxTxUsd: 500,
        remainingTodayUsd: 20.5,
        perUsdt: 1600,
      }),
      { min: 1600, max: 32_800 },
    );
  });

  test("never goes below zero once the day is used up", () => {
    assert.deepEqual(
      topUpBounds({
        minUsd: 1,
        maxTxUsd: 500,
        remainingTodayUsd: -3,
        perUsdt: 1600,
      }),
      { min: 1600, max: 0 },
    );
  });
});
