import type { Metadata } from "next";
import { MobileDataView } from "@/components/bills/data-view";

export const metadata: Metadata = { title: "Data" };

export default function DataPage() {
  return <MobileDataView />;
}
