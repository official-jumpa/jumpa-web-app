import { LockSavingsView } from "@/components/savings/lock-savings-view";
import { PROMOTIONS } from "@/lib/wallet";

export default function LockSavingsPage() {
  return <LockSavingsView promotions={PROMOTIONS} />;
}
