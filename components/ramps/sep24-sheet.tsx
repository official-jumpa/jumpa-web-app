"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import { CheckIcon } from "@/components/ui/icons/check";
import { CloseIcon } from "@/components/ui/icons/close";
import { CopyIcon } from "@/components/ui/icons/copy";
import { CornerUpLeftIcon } from "@/components/ui/icons/corner-up-left";
import { CreditCardNavIcon } from "@/components/ui/icons/credit-card-nav";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { MoneyBillIcon } from "@/components/ui/icons/money-bill";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";

export interface Sep24SheetProps {
  isOpen: boolean;
  onClose: () => void;
  anchorName?: string;
  assetCode?: string;
  account?: string;
  userName?: string;
  userEmail?: string;
  type?: "deposit" | "withdraw";
  amount?: string;
}

const PROVIDERS = [
  { id: "moneygram", label: "MoneyGram Access" },
  { id: "stellar-anchor", label: "Stellar TestAnchor" },
  { id: "mercuryo", label: "Mercuryo Ramp" },
] as const;

type Provider = (typeof PROVIDERS)[number]["id"];

const STEPS = ["kyc", "payment", "confirm"] as const;
const STEP_LABELS = { kyc: "Identity", payment: "Method", confirm: "Confirm" };
type Step = (typeof STEPS)[number] | "success";

const RAILS = [
  {
    id: "cash",
    title: "MoneyGram cash location",
    blurb: "Settle in cash at an authorised branch",
    Icon: MoneyBillIcon,
  },
  {
    id: "card",
    title: "Debit / credit card",
    blurb: "Instant testnet card checkout",
    Icon: CreditCardNavIcon,
  },
] as const;

type Rail = (typeof RAILS)[number]["id"];

const FIELD =
  "mt-1.5 h-11 w-full rounded-xl border border-jumpa-white/10 bg-jumpa-white/5 px-3 text-xs text-jumpa-white " +
  "placeholder:text-jumpa-white/30 focus:border-jumpa-primary-600 focus:outline-none";
const LABEL = "text-[11px] leading-4 font-medium text-jumpa-white/55";
const CARD = "rounded-xl border border-jumpa-white/10 bg-jumpa-white/4";

/** Long Stellar keys only ever need their ends. */
const shorten = (key: string) =>
  key.length > 16 ? `${key.slice(0, 6)}…${key.slice(-6)}` : key;

/**
 * The anchor's hosted SEP-24 window. Portalled to the body and fixed to the
 * viewport, so the transcript behind it cannot drag it out of place, and above
 * the chat header, which would otherwise float over it.
 */
