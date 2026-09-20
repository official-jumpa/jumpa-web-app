import type { Metadata } from "next";
import { ScanView } from "@/components/send/scan-view";

export const metadata: Metadata = { title: "Scan QR code" };

export default function ScanPage() {
  return <ScanView />;
}
