import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Your Devices" };

export default function DevicesPage() {
  return <ComingSoon feature="Your Devices" />;
}
