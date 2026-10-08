"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PlusIcon } from "@/components/ui/icons/plus";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons/check";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { LockIcon } from "@/components/ui/icons/lock";
import { UsersIcon } from "@/components/ui/icons/users";
import { ArrowBackIcon } from "@/components/ui/icons/arrow-back";
import { SavingsIntroSheet } from "@/components/savings/savings-intro-sheet";
import { SAVINGS_INTROS } from "@/components/savings/savings-intros";
import type { SavingsKind } from "@/lib/savings";

type Currency = "NGN" | "USDC";
type Screen = "hub" | "detail" | "create-individual" | "create-lock" | "create-circle";

interface HistoryItem {
  id: string;
  type: "deposit" | "withdrawal" | "interest";
  amount: number;
  date: string;
}

interface MockGoal {
  id: string;
  name: string;
  currency: Currency;
  saved: number;
  target: number;
  interestEarned: number;
  apy: string;
  daysLeft: number;
  startDate?: string;
  status: "Active" | "Matured";
  kind: "individual" | "lock" | "circle";
  membersCount?: number;
  history?: HistoryItem[];
}

const INITIAL_GOALS: MockGoal[] = [
  {
    id: "g-1",
    name: "MacBook Pro M4 Fund",
    currency: "NGN",
    saved: 450000,
    target: 1200000,
    interestEarned: 18500,
    apy: "11.5% p.a.",
    daysLeft: 42,
    startDate: "15 Aug 2026",
    status: "Active",
    kind: "individual",
    history: [
      { id: "h-1", type: "deposit", amount: 250000, date: "15 Aug 2026" },
      { id: "h-2", type: "deposit", amount: 200000, date: "02 Sep 2026" },
      { id: "h-3", type: "interest", amount: 18500, date: "Today (Accrued)" },
    ],
  },
  {
    id: "g-2",
    name: "Emergency Reserve",
    currency: "USDC",
    saved: 1200,
    target: 2500,
    interestEarned: 48.75,
    apy: "9.8% p.a.",
    daysLeft: 88,
    startDate: "01 Jul 2026",
    status: "Active",
    kind: "individual",
    history: [
      { id: "h-4", type: "deposit", amount: 1000, date: "01 Jul 2026" },
      { id: "h-5", type: "deposit", amount: 200, date: "15 Aug 2026" },
      { id: "h-6", type: "interest", amount: 48.75, date: "Today (Accrued)" },
    ],
  },
  {
    id: "g-3",
    name: "3-Month High Yield Lock",
    currency: "NGN",
    saved: 800000,
    target: 800000,
    interestEarned: 32000,
    apy: "14.5% p.a.",
    daysLeft: 18,
    startDate: "20 Jul 2026",
    status: "Active",
    kind: "lock",
    history: [
      { id: "h-7", type: "deposit", amount: 800000, date: "20 Jul 2026" },
      { id: "h-8", type: "interest", amount: 32000, date: "Today (Accrued)" },
    ],
  },
  {
    id: "g-4",
    name: "Tech Bro Trip to Kigali",
    currency: "NGN",
    saved: 650000,
    target: 1500000,
    interestEarned: 14200,
    apy: "10.0% p.a.",
    daysLeft: 65,
    startDate: "10 Aug 2026",
    status: "Active",
    kind: "circle",
    membersCount: 4,
    history: [
      { id: "h-9", type: "deposit", amount: 300000, date: "10 Aug 2026" },
      { id: "h-10", type: "deposit", amount: 350000, date: "28 Aug 2026" },
      { id: "h-11", type: "interest", amount: 14200, date: "Today (Accrued)" },
    ],
  },
];

