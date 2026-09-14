import type { Metadata } from "next";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getUserById } from "@/lib/functions/userFunctions";
import { SavingsView } from "@/components/savings/savings-view";

export const metadata: Metadata = { title: "Savings" };

export default async function SavingsPage() {
  let seenSavingsIntros:
    | { individual?: boolean; lock?: boolean; circle?: boolean }
    | undefined;
  let hasCreatedSavings = false;

  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      const user = await getUserById(session.user.id);
      if (user) {
        seenSavingsIntros = {
          individual: Boolean(user.seenSavingsIntros?.individual),
          lock: Boolean(user.seenSavingsIntros?.lock),
          circle: Boolean(user.seenSavingsIntros?.circle),
        };
        hasCreatedSavings = Boolean(user.hasCreatedSavings);
      }
    }
  } catch (err) {
    console.warn("[SavingsPage SSR] Failed to fetch user savings status:", err);
  }

  return (
    <SavingsView
      initialSeenIntros={seenSavingsIntros}
      hasCreatedSavings={hasCreatedSavings}
    />
  );
}
