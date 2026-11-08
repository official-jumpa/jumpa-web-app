import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { permitTookEffect } from "./relayer";

const FAST = { timeoutMs: 50, pollMs: 5 };

function allowance(replies: boolean[]) {
  let calls = 0;
  const covers = async () => {
    const reply = replies[Math.min(calls, replies.length - 1)];
    calls += 1;
    return reply;
  };
  return { covers, calls: () => calls };
}

const unreadable = async (): Promise<"success" | "reverted"> => {
  throw new Error("Archive requests require a personal token.");
};

describe("permitTookEffect", () => {
  test("a confirmed permit counts without reading the allowance", async () => {
    const owner = allowance([false]);
    assert.equal(
      await permitTookEffect(async () => "success", owner.covers, FAST),
      true,
    );
    assert.equal(owner.calls(), 0);
  });

  test("a reverted permit still counts when the allowance covers the value", async () => {
    const owner = allowance([true]);
    assert.equal(
      await permitTookEffect(async () => "reverted", owner.covers, FAST),
      true,
    );
  });

  test("a reverted permit with no allowance fails at once", async () => {
    const owner = allowance([false]);
    assert.equal(
      await permitTookEffect(async () => "reverted", owner.covers, FAST),
      false,
    );
    assert.equal(owner.calls(), 1);
  });

  test("an unreadable receipt waits for the allowance instead of failing", async () => {
    const owner = allowance([false, false, true]);
    assert.equal(await permitTookEffect(unreadable, owner.covers, FAST), true);
    assert.equal(owner.calls(), 3);
  });

  test("an unreadable receipt fails once the wait runs out with no allowance", async () => {
    const owner = allowance([false]);
    assert.equal(await permitTookEffect(unreadable, owner.covers, FAST), false);
    assert.ok(owner.calls() > 1);
  });
});
