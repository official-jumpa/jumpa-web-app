import { environment } from "@/lib/environment";

/** When referrals earn. No start date means the campaign is off. */
export type CampaignWindow = { start: Date | null; end: Date | null };

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getCampaignWindow(): CampaignWindow {
  return {
    start: parseDate(environment.REFERRAL_REWARDS_START),
    end: parseDate(environment.REFERRAL_REWARDS_END),
  };
}

/** A referral earns only if it signed up, and completes, inside the window. */
export function isInCampaign(window: CampaignWindow, at: Date): boolean {
  if (!window.start || at < window.start) return false;
  return !window.end || at < window.end;
}

export type CampaignStatus = "off" | "upcoming" | "live" | "ended";

export function campaignStatus(
  window: CampaignWindow,
  now: Date,
): CampaignStatus {
  if (!window.start) return "off";
  if (now < window.start) return "upcoming";
  return isInCampaign(window, now) ? "live" : "ended";
}
