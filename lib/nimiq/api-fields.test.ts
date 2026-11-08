import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { orderIdsField, recipientField } from "./api";
import { MAX_LISTED_ORDERS } from "./constants";

const id = (n: number) => `nimq_${String(n).padStart(20, "0")}`;

describe("orderIdsField", () => {
  test("splits, trims and de-duplicates the ids", () => {
    assert.deepEqual(orderIdsField.parse(`${id(1)}, ${id(2)},${id(1)},`), [
      id(1),
      id(2),
    ]);
  });

  test("refuses a missing list, a malformed id and an oversized list", () => {
    assert.equal(orderIdsField.safeParse(undefined).success, false);
    assert.equal(orderIdsField.safeParse("").success, false);
    assert.equal(orderIdsField.safeParse(`${id(1)},bad`).success, false);
    const many = Array.from({ length: MAX_LISTED_ORDERS + 1 }, (_, n) => id(n));
    assert.equal(orderIdsField.safeParse(many.join(",")).success, false);
  });
});

describe("recipientField", () => {
  test("passes a wallet through trimmed", () => {
    const wallet = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
    assert.equal(recipientField.parse(` ${wallet} `), wallet);
  });

  test("refuses the zero address with the shared copy", () => {
    const result = recipientField.safeParse(
      "0x0000000000000000000000000000000000000000",
    );
    assert.equal(result.success, false);
    assert.equal(
      result.error?.issues[0]?.message,
      "This address can't receive USDT.",
    );
  });
});
