import type { Metadata } from "next";
import { SavingsView } from "@/components/savings/savings-view";
import { SAVINGS_PLANS } from "@/lib/savings";

export const metadata: Metadata = { title: "Savings" };

export default function SavingsPage() {
  return <SavingsView hasGoals={SAVINGS_PLANS.length > 0} />;
}
