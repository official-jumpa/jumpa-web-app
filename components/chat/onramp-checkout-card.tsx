import { useState } from "react";
import {
  ConversionBlock,
  CopyField,
  DetailBox,
  DetailRow,
  RampNotes,
  RampNotice,
  RampShell,
  StepLabel,
} from "@/components/chat/ramp-parts";
import type { OnrampCard } from "@/lib/chat";

interface OnrampCheckoutCardProps {
  card: OnrampCard;
  onPaid?: () => void;
}

/** Buying crypto with a bank transfer: pay this account, then say you have. */
export function OnrampCheckoutCard({ card, onPaid }: OnrampCheckoutCardProps) {
  const [verifying, setVerifying] = useState(false);
  const [isDone, setIsDone] = useState(card.status === "confirmed");
  const [statusError, setStatusError] = useState<string | null>(null);

  const isError = card.status === "error";

  const handleConfirmPaid = async () => {
    setVerifying(true);
    setStatusError(null);

    try {
      const res = await fetch(
        `/api/switch/status?reference=${encodeURIComponent(card.reference)}`,
      );
      const data = await res.json();

      if (data.success && data.isCompleted) {
        setIsDone(true);
        onPaid?.();
      } else if (data.success && data.isAwaiting) {
        setStatusError(
          data.message ||
            "Payment awaiting deposit. If you have already transferred, please allow a moment for confirmation.",
        );
      } else {
        setStatusError(
          data.message || data.error || "Could not verify payment. Try again.",
        );
      }
    } catch {
      setStatusError("Network error checking status. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <RampShell
      title={card.title || "Buy Crypto"}
      status={isDone ? "Completed" : isError ? "Error" : "Awaiting transfer"}
      tone={isDone ? "done" : isError ? "error" : "pending"}
    >
      <ConversionBlock
        from={{
          caption: "You send",
          value: `₦${card.fiatAmount}`,
          badge: card.fiatCurrency || "NGN",
        }}
        to={{
          caption: "You receive",
          value: card.cryptoAmount === "—" ? "Calculating…" : card.cryptoAmount,
          badge: card.cryptoToken,
        }}
      />

      {isError ? (
        <RampNotice tone="error">
          Could not load bank details. Please try again.
        </RampNotice>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <StepLabel step={1}>Transfer to this account</StepLabel>
            <DetailBox>
              <DetailRow label="Bank" value={card.bankName} />
              <DetailRow label="Account name" value={card.accountName} />
              <CopyField label="Account number" value={card.accountNumber} />
            </DetailBox>
          </div>

          {card.notes && card.notes.length > 0 ? (
            <RampNotes notes={card.notes} />
          ) : null}

          {statusError ? (
            <RampNotice tone="pending">{statusError}</RampNotice>
          ) : null}

          {isDone ? null : (
            <div className="flex flex-col gap-2">
              <StepLabel step={2}>Confirm once you have paid</StepLabel>
              <button
                type="button"
                onClick={handleConfirmPaid}
                disabled={verifying}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-pill bg-[image:var(--gradient-jumpa-cta)] text-[13px] leading-4 font-semibold text-jumpa-white shadow-xs transition-opacity active:scale-98 disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <span className="size-3 animate-spin rounded-full border-2 border-jumpa-white border-t-transparent" />
                    Verifying…
                  </>
                ) : (
                  "I have transferred the funds"
                )}
              </button>
            </div>
          )}
        </>
      )}
    </RampShell>
  );
}
