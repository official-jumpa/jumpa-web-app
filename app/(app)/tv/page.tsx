import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "TV" };

export default function TvPage() {
  return <ComingSoon feature="TV subscriptions" />;
}
