import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { getDb } from "@/lib/db";
import { acquireRelayerLock, RelayerBusyError } from "./relayer";
import { connectTestDb, dropTestDb, skipWithoutDb } from "./test-db";

describe("relayer lock", () => {
  before(connectTestDb);
  after(dropTestDb);

  test("serialises relays: a second holder waits, then gets the lock", async (t) => {
    if (skipWithoutDb(t)) return;
    const releaseA = await acquireRelayerLock("a");

    await assert.rejects(acquireRelayerLock("b", 500), RelayerBusyError);

    await releaseA();
    const releaseB = await acquireRelayerLock("b", 500);
    await releaseB();
  });

  test("a waiting holder gets the lock as soon as it is released", async (t) => {
    if (skipWithoutDb(t)) return;
    const releaseA = await acquireRelayerLock("a");
    setTimeout(() => void releaseA(), 300);
    const releaseB = await acquireRelayerLock("b", 3000);
    await releaseB();
  });

  test("an expired lease is taken over", async (t) => {
    if (skipWithoutDb(t)) return;
    await getDb()
      .collection<{ _id: string; holder: string; lockedUntil: Date }>(
        "nimiq_locks",
      )
      .updateOne(
        { _id: "polygon-relayer" },
        { $set: { holder: "crashed", lockedUntil: new Date(Date.now() - 1) } },
        { upsert: true },
      );
    const release = await acquireRelayerLock("c", 500);
    await release();
  });

  test("a stale release cannot free someone else's lock", async (t) => {
    if (skipWithoutDb(t)) return;
    const releaseA = await acquireRelayerLock("a");
    await releaseA();
    const releaseB = await acquireRelayerLock("b");
    await releaseA();
    await assert.rejects(acquireRelayerLock("c", 300), RelayerBusyError);
    await releaseB();
  });

  test("a held lock is renewed while its holder is still working", async (t) => {
    if (skipWithoutDb(t)) return;
    const release = await acquireRelayerLock("slow-relay", 0, 300);
    await new Promise((resolve) => setTimeout(resolve, 900));

    await assert.rejects(acquireRelayerLock("next", 0), RelayerBusyError);
    await release();
    const releaseNext = await acquireRelayerLock("next", 0);
    await releaseNext();
  });
});
