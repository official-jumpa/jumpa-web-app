import { environment } from "@/lib/environment";

/** When referrals earn. No start date means the campaign is off. */
export type CampaignWindow = { start: Date | null; end: Date | null };

/** `2026-12-01`, or a time with its zone: `2026-12-01T00:00:00+01:00` / `…Z`. */
const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;

/** Date rolls 2026-02-31 over to March; refuse days that don't exist. */
function isCalendarDay(day: string): boolean {
  const date = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(day);
}

const warnedInvalid = new Set<string>();

/** Strict: `new Date()` alone reads "1 Dec" as 2001, which would open the window to every old sign-up. */
export function parseCampaignDate(name: string, value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date =
    ISO_DATE.test(trimmed) && isCalendarDay(trimmed.slice(0, 10))
      ? new Date(trimmed)
      : null;
  if (date && !Number.isNaN(date.getTime())) return date;
  if (!warnedInvalid.has(name)) {
    warnedInvalid.add(name);
    console.warn(
      `[Referrals] ${name} must look like 2026-12-01T00:00:00+01:00; treating it as unset.`,
    );
  }
  return null;
}

export function getCampaignWindow(): CampaignWindow {
  return {
    start: parseCampaignDate(
      "REFERRAL_REWARDS_START",
      environment.REFERRAL_REWARDS_START,
    ),
    end: parseCampaignDate(
      "REFERRAL_REWARDS_END",
      environment.REFERRAL_REWARDS_END,
    ),
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