export function SavingsOption1View() {
  const [screen, setScreen] = useState<Screen>("hub");
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [goals, setGoals] = useState<MockGoal[]>(INITIAL_GOALS);
  const [selectedGoal, setSelectedGoal] = useState<MockGoal | null>(null);

  // Intro sheet trigger (popup explaining each type before creating)
  const [introKind, setIntroKind] = useState<SavingsKind | null>(null);

  // Creation forms states
  const [formName, setFormName] = useState("");
  const [formCurrency, setFormCurrency] = useState<Currency>("NGN");
  const [formTarget, setFormTarget] = useState("");
  const [formDeposit, setFormDeposit] = useState("");
  const [formDays, setFormDays] = useState("30");
  const [formCircleMembers, setFormCircleMembers] = useState("3");

  // Detail screen action states
  const [topUpAmount, setTopUpAmount] = useState("");
  const [showTopUpSheet, setShowTopUpSheet] = useState(false);
  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);

  // Computations
  const filteredGoals = goals.filter((g) => g.currency === currency);
  const totalSaved = filteredGoals.reduce((sum, g) => sum + g.saved, 0);
  const totalInterest = filteredGoals.reduce((sum, g) => sum + g.interestEarned, 0);

  const formatMoney = (val: number, cur: Currency) => {
    return cur === "NGN"
      ? `₦${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const depositNum = parseFloat(formDeposit) || 0;
  const simulatedYield30d = (depositNum * 0.115 * (30 / 365)).toFixed(2);
  const simulatedLockYield = (
    depositNum *
    0.15 *
    ((parseInt(formDays) || 30) / 365)
  ).toFixed(2);

  // Handler for creating goals per product type
  const handleSaveGoal = (kind: "individual" | "lock" | "circle") => {
    const targetVal = parseFloat(formTarget) || (kind === "lock" ? depositNum : depositNum * 2);
    const newGoal: MockGoal = {
      id: `g-${Date.now()}`,
      name: formName || (kind === "lock" ? "Locked Vault" : kind === "circle" ? "Circle Target" : "Personal Goal"),
      currency: formCurrency,
      saved: depositNum,
      target: targetVal,
      interestEarned: 0,
      apy: kind === "lock" ? "15.0% p.a." : kind === "circle" ? "10.0% p.a." : "11.5% p.a.",
      daysLeft: parseInt(formDays) || 60,
      status: "Active",
      kind,
      membersCount: kind === "circle" ? parseInt(formCircleMembers) || 3 : undefined,
    };

    setGoals([newGoal, ...goals]);
    setCurrency(formCurrency);
    setSelectedGoal(newGoal);
    setScreen("detail");
    // Reset form
    setFormName("");
    setFormTarget("");
    setFormDeposit("");
  };

  const handleTopUp = () => {
    if (!selectedGoal) return;
    const added = parseFloat(topUpAmount) || 0;
    const newHistoryItem: HistoryItem = {
      id: `h-${Date.now()}`,
      type: "deposit",
      amount: added,
      date: "Today",
    };
    const updatedHistory = [newHistoryItem, ...(selectedGoal.history || [])];
    const updated = {
      ...selectedGoal,
      saved: selectedGoal.saved + added,
      history: updatedHistory,
    };
    setGoals(goals.map((g) => (g.id === selectedGoal.id ? updated : g)));
    setSelectedGoal(updated);
    setTopUpAmount("");
    setShowTopUpSheet(false);
  };

  const handleWithdraw = () => {
    if (!selectedGoal) return;
    setGoals(goals.filter((g) => g.id !== selectedGoal.id));
    setSelectedGoal(null);
    setShowWithdrawSheet(false);
    setScreen("hub");
  };

  // ==========================================
  // 1. STANDALONE SCREEN: GOAL DETAILS VIEW
  // ==========================================
  if (screen === "detail" && selectedGoal) {
    const progress = Math.min(
      100,
      Math.round((selectedGoal.saved / selectedGoal.target) * 100)
    );

    return (
      <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        {/* Navigation Header */}
        <div className="flex items-center justify-between pb-2">
          <button
            onClick={() => setScreen("hub")}
            className="tap flex size-9 items-center justify-center rounded-full bg-jumpa-neutral-100 text-jumpa-black hover:bg-jumpa-neutral-200 transition-all"
          >
            <ArrowBackIcon className="size-4" />
          </button>
          <h1 className="text-sm font-bold text-jumpa-black truncate max-w-[60%]">
            {selectedGoal.name}
          </h1>
          <span className="rounded-pill bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9.5px] font-bold text-emerald-700">
            {selectedGoal.status}
          </span>
        </div>

        {/* Compact Goal Banner */}
        <div className="relative mt-1.5 flex flex-col overflow-hidden rounded-key bg-[linear-gradient(to_bottom,var(--color-jumpa-primary-600),var(--color-jumpa-primary-700))] px-4.5 py-3.5 text-jumpa-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="rounded-pill bg-jumpa-primary-950/70 px-2 py-0.5 text-[8.5px] font-semibold tracking-wider text-jumpa-primary-100 uppercase">
              {selectedGoal.kind.toUpperCase()} SAVINGS
            </span>
            <span className="text-[11px] font-bold text-emerald-300">
              {selectedGoal.apy}
            </span>
          </div>

          <div className="my-2 flex flex-col items-center">
            <span className="text-[10px] text-jumpa-primary-100 uppercase tracking-wide">Total Saved</span>
            <p className="text-2xl font-bold tracking-tight leading-tight">
              {formatMoney(selectedGoal.saved, selectedGoal.currency)}
            </p>
            <div className="mt-1 inline-flex items-center gap-1 rounded-pill border border-emerald-400/25 bg-emerald-950/50 px-2.5 py-0.5 text-[9.5px] font-medium text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <span>Interest Earned: +{formatMoney(selectedGoal.interestEarned, selectedGoal.currency)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-jumpa-white/15 pt-2 text-[10.5px]">
            <span className="text-jumpa-primary-100">
              Target: {formatMoney(selectedGoal.target, selectedGoal.currency)}
            </span>
            <span className="font-semibold text-jumpa-white">{progress}% Funded</span>
          </div>
        </div>

        {/* Action Buttons (High Contrast Clear Withdraw Button) */}
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <Button
            size="md"
            variant="brand"
            onClick={() => setShowTopUpSheet(true)}
            className="shadow-xs font-bold"
          >
            + Top Up
          </Button>
          <button
            type="button"
            onClick={() => setShowWithdrawSheet(true)}
            className="tap flex h-[52px] items-center justify-center rounded-pill border border-jumpa-neutral-300 bg-jumpa-neutral-100 text-sm font-bold text-jumpa-black hover:bg-jumpa-neutral-200 active:scale-[0.98] transition-all"
          >
            Withdraw
          </button>
        </div>

        {/* Non-Duplicated Plan Details */}
        <div className="mt-4 flex flex-col gap-1.5">
          <h2 className="text-[11px] font-semibold text-jumpa-neutral-600 uppercase tracking-wider">
            Plan Configuration
          </h2>
          <div className="flex flex-col gap-2 rounded-surface border border-jumpa-neutral-200 bg-jumpa-white p-3.5 text-xs">
            <div className="flex justify-between">
              <span className="text-jumpa-neutral-500">Start Date</span>
              <span className="font-semibold text-jumpa-black">
                {selectedGoal.startDate || "15 Aug 2026"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-jumpa-neutral-500">Duration Remaining</span>
              <span className="font-semibold text-jumpa-black">
                {selectedGoal.daysLeft} days remaining
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-jumpa-neutral-500">Settlement Wallet</span>
              <span className="font-semibold text-jumpa-black">
                Jumpa {selectedGoal.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-jumpa-neutral-500">Savings Model</span>
              <span className="font-semibold text-emerald-700">
                Manual Top-up (Save at your pace)
              </span>
            </div>
            {selectedGoal.membersCount && (
              <div className="flex justify-between">
                <span className="text-jumpa-neutral-500">Circle Contributors</span>
                <span className="font-bold text-purple-700">
                  {selectedGoal.membersCount} active members
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Activity & Transaction History */}
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold text-jumpa-neutral-600 uppercase tracking-wider">
              Activity History
            </h2>
            <span className="text-[10px] text-jumpa-neutral-400">
              {selectedGoal.history?.length || 0} events
            </span>
          </div>

          <div className="flex flex-col divide-y divide-jumpa-neutral-100 rounded-surface border border-jumpa-neutral-200 bg-jumpa-white shadow-2xs overflow-hidden">
            {(!selectedGoal.history || selectedGoal.history.length === 0) ? (
              <div className="p-4 text-center text-xs text-jumpa-neutral-400">
                No transactions yet.
              </div>
            ) : (
              selectedGoal.history.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex size-7 items-center justify-center rounded-full text-[11px] font-bold ${
                        tx.type === "deposit"
                          ? "bg-jumpa-primary-100 text-jumpa-primary-700"
                          : tx.type === "withdrawal"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {tx.type === "deposit" ? "↓" : tx.type === "withdrawal" ? "↑" : "✦"}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-jumpa-black capitalize">
                        {tx.type === "deposit"
                          ? "Deposit (Top-Up)"
                          : tx.type === "withdrawal"
                            ? "Withdrawal"
                            : "Accrued Yield"}
                      </span>
                      <span className="text-[10px] text-jumpa-neutral-400">{tx.date}</span>
                    </div>
                  </div>
                  <span
                    className={`font-bold ${
                      tx.type === "withdrawal"
                        ? "text-rose-600"
                        : tx.type === "interest"
                          ? "text-emerald-600"
                          : "text-jumpa-primary-600"
                    }`}
                  >
                    {tx.type === "withdrawal" ? "-" : "+"}
                    {formatMoney(tx.amount, selectedGoal.currency)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top-Up Sheet */}
        {showTopUpSheet && (
          <BottomSheet onClose={() => setShowTopUpSheet(false)} pb="pb-6">
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-jumpa-black">
                Top Up {selectedGoal.name}
              </h2>
              <p className="text-xs text-jumpa-neutral-600">
                Deposit funds directly from your Jumpa {selectedGoal.currency} wallet.
              </p>
              <input
                type="number"
                placeholder={`Amount in ${selectedGoal.currency}`}
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="h-11 rounded-tile border border-jumpa-neutral-200 px-3 text-sm focus:border-jumpa-primary-600 focus:outline-none"
              />
              <Button
                variant="gradientSheet"
                onClick={handleTopUp}
                disabled={!topUpAmount}
              >
                Authorize Deposit
              </Button>
            </div>
          </BottomSheet>
        )}

        {/* Withdraw Sheet */}
        {showWithdrawSheet && (
          <BottomSheet onClose={() => setShowWithdrawSheet(false)} pb="pb-6">
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-rose-600">Withdraw Funds</h2>
              <p className="text-xs text-jumpa-neutral-600">
                Instantly withdraw {formatMoney(selectedGoal.saved, selectedGoal.currency)} plus accrued interest back to your {selectedGoal.currency} wallet.
              </p>
              <Button variant="gradientSheet" onClick={handleWithdraw}>
                Confirm Instant Withdrawal
              </Button>
            </div>
          </BottomSheet>
        )}
      </div>
    );
  }

  // ==========================================
  // 2. STANDALONE SCREEN: CREATE INDIVIDUAL SAVINGS
  // ==========================================
  if (screen === "create-individual") {
    return (
      <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <div className="flex items-center justify-between pb-3">
          <button
            onClick={() => setScreen("hub")}
            className="tap flex size-9 items-center justify-center rounded-full bg-jumpa-neutral-100 text-jumpa-black"
          >
            <ArrowBackIcon className="size-4" />
          </button>
          <h1 className="text-base font-bold text-jumpa-black">Create Individual Goal</h1>
          <div className="size-9" />
        </div>

        <div className="flex flex-col gap-4 mt-2">
          {/* Currency Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-jumpa-neutral-700">Choose Currency</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormCurrency("NGN")}
                className={`py-2.5 rounded-tile border text-xs font-bold transition-all ${
                  formCurrency === "NGN"
                    ? "border-jumpa-primary-600 bg-jumpa-primary-50 text-jumpa-primary-600"
                    : "border-jumpa-neutral-200 text-jumpa-neutral-600"
                }`}
              >
                ₦ Nigerian Naira (NGN)
              </button>
              <button
                type="button"
                onClick={() => setFormCurrency("USDC")}
                className={`py-2.5 rounded-tile border text-xs font-bold transition-all ${
                  formCurrency === "USDC"
                    ? "border-jumpa-primary-600 bg-jumpa-primary-50 text-jumpa-primary-600"
                    : "border-jumpa-neutral-200 text-jumpa-neutral-600"
                }`}
              >
                $ Dollar (USDC)
              </button>
            </div>
          </div>

          {/* Goal Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-jumpa-neutral-700">Goal Name</label>
            <input
              type="text"
              placeholder="e.g. Rent, Laptop, Rainy Day"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="h-11 rounded-tile border border-jumpa-neutral-200 px-3 text-sm focus:border-jumpa-primary-600 focus:outline-none"
            />
          </div>

          {/* Target & Initial Deposit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-jumpa-neutral-700">
                Target ({formCurrency === "NGN" ? "₦" : "$"})
              </label>
              <input
                type="number"
                placeholder="500,000"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                className="h-11 rounded-tile border border-jumpa-neutral-200 px-3 text-sm focus:border-jumpa-primary-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-jumpa-neutral-700">
                Initial Deposit ({formCurrency === "NGN" ? "₦" : "$"})
              </label>
              <input
                type="number"
                placeholder="25,000"
                value={formDeposit}
                onChange={(e) => setFormDeposit(e.target.value)}
                className="h-11 rounded-tile border border-jumpa-neutral-200 px-3 text-sm focus:border-jumpa-primary-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Yield Projection */}
          {depositNum > 0 && (
            <div className="rounded-surface border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
              <div className="flex items-center justify-between font-bold text-emerald-800">
                <span>Expected Yield (11.5% APY):</span>
                <span>+{formCurrency === "NGN" ? `₦${simulatedYield30d}` : `$${simulatedYield30d}`}</span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-700">
                Save at your own pace. Deposit more whenever you choose, no automatic deductions.
              </p>
            </div>
          )}

          <Button
            size="lg"
            variant="gradientSheet"
            onClick={() => handleSaveGoal("individual")}
            disabled={!formName || !formTarget || !formDeposit}
          >
            Create Individual Goal
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. STANDALONE SCREEN: CREATE LOCKED SAVINGS
  // ==========================================
  if (screen === "create-lock") {
    return (
      <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <div className="flex items-center justify-between pb-3">
          <button
            onClick={() => setScreen("hub")}
            className="tap flex size-9 items-center justify-center rounded-full bg-jumpa-neutral-100 text-jumpa-black"
          >
            <ArrowBackIcon className="size-4" />
          </button>
          <h1 className="text-base font-bold text-jumpa-black">Lock Savings (High APY)</h1>
          <div className="size-9" />
        </div>

        <div className="flex flex-col gap-4 mt-2">
          {/* Currency Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-jumpa-neutral-700">Lock Currency</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormCurrency("NGN")}
                className={`py-2.5 rounded-tile border text-xs font-bold transition-all ${
                  formCurrency === "NGN"
                    ? "border-jumpa-primary-600 bg-jumpa-primary-50 text-jumpa-primary-600"
                    : "border-jumpa-neutral-200 text-jumpa-neutral-600"
                }`}
              >
                ₦ Nigerian Naira (NGN)
              </button>
              <button
                type="button"
                onClick={() => setFormCurrency("USDC")}
                className={`py-2.5 rounded-tile border text-xs font-bold transition-all ${
                  formCurrency === "USDC"
                    ? "border-jumpa-primary-600 bg-jumpa-primary-50 text-jumpa-primary-600"
                    : "border-jumpa-neutral-200 text-jumpa-neutral-600"
                }`}
              >
                $ Dollar (USDC)
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-jumpa-neutral-700">Vault Title</label>
            <input
              type="text"
              placeholder="e.g. 3-Month Fixed Deposit"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="h-11 rounded-tile border border-jumpa-neutral-200 px-3 text-sm focus:border-jumpa-primary-600 focus:outline-none"
            />
          </div>

          {/* Amount to Lock */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-jumpa-neutral-700">
              Amount to Lock ({formCurrency === "NGN" ? "₦" : "$"})
            </label>
            <input
              type="number"
              placeholder="100,000"
              value={formDeposit}
              onChange={(e) => setFormDeposit(e.target.value)}
              className="h-11 rounded-tile border border-jumpa-neutral-200 px-3 text-sm focus:border-jumpa-primary-600 focus:outline-none"
            />
          </div>

          {/* Lock Duration */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-jumpa-neutral-700">Lock Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { days: "30", label: "30 Days (12% APY)" },
                { days: "60", label: "60 Days (13.5% APY)" },
                { days: "90", label: "90 Days (15% APY)" },
              ].map((item) => (
                <button
                  key={item.days}
                  type="button"
                  onClick={() => setFormDays(item.days)}
                  className={`flex flex-col p-2.5 rounded-tile border text-left text-xs transition-all ${
                    formDays === item.days
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold"
                      : "border-jumpa-neutral-200 text-jumpa-neutral-600"
                  }`}
                >
                  <span>{item.days} Days</span>
                  <span className="text-[10px] text-emerald-600 mt-0.5">High Yield</span>
                </button>
              ))}
            </div>
          </div>

          {/* Guaranteed Return Preview */}
          {depositNum > 0 && (
            <div className="rounded-surface border border-emerald-300 bg-emerald-50 p-3.5 text-xs">
              <div className="flex justify-between font-bold text-emerald-900">
                <span>Guaranteed Payout on Maturity:</span>
                <span>
                  {formatMoney(depositNum + parseFloat(simulatedLockYield), formCurrency)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-800">
                Includes +{formCurrency === "NGN" ? `₦${simulatedLockYield}` : `$${simulatedLockYield}`} interest. Funds are locked for {formDays} days.
              </p>
            </div>
          )}

          <Button
            size="lg"
            variant="gradientSheet"
            onClick={() => handleSaveGoal("lock")}
            disabled={!formName || !formDeposit}
          >
            Lock Funds Now
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. STANDALONE SCREEN: CREATE CIRCLE SAVINGS
  // ==========================================
  if (screen === "create-circle") {
    return (
      <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <div className="flex items-center justify-between pb-3">
          <button
            onClick={() => setScreen("hub")}
            className="tap flex size-9 items-center justify-center rounded-full bg-jumpa-neutral-100 text-jumpa-black"
          >
            <ArrowBackIcon className="size-4" />
          </button>
          <h1 className="text-base font-bold text-jumpa-black">Create Savings Circle</h1>
          <div className="size-9" />
        </div>

        <div className="flex flex-col gap-4 mt-2">
          {/* Explanation banner */}
          <div className="rounded-surface border border-purple-200 bg-purple-50/60 p-3 text-xs">
            <span className="font-bold text-purple-900">Multiple Contributors, One Target</span>
            <p className="text-[11px] text-purple-700 mt-0.5">
              Invite friends, teammates, or family to pool money toward a shared target.
            </p>
          </div>

          {/* Currency Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-jumpa-neutral-700">Circle Currency</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormCurrency("NGN")}
                className={`py-2.5 rounded-tile border text-xs font-bold transition-all ${
                  formCurrency === "NGN"
                    ? "border-jumpa-primary-600 bg-jumpa-primary-50 text-jumpa-primary-600"
                    : "border-jumpa-neutral-200 text-jumpa-neutral-600"
                }`}
              >
                ₦ Nigerian Naira (NGN)
              </button>
              <button
                type="button"
                onClick={() => setFormCurrency("USDC")}
                className={`py-2.5 rounded-tile border text-xs font-bold transition-all ${
                  formCurrency === "USDC"
                    ? "border-jumpa-primary-600 bg-jumpa-primary-50 text-jumpa-primary-600"
                    : "border-jumpa-neutral-200 text-jumpa-neutral-600"
                }`}
              >
                $ Dollar (USDC)
              </button>
            </div>
          </div>

          {/* Circle Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-jumpa-neutral-700">Circle Name</label>
            <input
              type="text"
              placeholder="e.g. Wedding Contribution, Road Trip"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="h-11 rounded-tile border border-jumpa-neutral-200 px-3 text-sm focus:border-jumpa-primary-600 focus:outline-none"
            />
          </div>

          {/* Total Target */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-jumpa-neutral-700">
              Shared Target ({formCurrency === "NGN" ? "₦" : "$"})
            </label>
            <input
              type="number"
              placeholder="1,000,000"
              value={formTarget}
              onChange={(e) => setFormTarget(e.target.value)}
              className="h-11 rounded-tile border border-jumpa-neutral-200 px-3 text-sm focus:border-jumpa-primary-600 focus:outline-none"
            />
          </div>

          {/* Number of Contributors & Initial Deposit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-jumpa-neutral-700">
                Number of Contributors
              </label>
              <input
                type="number"
                placeholder="4"
                value={formCircleMembers}
                onChange={(e) => setFormCircleMembers(e.target.value)}
                className="h-11 rounded-tile border border-jumpa-neutral-200 px-3 text-sm focus:border-jumpa-primary-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-jumpa-neutral-700">
                Your Initial Deposit
              </label>
              <input
                type="number"
                placeholder="50,000"
                value={formDeposit}
                onChange={(e) => setFormDeposit(e.target.value)}
                className="h-11 rounded-tile border border-jumpa-neutral-200 px-3 text-sm focus:border-jumpa-primary-600 focus:outline-none"
              />
            </div>
          </div>

          <Button
            size="lg"
            variant="gradientSheet"
            onClick={() => handleSaveGoal("circle")}
            disabled={!formName || !formTarget || !formDeposit}
          >
            Create Circle & Generate Invite
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. MAIN HUB SCREEN: PORTFOLIO & DASHBOARD
  // ==========================================
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      {/* Navigation Header */}
      <div className="flex items-center justify-between pb-2">
        <Link
          href="/home"
          className="tap flex size-9 items-center justify-center rounded-full bg-jumpa-neutral-100 text-jumpa-black"
        >
          <ArrowBackIcon className="size-4" />
        </Link>
        <h1 className="text-base font-bold text-jumpa-black">Savings</h1>
        <button
          onClick={() => setScreen("create-individual")}
          className="tap flex size-9 items-center justify-center rounded-full border border-jumpa-primary-600 bg-jumpa-secondary-150 text-jumpa-primary-600 active:scale-95"
        >
          <PlusIcon className="size-3.5" />
        </button>
      </div>

      {/* 1. COMPACT UNIFIED PORTFOLIO BALANCE CARD */}
      <div className="relative mt-2 flex flex-col overflow-hidden rounded-key bg-[linear-gradient(to_bottom,var(--color-jumpa-primary-600),var(--color-jumpa-primary-700))] px-4.5 py-4 text-jumpa-white shadow-md">
        <Image
          src="/images/savings/lock-grid.svg"
          alt=""
          aria-hidden="true"
          width={357}
          height={328}
          className="pointer-events-none absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 opacity-20"
        />

        <div className="relative flex items-center justify-between">
          <span className="rounded-pill bg-jumpa-primary-950/70 px-2.5 py-0.5 text-[9px] font-semibold tracking-wider text-jumpa-primary-100 uppercase">
            Total Savings
          </span>

          {/* Dual Currency Switcher */}
          <div className="flex rounded-pill bg-jumpa-primary-950/60 p-0.5">
            <button
              onClick={() => setCurrency("NGN")}
              className={`rounded-pill px-2 py-0.5 text-[10px] font-bold transition-all ${
                currency === "NGN"
                  ? "bg-jumpa-white text-jumpa-primary-600 shadow-xs"
                  : "text-jumpa-primary-100 opacity-70"
              }`}
            >
              ₦ NGN
            </button>
            <button
              onClick={() => setCurrency("USDC")}
              className={`rounded-pill px-2 py-0.5 text-[10px] font-bold transition-all ${
                currency === "USDC"
                  ? "bg-jumpa-white text-jumpa-primary-600 shadow-xs"
                  : "text-jumpa-primary-100 opacity-70"
              }`}
            >
              $ USDC
            </button>
          </div>
        </div>

        {/* Unified Balance Figure & Subtle Interest Pill */}
        <div className="relative my-2 flex flex-col items-center">
          <p className="text-2xl leading-tight font-bold tracking-tight">
            {formatMoney(totalSaved, currency)}
          </p>

          <div className="mt-1.5 inline-flex items-center gap-1 rounded-pill border border-emerald-400/25 bg-emerald-950/50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>Interest Earned: +{formatMoney(totalInterest, currency)}</span>
          </div>
        </div>
      </div>

      {/* 2. COMPACT 3-PRODUCT SUITE (Full Width Grid) */}
      <div className="mt-4 flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold text-jumpa-neutral-600 uppercase tracking-wider">
          Savings Products
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {/* 1. Individual Savings */}
          <button
            onClick={() => setIntroKind("individual")}
            className="tap flex flex-col justify-between rounded-surface border border-jumpa-primary-100 bg-jumpa-primary-50 p-2.5 text-left transition-all hover:border-jumpa-primary-300 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-7 items-center justify-center rounded-panel bg-jumpa-primary-950 text-jumpa-primary-50">
                <CircleUserIcon className="size-3.5" />
              </span>
              <span className="rounded-pill bg-jumpa-primary-100 px-1.5 py-0.5 text-[8.5px] font-bold text-jumpa-primary-700">
                11.5%
              </span>
            </div>
            <div className="mt-2 flex flex-col">
              <span className="text-[11px] font-bold text-jumpa-black leading-tight">Individual</span>
              <span className="text-[9.5px] text-jumpa-neutral-500 mt-0.5 line-clamp-1">
                Save flexibly
              </span>
            </div>
          </button>

          {/* 2. Locked Savings */}
          <button
            onClick={() => setIntroKind("lock")}
            className="tap flex flex-col justify-between rounded-surface border border-emerald-100 bg-emerald-50/40 p-2.5 text-left transition-all hover:border-emerald-300 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-7 items-center justify-center rounded-panel bg-jumpa-primary-950 text-jumpa-primary-50">
                <LockIcon className="size-3.5" />
              </span>
              <span className="rounded-pill bg-emerald-100 px-1.5 py-0.5 text-[8.5px] font-bold text-emerald-800">
                15.0%
              </span>
            </div>
            <div className="mt-2 flex flex-col">
              <span className="text-[11px] font-bold text-jumpa-black leading-tight">Locked</span>
              <span className="text-[9.5px] text-jumpa-neutral-500 mt-0.5 line-clamp-1">
                High yield
              </span>
            </div>
          </button>

          {/* 3. Circles (Group Savings) */}
          <button
            onClick={() => setIntroKind("circle")}
            className="tap flex flex-col justify-between rounded-surface border border-purple-100 bg-purple-50/40 p-2.5 text-left transition-all hover:border-purple-300 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-7 items-center justify-center rounded-panel bg-jumpa-primary-950 text-jumpa-primary-50">
                <UsersIcon className="size-3.5" />
              </span>
              <span className="rounded-pill bg-purple-100 px-1.5 py-0.5 text-[8.5px] font-bold text-purple-800">
                Group
              </span>
            </div>
            <div className="mt-2 flex flex-col">
              <span className="text-[11px] font-bold text-jumpa-black leading-tight">Circles</span>
              <span className="text-[9.5px] text-jumpa-neutral-500 mt-0.5 line-clamp-1">
                Save together
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. CLEAN & COMPACT ACTIVE GOAL CARDS */}
      <div className="mt-5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold text-jumpa-neutral-600 uppercase tracking-wider">
            Active Goals ({filteredGoals.length})
          </h2>
          <span className="text-[10px] text-jumpa-neutral-400">
            Tap card for full details
          </span>
        </div>

        {filteredGoals.map((g) => {
          const progress = Math.min(100, Math.round((g.saved / g.target) * 100));
          return (
            <div
              key={g.id}
              onClick={() => {
                setSelectedGoal(g);
                setScreen("detail");
              }}
              className="tap flex flex-col gap-2 rounded-tile border border-jumpa-neutral-200 bg-jumpa-white p-3 shadow-2xs transition-all hover:border-jumpa-primary-200 active:scale-[0.99] cursor-pointer"
            >
              {/* Header row: Title & Balance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                  <h3 className="text-xs font-bold text-jumpa-black truncate">
                    {g.name}
                  </h3>
                  {g.kind === "circle" && (
                    <span className="rounded-pill bg-purple-100 px-1.5 py-0.2 text-[8px] font-bold text-purple-700">
                      Circle
                    </span>
                  )}
                  {g.kind === "lock" && (
                    <span className="rounded-pill bg-emerald-100 px-1.5 py-0.2 text-[8px] font-bold text-emerald-700">
                      Lock
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 text-xs">
                  <span className="font-bold text-jumpa-primary-600">
                    {formatMoney(g.saved, g.currency)}
                  </span>
                  <span className="text-[10px] text-jumpa-neutral-400">
                    / {formatMoney(g.target, g.currency)}
                  </span>
                </div>
              </div>

              {/* Progress bar and badges row */}
              <div className="flex flex-col gap-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-jumpa-neutral-100">
                  <div
                    className="h-full rounded-full bg-jumpa-primary-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-medium text-jumpa-neutral-500">
                    {progress}% • {g.daysLeft}d left
                  </span>
                  <span className="font-bold text-emerald-700">
                    +{formatMoney(g.interestEarned, g.currency)} earned
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Explanation & Intro Sheet for all 3 types */}
      {introKind && (
        <SavingsIntroSheet
          intro={{
            ...SAVINGS_INTROS[introKind],
            // Override href so clicking the button executes onContinue instead of navigating to production /savings/[kind]
            href: "",
            secondary: undefined,
          }}
          onClose={() => setIntroKind(null)}
          onContinue={() => {
            const destinationScreen: Record<SavingsKind, Screen> = {
              individual: "create-individual",
              lock: "create-lock",
              circle: "create-circle",
            };
            setScreen(destinationScreen[introKind]);
            setIntroKind(null);
          }}
        />
      )}
    </div>
  );
}
