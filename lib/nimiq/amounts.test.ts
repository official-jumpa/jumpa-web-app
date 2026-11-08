import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { AMOUNT_PATTERN, fromUnits, nairaPerUsdt, toUnits } from "./amounts";

describe("toUnits", () => {
  test("converts a decimal amount to 6-decimal base units", () => {
    assert.equal(toUnits("10.5"), BigInt(10_500_000));
  });

  test("keeps the smallest unit exact", () => {
    assert.equal(toUnits("0.000001"), BigInt(1));
  });

  for (const bad of [
    "1.0000001",
    "-1",
    "abc",
    "0",
    "0.000000",
    "",
    "1e3",
    " 1",
  ]) {
    test(`rejects ${JSON.stringify(bad)}`, () => {
      assert.throws(() => toUnits(bad));
    });
  }
});

describe("fromUnits", () => {
  test("drops trailing zeros", () => {
    assert.equal(fromUnits(BigInt(10_500_000)), "10.5");
  });

  test("prints whole amounts without a decimal point", () => {
    assert.equal(fromUnits(BigInt(2_000_000)), "2");
  });
});

describe("AMOUNT_PATTERN", () => {
  test("accepts up to six decimals", () => {
    assert.equal(AMOUNT_PATTERN.test("12.123456"), true);
    assert.equal(AMOUNT_PATTERN.test("12.1234567"), false);
  });
});

describe("nairaPerUsdt", () => {
  test("reads a cash-out quote as Naira received per USDT sent", () => {
    const quote = {
      rate: 0.000625,
      send: { amount: 10, currency: "USDT" },
      receive: { amount: 15_800, currency: "NGN" },
    };
    assert.equal(nairaPerUsdt(quote), 1580);
  });

  test("reads a top-up quote as Naira paid per USDT received", () => {
    const quote = {
      rate: 1600,
      send: { amount: 16_000, currency: "NGN" },
      receive: { amount: 9.5, currency: "USDT" },
    };
    assert.equal(nairaPerUsdt(quote), 16_000 / 9.5);
  });

  test("is undefined when the quote moves nothing", () => {
    const quote = {
      rate: 1600,
      send: { amount: 100, currency: "NGN" },
      receive: { amount: 0, currency: "USDT" },
    };
    assert.equal(nairaPerUsdt(quote), undefined);
  });
});
