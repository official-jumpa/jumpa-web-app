import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Scan QR code" };

export default function ScanPage() {
  return <ComingSoon feature="QR code scanning" />;
}
