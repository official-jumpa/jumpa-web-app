/**
 * The Terms of Service and Privacy Policy for Jumpa
 */

export const LEGAL_ENTITY = {
  name: "Jumpa Technologies Limited",
  short: "Jumpa",
  registration: "RC 9117826",
  address: "Lagos, Nigeria",
  country: "Nigeria",
  courts: "the courts of Lagos State, Nigeria",
  liabilityCap: "the total fees you paid us in the six months before the claim",
};

export const LEGAL_CONTACT = {
  legal: "legal@usejumpa.com",
  privacy: "privacy@usejumpa.com",
};

export const LEGAL_UPDATED = "14 October 2026";

export type LegalDoc = "terms" | "privacy";

export type LegalBlock =
  | { kind: "text"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "callout"; text: string };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  short: string;
  summary: string;
  intro: string;
  sections: LegalSection[];
}

export function isLegalDoc(value: string): value is LegalDoc {
  return value === "terms" || value === "privacy";
}

const LEGAL_PATHS: Record<LegalDoc, string> = {
  terms: "/terms-of-service",
  privacy: "/privacy",
};

export function legalHref(doc?: LegalDoc): string {
  return doc ? LEGAL_PATHS[doc] : "/legal";
}

export const LEGAL_ORDER: readonly LegalDoc[] = ["terms", "privacy"];

export function otherLegalDoc(doc: LegalDoc): LegalDoc {
  return doc === "terms" ? "privacy" : "terms";
}

export function sectionSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const TERMS: LegalDocument = {
  title: "Terms and Conditions",
  short: "Terms and Conditions",
  summary: "The agreement between you and Jumpa when you use our app and services.",
  intro: `These terms are the agreement between you and ${LEGAL_ENTITY.name} ("${LEGAL_ENTITY.short}", "we", "us"), covering the Jumpa mobile web app, our website, and all associated services. Please read them carefully before using Jumpa.`,
  sections: [
    {
      heading: "Overview and Eligibility",
      blocks: [
        {
          kind: "text",
          text: "Jumpa is an AI-powered conversational money app that lets you send, receive, swap, save, and spend digital assets and local currencies in one conversation.",
        },
        {
          kind: "list",
          items: [
            "You must be at least 18 years old and legally competent to enter into a contract.",
            "You are using Jumpa for yourself, not on behalf of an undisclosed third party or sanctioned entity.",
            "Jumpa is not a bank. Digital asset balances are not insured bank deposits and do not earn statutory interest unless explicitly engaged in a designated savings protocol.",
            "Nothing provided in the app or stated by the assistant constitutes financial, investment, legal, or tax advice.",
          ],
        },
      ],
    },
    {
      heading: "Your Account and Security",
      blocks: [
        {
          kind: "list",
          items: [
            "You register using your email and verified phone number, setting a login password, and a 4-digit transaction PIN.",
            "Your 4-digit PIN is required to authorize all payments, swaps, and secret key exports. Never share your password or PIN with anyone, including Jumpa staff.",
            "You are solely responsible for activities performed through your account and for maintaining device security.",
            "We may require identity verification (KYC) to comply with regulatory standards or partner bank requirements.",
          ],
        },
      ],
    },
    {
      heading: "Your Wallet and Key Ownership",
      blocks: [
        {
          kind: "callout",
          text: "You retain ownership of your digital assets. Your wallet credentials are encrypted securely and can be exported at any time in Settings > Security.",
        },
        {
          kind: "list",
          items: [
            "Jumpa automatically creates multi-chain wallet addresses (Stellar, Base, Ethereum, Solana, Tron) for your account.",
            "You can view and export your private keys and recovery phrase in Settings by entering your 4-digit PIN.",
            "If you decide to delete your Jumpa account, you MUST export your recovery phrase or private keys beforehand. Once your account is deleted, Jumpa cannot retrieve your keys, and any remaining on-chain funds will be permanently inaccessible.",
          ],
        },
      ],
    },
    {
      heading: "The Chat Assistant and Transaction Approval",
      blocks: [
        {
          kind: "text",
          text: "The Jumpa AI assistant parses text or voice instructions to prepare transaction previews. It cannot autonomously move your funds.",
        },
        {
          kind: "list",
          items: [
            "No transaction executes until you inspect the review card and authorize it with your 4-digit PIN.",
            "You must carefully verify recipient tags, bank account details, destination wallet addresses, and quoted rates before approving.",
            "Quoted rates, exchange fees, and estimated arrival times are indicative and may adjust to real-time market slippage and blockchain gas conditions.",
            "Never paste private keys, seed phrases, or sensitive passwords into the chat interface.",
          ],
        },
      ],
    },
    {
      heading: "Transactions and Finality",
      blocks: [
        {
          kind: "callout",
          text: "Blockchain transactions are final and irreversible once broadcast. Jumpa cannot cancel, edit, or recall on-chain transfers once successful.",
        },
        {
          kind: "list",
          items: [
            "Sending funds to an incorrect address or over an unsupported chain network will result in permanent loss.",
            "Bank deposits and withdrawals (fiat on/off ramps) are facilitated by regulated third-party infrastructure partners. Partner processing times and verification requirements apply.",
            "Blockchain network gas fees are collected by their respective decentralized networks, not Jumpa, and cannot be refunded even if a transaction fails.",
          ],
        },
      ],
    },
    {
      heading: "Savings, Yield, and Partner Services",
      blocks: [
        {
          kind: "list",
          items: [
            "Savings plans allocate assets into third-party decentralized protocols or local yield vaults. Projected yields are variable and subject to market protocol risk.",
            "Airtime, data, and utility payments are delivered by telecommunication partners upon transaction confirmation.",
            "Jumpa does not guarantee the uptime or performance of external protocols, bridges, or payment rails.",
          ],
        },
      ],
    },
    {
      heading: "Prohibited Uses, Anti-Scraping, and IP Protection",
      blocks: [
        {
          kind: "callout",
          text: "Scraping, automated data extraction, copying our interface or code, and trademark or copyright infringement are strictly prohibited.",
        },
        {
          kind: "list",
          items: [
            "You must not scrape, crawl, reverse-engineer, decompile, copy, frame, or mirror any portion of the Jumpa interface, API, or underlying code.",
            "All Jumpa trademarks, logos, brand elements, designs, text, and software are the exclusive intellectual property of Jumpa Technologies Limited.",
            "You may not use Jumpa for unlawful purposes, money laundering, fraud, terrorist financing, sanctions evasion, or commercial exploitation.",
            "Violation of these rules will result in immediate account termination and potential legal action.",
          ],
        },
      ],
    },
    {
      heading: "Disclaimers, Liability, and Governing Law",
      blocks: [
        {
          kind: "text",
          text: `Jumpa is provided "as is" without express or implied warranties. To the maximum extent permitted by law, ${LEGAL_ENTITY.name} is not liable for indirect losses, lost profits, blockchain network outages, or errors caused by incorrect recipient details.`,
        },
        {
          kind: "text",
          text: `Our aggregate liability is capped at ${LEGAL_ENTITY.liabilityCap}. These terms are governed by the laws of ${LEGAL_ENTITY.country}, under the exclusive jurisdiction of ${LEGAL_ENTITY.courts}. For questions or dispute resolutions, contact us at ${LEGAL_CONTACT.legal} or through in-app support.`,
        },
      ],
    },
  ],
};

