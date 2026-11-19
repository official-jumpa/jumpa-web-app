import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { beforeEach, describe, it } from "node:test";
import type {
  GasSponsorshipStore,
  NewSponsorship,
} from "@/lib/functions/gasSponsorshipFunctions";
import type { GasSponsorshipStatus } from "@/models/GasSponsorship";
import { tronAccountFromSecret, tronAddressFrom41Hex } from "./address";
import type { TronFeeParams, TronTxOutcome } from "./node";
import {
  formatTokenRaw,
  getTronOwedRaw,
  planTronGas,
  quoteTronTokenSend,
  sendTronToken,
  type TronGasInputs,
  type TronSponsorDeps,
} from "./sponsor";

const n = (value: number) => BigInt(value);
// Mainnet's live prices: 100 sun/energy, 1,000 sun/byte, 1.1 TRX to create an account.
const FEES: TronFeeParams = {
  energySun: n(100),
  bandwidthSun: n(1000),
  activationSun: n(1_100_000),
};
const NEW_HOLDER = n(130_285);
const HOLDER = n(64_285);

describe("planTronGas", () => {
  const base: TronGasInputs = {
    userTrxSun: n(0),
    userActivated: false,
    mainEnergy: NEW_HOLDER,
    feeEnergy: HOLDER,
    fees: FEES,
    trxPriceUsd: 0.3,
    platformFeeUsd: 0.05,
    owedRaw: n(0),
  };

  it("lets a wallet with enough TRX pay its own gas", () => {
    assert.deepEqual(
      planTronGas({ ...base, userTrxSun: n(20_000_000), userActivated: true }),
      {
        mode: "self",
        burnSun: n(13_378_500),
      },
    );
  });

  it("charges an empty, never-used wallet the TRX sent, its activation and the platform fee", () => {
    // (130,285 + 64,285) energy × 100 + 2 × 350 bytes × 1,000 = 20.157 TRX, +10% → 22.18 TRX.
    // Cost 22.18 + 1.1 activation = 23.28 TRX × $0.30 = $6.984, + $0.05 = $7.034 → $7.04.
    assert.deepEqual(planTronGas(base), {
      mode: "sponsored",
      topUpSun: n(22_180_000),
      costSun: n(23_280_000),
      feeRaw: n(7_040_000),
      owedRaw: n(0),
      collectRaw: n(7_040_000),
    });
  });

  it("only tops up what an activated wallet is short, and charges its bandwidth instead of activation", () => {
    // Needs 2 × 6.7785 TRX + 10% = 14.9127; holds 3 → 11.92 sent. Cost 12.19 TRX × $0.25 + $0.05 = $3.0975 → $3.10.
    const plan = planTronGas({
      ...base,
      userTrxSun: n(3_000_000),
      userActivated: true,
      mainEnergy: HOLDER,
      trxPriceUsd: 0.25,
    });
    assert.equal(plan.mode, "sponsored");
    assert.equal(plan.mode === "sponsored" && plan.topUpSun, n(11_920_000));
    assert.equal(plan.mode === "sponsored" && plan.costSun, n(12_190_000));
    assert.equal(plan.mode === "sponsored" && plan.feeRaw, n(3_100_000));
  });

  it("doesn't add a cent for float noise on an exact amount", () => {
    // 1.04 TRX × $0.50 + $0.05 is exactly $0.57, which floats read as 0.5700000000000001.
    const plan = planTronGas({
      ...base,
      userActivated: true,
      mainEnergy: n(0),
      feeEnergy: n(0),
      trxPriceUsd: 0.5,
    });
    assert.equal(plan.mode === "sponsored" && plan.costSun, n(1_040_000));
    assert.equal(plan.mode === "sponsored" && plan.feeRaw, n(570_000));
  });

  it("collects an old fee from a wallet that no longer needs gas, without sending any", () => {
    assert.deepEqual(
      planTronGas({
        ...base,
        userTrxSun: n(50_000_000),
        userActivated: true,
        owedRaw: n(1_500_000),
      }),
      {
        mode: "sponsored",
        topUpSun: n(0),
        costSun: n(0),
        feeRaw: n(0),
        owedRaw: n(1_500_000),
        collectRaw: n(1_500_000),
      },
    );
  });

  it("adds anything owed to a new fee", () => {
    const plan = planTronGas({ ...base, owedRaw: n(1_000_000) });
    assert.equal(plan.mode === "sponsored" && plan.collectRaw, n(8_040_000));
  });

  it("follows the network's price when governance changes it", () => {
    const plan = planTronGas({ ...base, fees: { ...FEES, energySun: n(210) } });
    // (194,570 × 210 + 700,000) × 1.1 = 45.71 TRX sent.
    assert.equal(plan.mode === "sponsored" && plan.topUpSun, n(45_720_000));
  });
});

