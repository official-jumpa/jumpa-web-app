import { connectDB } from "@/lib/db";
import {
  campaignStatus,
  getCampaignWindow,
  isInCampaign,
} from "@/lib/referrals/campaign";
import { type IReferral, Referral } from "@/models/Referral";

/** The pop-ups Home can raise when the app opens. */
export type HomePromo = "savings" | "refer" | "reward";

/**
 * Which pop-ups this user qualifies for. Savings always; the referral two only
 * while the campaign is live, and "reward" only for a friend who can still earn.
 */
export async function getHomePromos(userId: string): Promise<HomePromo[]> {
  const window = getCampaignWindow();
  if (campaignStatus(window, new Date()) !== "live") return ["savings"];

  await connectDB();
  const own = await Referral.findOne(
    { referredUserId: userId },
    "status createdAt",
  ).lean<Pick<IReferral, "status" | "createdAt">>();
  const canStillEarn =
    own !== null &&
    own.status !== "rewarded" &&
    isInCampaign(window, own.createdAt);

  return canStillEarn ? ["savings", "refer", "reward"] : ["savings", "refer"];
}
