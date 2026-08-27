"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
  const [provider, setProvider] = useState<"moneygram" | "stellar-anchor" | "mercuryo">("moneygram");
  const [step, setStep] = useState<"kyc" | "payment" | "confirm" | "success">("kyc");
  const [kycName, setKycName] = useState(() => userName);
  const [kycEmail, setKycEmail] = useState(() => userEmail);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bank">("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [txId] = useState(() => `sep24-${Math.random().toString(36).slice(2, 10)}`);

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (step === "kyc") setStep("payment");
    else if (step === "payment") setStep("confirm");
    else if (step === "confirm") {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setStep("success");
      }, 1200);
    }
  };

  const handleReset = () => {
    setStep("kyc");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-app h-[90vh] flex flex-col bg-[#0C0D14] border-t border-x border-white/15 rounded-t-[24px] shadow-2xl overflow-hidden animate-sheet-up text-white"
      >
        {/* Grab Handle */}
        <div className="pt-2 pb-1 flex justify-center bg-[#0C0D14]">
          <span className="h-1 w-12 rounded-full bg-white/20" />
        </div>

        {/* Compact Header */}
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs">
              ⚓
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-semibold text-white">SEP-24 Hosted Sandbox</h3>
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-medium text-emerald-400 border border-emerald-500/20">
                  Testnet
                </span>
              </div>
              <p className="text-[10px] text-white/50">{provider === "moneygram" ? "MoneyGram Access" : provider === "mercuryo" ? "Mercuryo Ramp" : "Stellar TestAnchor"}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Compact Provider Selector Tabs */}
        <div className="flex gap-1.5 px-3 py-2 bg-white/[0.01] border-b border-white/5 overflow-x-auto text-[11px]">
          <button
            type="button"
            onClick={() => { setProvider("moneygram"); setStep("kyc"); }}
            className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all cursor-pointer ${
              provider === "moneygram"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-white/50 hover:text-white/80 bg-white/5"
            }`}
          >
            MoneyGram Access
          </button>
          <button
            type="button"
            onClick={() => { setProvider("stellar-anchor"); setStep("kyc"); }}
            className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all cursor-pointer ${
              provider === "stellar-anchor"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-white/50 hover:text-white/80 bg-white/5"
            }`}
          >
            Stellar TestAnchor
          </button>
          <button
            type="button"
            onClick={() => { setProvider("mercuryo"); setStep("kyc"); }}
            className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all cursor-pointer ${
              provider === "mercuryo"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-white/50 hover:text-white/80 bg-white/5"
            }`}
          >
            Mercuryo
          </button>
        </div>

        {/* Main Content Area — Occupies full height with clean compact layout */}
        <div className="flex-1 p-3.5 overflow-y-auto flex flex-col justify-between bg-gradient-to-b from-[#11121A] to-[#0A0B10]">
          <div>
            {/* Compact Step Progress */}
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${step === "kyc" ? "bg-purple-500 text-white" : "bg-emerald-500/20 text-emerald-400"}`}>
                  {step === "kyc" ? "1" : "✓"}
                </span>
                <span className="text-[11px] text-white/80">Identity</span>
              </div>
              <div className="h-0.5 w-6 bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${step === "payment" ? "bg-purple-500 text-white" : step === "confirm" || step === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}>
                  {step === "confirm" || step === "success" ? "✓" : "2"}
                </span>
                <span className="text-[11px] text-white/80">Method</span>
              </div>
              <div className="h-0.5 w-6 bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${step === "confirm" ? "bg-purple-500 text-white" : step === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}>
                  {step === "success" ? "✓" : "3"}
                </span>
                <span className="text-[11px] text-white/80">Confirm</span>
              </div>
            </div>

            {/* STEP 1: KYC / Identity */}
            {step === "kyc" && (
              <div className="space-y-3 animate-fade">
                <div>
                  <h4 className="text-xs font-semibold text-white">Customer Identification (SEP-24)</h4>
                  <p className="text-[10px] text-white/50">Stellar Testnet anchor KYC pre-fill</p>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-medium text-white/60">Full Name</label>
                    <input
                      type="text"
                      value={kycName}
                      onChange={(e) => setKycName(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-white/60">Email Address</label>
                    <input
                      type="email"
                      value={kycEmail}
                      onChange={(e) => setKycEmail(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-white/60">Stellar Destination Address</label>
                    <input
                      type="text"
                      readOnly
                      value={account}
                      className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 font-mono text-[10px] text-white/60 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Payment Rail / Location */}
            {step === "payment" && (
              <div className="space-y-3 animate-fade">
                <div>
                  <h4 className="text-xs font-semibold text-white">Funding Rail</h4>
                  <p className="text-[10px] text-white/50">Funding {amount} {assetCode} on Stellar Testnet</p>
                </div>

                <div className="space-y-2">
                  <div
                    onClick={() => setPaymentMethod("cash")}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      paymentMethod === "cash"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">💵</span>
                      <div>
                        <p className="text-xs font-semibold text-white">MoneyGram Physical Cash Location</p>
                        <p className="text-[10px] text-white/50">Deposit cash at an authorized branch</p>
                      </div>
                    </div>
                    <input type="radio" checked={paymentMethod === "cash"} readOnly className="accent-purple-500" />
                  </div>

                  <div
                    onClick={() => setPaymentMethod("card")}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      paymentMethod === "card"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">💳</span>
                      <div>
                        <p className="text-xs font-semibold text-white">Debit / Credit Card Sandbox</p>
                        <p className="text-[10px] text-white/50">Instant testnet card checkout</p>
                      </div>
                    </div>
                    <input type="radio" checked={paymentMethod === "card"} readOnly className="accent-purple-500" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Confirm Details */}
            {step === "confirm" && (
              <div className="space-y-3 animate-fade">
                <div>
                  <h4 className="text-xs font-semibold text-white">Confirm Deposit</h4>
                  <p className="text-[10px] text-white/50">Stellar SEP-24 payload summary</p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-white/60">
                    <span>Deposit:</span>
                    <span className="font-semibold text-white">{amount} {assetCode}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Fee:</span>
                    <span className="text-emerald-400 font-medium">$0.00 (Waived)</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Provider:</span>
                    <span className="text-white capitalize">{provider === "moneygram" ? "MoneyGram Access" : provider}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Rail:</span>
                    <span className="text-white capitalize">{paymentMethod === "cash" ? "Cash at Location" : "Card Checkout"}</span>
                  </div>
                  <div className="border-t border-white/10 pt-1.5 flex justify-between text-white/60">
                    <span>Ref:</span>
                    <span className="font-mono text-[10px] text-purple-300">{txId}</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Success Receipt */}
            {step === "success" && (
              <div className="space-y-3 text-center py-2 animate-fade">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-lg">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">SEP-24 Deposit Initialized!</h4>
                  <p className="text-[10px] text-white/60 mt-0.5">
                    Staged on-ramp of <span className="text-white font-semibold">{amount} {assetCode}</span> to your Stellar account.
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs text-left space-y-1 font-mono">
                  <div className="flex justify-between text-white/50 text-[10px]">
                    <span>Status:</span>
                    <span className="text-emerald-400 font-semibold">pending_anchor_funds</span>
                  </div>
                  <div className="flex justify-between text-white/50 text-[10px]">
                    <span>Ref:</span>
                    <span className="text-purple-300 truncate max-w-[160px]">{txId}</span>
                  </div>
                  <div className="flex justify-between text-white/50 text-[10px]">
                    <span>Account:</span>
                    <span className="text-white truncate max-w-[160px]">{account}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button at bottom of content */}
          <div className="pt-3">
            {step === "kyc" && (
              <Button
                onClick={handleNextStep}
                className="w-full h-9 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md shadow-purple-900/30 cursor-pointer"
              >
                Continue to Payment Method →
              </Button>
            )}

            {step === "payment" && (
              <Button
                onClick={handleNextStep}
                className="w-full h-9 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md shadow-purple-900/30 cursor-pointer"
              >
                Review Order →
              </Button>
            )}

            {step === "confirm" && (
              <Button
                onClick={handleNextStep}
                disabled={isProcessing}
                className="w-full h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Broadcasting Deposit...
                  </>
                ) : (
                  "Complete Sandboxed Onramp Deposit"
                )}
              </Button>
            )}

            {step === "success" && (
              <Button
                onClick={handleReset}
                className="w-full h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs cursor-pointer"
              >
                Close Window
              </Button>
            )}
          </div>
        </div>

        {/* Ultra-Compact Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] text-white/50">
          <div className="flex items-center gap-1.5 truncate max-w-[240px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="truncate font-mono">{account}</span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-[10px] text-white/70 hover:text-white underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
