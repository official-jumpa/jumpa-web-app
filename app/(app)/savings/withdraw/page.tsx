import { Suspense } from "react";
import { SavingsWithdrawView } from "@/components/savings/savings-withdraw-view";

export default function SavingsWithdrawPage() {
  return (
    <Suspense fallback={null}>
      <SavingsWithdrawView />
    </Suspense>
  );
}