export function Sep24Sheet({
  isOpen,
  onClose,
  anchorName = "MoneyGram Access / TestAnchor",
  assetCode = "USDC",
  account = "GB25HBRJWZBPWKKGXW5BAOWYFUENSV5JHVDAS4TA43FULA4WU2QJDYMZ",
  userName = "Jumpa User",
  userEmail = "user@jumpa.xyz",
  type = "deposit",
  amount = "50",
}: Sep24SheetProps) {
  const [mounted, setMounted] = useState(false);
  const [provider, setProvider] = useState<Provider>("moneygram");
  const [step, setStep] = useState<Step>("kyc");
  const [kycName, setKycName] = useState(() => userName);
  const [kycEmail, setKycEmail] = useState(() => userEmail);
  const [rail, setRail] = useState<Rail>("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [txId] = useState(
    () => `sep24-${Math.random().toString(36).slice(2, 10)}`,
  );

  useEffect(() => setMounted(true), []);
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!isOpen || !mounted) return null;

  const isWithdraw = type === "withdraw";
  const verb = isWithdraw ? "Withdraw" : "Deposit";
  const index = STEPS.indexOf(step as (typeof STEPS)[number]);
  const activeProvider =
    PROVIDERS.find((p) => p.id === provider)?.label ?? anchorName;
  const railTitle = RAILS.find((r) => r.id === rail)?.title ?? "";

  const back = () => setStep(STEPS[index - 1]);

  const advance = () => {
    if (step === "kyc") return setStep("payment");
    if (step === "payment") return setStep("confirm");
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep("success");
    }, 1200);
  };

  const cta =
    step === "kyc"
      ? "Continue to funding rail"
      : step === "payment"
        ? "Review order"
        : step === "confirm"
          ? `Complete sandboxed ${verb.toLowerCase()}`
          : "Close window";

  return createPortal(
    <div className="fixed inset-0 z-60 mx-auto flex max-w-app items-end">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute inset-0 animate-fade cursor-default bg-jumpa-black/60 backdrop-blur-xs"
      />

      {/* max-h, not h: short steps size to their content instead of leaving a
          void, and only a long one turns the body into a scroller. dvh so the
          panel stops at the browser chrome rather than under it. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="SEP-24 hosted sandbox"
        className="relative flex max-h-[86dvh] w-full flex-col overflow-hidden rounded-t-sheet bg-jumpa-anchor-900 text-jumpa-white ring-1 ring-jumpa-white/12 animate-sheet-up"
      >
        <span
          aria-hidden="true"
          className="mx-auto mt-2 block h-1 w-12 shrink-0 rounded-full bg-jumpa-white/20"
        />

        <header className="flex shrink-0 items-center gap-3 px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-jumpa-primary-600/20 text-jumpa-primary-400 ring-1 ring-jumpa-primary-600/30">
            <GlobeIcon className="size-4.5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm leading-5 font-semibold">
                SEP-24 Hosted Sandbox
              </h2>
              <span className="shrink-0 rounded-pill bg-jumpa-success/12 px-2 py-0.5 text-[10px] leading-4 font-semibold text-jumpa-success ring-1 ring-jumpa-success/25">
                Testnet
              </span>
            </div>
            <p className="truncate text-[11px] leading-4 text-jumpa-white/45">
              {activeProvider}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sandbox"
            className="tap flex size-9 shrink-0 items-center justify-center rounded-xl text-jumpa-white/60 hover:bg-jumpa-white/10 hover:text-jumpa-white active:scale-90"
          >
            <CloseIcon className="size-4.5" />
          </button>
        </header>

        {/* Only this rail scrolls sideways; the panel itself never moves. */}
        <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          {PROVIDERS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === provider}
              onClick={() => {
                setProvider(option.id);
                setStep("kyc");
              }}
              className={cn(
                "tap shrink-0 rounded-pill px-3 py-1.5 text-[11px] leading-4 font-medium whitespace-nowrap active:scale-95",
                option.id === provider
                  ? "bg-jumpa-primary-600 text-jumpa-white"
                  : "bg-jumpa-white/6 text-jumpa-white/55 hover:text-jumpa-white/85",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="shrink-0 px-4">
          <ol className="flex items-center gap-2 border-y border-jumpa-white/8 py-3">
            {STEPS.map((entry, position) => {
              const complete = step === "success" || position < index;
              const current = entry === step;
              return (
                <li key={entry} className="flex flex-1 items-center gap-2">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                      complete
                        ? "bg-jumpa-success/20 text-jumpa-success"
                        : current
                          ? "bg-jumpa-primary-600 text-jumpa-white"
                          : "bg-jumpa-white/10 text-jumpa-white/40",
                    )}
                  >
                    {complete ? <CheckIcon className="size-3" /> : position + 1}
                  </span>
                  <span
                    className={cn(
                      "truncate text-[11px] leading-4 transition-colors",
                      current ? "text-jumpa-white" : "text-jumpa-white/50",
                    )}
                  >
                    {STEP_LABELS[entry]}
                  </span>
                  {position < STEPS.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-px flex-1 transition-colors",
                        complete ? "bg-jumpa-success/40" : "bg-jumpa-white/10",
                      )}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>

        {/* The one scrollable region. No `flex-1`: it sizes to its content and
            only shrinks once the panel hits its cap. `overscroll-contain` keeps
            it from chaining into the page at either end. */}
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          {step === "kyc" ? (
            <div className="animate-fade">
              <h3 className="text-xs leading-4 font-semibold">
                Customer identification
              </h3>
              <p className="mt-0.5 text-[11px] leading-4 text-jumpa-white/45">
                Stellar Testnet anchor KYC pre-fill
              </p>

              <div className="mt-4 flex flex-col gap-3.5">
                <div>
                  <label className={LABEL} htmlFor="sep24-name">
                    Full name
                  </label>
                  <input
                    id="sep24-name"
                    type="text"
                    value={kycName}
                    onChange={(event) => setKycName(event.target.value)}
                    className={FIELD}
                  />
                </div>

                <div>
                  <label className={LABEL} htmlFor="sep24-email">
                    Email address
                  </label>
                  <input
                    id="sep24-email"
                    type="email"
                    value={kycEmail}
                    onChange={(event) => setKycEmail(event.target.value)}
                    className={FIELD}
                  />
                </div>

                <div>
                  <label className={LABEL} htmlFor="sep24-account">
                    Stellar destination
                  </label>
                  <input
                    id="sep24-account"
                    type="text"
                    readOnly
                    value={shorten(account)}
                    className={cn(
                      FIELD,
                      "cursor-not-allowed bg-jumpa-black/40 font-mono text-jumpa-white/55",
                    )}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === "payment" ? (
            <div className="animate-fade">
              <h3 className="text-xs leading-4 font-semibold">Funding rail</h3>
              <p className="mt-0.5 text-[11px] leading-4 text-jumpa-white/45">
                {isWithdraw ? "Settling" : "Funding"} {amount} {assetCode} on
                Stellar Testnet
              </p>

              <fieldset className="mt-4 flex flex-col gap-2">
                <legend className="sr-only">Choose a funding rail</legend>
                {RAILS.map(({ id, title, blurb, Icon }) => (
                  <label
                    key={id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                      rail === id
                        ? "border-jumpa-primary-600 bg-jumpa-primary-600/10"
                        : "border-jumpa-white/10 bg-jumpa-white/4 hover:border-jumpa-white/20",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                        rail === id
                          ? "bg-jumpa-primary-600/20 text-jumpa-primary-400"
                          : "bg-jumpa-white/6 text-jumpa-white/60",
                      )}
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs leading-4 font-semibold">
                        {title}
                      </span>
                      <span className="block truncate text-[11px] leading-4 text-jumpa-white/45">
                        {blurb}
                      </span>
                    </span>
                    <input
                      type="radio"
                      name="sep24-rail"
                      value={id}
                      checked={rail === id}
                      onChange={() => setRail(id)}
                      className="size-4 shrink-0 accent-jumpa-primary-600"
                    />
                  </label>
                ))}
              </fieldset>
            </div>
          ) : null}

          {step === "confirm" ? (
            <div className="animate-fade">
              <div className={cn(CARD, "px-4 py-3.5 text-center")}>
                <p className="text-[11px] leading-4 text-jumpa-white/45">
                  You {verb.toLowerCase()}
                </p>
                <p className="mt-1 text-2xl leading-7 font-semibold">
                  {amount}{" "}
                  <span className="text-base text-jumpa-white/55">
                    {assetCode}
                  </span>
                </p>
              </div>

              <dl className={cn(CARD, "mt-3 flex flex-col gap-2.5 p-3.5")}>
                <Summary label="Provider" value={activeProvider} />
                <Summary label="Rail" value={railTitle} />
                <Summary label="Fee" value="$0.00 (waived)" tone="success" />
                <span aria-hidden="true" className="h-px bg-jumpa-white/10" />
                <Summary label="Destination" value={shorten(account)} mono />
                <Summary label="Reference" value={txId} mono />
              </dl>
            </div>
          ) : null}

          {step === "success" ? (
            <div className="animate-fade text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-jumpa-success/15 text-jumpa-success ring-1 ring-jumpa-success/30">
                <CheckIcon className="size-6" />
              </span>

              <h3 className="mt-3 text-sm leading-5 font-semibold">
                SEP-24 {verb.toLowerCase()} initialised
              </h3>
              <p className="mt-1 text-[11px] leading-4 text-jumpa-white/55">
                Staged {isWithdraw ? "off-ramp" : "on-ramp"} of{" "}
                <span className="font-semibold text-jumpa-white">
                  {amount} {assetCode}
                </span>{" "}
                {isWithdraw ? "from" : "to"} your Stellar account.
              </p>

              <dl
                className={cn(
                  CARD,
                  "mt-4 flex flex-col gap-2.5 p-3.5 text-left",
                )}
              >
                <Summary
                  label="Status"
                  value="pending_anchor_funds"
                  tone="success"
                  mono
                />
                <Summary label="Reference" value={txId} mono />
                <Summary label="Account" value={shorten(account)} mono />
              </dl>
            </div>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-jumpa-white/10 bg-jumpa-anchor-950 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <div className="flex items-center gap-2">
            {index > 0 && step !== "success" ? (
              <button
                type="button"
                onClick={back}
                disabled={isProcessing}
                aria-label="Previous step"
                className="tap flex size-12 shrink-0 items-center justify-center rounded-pill bg-jumpa-white/8 text-jumpa-white/70 hover:bg-jumpa-white/14 hover:text-jumpa-white active:scale-95 disabled:opacity-50"
              >
                <CornerUpLeftIcon className="size-4.5" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={step === "success" ? onClose : advance}
              disabled={isProcessing}
              className={cn(
                "tap flex h-12 flex-1 items-center justify-center gap-2 rounded-pill text-xs font-semibold active:scale-[0.98] disabled:opacity-60",
                step === "success"
                  ? "bg-jumpa-white/10 text-jumpa-white hover:bg-jumpa-white/15"
                  : "bg-jumpa-primary-600 text-jumpa-white hover:bg-jumpa-primary-700",
              )}
            >
              {isProcessing ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-jumpa-white border-t-transparent" />
                  Broadcasting…
                </>
              ) : (
                <>
                  {cta}
                  {step !== "success" ? (
                    <ArrowUpRightIcon className="size-3.5" />
                  ) : null}
                </>
              )}
            </button>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-[10px] leading-4 text-jumpa-white/40">
              <span className="size-1.5 shrink-0 rounded-full bg-jumpa-success" />
              <span className="truncate font-mono">{shorten(account)}</span>
            </span>

            <button
              type="button"
              onClick={async () => setCopied(await copyText(account))}
              className="tap flex shrink-0 items-center gap-1 text-[10px] leading-4 font-semibold text-jumpa-white/50 hover:text-jumpa-white active:scale-95"
            >
              {copied ? (
                <CheckIcon className="size-3 text-jumpa-success" />
              ) : (
                <CopyIcon className="size-3" />
              )}
              {copied ? "Copied" : "Copy address"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Summary({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "success";
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[11px] leading-4 text-jumpa-white/45">
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 truncate text-right text-xs leading-4 font-semibold",
          mono && "font-mono text-[11px]",
          tone === "success" ? "text-jumpa-success" : "text-jumpa-white",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
