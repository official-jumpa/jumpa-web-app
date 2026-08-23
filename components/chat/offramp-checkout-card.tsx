import {
  ConversionBlock,
  DetailBox,
  DetailRow,
  RampNotice,
  RampShell,
} from "@/components/chat/ramp-parts";
import type { OfframpCard } from "@/lib/chat";

interface OfframpCheckoutCardProps {
  card: OfframpCard;
}

/**
 * Clean offramp proposal / review card.
 * Displays token, amount, receiving fiat amount, and verified bank account details.
 * The AI/sovereign wallet executes the transaction upon PIN confirmation.
 */
export function OfframpCheckoutCard({ card }: OfframpCheckoutCardProps) {
  const isDone = card.status === "confirmed";
  const isError = card.status === "error";
  const isCancelled = card.status === "cancelled";

  const statusLabel = isDone
    ? "Completed"
    : isCancelled
      ? "Cancelled"
      : isError
        ? "Error"
        : "Pending Confirmation";

  const tone = isDone
    ? "done"
    : isCancelled || isError
      ? "error"
      : "pending";

  const networkName = card.asset
    ? card.asset.split(":")[0]?.toUpperCase()
    : "BASE";

  return (
    <RampShell
      title={card.title || "Withdrawal"}
      status={statusLabel}
      tone={tone}
    >
      <ConversionBlock
        from={{
          caption: `You sell (${networkName})`,
          value: card.cryptoAmount,
          badge: card.cryptoToken || "USDC",
        }}
        to={{
          caption: "You receive",
          value:
            card.fiatAmount === "—" ? "Calculating…" : `₦${card.fiatAmount}`,
          badge: card.fiatCurrency || "NGN",
        }}
      />

      {isError ? (
        <RampNotice tone="error">
          Could not process withdrawal. Please try again.
        </RampNotice>
      ) : isCancelled ? (
        <RampNotice tone="error">
          This withdrawal has been cancelled.
        </RampNotice>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <DetailBox>
              <DetailRow label="Bank" value={card.bankName} />
              <DetailRow label="Account name" value={card.accountName} />
              <DetailRow label="Account number" value={card.accountNumber} />
              {card.asset ? (
                <DetailRow label="Network" value={networkName} />
              ) : null}
            </DetailBox>
          </div>

          {isDone ? null : (
            <RampNotice tone="pending">
              Confirm with your PIN to complete this withdrawal
            </RampNotice>
          )}
        </>
      )}
    </RampShell>
  );
}
