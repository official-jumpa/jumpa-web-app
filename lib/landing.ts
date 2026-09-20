/** Copy and structured content for the public landing page (`app/page.tsx`). */

export const CTA_LABEL = "Join Beta";
export const EMAIL_PLACEHOLDER = "Enter your email...";

export const NAV_LINKS = [
  { label: "Home", href: "#" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Security", href: "#security" },
  { label: "FAQ", href: "#faq" },
] as const;

export const HERO = {
  // The design reads "Accepted Accross" — corrected here, flagged to the client.
  badge: { lead: "Accepted Across 5", strong: "+", tail: " Countries" },
  heading: { lead: "Move money the way you ", accent: "chat." },
  subhead:
    "Send and receive money, move between cash and crypto, save toward your goals, and more. Just tell Jumpa what you want to do by text or voice.",
} as const;

/** The mocked conversation on the hero's glass panel. */
export const CHAT_PREVIEW = {
  messages: ["Heyyy, Jumpa", "i want to sell 100 USD"],
  reply: "Finding you the best rate...",
  composer: "| Tap to start typing...",
} as const;

/** The suggestion chips under that conversation, in the order the design draws them. */
export const QUICK_ACTIONS = [
  { id: "add-funds", label: "Add funds" },
  { id: "cash-out", label: "Cash Out" },
  { id: "balance", label: "Check Balance" },
  { id: "savings", label: "Create Savings" },
  { id: "swap", label: "Swap Token to Token" },
] as const;

export const HOW_IT_WORKS = {
  badge: "How it works",
  heading: "Tell Jumpa what you want to do.",
  subhead: "Moving money should feel as simple as saying what you need.",
  steps: [
    {
      title: "Say it or type it",
      description: "Type a message or send a voice note.",
    },
    {
      title: "Jumpa prepares it",
      description:
        "Jumpa understands your request and turns it into a clear action for you to review.",
    },
    {
      title: "Review and confirm",
      description:
        "Check the important details and approve the transaction with your PIN.",
    },
    {
      title: "Done",
      description:
        "Jumpa processes the transaction and lets you know when it's complete.",
    },
  ],
} as const;

/** Bar heights of the decorative waveform, in desktop design px (142 tall). */
export const WAVEFORM_BARS = [
  39.172, 39.172, 117.517, 73.448, 142, 122.414, 97.931, 58.759, 127.31, 48.966,
  117.517, 39.172, 39.172, 107.724, 58.759, 117.517, 58.759, 107.724, 73.448,
  73.448, 142, 39.172, 39.172,
] as const;

export const FEATURES = {
  badge: "Features",
  heading: "Send. Spend. Swap. Save.",
  subhead: "More ways to move and use your money. One simpler experience.",
} as const;

export const SEND_CARD = {
  title: "Send",
  description:
    "Send money to bank accounts, wallet addresses, Jumpa users and other supported destinations",
  // Two rows of asset chips; NGN resolves to the naira flag, everything else to a coin.
  rows: [
    ["XLM", "BTC", "USDT"],
    ["USDC", "ETH", "SOL", "NGN"],
  ],
} as const;

export const RECEIVE_CARD = {
  title: "Receive",
  description:
    "Receive naira through bank transfer or receive supported crypto directly into Jumpa.",
  amount: "+$274",
} as const;

export const SWAP_CARD = {
  title: "Buy, Sell & Swap",
  description:
    "Buy crypto with naira, sell supported crypto back to naira, or swap between supported crypto assets.",
  pay: { label: "YOU PAY", amount: "100", symbol: "XLM" },
  receive: { label: "YOU RECEIVE", amount: "4,830", symbol: "BTC" },
} as const;

export const SAVE_CARD = {
  title: "Save",
  description:
    "Save toward your own goals or contribute with others through Circles.",
  plans: [
    {
      title: "Individual Savings",
      description: "Save towards something personal.",
    },
    // The design repeats "Save towards something personal." on Lock savings too — a
    // copy-paste slip. Written distinctly; confirm the real copy with the client.
    {
      title: "Lock savings",
      description: "Save for a fixed period, at a fixed rate.",
    },
    {
      title: "Circles (Groups)",
      description: "Create or join a shared savings goal.",
    },
  ],
} as const;

export const WHY_JUMPA = {
  badge: "Why Jumpa",
  heading: "Your money shouldn't take this many steps.",
  subhead:
    "Stop jumping through different apps and complicated flows just to move your money.",
  panel: {
    heading: "Tell Jumpa what you want to do.",
    subhead: "Jumpa prepares it, you review it, and you stay in control.",
  },
} as const;

export const SECURITY = {
  badge: "Security",
  heading: "Your money moves. Your control stays.",
  subhead:
    "Jumpa can understand what you want to do. It cannot approve a transaction for you.",
  cards: {
    // The two frames give this card different copy; each renders at its own
    // width, as drawn. Confirm with the client which one is current.
    access: {
      title: "Secure account access",
      description:
        "Access your account through supported sign-in methods, including one-time verification codes and Google or Apple sign-in.",
      mobileTitle: "Protect your account",
      mobileDescription:
        "Your sign-in is verified with a one-time code to help keep your account protected.",
    },
    pin: {
      title: "Confirm with your PIN",
      description:
        "Every transaction requires your PIN before it goes through.",
    },
    review: {
      title: "Review",
      // One text node with a hard break in the design, so no gap between them.
      description: [
        "Review before you confirm",
        "See the important transaction details before anything moves.",
      ],
    },
  },
} as const;

/** The transaction-review sheet drawn inside the third security card. */
export const REVIEW_MOCK = {
  title: "Review",
  sending: { label: "Sending", asset: "USDT" },
  // Placeholder address the designer drew; nothing here is a real wallet.
  to: {
    label: "To",
    address: "GD3PSH6RRKIIBZ7FD7KNSQCQ6QIJL46LNMFBILR3BTFXKWGRLUXKCHD",
    network: "Stellar - Mainet",
  },
  recipient: { label: "RECIPIENT GETS", amount: "100 USDT" },
  // The design lists "Network fee" twice; kept verbatim.
  rows: [
    { label: "Network", value: "Stellar" },
    { label: "Asset", value: "USDC" },
    { label: "Network fee", value: "~$0.001" },
    { label: "Network fee", value: "~$0.001" },
    { label: "Settlement time", value: "3-5 seconds" },
  ],
  cta: "Confirm payment",
} as const;

export const FAQ = {
  badge: "FAQS",
  heading: "Frequently asked questions",
  items: [
    {
      question: "What is Jumpa?",
      answer:
        "Jumpa is a self-custodial wallet that lets you send, receive, swap, and manage money across currencies and blockchains — all from one simple app. Think of it as your all-in-one money hub.",
    },
    {
      question: "How does Jumpa keep my funds safe?",
      answer:
        "Your keys never leave your device. Jumpa uses a self-custodial model, meaning only you control your wallet. Add biometric login, a transaction PIN, and back up your seed phrase for full peace of mind.",
    },
    {
      question: "What currencies and chains does Jumpa support?",
      answer:
        "Jumpa supports NGN and USD fiat accounts alongside crypto on Ethereum, Base, BNB Chain, and Stellar. Swap between them instantly, right inside the app.",
    },
    {
      question: "Are there any fees?",
      answer:
        "Jumpa keeps fees transparent and competitive. Crypto-to-crypto swaps and on-chain transfers carry only the network gas fee. Fiat conversions show the rate and any spread before you confirm — no hidden charges.",
    },
    {
      question: "How do I open a USD or NGN account?",
      answer:
        "Tap the USD or NGN card on your home screen, walk through a quick KYC check, and your account is ready in minutes. You'll get dedicated bank details you can share to receive payments.",
    },
    {
      question: "Can I send money to someone without a Jumpa wallet?",
      answer:
        "Yes. You can send to any bank account or blockchain address. For bank transfers, just enter the recipient's account details and confirm with your transaction PIN.",
    },
    {
      question: "How do I recover my wallet if I lose my phone?",
      answer:
        "Install Jumpa on your new device and restore using your 12-word seed phrase. That phrase is the master key to your wallet — keep it written down somewhere safe and offline.",
    },
  ],
} as const;

export const BETA_CTA = {
  badge: "BETA",
  formTitle: "Join the Private Beta",
  emailLabel: "Enter your Email",
  note: "We'll only email you about Jumpa access and important updates concerning Jumpa",
  buttonSubmitting: "Joining...",
  buttonSuccess: "You're on the list",
  successNotice: "You're on the list. Check your email to continue",
  alreadyJoinedNotice: "You're already on the waitlist! Check your email to continue",
  desktop: {
    heading: "Help shape how money moves.",
    blurb:
      "Be among the first to test Jumpa. Move money by text or voice, explore the experience, and help us make it better before launch.",
  },
  // The mobile frame carries its own heading and blurb, not a scaled-down desktop.
  mobile: {
    heading: "Be the first when the doors open",
    blurb:
      "Join the Jumpa waitlist and be among the first to experience a simpler way to move money",
  },
} as const;

export const FOOTER = {
  tagline: "Move money the way you chat.",
  copyright: { year: `© ${new Date().getFullYear()} `, owner: "Jumpa app" },
  columns: [
    { heading: "Company", links: NAV_LINKS.slice(1) },
  ],
  // Canonical profile URLs — the share/QR tokens the links were sent with expire.
  socials: [
    { label: "TikTok", href: "https://www.tiktok.com/@usejumpa" },
    { label: "X", href: "https://x.com/jumpahq" },
    { label: "Instagram", href: "https://www.instagram.com/usejumpa" },
    // TODO(content): placeholder — this is LinkedIn's homepage, not Jumpa's page.
    // Replace with the real profile URL.
    { label: "LinkedIn", href: "https://linkedin.com" },
  ],
  betaTitle: "Private Beta",
  betaBlurb:
    "Be among the first to test Jumpa. Move money by text or voice, explore the experience, and help us make it better before launch.",
  // TODO(content): neither page exists and the design gives no destination.
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ],
} as const;
