import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Electricity" };

export default function ElectricityPage() {
  return <ComingSoon feature="Electricity" />;
}