describe("formatTokenRaw", () => {
  it("prints whole cents and keeps finer digits", () => {
    assert.equal(formatTokenRaw(n(4_130_000)), "4.13");
    assert.equal(formatTokenRaw(n(4_100_000)), "4.10");
    assert.equal(formatTokenRaw(n(4_000_000)), "4");
    assert.equal(formatTokenRaw(n(10_000)), "0.01");
    assert.equal(formatTokenRaw(n(4_123_456)), "4.123456");
  });
});

/* ───────────────────────────── Sends, against a fake chain ───────────────────────────── */

const key = () => `0x${randomBytes(32).toString("hex")}`;
const address = () =>
  tronAddressFrom41Hex(`41${randomBytes(20).toString("hex")}`);

type Row = NewSponsorship & {
  _id: string;
  status: GasSponsorshipStatus;
  feeTxHash: string | null;
  transferTxHash: string | null;
  updatedAt: Date;
};

function memoryStore(now: () => number) {
  const rows = new Map<string, Row>();
  let next = 0;
  const isOpen = (r: Row) =>
    ["TOPPING_UP", "OWED", "COLLECTING"].includes(r.status);
  const store: GasSponsorshipStore = {
    async create(record) {
      // Mirrors the unique index: one open record per user.
      for (const r of rows.values())
        if (r.userId === record.userId && isOpen(r)) return null;
      const _id = `gas_${++next}`;
      rows.set(_id, {
        ...record,
        _id,
        status: "TOPPING_UP",
        feeTxHash: null,
        transferTxHash: null,
        updatedAt: new Date(now()),
      });
      return _id;
    },
    async update(ids, patch, expect) {
      let changed = 0;
      for (const id of ids) {
        const row = rows.get(id);
        if (!row || (expect && row.status !== expect.status)) continue;
        if (
          expect &&
          expect.feeTxHash !== undefined &&
          row.feeTxHash !== expect.feeTxHash
        )
          continue;
        Object.assign(row, patch, { updatedAt: new Date(now()) });
        changed++;
      }
      return changed;
    },
    async unsettled(userId) {
      return [...rows.values()]
        .filter((r) => r.userId === userId && isOpen(r))
        .map((r) => ({ ...r }));
    },
  };
  return { store, rows };
}

const USER_KEY = key();
const USER = tronAccountFromSecret(USER_KEY).address;
const SPONSOR = tronAccountFromSecret(key());
const FEE_WALLET = address();
const RECIPIENT = address();
const TOKEN = address();
const USER_ID = "user_test";

