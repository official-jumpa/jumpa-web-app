import type { Metadata } from "next";
import { SavingsView } from "@/components/savings/savings-view";

export const metadata: Metadata = { title: "Savings" };

export default function SavingsPage() {
  return <SavingsView hasGoals={false} />;
}
