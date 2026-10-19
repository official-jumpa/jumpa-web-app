// node --import tsx --test  (npm test)
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkLength, digitsOf } from "./validation";

test("digitsOf: strips spaces, dashes and any other non-digit", () => {
  assert.equal(digitsOf("012 345-6789"), "0123456789");
  assert.equal(digitsOf("+234 (801) 234 5678"), "2348012345678");
  assert.equal(digitsOf("abc"), "");
});

test("checkLength: empty input returns the caller's empty message", () => {
  assert.equal(
    checkLength("", 10, "Account numbers", "Enter an account number."),
    "Enter an account number.",
  );
  assert.equal(
    checkLength(" - ", 10, "Account numbers", "Enter an account number."),
    "Enter an account number.",
  );
});

test("checkLength: too short says how many digits were entered", () => {
  assert.equal(
    checkLength("0123 456", 10, "Account numbers", "empty"),
    "Account numbers are 10 digits, you have entered 7.",
  );
});

test("checkLength: formatted input that reaches the length passes", () => {
  assert.equal(
    checkLength("012-345-6789", 10, "Account numbers", "empty"),
    undefined,
  );
});
