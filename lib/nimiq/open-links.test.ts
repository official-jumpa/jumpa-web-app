import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  NIMIQ_MINI_APP_ADDRESS,
  NIMIQ_OPEN_URL,
  NIMIQ_PAY_STORES,
} from "./constants";

describe("Nimiq Pay open links", () => {
  test("the deeplink opens the same address people are told to type", () => {
    assert.equal(NIMIQ_MINI_APP_ADDRESS, "usejumpa.com/nimiq");
    assert.equal(
      NIMIQ_OPEN_URL,
      `https://nimpay.app/miniapps/open/${NIMIQ_MINI_APP_ADDRESS}`,
    );
  });

  test("the store links are Nimiq Pay's official listings", () => {
    assert.deepEqual(NIMIQ_PAY_STORES, [
      {
        label: "App Store",
        href: "https://apps.apple.com/app/nimiq-pay/id6471844738",
      },
      {
        label: "Google Play",
        href: "https://play.google.com/store/apps/details?id=com.nimiq.pay",
      },
    ]);
  });
});
