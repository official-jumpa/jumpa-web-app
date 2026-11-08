import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MINI_APP_TAB_HREF, readView, tabHrefOf } from "./views";

const view = (query: string) => readView(new URLSearchParams(query));

describe("mini app views", () => {
  test("each tab reads back from its own href", () => {
    assert.deepEqual(view(""), { name: "home" });
    assert.deepEqual(view("view=history"), { name: "history" });
    assert.deepEqual(view("view=me"), { name: "me" });
    for (const href of Object.values(MINI_APP_TAB_HREF)) {
      const query = href.split("?")[1] ?? "";
      assert.equal(tabHrefOf(view(query)), href);
    }
  });

  test("flows and orders are not tabs", () => {
    assert.deepEqual(view("view=cash-out"), { name: "cash-out" });
    assert.equal(tabHrefOf(view("view=cash-out")), null);
    const order = view("order=nimq_00000000000000000001&from=history");
    assert.deepEqual(order, {
      name: "order",
      orderId: "nimq_00000000000000000001",
      fromHistory: true,
    });
    assert.equal(tabHrefOf(order), null);
  });

  test("anything unknown lands on home", () => {
    assert.deepEqual(view("view=admin"), { name: "home" });
    assert.deepEqual(view("order=not-an-id"), { name: "home" });
  });
});
