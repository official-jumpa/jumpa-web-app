/** Screens under `/profile`, each a `?view=` on the one route. */
export const PROFILE_VIEWS = {
  edit: { title: "Edit Profile" },
  tiers: { title: "KYC Tiers" },
} as const;

export type ProfileViewName = keyof typeof PROFILE_VIEWS;

export function isProfileView(value: string): value is ProfileViewName {
  return Object.hasOwn(PROFILE_VIEWS, value);
}

export function profileHref(view?: ProfileViewName): string {
  return view ? `/profile?view=${view}` : "/profile";
}
