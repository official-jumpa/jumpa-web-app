// node --import tsx --test  (npm test)
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decimalsFor,
  FIAT_DECIMALS,
  formatUsd,
  TOKEN_DECIMALS,
  usdEquivalent,
} from "./token-amount";

test("decimalsFor: per-token precision, case and whitespace insensitive", () => {
  assert.equal(decimalsFor("USDC"), 6);
  assert.equal(decimalsFor("usdc"), 6);
  assert.equal(decimalsFor(" xlm "), 7);
  assert.equal(decimalsFor("BTC"), 8);
});

test("decimalsFor: unknown, empty or missing symbols fall back to fiat precision", () => {
  assert.equal(decimalsFor("NGN"), FIAT_DECIMALS);
  assert.equal(decimalsFor("DOGE"), FIAT_DECIMALS);
  assert.equal(decimalsFor(""), FIAT_DECIMALS);
  assert.equal(decimalsFor(undefined), FIAT_DECIMALS);
});

test("TOKEN_DECIMALS: never above the 8-decimal UI cap", () => {
  for (const [symbol, decimals] of Object.entries(TOKEN_DECIMALS)) {
    assert.ok(decimals <= 8, `${symbol} allows ${decimals} decimals`);
    assert.ok(Number.isInteger(decimals) && decimals > 0, symbol);
  }
});

test("formatUsd: two decimals from one dollar up, with thousands separators", () => {
  assert.equal(formatUsd(1), "$1.00");
  assert.equal(formatUsd(12.394), "$12.39");
  assert.equal(formatUsd(1234567.891), "$1,234,567.89");
});

test("formatUsd: up to four decimals below one dollar", () => {
  assert.equal(formatUsd(0.15), "$0.15");
  assert.equal(formatUsd(0.1234), "$0.1234");
  assert.equal(formatUsd(0.00015), "$0.0002");
});

test("formatUsd: dust is shown as a bound instead of $0.00", () => {
  assert.equal(formatUsd(0.00009), "< $0.0001");
  assert.equal(formatUsd(0.0001), "$0.0001");
  assert.equal(formatUsd(0), "$0.00");
});

test("usdEquivalent: amount × price with the approximate sign", () => {
  assert.equal(usdEquivalent("2.5", "4.956"), "≈ $12.39");
  assert.equal(usdEquivalent(0.0837, 150), "≈ $12.56");
  assert.equal(usdEquivalent("10", "0.05"), "≈ $0.50");
});

test("usdEquivalent: nothing to show without an amount or a price", () => {
  assert.equal(usdEquivalent("", "1"), undefined);
  assert.equal(usdEquivalent("0", "1"), undefined);
  assert.equal(usdEquivalent("abc", "1"), undefined);
  assert.equal(usdEquivalent("-5", "1"), undefined);
  assert.equal(usdEquivalent("1", undefined), undefined);
  assert.equal(usdEquivalent("1", "0"), undefined);
});

test("usdEquivalent: dust keeps the bound without a second approximate sign", () => {
  assert.equal(usdEquivalent("0.000001", "1"), "< $0.0001");
});
