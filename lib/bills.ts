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

/**
 * Detects the Nigerian mobile carrier from a phone number prefix.
 * Supports standard formats: 0803..., 803..., +234803..., 234803...
 */
export function detectCarrierFromPhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  let normalized = digits;
  if (digits.startsWith("234") && digits.length >= 3) {
    normalized = "0" + digits.slice(3);
  } else if (!digits.startsWith("0") && digits.length > 0) {
    normalized = "0" + digits;
  }

  if (normalized.length < 4) return null;
  const prefix4 = normalized.slice(0, 4);
  const prefix5 = normalized.slice(0, 5);

  // MTN prefixes
  const mtnPrefixes = [
    "0803", "0806", "0703", "0706", "0813", "0816",
    "0810", "0814", "0903", "0906", "0913", "0916", "0704",
  ];
  if (mtnPrefixes.includes(prefix4) || prefix5 === "07025" || prefix5 === "07026") {
    return "mtn";
  }

  // Airtel prefixes
  const airtelPrefixes = [
    "0802", "0808", "0708", "0812", "0701", "0902",
    "0901", "0904", "0907", "0912", "0911",
  ];
  if (airtelPrefixes.includes(prefix4)) {
    return "airtel";
  }

  // Glo prefixes
  const gloPrefixes = [
    "0805", "0807", "0705", "0815", "0811", "0905", "0915",
  ];
  if (gloPrefixes.includes(prefix4)) {
    return "glo";
  }

  // 9mobile prefixes
  const nineMobilePrefixes = [
    "0809", "0817", "0818", "0909", "0908",
  ];
  if (nineMobilePrefixes.includes(prefix4)) {
    return "9mobile";
  }

  return null;
}

/**
 * Extracts standard network ID ('mtn' | 'airtel' | 'glo' | '9mobile') from provider product_type or text.
 */
export function detectCarrierFromProductType(productType?: string): string | null {
  const clean = (productType || "").toLowerCase();
  if (clean.includes("mtn")) return "mtn";
  if (clean.includes("airtel")) return "airtel";
  if (clean.includes("glo")) return "glo";
  if (clean.includes("9mobile") || clean.includes("etisalat")) return "9mobile";
  return null;
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
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
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
  productName?: string;
  numericPrice?: number;
};

/**
 * Formats raw carrier data volume (e.g. "36000 MB", "1500000 MB", "2700 MB")
 * into standard human-readable units (e.g. "36GB", "1.5TB", "2.7GB", "Unlimited").
 */
export function formatDataVolume(volume?: string, productName?: string): string {
  const pName = (productName || "").trim();
  const cleanVol = (volume || "").trim();
  const isUnlimited =
    /\bunlimited\b/i.test(pName) || /\bunlimited\b/i.test(cleanVol);

  // If already identified as Unlimited
  if (cleanVol.toLowerCase() === "unlimited") {
    return "Unlimited";
  }

  const rawNum = parseFloat(cleanVol.replace(/[^0-9.]/g, ""));
  const hasValidRawVolume = !isNaN(rawNum) && rawNum > 0;

  // If raw volume is missing, empty, 0, or "0 MB", extract from productName or recognize Unlimited.
  if (!hasValidRawVolume) {
    // Match explicit capacity like 100GB, 220GB, 500MB (excluding speed ratings like 60MBPS)
    const match = pName.match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB)(?!PS)\b/i);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      if (unit === "MB" && val >= 1000) {
        return `${parseFloat((val / 1000).toFixed(2))}GB`;
      }
      return `${val}${unit}`;
    }
    if (isUnlimited) {
      return "Unlimited";
    }
    return "Data";
  }

  // If already specified as TB, normalize (e.g. "1.5 TB" -> "1.5TB")
  const tbMatch = cleanVol.match(/^([\d.]+)\s*TB$/i);
  if (tbMatch) return `${parseFloat(tbMatch[1])}TB`;

  // If already specified as GB, normalize (e.g. "36 GB" -> "36GB")
  const gbMatch = cleanVol.match(/^([\d.]+)\s*GB$/i);
  if (gbMatch) return `${parseFloat(gbMatch[1])}GB`;

  // 1,000,000+ MB -> TB (e.g. 1500000 MB -> 1.5TB)
  if (rawNum >= 1000000) {
    const tb = parseFloat((rawNum / 1000000).toFixed(2));
    return `${tb}TB`;
  }

  // 1,000+ MB -> GB (e.g. 36000 MB -> 36GB, 2700 MB -> 2.7GB, 8000 MB -> 8GB)
  if (rawNum >= 1000) {
    let gb: number;
    if (rawNum % 1024 === 0) {
      gb = rawNum / 1024;
    } else {
      gb = parseFloat((rawNum / 1000).toFixed(2));
    }
    return `${gb}GB`;
  }

  // Sub-1000 MB (e.g. 500 MB)
  return `${rawNum}MB`;
}

/**
 * Formats plan validity string, preventing duplicate or conflicting duration mentions.
 */
export function formatPlanValidity(productName?: string, validity?: string): string {
  const pName = (productName || "").trim();
  const val = (validity || "").trim();
  if (!val) return pName || "Data bundle";
  if (!pName) return val;

  // If the product name already specifies duration (e.g. "7 DAYS", "30 DAYS", "365 DAYS"), don't append validity
  const hasDurationInName = /\b(\d+\s*(?:days?|hours?|hrs?|weeks?|months?|yrs?|years?))\b/i.test(pName);
  if (hasDurationInName) {
    return pName;
  }

  const cleanPName = pName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanVal = val.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (cleanPName.includes(cleanVal)) {
    return pName;
  }
  return `${pName} (${val})`;
}

/** A phone number is only worth acting on once it is this long. */
export const PHONE_NUMBER_MIN = 10;



