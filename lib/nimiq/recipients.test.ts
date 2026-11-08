import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { POLYGON_USDT } from "./constants";
import {
  MAX_SAVED,
  parseSaved,
  rememberBank,
  rememberWallet,
  type SavedBank,
  walletAddressError,
} from "./recipients";

const ADA: SavedBank = {
  accountNumber: "0123456789",
  bank: "Access Bank",
  accountName: "Ada Okafor",
  bankName: "Access Bank",
};
const WALLET = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";

const bankNumbered = (n: number): SavedBank => ({
  ...ADA,
  accountNumber: String(n).padStart(10, "0"),
});

describe("saved bank accounts", () => {
  test("the newest account goes first", () => {
    const other = { ...ADA, accountNumber: "9999999999" };
    assert.deepEqual(rememberBank([ADA], other), [other, ADA]);
  });

  test("sending to a saved account again moves it to the top without a duplicate", () => {
    const other = { ...ADA, accountNumber: "9999999999" };
    const renamed = { ...ADA, accountName: "Ada N. Okafor" };
    assert.deepEqual(rememberBank([other, ADA], renamed), [renamed, other]);
  });

  test("the same number at another bank is a different account", () => {
    const opay = { ...ADA, bank: "OPay", bankName: "OPay" };
    assert.equal(rememberBank([ADA], opay).length, 2);
  });

  test(`only the last ${MAX_SAVED} accounts are kept`, () => {
    let list: SavedBank[] = [];
    for (let n = 1; n <= MAX_SAVED + 2; n += 1) {
      list = rememberBank(list, bankNumbered(n));
    }
    assert.equal(list.length, MAX_SAVED);
    assert.equal(
      list[0].accountNumber,
      bankNumbered(MAX_SAVED + 2).accountNumber,
    );
  });
});

describe("saved wallets", () => {
  test("a wallet saved twice in another case is kept once, newest first", () => {
    const other = "0x1111111111111111111111111111111111111111";
    assert.deepEqual(rememberWallet([WALLET, other], WALLET.toLowerCase()), [
      WALLET,
      other,
    ]);
  });

  test("wallets are stored checksummed", () => {
    assert.deepEqual(rememberWallet([], WALLET.toLowerCase()), [WALLET]);
  });
});

describe("parseSaved", () => {
  test("reads back what was saved", () => {
    const stored = JSON.stringify({ banks: [ADA], wallets: [WALLET] });
    assert.deepEqual(parseSaved(stored), { banks: [ADA], wallets: [WALLET] });
  });

  test("drops entries that are not valid, and survives junk", () => {
    const stored = JSON.stringify({
      banks: [ADA, { ...ADA, accountNumber: "12" }, { bank: 4 }, null],
      wallets: [WALLET, "0x123", 42],
    });
    assert.deepEqual(parseSaved(stored), { banks: [ADA], wallets: [WALLET] });
    assert.deepEqual(parseSaved("not json"), { banks: [], wallets: [] });
    assert.deepEqual(parseSaved(null), { banks: [], wallets: [] });
    assert.deepEqual(parseSaved("[1,2]"), { banks: [], wallets: [] });
  });

  test(`never returns more than ${MAX_SAVED} of each`, () => {
    const banks = Array.from({ length: MAX_SAVED + 3 }, (_, n) =>
      bankNumbered(n),
    );
    assert.equal(parseSaved(JSON.stringify({ banks })).banks.length, MAX_SAVED);
  });
});

describe("walletAddressError", () => {
  test("accepts a Polygon wallet address, checksummed or lowercase", () => {
    assert.equal(walletAddressError(WALLET), undefined);
    assert.equal(walletAddressError(` ${WALLET.toLowerCase()} `), undefined);
  });

  test("asks for an address when the field is empty", () => {
    assert.equal(walletAddressError("  "), "Enter a wallet address.");
  });

  test("refuses anything that is not an address", () => {
    assert.equal(walletAddressError("0x123"), "Enter a valid Polygon address.");
    assert.equal(
      walletAddressError("nimiq NQ07 0000 0000 0000 0000 0000 0000 0000 0000"),
      "Enter a valid Polygon address.",
    );
  });

  test("refuses addresses that would burn the USDT", () => {
    assert.equal(
      walletAddressError("0x0000000000000000000000000000000000000000"),
      "This address can't receive USDT.",
    );
    assert.equal(
      walletAddressError(POLYGON_USDT.address.toLowerCase()),
      "This address can't receive USDT.",
    );
  });
});
