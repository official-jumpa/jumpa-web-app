"use client";

import { useState } from "react";
import { RampNotes } from "@/components/chat/ramp-parts";
import { BankTicket } from "@/components/receive/bank-ticket";
import { DepositStatus } from "@/components/receive/deposit-status";
import { assetOptions, QuoteLeg } from "@/components/transfer/quote-leg";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Select, type SelectOption } from "@/components/ui/select";
import { useDepositState } from "@/hooks/use-deposit-state";
import { useOnrampQuote } from "@/hooks/use-onramp-quote";
import { CHAINS } from "@/lib/blockchain";
import { cn } from "@/lib/cn";
import { FLAGS } from "@/lib/flags";
import {
  formatNaira,
  formatStable,
  NAIRA_TOKENS,
  type NairaToken,
  ONRAMP_CHAINS,
  ONRAMP_SOON_CHAINS,
  type OnrampOrder,
} from "@/lib/naira-deposit";
import { formatAmount, sanitiseAmount } from "@/lib/transfer";

type Stage = "form" | "pay" | "status";

/** The user's receiving address on each chain, as `/api/v1/wallet` names them. */
export type WalletAddresses = Partial<
  Record<"eth" | "base" | "sol" | "xlm" | "trx", string>
>;

const TOKEN_OPTIONS = assetOptions(NAIRA_TOKENS);
const NAIRA_OPTION: SelectOption[] = [
  { value: "NGN", label: "NGN", icon: FLAGS.NG },
];

const CHAIN_LOGO: Record<string, string> = {
  stellar: "/coins/xlm.webp",
  base: "/coins/base.webp",
  solana: "/coins/sol.webp",
  ethereum: "/coins/eth.webp",
  tron: "/coins/trx.webp",
};

function networkOptions(token: NairaToken): SelectOption[] {
  return [
    ...ONRAMP_CHAINS[token].map((id) => ({
      value: id,
      label: CHAINS[id]?.name ?? id,
      icon: CHAIN_LOGO[id],
    })),
    ...ONRAMP_SOON_CHAINS.map((id) => ({
      value: id,
      label: CHAINS[id]?.name ?? id,
      caption: "Coming soon",
      icon: CHAIN_LOGO[id],
      disabled: true,
    })),
  ];
}

function addressOn(
  chain: string,
  addresses: WalletAddresses,
): string | undefined {
  const key = (CHAINS[chain] as { walletKey?: keyof WalletAddresses })
    ?.walletKey;
  return key ? addresses[key] : undefined;
}

const AMOUNT_TEXT =
  "w-full min-w-0 bg-transparent text-base leading-4 font-medium text-jumpa-black";

/**
 * Deposit Naira: type the naira, see the tokens it buys, then pay into the
 * one-off account the provider issues. One route, three stages.
 */
