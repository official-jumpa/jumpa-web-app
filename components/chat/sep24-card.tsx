"use client";

import { useState } from "react";
import { DetailBox, DetailRow, RampShell } from "@/components/chat/ramp-parts";
import { Sep24Sheet } from "@/components/ramps/sep24-sheet";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";

export interface Sep24CardProps {
  card: {
    anchorName?: string;
    assetCode?: string;
    account?: string;
    userName?: string;
    userEmail?: string;
    type?: "deposit" | "withdraw";
    amount?: string;
    summary?: string;
  };
}

const FALLBACK_ACCOUNT =
  "GB25HBRJWZBPWKKGXW5BAOWYFUENSV5JHVDAS4TA43FULA4WU2QJDYMZ";

/** Entry point to the anchor's hosted window, in the transcript's card language. */
export function Sep24Card({ card }: Sep24CardProps) {
  const [open, setOpen] = useState(false);

  const anchorName = card.anchorName || "Stellar TestAnchor / MoneyGram";
  const assetCode = card.assetCode || "USDC";
  const type = card.type || "deposit";
  const amount = card.amount || "50";
  const account = card.account || FALLBACK_ACCOUNT;

  return (
    <>
      <RampShell
        title="SEP-24 Hosted Anchor"
        status="Testnet Sandbox"
        tone="pending"
      >
        <DetailBox>
          <DetailRow label="Anchor Provider" value={anchorName} />
          <DetailRow
            label="Operation"
            value={type === "withdraw" ? "Withdraw" : "Deposit"}
          />
          <DetailRow label="Target Asset" value={`${amount} ${assetCode}`} />
          <DetailRow label="Settlement Rail" value="SEP-24 Interactive" />
        </DetailBox>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-jumpa-primary-600 text-xs leading-4 font-semibold text-jumpa-white active:scale-[0.98]"
        >
          Launch sandbox window
          <ArrowUpRightIcon className="size-3.5" />
        </button>
      </RampShell>

      <Sep24Sheet
        isOpen={open}
        onClose={() => setOpen(false)}
        anchorName={anchorName}
        assetCode={assetCode}
        account={account}
        userName={card.userName}
        userEmail={card.userEmail}
        type={type}
        amount={amount}
      />
    </>
  );
}
