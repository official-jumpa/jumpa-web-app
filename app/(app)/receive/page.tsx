import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Receive" };

export default function ReceivePage() {
  return <ComingSoon feature="Receive" />;
}
