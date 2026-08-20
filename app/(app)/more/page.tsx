import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "More" };

export default function MorePage() {
  return <ComingSoon feature="More" />;
}
