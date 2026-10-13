/** Copy and structured content for the public landing page (`app/page.tsx`). */

import { legalHref } from "@/lib/legal";
import { supportMailto } from "@/lib/support";

const IMG = "/images/landing";

export const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Security", href: "#security" },
  { label: "FAQ", href: "#faq" },
] as const;

/** The design gives no destination for either CTA; both enter the app's own flow. */
export const CTA = {
  join: { label: "Join Beta", href: "/sign-up" },
  start: { label: "Use Jumpa now", href: "/onboarding" },
} as const;

export const HERO = {
  // The design reads "Accepted Accross" — corrected here, flagged to the client.
  badge: { lead: "Accepted Across 5", strong: "+", tail: " Countries" },
  heading: { lead: "Move money the way you ", accent: "chat." },
  subhead:
    "Send money, receive payments, move between cash and crypto, save toward your goals, and more. Just tell Jumpa what you want to do by text or voice.",
  backedBy: "Backed by",
} as const;

export interface Step {
  title: string;
  body: string;
  /** The phone screen the step shows, at its 2x export size. */
  image: { src: string; width: number; height: number };
}

export const HOW_IT_WORKS = {
  badge: "How it works",
  heading: "Tell Jumpa what you want to do.",
  subhead: "Moving money should feel as simple as saying what you need.",
  steps: [
    {
      title: "Say it or type it",
      body: "Type a message or send a voice note. Tell Jumpa what you want to do in your own words. No special commands to learn.",
      image: { src: `${IMG}/step-say.webp`, width: 456, height: 958 },
    },
    {
      title: "Jumpa prepares it",
      body: "Jumpa understands your request and turns it into a clear action for you to review.",
      image: { src: `${IMG}/step-prepare.webp`, width: 678, height: 1423 },
    },
    {
      title: "Review and confirm",
      body: "Check the important details and approve the transaction with your PIN.",
      image: { src: `${IMG}/step-review.webp`, width: 678, height: 1423 },
    },
    {
      title: "Done",
      body: "Jumpa processes the transaction and lets you know when it's complete.",
      image: { src: `${IMG}/step-done.webp`, width: 678, height: 1423 },
    },
  ] satisfies Step[],
} as const;

export type FeatureId = "send" | "receive" | "swap" | "save" | "spend";

export interface Feature {
  id: FeatureId;
  pill: string;
  title: string;
  body: string;
}

export const FEATURES = {
  badge: "Features",
  heading: "More ways to move and use your money. One simpler experience.",
  cards: [
    {
      id: "send",
      pill: "Send",
      title: "Send it where it needs to go.",
      body: "Send money to bank accounts, wallet addresses, Jumpa users and other supported destinations without jumping through complicated transaction flows.",
    },
    {
      id: "receive",
      pill: "Receive",
      // The design breaks this title by hand, on both frames.
      title: "Get paid the\nway that works\nfor you.",
      body: "Receive naira through bank transfer or receive supported crypto directly into Jumpa.",
    },
    {
      id: "swap",
      // The design reads "Buy, Sell &Swap" — spacing corrected.
      pill: "Buy, Sell & Swap",
      title: "Move between naira & crypto without the usual back and forth.",
      body: "Buy crypto with naira, sell supported crypto back to naira, or swap between supported crypto assets.",
    },
    {
      id: "save",
      pill: "Save",
      title: "Put money aside by yourself or together.",
      body: "Save toward your own goals or contribute with others through Circles.",
    },
    {
      id: "spend",
      pill: "Spend",
      title: "Use your balance beyond transfers.",
      body: "Use your Jumpa balance for everyday payments and spend with your Jumpa card.",
    },
  ] satisfies Feature[],
} as const;

export type SecurityId = "access" | "review" | "approve";

