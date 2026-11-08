import assert from "node:assert/strict";
import { describe, test } from "node:test";
import environment from "@/lib/environment";
import { getSwitchFeeRecipient, isSwitchAssetAllowed } from "@/lib/switch";

describe("isSwitchAssetAllowed", () => {
  test("keeps Polygon USDT out of the main app's calls", () => {
    assert.equal(isSwitchAssetAllowed("polygon:usdt"), false);
  });

  test("lets the mini app opt in to Polygon USDT", () => {
    assert.equal(isSwitchAssetAllowed("polygon:usdt", true), true);
  });

  test("still allows the main app's assets", () => {
    assert.equal(isSwitchAssetAllowed("base:usdc"), true);
    assert.equal(isSwitchAssetAllowed("base:usdc", true), true);
  });

  test("normalises the eth: shorthand before checking", () => {
    assert.equal(isSwitchAssetAllowed("eth:usdt"), true);
  });

  test("never allows an asset neither list names", () => {
    assert.equal(isSwitchAssetAllowed("polygon:dai", true), false);
  });
});

describe("getSwitchFeeRecipient", () => {
  test("pays Polygon developer fees to the EVM fee wallet", () => {
    const original = environment.FEE_WALLET_EVM;
    environment.FEE_WALLET_EVM = "0x000000000000000000000000000000000000dEaD";
    try {
      assert.equal(
        getSwitchFeeRecipient("polygon:usdt"),
        "0x000000000000000000000000000000000000dEaD",
      );
    } finally {
      environment.FEE_WALLET_EVM = original;
    }
  });
});