/** A chain that answers from `state` and logs every build and broadcast in order. */
function fakeChain() {
  const state = {
    userTrxSun: n(0),
    userExists: false,
    tokenRaw: n(100_000_000),
    outcomes: {} as Record<string, TronTxOutcome>,
    log: [] as string[],
    builds: [] as Array<{ to: string; amountRaw: bigint; feeLimitSun: bigint }>,
    onBuildFee: undefined as undefined | (() => void),
    onBuildTopUp: undefined as undefined | (() => Promise<unknown>),
  };
  const node: TronSponsorDeps["node"] = {
    getTronAccount: async () => ({
      exists: state.userExists,
      balanceSun: state.userTrxSun,
    }),
    getTronFeeParams: async () => FEES,
    readTokenBalance: async () => state.tokenRaw,
    estimateTokenTransferEnergy: async (_owner, _token, to) =>
      to === FEE_WALLET ? HOLDER : NEW_HOLDER,
    buildTrxTransfer: async (owner, to, amountSun) => {
      assert.equal(owner, SPONSOR.address);
      assert.equal(to, USER);
      state.log.push(`build top-up ${amountSun}`);
      await state.onBuildTopUp?.();
      return { txID: "topup", raw_data_hex: "" };
    },
    buildTokenTransfer: async ({ to, amountRaw, feeLimitSun }) => {
      state.builds.push({ to, amountRaw, feeLimitSun });
      if (to === FEE_WALLET) state.onBuildFee?.();
      return { txID: to === FEE_WALLET ? "fee" : "main", raw_data_hex: "" };
    },
    signTronTransaction: async (tx) => ({ txID: tx.txID, hex: "" }),
    broadcastTronTransaction: async (tx) => {
      state.log.push(`broadcast ${tx.txID}`);
    },
    waitForTronTransaction: async (txID) => state.outcomes[txID] ?? "SUCCESS",
    readTronTransactionOutcome: async (txID) =>
      state.outcomes[txID] ?? "SUCCESS",
  };
  return { state, node };
}