export const SECURITY = {
  badge: "Security",
  heading: "Your money moves. Your control stays.",
  subhead:
    "Jumpa can understand what you want to do. It cannot approve a transaction for you.",
  cards: [
    {
      id: "access",
      title: "Secure account access",
      body: "Access your account through supported sign-in methods, including one-time verification codes and Google or Apple sign-in.",
    },
    {
      id: "review",
      title: "Review before anything moves",
      body: "See the important transaction details before you approve an action.",
    },
    {
      id: "approve",
      title: "You approve every transaction",
      body: "Transactions require your confirmation and PIN before they are processed.",
    },
  ] satisfies { id: SecurityId; title: string; body: string }[],
  pinLabel: "Enter your PIN",
  ndpc: {
    title: "NDPC Certified",
    body: "Jumpa is recognized by the Nigeria Data Protection Commission (NDPC) as a legally compliant entity that handles personal data in strict accordance with the Nigeria Data Protection Act (NDPA).",
  },
} as const;

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  /** The app screenshot the user shared, and where its crop sits vertically. */
  shot: { src: string; position: string };
  /** Portrait inside the 48px disc, placed the way the design crops it. */
  avatar: {
    src: string;
    width: number;
    height: number;
    box: { left: string; top: string; width: string; height: string };
    flip?: boolean;
  };
}

// TODO(content): beta-user quotes and photos from the design; confirm each
// person has agreed to appear before launch.
export const TESTIMONIALS = {
  badge: "Testimonial",
  heading: "What people say",
  subhead:
    "Real stories from real people. See how Jumpa is helping individuals and groups save, plan and reach their goals.",
  items: [
    {
      name: "Olivia .G.",
      role: "Beta User",
      quote: "“Very fast and reliable I love it.”",
      shot: { src: `${IMG}/testimonial-olivia.webp`, position: "50% 35%" },
      avatar: {
        src: `${IMG}/avatar-olivia.webp`,
        width: 270,
        height: 480,
        box: {
          left: "-2.04%",
          top: "-42.87%",
          width: "105.64%",
          height: "187.76%",
        },
      },
    },
    {
      name: "Winnie. N.",
      role: "Beta User",
      quote:
        "“The Jumpa web app is crazyy, literally less than 10sec. The rate is unbelievable”",
      shot: { src: `${IMG}/testimonial-winnie.webp`, position: "50% 0%" },
      avatar: {
        src: `${IMG}/avatar-winnie.webp`,
        width: 320,
        height: 480,
        box: {
          left: "10.2%",
          top: "-16.34%",
          width: "89.8%",
          height: "134.69%",
        },
        flip: true,
      },
    },
    {
      name: "Abubaka",
      role: "Beta User",
      quote:
        "“Omo this Jumpa is so fast and reliable as I made a transfer boom it appears in seconds.”",
      shot: { src: `${IMG}/testimonial-abubaka.webp`, position: "50% 29%" },
      avatar: {
        src: `${IMG}/avatar-abubaka.webp`,
        width: 320,
        height: 480,
        box: {
          left: "-8.17%",
          top: "-16.34%",
          width: "112.24%",
          height: "168.37%",
        },
      },
    },
  ] satisfies Testimonial[],
} as const;

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ = {
  badge: "FAQ",
  heading: "Frequently asked questions",
  subhead: "Find quick answers to the most common questions about Jumpa.",
  support: {
    label: "Need further support?",
    cta: "Contact us",
    href: supportMailto(),
  },
  items: [
    {
      question: "What is Jumpa?",
      answer:
        "Jumpa is a mobile money app that lets you perform financial actions by simply telling it what you want to do through text or voice. You can send and receive money, buy and sell crypto, swap supported assets, save toward goals, spend and more.",
    },
    {
      question: "How does Jumpa work?",
      // TODO(content): verbatim from the design, where it reads as the tail of a
      // longer answer. Confirm the full copy.
      answer:
        "You review the details, confirm with your PIN, and Jumpa processes it.",
    },
    {
      question: "Can I use naira and crypto on Jumpa?",
      answer:
        "Yes. Jumpa supports naira alongside selected stablecoins and other supported crypto assets. You can receive naira, buy crypto with naira, sell supported crypto back to naira, and move supported assets within Jumpa.",
    },
    {
      question: "Can I send and receive money through my bank account?",
      answer:
        "Yes. In Nigeria, you can receive naira through bank transfer and send money to supported Nigerian bank accounts. You can also send and receive supported crypto.",
    },
    {
      question: "Which crypto assets will Jumpa support?",
      answer:
        "Jumpa will support selected stablecoins and other crypto assets. The confirmed list of assets available at launch will be shared before access is granted.",
    },
    {
      question: "Is my money moved automatically when I message Jumpa?",
      answer:
        "No. Telling Jumpa what you want to do does not automatically move your money. Jumpa prepares the transaction for you to review, and you approve it with your PIN before it is processed.",
    },
    {
      question: "Is Jumpa launching in Nigeria?",
      answer: "Yes. Jumpa is launching in Nigeria first.",
    },
    {
      question: "Will I need to complete KYC?",
      answer:
        "Yes, where required. You may need to verify your identity before using certain Jumpa services.",
    },
    {
      question: "Will Jumpa charge fees?",
      answer:
        "Where a transaction has a fee, you'll see it before you confirm. Full fee details will be shared before launch.",
    },
    {
      question: "When can I use Jumpa?",
      answer:
        "Jumpa isn't publicly available yet. Join the waitlist and we'll send you an email when you're granted access.",
    },
  ] satisfies FaqItem[],
} as const;

