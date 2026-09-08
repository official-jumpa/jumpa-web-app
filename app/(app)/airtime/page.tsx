import type { Metadata } from "next";
import { AirtimeView } from "@/components/bills/airtime-view";

export const metadata: Metadata = { title: "Airtime" };

export default function AirtimePage() {
  return <AirtimeView />;
}
