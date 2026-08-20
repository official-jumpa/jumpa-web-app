import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Savings" };

export default function SavingsPage() {
  return <ComingSoon feature="Savings" />;
}
