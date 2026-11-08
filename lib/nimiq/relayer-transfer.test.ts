import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { POLYGON_USDT } from "./constants";
import {
  encodeTransferFromCall,
  TRANSFER_GAS_LIMIT,
  transferFromRequest,
} from "./relayer";

const OWNER = "0x3b7EEF0B4BE6BE29b8779871CE4cC3C4FfFB12f2";
const DEPOSIT = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
const ONE_USDT = BigInt(1_000_000);
const REAL_TRANSFER_GAS = BigInt(84_174);

describe("transferFromRequest", () => {
  test("carries its own gas limit, so no lagging node simulates it before the permit", () => {
    const request = transferFromRequest(OWNER, DEPOSIT, ONE_USDT, 7);
    assert.deepEqual(request, {
      to: POLYGON_USDT.address,
      data: encodeTransferFromCall(OWNER, DEPOSIT, ONE_USDT),
      nonce: 7,
      gas: TRANSFER_GAS_LIMIT,
    });
  });

  test("the limit leaves room above a real USDT0 transferFrom (84,174 gas)", () => {
    assert.equal(TRANSFER_GAS_LIMIT, BigInt(150_000));
    assert.ok(TRANSFER_GAS_LIMIT > (REAL_TRANSFER_GAS * BigInt(3)) / BigInt(2));
  });
});