const PRIVACY: LegalDocument = {
  title: "Privacy Policy",
  short: "Privacy Policy",
  summary: "How Jumpa collects, protects, and handles your personal information.",
  intro: `This Privacy Policy outlines how ${LEGAL_ENTITY.name} ("${LEGAL_ENTITY.short}", "we", "us") handles personal data across the Jumpa mobile application and website.`,
  sections: [
    {
      heading: "Key Privacy Highlights",
      blocks: [
        {
          kind: "list",
          items: [
            "We never view or store your raw PIN or plaintext login password.",
            "We only collect information necessary to maintain account security, prevent fraud, execute transfers, and comply with financial laws.",
            "We do not sell your personal data to data brokers or third-party advertisers.",
            "Public blockchain transactions (wallet addresses and transfer amounts) are transparent and immutable by decentralized design.",
          ],
        },
      ],
    },
    {
      heading: "Information We Collect",
      blocks: [
        {
          kind: "list",
          items: [
            "Profile Data: Your email address, phone number, Jumpa Tag, referral code, and hashed security credentials.",
            "Verification & KYC: Government ID and selfie to access higher transaction limits.",
            "Financial Activity: Public wallet addresses, transaction history, savings balances, and recipient bank account details entered for withdrawals.",
            "Conversational Data: Chat prompts and voice transcripts processed to generate transaction previews.",
            "Device & Log Data: IP address, operating system, and security session timestamps to safeguard against unauthorized logins.",
          ],
        },
      ],
    },
    {
      heading: "How We Use Your Data",
      blocks: [
        {
          kind: "list",
          items: [
            "To operate your wallet and process crypto, and fiat transactions.",
            "To parse text and voice instructions into actionable previews via AI language models.",
            "To verify your identity and satisfy regulatory anti-money-laundering (AML) standards.",
            "To detect security breaches, prevent fraud, and provide customer support.",
          ],
        },
      ],
    },
    {
      heading: "Third-Party Sharing and Infrastructure",
      blocks: [
        {
          kind: "list",
          items: [
            "Financial & Ramp Partners: Licensed banking and on/off ramp partners to settle cash deposits and withdrawals.",
            "AI Service Providers: Cloud language models that process conversational prompts (we do not allow AI vendors to train public models on your sensitive credentials).",
            "Public Blockchains: Transaction hashes and addresses are permanently written to public ledgers (Stellar, EVM, Solana, Tron).",
            "Legal & Regulatory Authorities: Disclosed only when legally mandated by court order or applicable financial regulations.",
          ],
        },
      ],
    },
    {
      heading: "Data Retention and Account Deletion",
      blocks: [
        {
          kind: "text",
          text: "We keep account profile data while your account is active. Financial audit and KYC logs are retained for statutory retention periods mandated by applicable anti-money laundering regulations.",
        },
        {
          kind: "text",
          text: "You can request account deletion at any time in Settings > Danger Zone. Deleting your account deletes your Jumpa credentials. Remember to export your wallet recovery phrase before deleting your account.",
        },
      ],
    },
    {
      heading: "Your Rights and Contact Information",
      blocks: [
        {
          kind: "text",
          text: `You have the right to access, rectify, or request a portable copy of your personal data. For privacy inquiries or data requests, contact our privacy team at ${LEGAL_CONTACT.privacy}.`,
        },
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalDoc, LegalDocument> = {
  terms: TERMS,
  privacy: PRIVACY,
};
