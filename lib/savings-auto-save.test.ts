import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  amountRuleError,
  formatAutoSaveAmount,
  toCurrencyPrecision,
} from "./savings-auto-save";

describe("amountRuleError", () => {
  it("keeps Naira whole and at least ₦1", () => {
    assert.equal(amountRuleError(500, "NGN"), undefined);
    assert.equal(amountRuleError(0.5, "NGN"), "The smallest amount is ₦1");
    assert.equal(amountRuleError(500.5, "NGN"), "Use a whole amount");
  });

  it("lets USDC go down to $0.10, to the cent", () => {
    assert.equal(amountRuleError(0.1, "USDC"), undefined);
    assert.equal(amountRuleError(12.34, "USDC"), undefined);
    assert.equal(amountRuleError(0.09, "USDC"), "The smallest amount is $0.10");
    assert.equal(amountRuleError(1.234, "USDC"), "Use up to 2 decimal places");
  });

  it("is not fooled by float noise on cent amounts", () => {
    assert.equal(amountRuleError(0.1 + 0.2, "USDC"), undefined);
    assert.equal(amountRuleError(1.15, "USDC"), undefined);
  });
});

describe("toCurrencyPrecision", () => {
  it("drops what the currency cannot carry, never rounding up", () => {
    assert.equal(toCurrencyPrecision(12.349, "USDC"), 12.34);
    assert.equal(toCurrencyPrecision(0.009, "USDC"), 0);
    assert.equal(toCurrencyPrecision(999.9, "NGN"), 999);
  });

  it("keeps exact cents exact", () => {
    assert.equal(toCurrencyPrecision(1.15, "USDC"), 1.15);
    assert.equal(toCurrencyPrecision(0.1 + 0.2, "USDC"), 0.3);
  });
});

describe("formatAutoSaveAmount", () => {
  it("shows cents only when there are some", () => {
    assert.equal(formatAutoSaveAmount(2000, "NGN"), "₦2,000");
    assert.equal(formatAutoSaveAmount(5, "USDC"), "$5");
    assert.equal(formatAutoSaveAmount(0.1, "USDC"), "$0.10");
  });
});
