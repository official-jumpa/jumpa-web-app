/**
 * Placeholder data for the airtime and data flows. Nothing here touches a
 * network yet — the screens are wired end to end against these.
 */

export type MobileNetwork = {
  id: string;
  label: string;
  logo: string;
  /**
   * Disc behind the mark, sampled from the design. Carrier brand colours, so
   * they live with the logo rather than in the theme; MTN and Glo carry their
   * own disc in the artwork and need none.
   */
  tint?: string;
};

/** Carriers the recharge screens offer, in the order the design lists them. */
export const MOBILE_NETWORKS: MobileNetwork[] = [
  { id: "mtn", label: "MTN", logo: "/images/networks/mtn.webp" },
  {
    id: "airtel",
    label: "Airtel",
    logo: "/images/networks/airtel.svg",
    tint: "#ffe6e6",
  },
  { id: "glo", label: "Glo", logo: "/images/networks/glo.svg" },
  {
    id: "9mobile",
    label: "9mobile",
    logo: "/images/networks/9mobile.svg",
    tint: "#e0fff8",
  },
];

export function getNetwork(id: string): MobileNetwork | undefined {
  return MOBILE_NETWORKS.find((network) => network.id === id);
}

/** Offer art above the recharge forms. The banner cycles through these. */
export const BILL_ADS = [
  { id: "recharge", src: "/images/bills/ad-1.webp" },
  { id: "stay-connected", src: "/images/bills/ad-2.webp" },
  { id: "call-bae", src: "/images/bills/ad-3.webp" },
  { id: "data-finish", src: "/images/bills/ad-4.webp" },
] as const;

/** Quick-fill amounts on the airtime keypad. */
export const AIRTIME_AMOUNTS = [200, 300, 500, 1000, 5000] as const;

export type DataPlanPeriod = "daily" | "weekly" | "monthly";

export const DATA_PERIODS: readonly {
  value: DataPlanPeriod;
  label: string;
}[] = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
];

export function getPeriodLabel(period: DataPlanPeriod): string {
  return DATA_PERIODS.find((entry) => entry.value === period)?.label ?? "";
}

export type DataPlan = {
  id: string;
  size: string;
  period: DataPlanPeriod;
  /** "Monthly plan (30 days)" — the line under the size. */
  validity: string;
  price: string;
  /** Red badge beside the size on promoted plans. */
  hot?: boolean;
};

export const DATA_PLANS: DataPlan[] = [
  {
    id: "m-1gb-a",
    size: "1GB",
    period: "monthly",
    validity: "Monthly plan (30 days)",
    price: "N1000",
    hot: true,
  },
  {
    id: "m-2gb",
    size: "2GB",
    period: "monthly",
    validity: "Monthly plan (30 days)",
    price: "N1500",
    hot: true,
  },
  {
    id: "m-3gb",
    size: "3GB",
    period: "monthly",
    validity: "Monthly plan (30 days)",
    price: "N2000",
  },
  {
    id: "m-5gb",
    size: "5GB",
    period: "monthly",
    validity: "Monthly plan (30 days)",
    price: "N3000",
  },
  {
    id: "m-10gb",
    size: "10GB",
    period: "monthly",
    validity: "Monthly plan (30 days)",
    price: "N5000",
  },
  {
    id: "m-20gb",
    size: "20GB",
    period: "monthly",
    validity: "Monthly plan (30 days)",
    price: "N8000",
  },
  {
    id: "d-500mb",
    size: "500MB",
    period: "daily",
    validity: "Daily plan (1 day)",
    price: "N200",
  },
  {
    id: "d-1gb",
    size: "1GB",
    period: "daily",
    validity: "Daily plan (1 day)",
    price: "N350",
    hot: true,
  },
  {
    id: "d-2gb",
    size: "2GB",
    period: "daily",
    validity: "Daily plan (2 days)",
    price: "N500",
  },
  {
    id: "w-1-5gb",
    size: "1.5GB",
    period: "weekly",
    validity: "Weekly plan (7 days)",
    price: "N800",
  },
  {
    id: "w-3gb",
    size: "3GB",
    period: "weekly",
    validity: "Weekly plan (7 days)",
    price: "N1200",
  },
  {
    id: "w-6gb",
    size: "6GB",
    period: "weekly",
    validity: "Weekly plan (7 days)",
    price: "N2000",
  },
];

/** A phone number is only worth acting on once it is this long. */
export const PHONE_NUMBER_MIN = 10;