describe("sendTronToken", () => {
  let clock: number;
  let chain: ReturnType<typeof fakeChain>;
  let memory: ReturnType<typeof memoryStore>;
  let deps: TronSponsorDeps;

  beforeEach(() => {
    clock = 1_800_000_000_000;
    chain = fakeChain();
    memory = memoryStore(() => clock);
    deps = {
      node: chain.node,
      store: memory.store,
      trxPriceUsd: async () => 0.3,
      sponsor: () => ({ account: SPONSOR.account, address: SPONSOR.address }),
      feeWallet: () => FEE_WALLET,
      platformFeeUsd: () => 0.05,
      now: () => clock,
    };
  });

  const send = (amount = "10") =>
    sendTronToken(
      {
        userId: USER_ID,
        mnemonicOrPrivateKey: USER_KEY,
        toAddress: RECIPIENT,
        amount,
        token: TOKEN,
        symbol: "USDT",
      },
      deps,
    );

  it("sends on the user's own TRX when they have enough, with nothing recorded", async () => {
    chain.state.userTrxSun = n(20_000_000);
    chain.state.userExists = true;
    const result = await send();
    assert.equal(result.success, true);
    assert.equal(result.feePaid, undefined);
    assert.deepEqual(chain.state.log, ["broadcast main"]);
    assert.equal(memory.rows.size, 0);
    // fee_limit: 130,285 × 100 × 1.5 + 350 bytes × 1,000.
    assert.equal(chain.state.builds[0].feeLimitSun, n(19_892_750));
  });

  it("tops up, takes the fee, then sends, and marks the gas paid", async () => {
    const result = await send();
    assert.equal(result.success, true, result.error ?? "");
    assert.equal(result.txHash, "main");
    assert.equal(result.feePaid, "7.04");
    assert.deepEqual(chain.state.log, [
      "build top-up 22180000",
      "broadcast topup",
      "broadcast fee",
      "broadcast main",
    ]);
    assert.deepEqual(
      chain.state.builds.map((b) => [b.to, b.amountRaw]),
      [
        [FEE_WALLET, n(7_040_000)],
        [RECIPIENT, n(10_000_000)],
      ],
    );
    const [row] = memory.rows.values();
    assert.equal(row.status, "PAID");
    assert.equal(row.feeTxHash, "fee");
    assert.equal(row.transferTxHash, "main");
    assert.equal(row.topUpSun, 22_180_000);
    assert.equal(row.costSun, 23_280_000);
    assert.equal(row.feeRaw, 7_040_000);
  });

  it("refuses up front when the token can't cover the amount and the fee", async () => {
    chain.state.tokenRaw = n(12_000_000);
    const result = await send("10");
    assert.equal(result.success, false);
    assert.match(
      result.error ?? "",
      /7\.04 USDT network fee is added .* up to 4\.96 USDT/,
    );
    assert.deepEqual(chain.state.log, []);
    assert.equal(memory.rows.size, 0);
  });

  it("refuses a send larger than the balance", async () => {
    chain.state.tokenRaw = n(5_000_000);
    const result = await send("10");
    assert.equal(result.error, "Not enough USDT for this amount.");
  });

  it("asks for TRX when no sponsor is set up", async () => {
    deps.sponsor = () => null;
    const result = await send();
    assert.match(result.error ?? "", /You need about 14\.72 TRX/);
    assert.deepEqual(chain.state.log, []);
  });

  it("cancels the record and stops when the top-up fails on chain", async () => {
    chain.state.outcomes.topup = "FAILED";
    const result = await send();
    assert.equal(result.success, false);
    assert.deepEqual(chain.state.log, [
      "build top-up 22180000",
      "broadcast topup",
    ]);
    assert.equal([...memory.rows.values()][0].status, "CANCELLED");
  });

  it("keeps the debt when the fee transfer fails, and never sends the user's transfer", async () => {
    chain.state.outcomes.fee = "FAILED";
    const result = await send();
    assert.equal(result.success, false);
    assert.ok(!chain.state.log.includes("broadcast main"));
    const [row] = memory.rows.values();
    assert.equal(row.status, "OWED");
    assert.equal(row.feeTxHash, null);
    assert.equal(await getTronOwedRaw(USER_ID, deps), n(7_040_000));
  });

  it("collects an owed fee on the next send without topping up again", async () => {
    chain.state.outcomes.fee = "FAILED";
    await send();
    // The top-up landed, so the wallet now holds the TRX.
    chain.state.userTrxSun = n(22_180_000);
    chain.state.userExists = true;
    delete chain.state.outcomes.fee;
    chain.state.log = [];
    chain.state.builds = [];

    const result = await send();
    assert.equal(result.success, true, result.error ?? "");
    assert.equal(result.feePaid, "7.04");
    assert.deepEqual(chain.state.log, ["broadcast fee", "broadcast main"]);
    assert.equal(chain.state.builds[0].amountRaw, n(7_040_000));
    assert.equal([...memory.rows.values()][0].status, "PAID");
  });

  it("won't top up a user who still owes, and asks for TRX instead", async () => {
    chain.state.outcomes.fee = "FAILED";
    await send();
    // The top-up landed but the TRX was moved out before the fee was taken.
    chain.state.userExists = true;
    delete chain.state.outcomes.fee;
    chain.state.log = [];

    const result = await send();
    assert.match(
      result.error ?? "",
      /still unpaid.*Add about 22\.18 TRX.*also pays the old fee/,
    );
    assert.deepEqual(chain.state.log, []);
    assert.equal(memory.rows.size, 1);
    assert.equal([...memory.rows.values()][0].status, "OWED");
    const quote = await quoteTronTokenSend(
      { userId: USER_ID, owner: USER, token: TOKEN, to: RECIPIENT },
      deps,
    );
    assert.equal(quote?.sponsored, false);
  });

  const otherSendsTopUp = () =>
    memory.store.create({
      userId: USER_ID,
      chain: "tron",
      address: USER,
      topUpTxHash: "other",
      topUpSun: 22_180_000,
      costSun: 23_280_000,
      feeRaw: 7_040_000,
    });

  it("refuses any send while another send's gas is still landing", async () => {
    await otherSendsTopUp();
    // Enough TRX to pay its own way, but that TRX may be the other send's gas.
    chain.state.userTrxSun = n(22_180_000);
    chain.state.userExists = true;
    const result = await send();
    assert.match(result.error ?? "", /Another transfer/);
    assert.deepEqual(chain.state.log, []);
  });

  it("gives one top-up at a time when two sends race", async () => {
    // The other send records its top-up after this one has checked.
    chain.state.onBuildTopUp = otherSendsTopUp;
    const result = await send();
    assert.match(result.error ?? "", /Another transfer/);
    assert.ok(!chain.state.log.includes("broadcast topup"));
    assert.equal(memory.rows.size, 1);
  });

  it("leaves a slow top-up for the chain to settle, then bills it once it lands", async () => {
    chain.state.outcomes.topup = "PENDING";
    const result = await send();
    assert.match(result.error ?? "", /network is slow/);
    assert.equal([...memory.rows.values()][0].status, "TOPPING_UP");

    // Still in flight a moment later: not owed yet.
    clock += 30_000;
    assert.equal(await getTronOwedRaw(USER_ID, deps), n(0));

    clock += 60_000;
    chain.state.outcomes.topup = "SUCCESS";
    assert.equal(await getTronOwedRaw(USER_ID, deps), n(7_040_000));
    assert.equal([...memory.rows.values()][0].status, "OWED");
  });

  it("cancels a top-up the chain never saw once it has expired", async () => {
    chain.state.outcomes.topup = "PENDING";
    await send();
    clock += 11 * 60_000;
    assert.equal(await getTronOwedRaw(USER_ID, deps), n(0));
    assert.equal([...memory.rows.values()][0].status, "CANCELLED");
  });

  it("settles a fee transfer that landed after the send gave up on it", async () => {
    chain.state.outcomes.fee = "PENDING";
    const result = await send();
    assert.match(result.error ?? "", /network is slow/);
    assert.equal([...memory.rows.values()][0].status, "COLLECTING");

    clock += 2 * 60_000;
    chain.state.outcomes.fee = "SUCCESS";
    assert.equal(await getTronOwedRaw(USER_ID, deps), n(0));
    assert.equal([...memory.rows.values()][0].status, "PAID");
  });

  it("won't collect a debt another send has already claimed", async () => {
    chain.state.outcomes.fee = "FAILED";
    await send();
    chain.state.userTrxSun = n(22_180_000);
    chain.state.userExists = true;
    delete chain.state.outcomes.fee;
    chain.state.log = [];
    // Another request claims the debt between this one reading it and collecting it.
    chain.state.onBuildFee = () => {
      const row = [...memory.rows.values()][0];
      row.status = "COLLECTING";
      row.feeTxHash = "other";
    };

    const result = await send();
    assert.match(result.error ?? "", /Another transfer/);
    assert.deepEqual(chain.state.log, []);
    const [row] = memory.rows.values();
    assert.equal(row.status, "COLLECTING");
    assert.equal(row.feeTxHash, "other");
  });

  it("rejects a bad address or amount before touching the chain", async () => {
    const bad = await sendTronToken(
      {
        userId: USER_ID,
        mnemonicOrPrivateKey: USER_KEY,
        toAddress: "T123",
        amount: "1",
        token: TOKEN,
        symbol: "USDT",
      },
      deps,
    );
    assert.equal(bad.error, "That isn't a valid Tron address.");
    assert.equal((await send("0")).error, "Invalid transfer amount.");
    assert.deepEqual(chain.state.log, []);
  });
});

