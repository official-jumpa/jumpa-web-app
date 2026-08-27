"use client";

import { useState } from "react";
import { Sep24Sheet } from "@/components/ramps/sep24-sheet";
import { Button } from "@/components/ui/button";

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

export function Sep24Card({ card }: Sep24CardProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const anchorName = card.anchorName || "Stellar TestAnchor / MoneyGram";
  const assetCode = card.assetCode || "USDC";
  const type = card.type || "deposit";
  const amount = card.amount || "50";
  const account = card.account || "GB25HBRJWZBPWKKGXW5BAOWYFUENSV5JHVDAS4TA43FULA4WU2QJDYMZ";
  const userName = card.userName;
  const userEmail = card.userEmail;

  return (
    <>
      <div className="w-full max-w-[360px] rounded-2xl border border-white/10 bg-[#12131A] p-4 text-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 text-xs">
              ⚓
            </span>
            <span className="text-xs font-semibold text-white/90">SEP-24 Hosted Anchor</span>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
            Testnet Sandbox
          </span>
        </div>

        {/* Body */}
        <div className="py-3 space-y-2 text-xs">
          <div className="flex items-center justify-between text-white/60">
            <span>Anchor Provider</span>
            <span className="font-medium text-white">{anchorName}</span>
          </div>
          <div className="flex items-center justify-between text-white/60">
            <span>Operation</span>
            <span className="font-medium text-white capitalize">{type}</span>
          </div>
          <div className="flex items-center justify-between text-white/60">
            <span>Target Asset</span>
            <span className="font-medium text-white">{amount} {assetCode}</span>
          </div>
          <div className="flex items-center justify-between text-white/60">
            <span>Settlement Rail</span>
            <span className="font-mono text-[11px] text-white/80 truncate max-w-[180px]">
              SEP-24 Interactive Webview
            </span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={() => setIsSheetOpen(true)}
          className="w-full mt-2 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Launch Sandboxed SEP-24 Window
        </Button>
      </div>

      {/* Embedded Sandbox Sheet */}
      <Sep24Sheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        anchorName={anchorName}
        assetCode={assetCode}
        account={account}
        userName={userName}
        userEmail={userEmail}
        type={type}
        amount={amount}
      />
    </>
  );
}
