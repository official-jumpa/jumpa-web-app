import type { Metadata } from "next";
import { BankTransferView } from "@/components/send/bank-transfer-view";
import { PROMOTIONS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Bank transfer" };

export default function BankTransferPage() {
  return <BankTransferView promotions={PROMOTIONS} />;
}
