import type { Metadata } from "next";
import { JumpaSendView } from "@/components/send/jumpa/jumpa-send-view";

export const metadata: Metadata = { title: "Send to Jumpa user" };

export default function SendToJumpaUserPage() {
  return <JumpaSendView />;
}
