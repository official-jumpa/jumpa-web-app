import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  type Eip1193,
  ensurePolygon,
  getConnectedAccount,
  isUserRejection,
  requestAccount,
  signTypedData,
} from "./provider";

type Call = { method: string; params?: unknown };

/** A scripted provider that records every request it receives. */
function fakeProvider(answer: (call: Call) => unknown) {
  const calls: Call[] = [];
  const provider: Eip1193 = {
    request: async (call) => {
      calls.push(call);
      return answer(call);
    },
  };
  return { provider, calls };
}

const ADDRESS = "0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed";
const CHECKSUMMED = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";

describe("isUserRejection", () => {
  test("matches the EIP-1193 rejection code", () => {
    assert.equal(isUserRejection({ code: 4001 }), true);
  });

  test("matches a rejection message", () => {
    assert.equal(isUserRejection(new Error("User rejected the request")), true);
  });

  test("ignores other failures", () => {
    assert.equal(isUserRejection(new Error("network")), false);
    assert.equal(isUserRejection(null), false);
  });
});

describe("requestAccount", () => {
  test("returns the first account, checksummed", async () => {
    const { provider } = fakeProvider(() => [ADDRESS]);
    assert.equal(await requestAccount(provider), CHECKSUMMED);
  });

  test("fails when the wallet shares no account", async () => {
    const { provider } = fakeProvider(() => []);
    await assert.rejects(requestAccount(provider));
  });
});

describe("getConnectedAccount", () => {
  test("reads an already-shared account without prompting", async () => {
    const { provider, calls } = fakeProvider(() => [ADDRESS]);
    assert.equal(await getConnectedAccount(provider), CHECKSUMMED);
    assert.equal(calls[0]?.method, "eth_accounts");
  });

  test("is null before the wallet is connected", async () => {
    const { provider } = fakeProvider(() => []);
    assert.equal(await getConnectedAccount(provider), null);
  });
});

describe("ensurePolygon", () => {
  test("does nothing when already on Polygon", async () => {
    const { provider, calls } = fakeProvider(() => "0x89");
    await ensurePolygon(provider);
    assert.deepEqual(
      calls.map((c) => c.method),
      ["eth_chainId"],
    );
  });

  test("switches to Polygon from another chain", async () => {
    const { provider, calls } = fakeProvider(({ method }) =>
      method === "eth_chainId" ? "0x1" : null,
    );
    await ensurePolygon(provider);
    assert.deepEqual(calls[1], {
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x89" }],
    });
  });

  test("adds Polygon when the wallet doesn't know it", async () => {
    const { provider, calls } = fakeProvider(({ method }) => {
      if (method === "eth_chainId") return "0x1";
      if (method === "wallet_switchEthereumChain") {
        throw Object.assign(new Error("Unrecognized chain"), { code: 4902 });
      }
      return null;
    });
    await ensurePolygon(provider);
    assert.equal(calls[2]?.method, "wallet_addEthereumChain");
  });
});

describe("signTypedData", () => {
  test("sends the address and JSON payload and returns the signature", async () => {
    const signature = `0x${"ab".repeat(65)}`;
    const { provider, calls } = fakeProvider(() => signature);
    const result = await signTypedData(provider, CHECKSUMMED, '{"a":1}');
    assert.equal(result, signature);
    assert.deepEqual(calls[0], {
      method: "eth_signTypedData_v4",
      params: [CHECKSUMMED, '{"a":1}'],
    });
  });

  test("rejects a reply that isn't a signature", async () => {
    const { provider } = fakeProvider(() => "nope");
    await assert.rejects(signTypedData(provider, CHECKSUMMED, "{}"));
  });
});
