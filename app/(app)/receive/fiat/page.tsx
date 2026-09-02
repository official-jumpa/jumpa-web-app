import type { Metadata } from "next";
import { FiatDeposit } from "@/components/transfer/fiat-deposit";

export const metadata: Metadata = { title: "Deposit Fiat" };

export default function DepositFiatPage() {
  return <FiatDeposit />;
}
