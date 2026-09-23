import { Suspense } from "react";
import { SavingsWithdrawView } from "@/components/savings/savings-withdraw-view";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { listSavingsPlansByUserId } from "@/lib/functions/savingsFunctions";
import { formatPlanForUI } from "@/lib/savings-service";
import type { SavingsPlan } from "@/lib/savings";

export default async function SavingsWithdrawPage() {
  let initialPlans: SavingsPlan[] | undefined = undefined;
  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      const dbPlans = await listSavingsPlansByUserId(session.user.id);
      initialPlans = dbPlans.map((p) => formatPlanForUI(p));
    }
  } catch (err) {
    console.error("[SavingsWithdrawPage] Failed to prefetch plans:", err);
  }

  return (
    <Suspense fallback={null}>
      <SavingsWithdrawView initialPlans={initialPlans} />
    </Suspense>
  );
}
