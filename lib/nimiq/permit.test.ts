import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { domainSeparator, pad } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { USDT0_DOMAIN_SEPARATOR, USDT0_PERMIT_DOMAIN } from "./constants";
import {
  buildPermitTypedData,
  isSignable,
  type PermitMessage,
  serializeTypedData,
  verifyPermitSignature,
} from "./permit";

const owner = privateKeyToAccount(generatePrivateKey());

const message: PermitMessage = {
  owner: owner.address,
  spender: "0x000000000000000000000000000000000000dEaD",
  value: BigInt(10_000_000),
  nonce: BigInt(0),
  deadline: BigInt(1_800_000_000),
};

describe("USDT0 permit domain", () => {
  test("domain hash matches the on-chain DOMAIN_SEPARATOR", () => {
    assert.equal(
      domainSeparator({ domain: USDT0_PERMIT_DOMAIN }),
      USDT0_DOMAIN_SEPARATOR,
    );
  });

  test("domain has a salt and no chainId", () => {
    assert.equal(USDT0_PERMIT_DOMAIN.salt, pad("0x89", { size: 32 }));
    assert.equal("chainId" in USDT0_PERMIT_DOMAIN, false);
  });
});

describe("permit signatures", () => {
  test("a permit signed by an account verifies", async () => {
    const signature = await owner.signTypedData(buildPermitTypedData(message));
    assert.equal(await verifyPermitSignature(message, signature), true);
  });

  test("a signature does not verify for a different value", async () => {
    const signature = await owner.signTypedData(buildPermitTypedData(message));
    const tampered = { ...message, value: message.value + BigInt(1) };
    assert.equal(await verifyPermitSignature(tampered, signature), false);
  });

  test("a malformed signature is rejected instead of throwing", async () => {
    assert.equal(await verifyPermitSignature(message, "0x1234"), false);
  });
});

describe("serializeTypedData", () => {
  test("writes bigints as decimal strings", () => {
    const json = JSON.parse(serializeTypedData(buildPermitTypedData(message)));
    assert.equal(json.message.value, "10000000");
    assert.equal(json.message.deadline, "1800000000");
    assert.equal(json.primaryType, "Permit");
  });

  test("lists the EIP712Domain fields for wallets that need them", () => {
    const json = JSON.parse(serializeTypedData(buildPermitTypedData(message)));
    assert.deepEqual(
      json.types.EIP712Domain.map((f: { name: string }) => f.name),
      ["name", "version", "verifyingContract", "salt"],
    );
  });
});

describe("isSignable", () => {
  const createdAt = new Date("2026-11-07T12:00:00Z");
  const deadline = createdAt.getTime() / 1000 + 900;

  test("true a minute after the order was created", () => {
    assert.equal(
      isSignable({ deadline, createdAt }, createdAt.getTime() + 60_000),
      true,
    );
  });

  test("false when the permit deadline is under a minute away", () => {
    const now = (deadline - 59) * 1000;
    assert.equal(isSignable({ deadline, createdAt }, now), false);
  });

  test("false once the Switch deposit address is older than 25 minutes", () => {
    const now = createdAt.getTime() + 1501 * 1000;
    assert.equal(
      isSignable({ deadline: deadline + 3600, createdAt }, now),
      false,
    );
  });
});
