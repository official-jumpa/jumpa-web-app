import type { Metadata } from "next";
import { KycView } from "@/components/kyc/kyc-view";

export const metadata: Metadata = { title: "Identity Verification" };

export default function KycPage() {
  return <KycView />;
}
