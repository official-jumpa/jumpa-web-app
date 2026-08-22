import {
  ConversionBlock,
  CopyField,
  DetailBox,
  DetailRow,
  RampNotice,
  RampShell,
  StepLabel,
} from "@/components/chat/ramp-parts";
import type { OfframpCard } from "@/lib/chat";

interface OfframpCheckoutCardProps {
  card: OfframpCard;
}

/** Cashing out: send the asset to this address, the bank account gets credited. */
export function OfframpCheckoutCard({ card }: OfframpCheckoutCardProps) {
  const isDone = card.status === "confirmed";
  const isError = card.status === "error";

  // Without a deposit address there is nothing for the user to do, so the bank
  // account becomes step one rather than step two.
  const bankStep = card.depositAddress ? 2 : 1;

  return (
    <RampShell
      title={card.title || "Cash Out"}
      status={isDone ? "Completed" : isError ? "Error" : "Pending"}
      tone={isDone ? "done" : isError ? "error" : "pending"}
    >
      <ConversionBlock
        from={{
          caption: "You send",
          value: card.cryptoAmount,
          badge: card.cryptoToken,
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
      ) : (
        <>
          {card.depositAddress ? (
            <div className="flex flex-col gap-2">
              <StepLabel step={1}>
                Send {card.cryptoToken} to this address
              </StepLabel>
              <DetailBox>
                {card.asset ? (
                  <DetailRow label="Network" value={card.asset} />
                ) : null}
                <CopyField
                  label="Deposit address"
                  value={card.depositAddress}
                  wrap
                />
              </DetailBox>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <StepLabel step={bankStep}>Paid into your account</StepLabel>
            <DetailBox>
              <DetailRow label="Bank" value={card.bankName} />
              <DetailRow label="Account name" value={card.accountName} />
              <DetailRow label="Account number" value={card.accountNumber} />
            </DetailBox>
          </div>

          {isDone ? null : (
            <RampNotice tone="pending">
              {card.depositAddress
                ? "Send the exact amount to the address above. Your account is credited once the transfer confirms."
                : "Your account is credited once the transfer confirms."}
            </RampNotice>
          )}
        </>
      )}
    </RampShell>
  );
}
