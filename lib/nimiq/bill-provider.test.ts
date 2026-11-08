import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readProviderReply } from "./bill-provider";

describe("SmartSMS replies", () => {
  test("a successful reply is delivered with the provider's id", () => {
    assert.deepEqual(
      readProviderReply(200, { success: true, data: { id: 98765 } }),
      { status: "delivered", reference: "98765" },
    );
  });

  test("an explicit refusal is rejected with the provider's words", () => {
    assert.deepEqual(
      readProviderReply(200, { success: false, comment: "Invalid number" }),
      { status: "rejected", reason: "Invalid number" },
    );
    assert.deepEqual(
      readProviderReply(400, { success: false, error: "Low balance" }),
      { status: "rejected", reason: "Low balance" },
    );
  });

  test("anything unreadable might have gone through, so it is unknown", () => {
    assert.equal(readProviderReply(502, { success: false }).status, "unknown");
    assert.equal(readProviderReply(200, null).status, "unknown");
    assert.equal(readProviderReply(200, "<html>").status, "unknown");
    assert.equal(readProviderReply(500, { success: true }).status, "unknown");
  });
});
