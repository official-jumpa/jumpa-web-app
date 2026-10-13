"use client";

import { type ReactNode, useEffect, useState } from "react";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { SavingsLabel, savingsShell } from "@/components/savings/savings-field";
import { SavingsPanel, SavingsRule } from "@/components/savings/savings-form";
import { formatMoney, type HubCurrency } from "@/lib/savings-hub";
import { MoneyField } from "@/components/savings/hub/money-field";
import { toast } from "@/components/ui/toast";

interface ResolvedCircle {
  id: string;
  name: string;
  currency: HubCurrency;
  target: number;
  saved: number;
  style: "save_together" | "shared_pool";
  inviteCode: string;
  membersCount: number;
  capacity: number;
  isFull: boolean;
  isMember: boolean;
  endDate: string | null;
}

export function JoinCircleView({
  onBack,
  onJoin,
}: {
  onBack?: () => void;
  onJoin?: (code: string, amount: number, currency: HubCurrency) => void;
}) {
  const [ref, setRef] = useState("");
  const [amount, setAmount] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [circle, setCircle] = useState<ResolvedCircle | null>(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clean the input to extract code (supports raw code e.g. "C8H2KX" or link e.g. "jumpa.app/...code=C8H2KX")
  const extractCode = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return "";
    try {
      if (trimmed.includes("code=")) {
        const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
        const codeParam = url.searchParams.get("code");
        if (codeParam) return codeParam.toUpperCase();
      }
    } catch { }
    // Extract last path or pure code
    const segments = trimmed.split(/[/=]/);
    return segments[segments.length - 1].toUpperCase();
  };

  useEffect(() => {
    const code = extractCode(ref);
    if (!code || code.length < 3) {
      setCircle(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/savings/lookup?code=${encodeURIComponent(code)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (res.ok && data.circle) {
          setCircle(data.circle);
        } else {
          setCircle(null);
          setError("No active circle matches this code");
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setCircle(null);
          setError("Failed to look up circle");
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [ref]);

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRef(text.trim());
      setPasteError(null);
    } catch {
      setPasteError("Paste is blocked. Type or long-press the field.");
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!circle) return;
    const numAmount = Number(amount);
    if (numAmount <= 0) {
      toast.error("Please enter your contribution amount");
      return;
    }
    if (circle.currency === "NGN") {
      if (numAmount < 200) {
        toast.error("Minimum circle contribution is ₦200");
        return;
      }
      if (numAmount > 1000000) {
        toast.error("Maximum contribution limit is ₦1,000,000");
        return;
      }
    } else {
      if (numAmount < 0.5) {
        toast.error("Minimum circle contribution is $0.5 USDC");
        return;
      }
      if (numAmount > 1000) {
        toast.error("Maximum contribution limit is $1,000 USDC");
        return;
      }
    }
    if (circle.isFull) {
      toast.error("This circle is already at full capacity");
      return;
    }
    if (circle.isMember) {
      toast.error("You are already a member of this circle");
      return;
    }

    if (onJoin) {
      onJoin(circle.inviteCode, numAmount, circle.currency);
    } else {
      setJoined(true);
    }
  };

  if (joined && circle) {
    return (
      <TransferSuccess
        back="/savings"
        compact
        title="Successful"
        titleFirst
        amount={`You joined ${circle.name}`}
        note={`You contributed ${formatMoney(Number(amount), circle.currency)} to this circle.`}
        actions={null}
        ctaLabel="Done"
        ctaHref="/savings"
      />
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
    >
      <TransferHeader back="/savings" onBack={onBack} title="Join circle" />

      <div className="mt-6 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-3">
            <SavingsLabel>Enter circle code or invite link</SavingsLabel>
            <span className={savingsShell()}>
              <SearchAltIcon
                aria-hidden="true"
                className="size-6 shrink-0 text-jumpa-primary-200"
              />
              <input
                value={ref}
                onChange={(event) => {
                  setRef(event.target.value);
                  setPasteError(null);
                }}
                placeholder="e.g. C7K9WZ or invite link"
                className="min-w-0 flex-1 bg-transparent text-sm leading-4 font-semibold text-jumpa-black outline-none placeholder:font-medium placeholder:text-jumpa-primary-200"
              />
              <button
                type="button"
                onClick={paste}
                className="tap flex h-full shrink-0 items-center rounded-pill bg-[image:var(--gradient-jumpa-cta)] px-2.5 text-xs leading-4 font-semibold text-jumpa-alt-400 active:scale-95"
              >
                Paste
              </button>
            </span>
          </label>

          <FieldError>
            {pasteError ?? error ?? undefined}
          </FieldError>
        </div>

        {circle ? (
          <>
            <SavingsPanel>
              <Row label="Name">
                <span className="text-xs leading-5 font-bold text-jumpa-black">
                  {circle.name}
                </span>
              </Row>
              <SavingsRule />

              <Row label="Type">
                <span className="text-xs leading-5 font-semibold text-jumpa-primary-600">
                  {circle.style === "shared_pool" ? "Shared Pool" : "Save Together"}
                </span>
              </Row>
              <SavingsRule />

              <Row label="Circle target">
                <span className="text-base leading-5 font-bold text-jumpa-primary-600">
                  {formatMoney(circle.target, circle.currency)}
                </span>
              </Row>
              <SavingsRule />

              <Row label="Members">
                <Value>
                  {circle.membersCount} of {circle.capacity} Members
                </Value>
              </Row>
              {circle.endDate ? (
                <>
                  <SavingsRule />
                  <Row label="Target date">
                    <Value>{circle.endDate}</Value>
                  </Row>
                </>
              ) : null}
            </SavingsPanel>

            <MoneyField
              label="Your first contribution"
              currency={circle.currency}
              value={amount}
              onChange={setAmount}
              example="target"
            />
          </>
        ) : null}
      </div>

      {circle ? (
        <Button
          type="submit"
          variant="gradientSheet"
          size="lg"
          className="mt-7"
          disabled={loading || circle.isFull || circle.isMember}
        >
          {circle.isFull
            ? "Circle is full"
            : circle.isMember
              ? "Already joined"
              : "Join circle"}
        </Button>
      ) : null}
    </form>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2.5">
      <span className="text-[10px] leading-4 text-jumpa-neutral-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function Value({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm leading-4 font-medium text-jumpa-primary-950">
      {children}
    </span>
  );
}
