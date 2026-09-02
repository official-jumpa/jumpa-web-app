/** Copy and step definitions for identity verification. Text is the design's. */

export type KycBenefit = {
  id: string;
  title: string;
  description: string;
};

export const KYC_BENEFITS: KycBenefit[] = [
  {
    id: "quick",
    title: "Quick & Easy",
    description:
      "Use your USD balance for international payments and everyday purchases.",
  },
  {
    id: "secure",
    title: "Keep Account Secure",
    description:
      "Get dedicated USD account details for receiving payments from abroad.",
  },
  {
    id: "protected",
    title: "Protected information",
    description: "Exchange USD to NGN whenever you want, right inside Jumpa.",
  },
];

export type KycTask = "document" | "selfie";

export const KYC_TASKS: readonly {
  id: KycTask;
  title: string;
  description: string;
}[] = [
  {
    id: "document",
    title: "Take a Picture of your Valid ID",
    description:
      "Use your USD balance for international payments and everyday purchases.",
  },
  {
    id: "selfie",
    title: "Take a Selfie of Yourself",
    description:
      "Get dedicated USD account details for receiving payments from abroad.",
  },
];

export type KycDocument = {
  id: string;
  label: string;
  /** Heading on the capture screen: "Upload a Picture of your <name>". */
  name: string;
};

export const KYC_DOCUMENTS: KycDocument[] = [
  { id: "nin", label: "National ID/ NIN", name: "National ID Card" },
  { id: "passport", label: "Passport", name: "Passport" },
  { id: "licence", label: "Drivers Licence", name: "Drivers Licence" },
];