/** Country pills on the CTA marquee, at their 2x export size (124 tall). */
export const COUNTRIES = [
  { name: "Nigeria", src: `${IMG}/flag-1.webp`, width: 305 },
  // The design's pill reads "United State" — the text is baked into the art.
  { name: "United States", src: `${IMG}/flag-2.webp`, width: 377 },
  { name: "Europe", src: `${IMG}/flag-3.webp`, width: 309 },
  { name: "Ghana", src: `${IMG}/flag-4.webp`, width: 299 },
  { name: "Kenya", src: `${IMG}/flag-5.webp`, width: 293 },
  { name: "China", src: `${IMG}/flag-6.webp`, width: 287 },
] as const;

export const CLOSING = {
  heading: { lead: "Move money the way you ", accent: "chat." },
  subhead:
    "From getting paid to sending money, saving towards a goal or moving between cash and crypto, Jumpa gives you one simpler place to start.",
  // Mock prompts on the phone art — the design's own examples, not real accounts.
  bubble: { lead: "Send 10k to ", account: "916846486", tail: " OPay" },
  // The design reads "Aliced" — corrected here.
  pills: ["Send $50 to Alice", "Send 100 Cedis to 2056478766"],
  borders: "Move money across borders.",
} as const;

export const FOOTER = {
  tagline: "Move money the way you chat.",
  rc: "RC:9117826",
  copyright: "© 2026 Jumpa. All rights reserved.",
  // Canonical profile URLs — the share/QR tokens the links were sent with expire.
  socials: [
    { label: "X", href: "https://x.com/jumpahq" },
    { label: "Instagram", href: "https://www.instagram.com/usejumpa" },
    // TODO(content): the design lists Facebook but there is no profile URL yet.
    { label: "Facebook", href: "#" },
    { label: "Tiktok", href: "https://www.tiktok.com/@usejumpa" },
    // TODO(content): placeholder — this is LinkedIn's homepage, not Jumpa's page.
    // Replace with the real profile URL.
    { label: "LinkedIn", href: "https://linkedin.com" },
  ],
  legal: [
    { label: "Privacy Policy", href: legalHref("privacy") },
    { label: "Terms of Service", href: legalHref("terms") },
    // TODO(content): no page exists for either yet; both are in the design.
    { label: "Risk Disclosure", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
} as const;

export const FOOTER_COLUMNS = [
  { heading: "Links", links: NAV_LINKS },
  { heading: "Legal", links: FOOTER.legal },
  { heading: "Social", links: FOOTER.socials },
] as const;
