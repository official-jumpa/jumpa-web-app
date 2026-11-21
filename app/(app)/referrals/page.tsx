import type { Metadata } from "next";
import { ReferralsView } from "@/components/referrals/referrals-view";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import {
  getReferralOverview,
  type ReferralOverview,
} from "@/lib/referrals/overview";

export const metadata: Metadata = {
  title: "Referrals",
};

export default async function ReferralsPage() {
  let initialData: ReferralOverview | null = null;

  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      initialData = await getReferralOverview(session.user.id);
    }
  } catch (err) {
    console.warn("[ReferralsPage SSR] Prefetch fallback:", err);
  }

  return <ReferralsView initialData={initialData} />;
}
