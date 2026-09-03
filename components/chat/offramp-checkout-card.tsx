import { DetailPanel } from "@/components/chat/card-rows";
import {
  CardAmount,
  CardRule,
  CardStatusPill,
  CardTitle,
  ChatCard,
  ReferenceLine,
} from "@/components/chat/chat-card";
import { RampNotice } from "@/components/chat/ramp-parts";
import type { OfframpCard } from "@/lib/chat";

interface OfframpCheckoutCardProps {
  card: OfframpCard;
  onReply?: (reply: string) => void;
}

/** Cash-out quote: what leaves the wallet, what lands in the bank. */
export function OfframpCheckoutCard({
  card,
  onReply,
}: OfframpCheckoutCardProps) {
  const isDone = card.status === "confirmed";
  const isError = card.status === "error";
  const isCancelled = card.status === "cancelled";
  // The design's quote state carries no pill, so only a settled or failed
  // withdrawal shows one.
  const settled = isDone || isError || isCancelled;

  return (
    <ChatCard>
      <CardTitle title={card.title || "Withdrawal/Cashout"}>
        {settled ? (
          <CardStatusPill
            status={{
              label: isDone ? "Completed" : isCancelled ? "Cancelled" : "Error",
              tone: isDone ? "done" : "pending",
            }}
          />
        ) : null}
      </CardTitle>

      <CardRule />

      <CardAmount
        row={{
          caption: "YOU PAY",
          value: card.cryptoAmount,
          badge: card.cryptoToken || "USDC",
        }}
      />
      <CardAmount
        row={{
          caption: "YOU RECEIVE",
          value: card.fiatAmount === "—" ? "Calculating…" : card.fiatAmount,
          badge: card.fiatCurrency || "NGN",
        }}
      />

      {isError || isCancelled ? (
        <RampNotice tone="error">
          {isCancelled
            ? "This withdrawal has been cancelled."
            : "Could not process withdrawal. Please try again."}
        </RampNotice>
      ) : (
        <DetailPanel
          onReply={onReply}
          details={{
            lines: [
              { label: "Bank Name", value: card.bankName },
              { label: "Account Name", value: card.accountName },
            ],
            field: { caption: "ACCOUNT NUMBER", value: card.accountNumber },
            action: settled ? undefined : { label: "Change", kind: "reply" },
          }}
        />
      )}

      {card.depositAddress ? (
        <DetailPanel
          details={{
            lines: card.asset
              ? [{ label: "Network", value: card.asset.split(":")[0] ?? "" }]
              : [],
            field: {
              caption: "DEPOSIT ADDRESS",
              value: card.depositAddress,
            },
            action: { label: "Copy", kind: "copy" },
          }}
        />
      ) : null}

      {card.reference ? (
        <>
          <CardRule />
          <ReferenceLine reference={card.reference} />
        </>
      ) : null}
    </ChatCard>
  );
}