export function NairaDepositView({
  initialToken,
  addresses,
  balances,
  nairaBalance,
}: {
  initialToken: NairaToken;
  addresses: WalletAddresses;
  /** Plain token amounts the user already holds, for the receive leg. */
  balances: Record<NairaToken, string>;
  /** The user's naira account balance, when they have one. */
  nairaBalance?: number;
}) {
  const [stage, setStage] = useState<Stage>("form");
  const [token, setToken] = useState<NairaToken>(initialToken);
  const [chain, setChain] = useState(ONRAMP_CHAINS[initialToken][0]);
  const [amount, setAmount] = useState("");
  const [order, setOrder] = useState<OnrampOrder | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string>();

  const naira = Number(amount) || 0;
  const asset = `${chain}:${token.toLowerCase()}`;
  // Amount and asset are frozen once an order exists, so the quote holds without refetching.
  const quote = useOnrampQuote(naira, asset);
  const locked = stage !== "form";
  // Asked from the moment the order exists, so a transfer that lands moves the screen on its own.
  const deposit = useDepositState(order?.reference);

  const changeToken = (next: string) => {
    const picked = next as NairaToken;
    setToken(picked);
    if (!ONRAMP_CHAINS[picked].includes(chain)) {
      setChain(ONRAMP_CHAINS[picked][0]);
    }
  };

  const placeOrder = async () => {
    const walletAddress = addressOn(chain, addresses);
    if (!walletAddress) {
      setError(
        "We couldn't find your wallet on this network. Pick another one.",
      );
      return;
    }
    setPlacing(true);
    setError(undefined);
    try {
      const res = await fetch("/api/v1/exchange/onramp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Whole naira, as the chat sends: the account expects that exact figure.
          fiatAmount: Math.round(naira),
          cryptoToken: token,
          asset,
          walletAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Couldn't start the deposit. Try again.");
      }
      setOrder(data);
      // The field now reads the exact figure to transfer.
      setAmount(String(data.fiatAmount));
      setStage("pay");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't start the deposit. Try again.",
      );
    } finally {
      setPlacing(false);
    }
  };

  const restart = () => {
    setOrder(null);
    setStage("form");
  };

  if (order && (stage === "status" || deposit !== "awaiting")) {
    return (
      <DepositStatus
        order={order}
        token={token}
        state={deposit}
        onBack={deposit === "awaiting" ? () => setStage("pay") : undefined}
        onRetry={restart}
      />
    );
  }

  const received =
    locked && order ? Number(order.cryptoAmount) : quote.received;
  const canContinue =
    Math.round(naira) > 0 &&
    !quote.loading &&
    !quote.error &&
    quote.received !== undefined;

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader
        back="/receive?rail=fiat"
        onBack={locked ? restart : undefined}
        title="Deposit Naira"
        round
      />

      <div className="mt-4.5 flex items-center justify-between">
        <span className="text-sm leading-4 font-medium tracking-jumpa-snug text-jumpa-primary-950 uppercase">
          Network
        </span>
        <Select
          variant="pill"
          label="Deposit network"
          value={chain}
          options={networkOptions(token)}
          onValueChange={setChain}
          disabled={locked}
        />
      </div>

      <div className="mt-4.5 flex flex-col gap-4 rounded-surface bg-jumpa-neutral-95 px-2.5 pt-3 pb-2.5">
        <div className="flex flex-col gap-1">
          <QuoteLeg
            label="You send"
            symbol="NGN"
            balance={
              nairaBalance === undefined ? undefined : String(nairaBalance)
            }
            options={NAIRA_OPTION}
            onSymbolChange={() => {}}
            locked
          >
            {/* Read-only once the order is placed, so the figure never swaps element. */}
            <input
              value={formatAmount(amount)}
              readOnly={locked}
              onChange={(event) => {
                setError(undefined);
                setAmount(sanitiseAmount(event.target.value));
              }}
              inputMode="decimal"
              aria-label="Amount in naira"
              placeholder="0"
              className={cn(
                AMOUNT_TEXT,
                "caret-jumpa-primary-600 outline-none",
              )}
            />
          </QuoteLeg>

          <QuoteLeg
            label={`You receive (${token})`}
            symbol={token}
            balance={balances[token]}
            options={TOKEN_OPTIONS}
            onSymbolChange={changeToken}
            locked={locked}
          >
            <span
              className={cn(
                AMOUNT_TEXT,
                "transition-opacity duration-300",
                quote.loading && !locked && "opacity-40",
              )}
            >
              {received === undefined ? "0.00" : formatStable(received)}
            </span>
          </QuoteLeg>
        </div>

        <span className="-mb-px block h-px w-full bg-jumpa-neutral-200" />

        <p className="flex items-center justify-between gap-3 px-2.5 text-[10px] leading-4 text-jumpa-black/50">
          <span>
            Rate{" "}
            <b className="font-bold text-jumpa-black">
              {quote.rate ? `1 ${token} = ${formatNaira(quote.rate)}` : "—"}
            </b>
          </span>
          <span>
            Fee <b className="font-bold text-jumpa-black">Included</b>
          </span>
        </p>
      </div>

      {quote.error && !locked ? (
        <div className="mt-3">
          <FieldError>{quote.error}</FieldError>
        </div>
      ) : null}

      {locked && order ? (
        <div className="mt-8.5 flex animate-rise flex-col gap-3">
          <BankTicket order={order} />
          {order.notes?.length ? <RampNotes notes={order.notes} /> : null}
        </div>
      ) : null}

      <div className="mt-auto flex flex-col items-center gap-6 pt-6.75">
        <FieldError>{error}</FieldError>
        {locked ? (
          <Button
            variant="gradient"
            size="lg"
            onClick={() => setStage("status")}
          >
            I&rsquo;ve sent the money
          </Button>
        ) : (
          <Button
            variant="gradient"
            size="lg"
            disabled={!canContinue || placing}
            onClick={placeOrder}
          >
            {placing ? "Getting account…" : "Next"}
          </Button>
        )}
        <p className="text-center text-[8px] leading-2.5 text-jumpa-black">
          Your balance will be updated within 1–5 mins
        </p>
      </div>
    </div>
  );
}
