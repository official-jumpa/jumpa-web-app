import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sha256 } from "viem";
import {
  type ExpectedTronTransaction,
  encodeSignedTransaction,
  verifyTronTransaction,
} from "./raw-data";

// Unsigned transactions TronGrid built on mainnet, never signed or sent.
const TRX = {
  txID: "fdb319a4b43b50b14bca2297b7a8b4f0a9ba33fa46ba4a623705b8bcd0094eb8",
  raw_data_hex:
    "0a02ac6f2208520a4ac99621cda740e0a1bc899f345a67080112630a2d747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e5472616e73666572436f6e747261637412320a15417588a02d5d1d6fa833d005af3799b70ecd15fe49121541d4d8ab094b35b99df93de235d68d8e2746e73ef31887ad4b70ebd8b8899f34",
};
const TOKEN = {
  txID: "c23e84c97be47a110d861b4f33b6da1cd559c241909a20815e647ee131c2065f",
  raw_data_hex:
    "0a02ac6f2208520a4ac99621cda740e0a1bc899f345aae01081f12a9010a31747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e54726967676572536d617274436f6e747261637412740a15417588a02d5d1d6fa833d005af3799b70ecd15fe49121541a614f803b6fd780986a42c78ec9c7f77e6ded13c2244a9059cbb000000000000000000000000d4d8ab094b35b99df93de235d68d8e2746e73ef300000000000000000000000000000000000000000000000000000000002625a070ffdcb8899f3490018087a70e",
};
const BUILT_AT = 1_795_047_698_047;

const OWNER = "417588a02d5d1d6fa833d005af3799b70ecd15fe49";
const TO = "41d4d8ab094b35b99df93de235d68d8e2746e73ef3";
const USDT = "41a614f803b6fd780986a42c78ec9c7f77e6ded13c";
const DATA =
  "a9059cbb000000000000000000000000d4d8ab094b35b99df93de235d68d8e2746e73ef300000000000000000000000000000000000000000000000000000000002625a0";

const trxExpected: ExpectedTronTransaction = {
  kind: "trx",
  owner41: OWNER,
  to41: TO,
  amountSun: BigInt(1_234_567),
};
const tokenExpected: ExpectedTronTransaction = {
  kind: "contract",
  owner41: OWNER,
  contract41: USDT,
  data: DATA,
  maxFeeLimitSun: BigInt(30_000_000),
};

/** The same transaction with extra raw bytes appended, re-hashed so only the content check can catch it. */
function withExtra(tx: { raw_data_hex: string }, extraHex: string) {
  const raw_data_hex = tx.raw_data_hex + extraHex;
  return { raw_data_hex, txID: sha256(`0x${raw_data_hex}`).slice(2) };
}

describe("verifyTronTransaction", () => {
  it("accepts the node's TRX transfer when it matches the request", () => {
    assert.equal(verifyTronTransaction(TRX, trxExpected, BUILT_AT), true);
  });

  it("accepts the node's token transfer when it matches the request", () => {
    assert.equal(verifyTronTransaction(TOKEN, tokenExpected, BUILT_AT), true);
  });

  it("refuses a different amount, recipient or owner", () => {
    assert.equal(
      verifyTronTransaction(
        TRX,
        { ...trxExpected, amountSun: BigInt(1_234_568) },
        BUILT_AT,
      ),
      false,
    );
    assert.equal(
      verifyTronTransaction(TRX, { ...trxExpected, to41: OWNER }, BUILT_AT),
      false,
    );
    assert.equal(
      verifyTronTransaction(TRX, { ...trxExpected, owner41: TO }, BUILT_AT),
      false,
    );
  });

  it("refuses token call data or a contract that differs", () => {
    assert.equal(
      verifyTronTransaction(
        TOKEN,
        { ...tokenExpected, data: DATA.replace(/a0$/, "a1") },
        BUILT_AT,
      ),
      false,
    );
    assert.equal(
      verifyTronTransaction(
        TOKEN,
        { ...tokenExpected, contract41: TO },
        BUILT_AT,
      ),
      false,
    );
  });

  it("refuses a fee limit above what was asked", () => {
    assert.equal(
      verifyTronTransaction(
        TOKEN,
        { ...tokenExpected, maxFeeLimitSun: BigInt(29_999_999) },
        BUILT_AT,
      ),
      false,
    );
  });

  it("refuses the wrong kind of transaction", () => {
    assert.equal(verifyTronTransaction(TOKEN, trxExpected, BUILT_AT), false);
    assert.equal(verifyTronTransaction(TRX, tokenExpected, BUILT_AT), false);
  });

  it("refuses an id that isn't the hash of the bytes", () => {
    assert.equal(
      verifyTronTransaction(
        { ...TRX, txID: TOKEN.txID },
        trxExpected,
        BUILT_AT,
      ),
      false,
    );
  });

  it("refuses a memo, which costs an extra 1 TRX, even with a matching id", () => {
    // Field 10 (data), "test".
    assert.equal(
      verifyTronTransaction(
        withExtra(TRX, "520474657374"),
        trxExpected,
        BUILT_AT,
      ),
      false,
    );
  });

  it("refuses a transaction set to live far longer than a node gives", () => {
    assert.equal(
      verifyTronTransaction(TRX, trxExpected, BUILT_AT - 60 * 60 * 1000),
      false,
    );
  });

  it("refuses missing or malformed fields", () => {
    assert.equal(
      verifyTronTransaction({ txID: TRX.txID }, trxExpected, BUILT_AT),
      false,
    );
    assert.equal(
      verifyTronTransaction(withExtra(TRX, "ff"), trxExpected, BUILT_AT),
      false,
    );
  });
});

describe("encodeSignedTransaction", () => {
  it("wraps raw data (field 1) and the signature (field 2) with their lengths", () => {
    const signature = `0x${"ab".repeat(65)}`;
    const hex = encodeSignedTransaction(TRX.raw_data_hex, signature);
    const rawLength = TRX.raw_data_hex.length / 2;
    // Over 0x7f bytes, so the length takes two varint bytes: 133 → 0x85 0x01.
    assert.equal(rawLength, 133);
    assert.equal(hex, `0a8501${TRX.raw_data_hex}1241${"ab".repeat(65)}`);
  });
});
