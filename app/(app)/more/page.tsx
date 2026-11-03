import type { Metadata } from "next";
import { MoreView } from "@/components/more/more-view";

export const metadata: Metadata = { title: "More" };

export default function MorePage() {
  return <MoreView />;
}
