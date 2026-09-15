import type { Metadata } from "next";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getReferralStatsForUser } from "@/lib/functions/referralFunctions";
import {
  ReferralsView,
  type ReferralData,
} from "@/components/referrals/referrals-view";

export const metadata: Metadata = {
  title: "Referrals",
};

export default async function ReferralsPage() {
  let initialData: ReferralData | null = null;

  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      const stats = await getReferralStatsForUser(session.user.id);
      initialData = {
        points: stats.points,
        invited: stats.invited,
        target: stats.target,
        referralCode: stats.referralCode,
        referralLink: stats.referralLink,
        history: stats.history.map((h: any) => ({
          id: String(h.id),
          name: h.name,
          joinedAt:
            h.joinedAt instanceof Date
              ? h.joinedAt.toISOString()
              : String(h.joinedAt),
          points: h.points,
        })),
      };
    }
  } catch (err) {
    console.warn("[ReferralsPage SSR] Prefetch fallback:", err);
  }

  return <ReferralsView initialData={initialData} />;
}
