/** Copy and step definitions for identity verification. Text is the design's. */

export type KycBenefit = {
  id: string;
  title: string;
  description: string;
};

export const KYC_BENEFITS: KycBenefit[] = [
  {
    id: "limits",
    title: "Higher Transaction Limits",
    description:
      "Unlock unlimited daily crypto and fiat transaction volumes for deposits and payouts.",
  },
  {
    id: "accounts",
    title: "Dedicated Naira & Dollar Accounts",
    description:
      "Open dedicated Nigerian virtual accounts (NGN) and US Dollar receiving accounts to manage your money.",
  },
  {
    id: "compliance",
    title: "Bank-Grade Compliance & Security",
    description:
      "Keep your account safe and compliant with CBN and international regulatory standards.",
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
    title: "Provide a Valid ID Document",
    description:
      "Upload or take a clear photo of your NIN slip, Driver's License, or Passport.",
  },
  {
    id: "selfie",
    title: "Take a Live Selfie",
    description:
      "Snap a quick live photo using your camera to verify biometric identity.",
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
