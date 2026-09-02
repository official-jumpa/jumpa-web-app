import type { Metadata } from "next";
import { MobileDataView } from "@/components/bills/data-view";
import { PROMOTIONS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Data" };

export default function DataPage() {
  return <MobileDataView promotions={PROMOTIONS} />;
}
