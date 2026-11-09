import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { getAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { NimiqName } from "@/models/NimiqName";
import { User } from "@/models/User";
import { claimTag, type NameDeps, tagOfWallet, tagStatus } from "./names";
import { OrderError } from "./orders";
import { serializeTagClaim } from "./tag-claim";
import { connectTestDb, dropTestDb, skipWithoutDb } from "./test-db";

const NOW = Date.parse("2026-11-09T12:00:00Z");
const deps: NameDeps = { now: () => NOW, connect: async () => {} };
const issuedAt = NOW / 1000;

const ada = privateKeyToAccount(generatePrivateKey());
const bola = privateKeyToAccount(generatePrivateKey());

type Account = typeof ada;

/** Signs the claim the way Nimiq Pay does, from the JSON the mini app sends it. */
async function signedClaim(
  account: Account,
  handle: string,
  at = issuedAt,
  signer: Account = account,
) {
  const typed = JSON.parse(
    serializeTagClaim({ wallet: account.address, handle, issuedAt: at }),
  );
  const { EIP712Domain: _domain, ...types } = typed.types;
  const signature = await signer.signTypedData({
    domain: typed.domain,
    types,
    primaryType: typed.primaryType,
    message: { ...typed.message, issuedAt: BigInt(typed.message.issuedAt) },
  });
  return { address: account.address, tag: handle, issuedAt: at, signature };
}

const refused = (status: number, message?: RegExp) => (error: unknown) => {
  assert.ok(error instanceof OrderError);
  assert.equal(error.status, status);
  if (message) assert.match(error.message, message);
  return true;
};

before(connectTestDb);
after(dropTestDb);

beforeEach(async () => {
  await NimiqName.deleteMany({});
  await User.collection.deleteMany({});
});

describe("claimTag", () => {
  test("saves the tag for the wallet that signed it", async (t) => {
    if (skipWithoutDb(t)) return;
    const result = await claimTag(await signedClaim(ada, "ada"), deps);
    assert.deepEqual(result, { tag: "ada@jumpa" });
    assert.equal(await tagOfWallet(ada.address, deps), "ada@jumpa");
    const status = await tagStatus("@ada", deps);
    assert.equal(status.available, false);
    assert.equal(status.address, getAddress(ada.address));
  });

  test("refuses a signature from another wallet", async (t) => {
    if (skipWithoutDb(t)) return;
    await assert.rejects(
      claimTag(await signedClaim(ada, "ada", issuedAt, bola), deps),
      refused(400, /didn't approve/),
    );
    assert.equal(await tagOfWallet(ada.address, deps), null);
  });

  test("refuses an approval signed too long ago", async (t) => {
    if (skipWithoutDb(t)) return;
    await assert.rejects(
      claimTag(await signedClaim(ada, "ada", issuedAt - 11 * 60), deps),
      refused(400, /expired/),
    );
  });

  test("refuses a tag a Jumpa account already holds", async (t) => {
    if (skipWithoutDb(t)) return;
    await User.collection.insertOne({
      _id: "user_1" as never,
      jumpaTag: "ada@jumpa",
    });
    await assert.rejects(
      claimTag(await signedClaim(ada, "ada"), deps),
      refused(409, /taken/),
    );
    const status = await tagStatus("ada", deps);
    assert.equal(status.available, false);
    assert.equal(status.address, null);
  });

  test("keeps one tag per wallet and one wallet per tag", async (t) => {
    if (skipWithoutDb(t)) return;
    await claimTag(await signedClaim(ada, "ada"), deps);
    await assert.rejects(
      claimTag(await signedClaim(ada, "ada_two"), deps),
      refused(409, /already has/),
    );
    await assert.rejects(
      claimTag(await signedClaim(bola, "ada"), deps),
      refused(409, /taken/),
    );
  });

  test("refuses reserved handles", async (t) => {
    if (skipWithoutDb(t)) return;
    await assert.rejects(
      claimTag(await signedClaim(ada, "jumpa"), deps),
      refused(409, /taken/),
    );
  });
});

describe("tagStatus", () => {
  test("offers free handles close to a taken one", async (t) => {
    if (skipWithoutDb(t)) return;
    await claimTag(await signedClaim(ada, "ada"), deps);
    await User.collection.insertOne({
      _id: "user_2" as never,
      jumpaTag: "ada1",
    });
    const status = await tagStatus("ada@jumpa", deps);
    assert.deepEqual(status.suggestions, ["ada_", "theada"]);
  });

  test("a free handle has no holder", async (t) => {
    if (skipWithoutDb(t)) return;
    const status = await tagStatus("nobody", deps);
    assert.deepEqual(status, {
      tag: "nobody@jumpa",
      address: null,
      available: true,
      suggestions: [],
    });
  });
});
