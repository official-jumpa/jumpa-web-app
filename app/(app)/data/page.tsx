import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Data" };

export default function DataPage() {
  return <ComingSoon feature="Data" />;
}
