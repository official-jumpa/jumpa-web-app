/** One selling point on the Open NGN Account intro. */
export type NgnBenefit = {
  id: "receive" | "details" | "convert";
  title: string;
  description: string;
};

export const NGN_BENEFITS: NgnBenefit[] = [
  {
    id: "receive",
    title: "Receive payments locally",
    description:
      "Get paid directly into your Nigerian account from anyone, anywhere in Nigeria.",
  },
  {
    id: "details",
    title: "Dedicated NGN detail",
    description:
      "Get dedicated NGN account details for receiving local transfers.",
  },
  {
    id: "convert",
    title: "Convert instantly",
    description: "Exchange NGN to USD whenever you want, right inside Jumpa.",
  },
];

/** How long the opening modal holds when animating transitions. */
export const NGN_OPENING_MS = 2400;

/** A line of the issued account, with the value the user can copy. */
export type NgnAccountField = {
  label: string;
  value: string;
};

export const COUNTRY_ISO_TO_NAME: Record<string, string> = {
  NG: "Nigeria",
  GH: "Ghana",
  KE: "Kenya",
  ZA: "South Africa",
  RW: "Rwanda",
  UG: "Uganda",
  TZ: "Tanzania",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
};

export function mapCountryCodeToName(codeOrName: string): string {
  if (!codeOrName) return "Nigeria";
  const upper = codeOrName.trim().toUpperCase();
  return COUNTRY_ISO_TO_NAME[upper] || codeOrName.trim();
}