describe("quoteTronTokenSend", () => {
  const chain = fakeChain();
  const deps: TronSponsorDeps = {
    node: chain.node,
    store: memoryStore(() => 0).store,
    trxPriceUsd: async () => 0.3,
    sponsor: () => ({ account: SPONSOR.account, address: SPONSOR.address }),
    feeWallet: () => FEE_WALLET,
    platformFeeUsd: () => 0.05,
    now: () => 0,
  };

  it("quotes the token fee a sponsored send will take", async () => {
    const quote = await quoteTronTokenSend(
      { userId: USER_ID, owner: USER, token: TOKEN },
      deps,
    );
    assert.deepEqual(quote, {
      balanceRaw: n(100_000_000),
      sponsored: true,
      feeRaw: n(7_040_000),
      burnSun: n(0),
    });
  });

  it("quotes the TRX burn when the wallet pays its own gas", async () => {
    chain.state.userTrxSun = n(20_000_000);
    chain.state.userExists = true;
    const quote = await quoteTronTokenSend(
      { userId: USER_ID, owner: USER, token: TOKEN },
      deps,
    );
    assert.deepEqual(quote, {
      balanceRaw: n(100_000_000),
      sponsored: false,
      feeRaw: n(0),
      burnSun: n(13_378_500),
    });
  });

  it("has nothing to quote for a wallet without the token", async () => {
    chain.state.tokenRaw = n(0);
    assert.equal(
      await quoteTronTokenSend(
        { userId: USER_ID, owner: USER, token: TOKEN },
        deps,
      ),
      null,
    );
  });
});
