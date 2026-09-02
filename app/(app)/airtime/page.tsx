import type { Metadata } from "next";
import { AirtimeView } from "@/components/bills/airtime-view";
import { PROMOTIONS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Airtime" };

export default function AirtimePage() {
  return <AirtimeView promotions={PROMOTIONS} />;
}
