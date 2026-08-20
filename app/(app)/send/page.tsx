import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Send" };

export default function SendPage() {
  return <ComingSoon feature="Send" />;
}
