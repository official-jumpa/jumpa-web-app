import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { broadcastSigned } from "./relayer";

function sender(replies: (Error | "ok")[]) {
  let calls = 0;
  const send = async () => {
    const reply = replies[Math.min(calls, replies.length - 1)];
    calls += 1;
    if (reply !== "ok") throw reply;
  };
  return { send, calls: () => calls };
}

describe("broadcastSigned", () => {
  test("a node that already has the transaction counts as sent", async () => {
    const node = sender([new Error("already known")]);
    assert.equal(await broadcastSigned(node.send, async () => false), true);
    assert.equal(node.calls(), 1);
  });

  test("re-sends the same bytes after a failed reply", async () => {
    const node = sender([new Error("timeout"), new Error("timeout"), "ok"]);
    assert.equal(await broadcastSigned(node.send, async () => false), true);
    assert.equal(node.calls(), 3);
  });

  test("counts as sent when a lookup finds the transaction", async () => {
    const node = sender([new Error("timeout")]);
    assert.equal(await broadcastSigned(node.send, async () => true), true);
  });

  test("is unknown, not failed, when no node ever confirms it", async () => {
    const node = sender([new Error("timeout")]);
    assert.equal(await broadcastSigned(node.send, async () => false), false);
    assert.equal(node.calls(), 3);
  });
});
