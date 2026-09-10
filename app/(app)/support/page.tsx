import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Help & Support" };

export default function SupportPage() {
  return <ComingSoon feature="Help & Support" />;
}
