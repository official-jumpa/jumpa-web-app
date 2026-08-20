import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Profile" };

export default function MePage() {
  return <ComingSoon feature="Profile" />;
}
