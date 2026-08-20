import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return <ComingSoon feature="Notifications" />;
}
