/**
 * The Terms and the Privacy Policy, as content rather than markup — one place
 * for the client's counsel to edit, and a dumb renderer over it.
 *
 * There is no Figma frame for either page. The copy is written against what the
 * app actually does (self-custody, the chat assistant, the ramp partners, KYC),
 * so it is specific rather than boilerplate — but it is a draft, not legal
 * advice, and it has to be reviewed and signed off before launch.
 */

/**
 * TODO(legal): every value here is a placeholder. The entity name, registration,
 * registered address, governing law and the liability cap are legal facts we
 * cannot invent — they have to come from the client's counsel.
 */
export const LEGAL_ENTITY = {
  name: "Jumpa Technologies Limited",
  short: "Jumpa",
  registration: "RC 0000000",
  address: "Registered address to be confirmed",
  country: "Nigeria",
  courts: "the courts of Lagos State, Nigeria",
  /** Liability cap. Counsel's call — the figure below is a common default, not advice. */
  liabilityCap: "the total fees you paid us in the six months before the claim",
};

/**
 * TODO(backend): only `support@usejumpa.com` exists today (see `lib/support.ts`).
 * Both inboxes below have to be created and monitored before these pages go live.
 */
export const LEGAL_CONTACT = {
  legal: "legal@usejumpa.com",
  privacy: "privacy@usejumpa.com",
};

/** TODO(legal): set to the date the documents are actually published. */
export const LEGAL_UPDATED = "23 September 2026";

/** TODO(legal): confirm the statutory retention period for the operating entity. */
const RETENTION_YEARS = "five (5) years";

export type LegalDoc = "terms" | "privacy";

export type LegalBlock =
  | { kind: "text"; text: string }
  | { kind: "list"; items: string[] }
  /** The handful of points someone has to read even if they read nothing else. */
  | { kind: "callout"; text: string };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  /** Row label on the index, and the browser tab. */
  short: string;
  /** One line under the title, and the page description for link previews. */
  summary: string;
  intro: string;
  sections: LegalSection[];
}

export function isLegalDoc(value: string): value is LegalDoc {
  return value === "terms" || value === "privacy";
}

export function legalHref(doc?: LegalDoc): string {
  return doc ? `/legal?doc=${doc}` : "/legal";
}

const TERMS: LegalDocument = {
  title: "Terms and Conditions",
  short: "Terms and Conditions",
  summary: "The agreement between you and Jumpa when you use the app.",
  intro: `These terms are the agreement between you and ${LEGAL_ENTITY.name} ("${LEGAL_ENTITY.short}", "we", "us"), and they cover the Jumpa app, our website and everything you can do with them. Please read all of it — in particular "Your wallet, your keys" and "Transactions are final", which explain two things about Jumpa that cannot be undone once they go wrong.`,
  sections: [
    {
      heading: "Accepting these terms",
      blocks: [
        {
          kind: "text",
          text: "By creating a Jumpa account, or by using any part of the app, you agree to these terms. If you do not agree to them, please do not use Jumpa.",
        },
        {
          kind: "list",
          items: [
            "You must be at least 18 years old and legally able to enter into a contract where you live.",
            "You must not be resident in, or acting for anyone in, a country or group that sanctions prevent us from dealing with.",
            "You are using Jumpa for yourself. You may not open or run an account on someone else's behalf unless we have agreed to it in writing.",
            "You are responsible for checking that using Jumpa is lawful where you are.",
          ],
        },
      ],
    },
    {
      heading: "What Jumpa is — and what it is not",
      blocks: [
        {
          kind: "text",
          text: "Jumpa is a self-custodial wallet with a chat interface. You can hold, send, swap, bridge, save and spend digital assets, and move money in and out through our partners, by describing what you want in words instead of tapping through forms.",
        },
        {
          kind: "callout",
          text: "Jumpa is self-custodial. Your recovery phrase and private keys are created on your device. We do not hold your assets, we cannot move them for you, and we cannot reset or recover your keys.",
        },
        {
          kind: "list",
          items: [
            "Jumpa is not a bank. We do not take deposits and we do not lend out your money.",
            "Balances in your wallet are not bank deposits. They are not covered by any deposit insurance or depositor protection scheme.",
            "Nothing in the app — including anything the assistant says — is financial, investment, tax or legal advice.",
            "Where we show a rate, a yield or a quote, it is indicative and it can change before your transaction executes.",
          ],
        },
      ],
    },
    {
      heading: "Your account",
      blocks: [
        {
          kind: "list",
          items: [
            "Give us accurate information when you register, and keep it up to date.",
            "We or our partners may ask you to verify your identity, including a government ID, a selfie, proof of address or information about your source of funds. Some features stay unavailable until that is complete, and we may decline or reverse access where verification fails.",
            "One account per person, unless we agree otherwise.",
            "Your Jumpa tag is unique to you. We may reclaim a tag that impersonates someone, infringes a trademark or is offensive.",
            "You are responsible for everything done through your account.",
          ],
        },
      ],
    },
    {
      heading: "Your wallet, your keys",
      blocks: [
        {
          kind: "text",
          text: "When you create a wallet, Jumpa generates a recovery phrase and shows it to you once. That phrase is the only thing that can restore your wallet.",
        },
        {
          kind: "callout",
          text: "If you lose your recovery phrase, we cannot recover it and your assets are gone permanently. If someone else obtains it, they control your wallet and we cannot stop them or reverse what they do. No one from Jumpa will ever ask you for it.",
        },
        {
          kind: "list",
          items: [
            "Write your recovery phrase down and keep it offline. Do not photograph it, store it in a note or a password manager you sync, email it to yourself, or type it into any website or chat — including ours.",
            "Anyone who asks you for your recovery phrase, private key or PIN is trying to steal from you, whoever they claim to be.",
            "Closing your Jumpa account does not close your wallet. Your assets stay on the blockchain and stay reachable with your recovery phrase.",
          ],
        },
      ],
    },
    {
      heading: "Keeping your account secure",
      blocks: [
        {
          kind: "list",
          items: [
            "Keep your login password, PINs and any biometric access on your device to yourself, and do not reuse them anywhere else.",
            "Tell us as soon as you think someone has your credentials or your device. We can end active sessions for you — but we cannot reverse a blockchain transaction, whoever made it.",
            "Review the devices signed in to your account in Settings, and remove any you do not recognise.",
            "Keep your device, its operating system and the app up to date.",
            "Except where the law says otherwise, we are not responsible for losses caused by your credentials being shared or guessed, or by malware, phishing or a compromised device.",
          ],
        },
      ],
    },
    {
      heading: "The chat assistant",
      blocks: [
        {
          kind: "text",
          text: "Jumpa's assistant reads what you type or say, works out what you are asking for, and prepares it for you to approve. It is software, and it can be wrong, incomplete or out of date.",
        },
        {
          kind: "list",
          items: [
            "The conversation does not authorise anything. Your confirmation on the review screen does — and your PIN is what signs it.",
            "Check every detail on that screen before you confirm: the amount, the asset, the network, the recipient and the fee. They are yours to get right.",
            "Nothing the assistant says is advice, a recommendation or a promise about what an asset will do.",
            "Quotes are indicative until they execute, and the amount you finally receive can differ because of price movement, slippage, network conditions or fees.",
            "Never put your recovery phrase, private key, PIN or password into the chat. To answer you, your messages are processed by a third-party AI provider — see our Privacy Policy.",
          ],
        },
      ],
    },
    {
      heading: "Transactions are final",
      blocks: [
        {
          kind: "callout",
          text: "A blockchain transaction cannot be reversed, cancelled or refunded once it has been broadcast — not by you, and not by us. There is no chargeback.",
        },
        {
          kind: "list",
          items: [
            "You are responsible for the recipient address and the network you choose. Assets sent to the wrong address, or on the wrong network, are normally lost for good.",
            "Network fees are set by the blockchain, not by us, and are payable even when a transaction fails.",
            "Transactions can fail, stall or be dropped for reasons outside our control — network congestion, an outage, a partner or node going down, or not enough balance left to pay fees.",
            "We may be unable to complete a transaction where doing so would breach a legal or regulatory obligation, or where a partner declines it.",
          ],
        },
      ],
    },
    {
      heading: "Deposits, withdrawals and fiat accounts",
      blocks: [
        {
          kind: "text",
          text: "Moving money between local currency and digital assets is provided by licensed third-party partners. Using those services means accepting their terms as well as ours, and they may carry out their own checks on you and on the payment.",
        },
        {
          kind: "list",
          items: [
            "An account number shown to you in the app may be issued and operated by a partner rather than by us.",
            "The name on the bank or mobile money account you use must match your verified name. Payments from someone else's account can be delayed, rejected or returned.",
            "How long a deposit or withdrawal takes depends on the partner and the payment rails, and we cannot guarantee it.",
            "We cannot recall money sent to a bank account you entered incorrectly.",
            "We may hold, decline or return a payment where we are required to, or where we reasonably suspect fraud or abuse.",
          ],
        },
      ],
    },
    {
      heading: "Savings and yield",
      blocks: [
        {
          kind: "list",
          items: [
            "Savings plans put your assets to work in third-party protocols. We do not hold those assets and we do not guarantee what they will return.",
            "Any rate shown is variable and indicative. It is not interest, and it is not a promise.",
            "These are not deposits. Your capital is at risk — from market movement, from a protocol failing or being exploited, and from a partner becoming insolvent.",
            "A locked plan cannot be ended before maturity except as that product describes, and ending one early may cost you part of what you have earned.",
          ],
        },
      ],
    },
    {
      heading: "Cards, bills and other services",
      blocks: [
        {
          kind: "list",
          items: [
            "Some features are provided with partners, are available only in some countries, and may be changed or withdrawn.",
            "Anything marked as coming soon is not live, and describing it is not a promise to deliver it.",
            "Airtime, data and bill payments are delivered by the relevant carrier or biller once we pass the request on. Their terms apply to what you receive.",
          ],
        },
      ],
    },
    {
      heading: "Fees",
      blocks: [
        {
          kind: "list",
          items: [
            "We show the fee that applies before you confirm. A partner fee or a spread may be built into a quoted rate.",
            "Network fees are separate, go to the blockchain rather than to us, and vary with network conditions.",
            "We may change our fees. A change applies only to transactions made after it takes effect.",
          ],
        },
      ],
    },
    {
      heading: "How you may not use Jumpa",
      blocks: [
        { kind: "text", text: "You must not use Jumpa to:" },
        {
          kind: "list",
          items: [
            "break the law, or help anyone else to;",
            "launder money, finance terrorism, or evade sanctions or tax;",
            "commit fraud, impersonate anyone, or handle the proceeds of crime;",
            "buy or sell anything you are not allowed to buy or sell;",
            "get around our verification checks, or use another person's identity or documents;",
            "scrape, probe, overload or attack the service, or interfere with anyone else's use of it;",
            "reverse engineer, copy, resell or white-label any part of Jumpa;",
            "abuse a referral scheme, promotion or reward;",
            "do anything that puts us or one of our partners in breach of our own obligations.",
          ],
        },
      ],
    },
    {
      heading: "Suspending or closing an account",
      blocks: [
        {
          kind: "list",
          items: [
            "We may limit, suspend or close your account where we reasonably need to — to meet a legal or regulatory obligation, where we suspect fraud or abuse, where a partner requires it, or where you have broken these terms.",
            "We will tell you when we are allowed to. Sometimes the law prevents us from explaining why.",
            "Because Jumpa is self-custodial, suspending an account restricts your access to the app and to our services. It does not freeze your assets, which remain reachable with your recovery phrase.",
            "You can close your account at any time in Settings. Do that only once you have your recovery phrase safely stored — we cannot give it back to you afterwards.",
            "Closing your account does not end obligations either of us already owes the other.",
          ],
        },
      ],
    },
    {
      heading: "Our intellectual property",
      blocks: [
        {
          kind: "text",
          text: `The Jumpa name, logo, app, design and content belong to ${LEGAL_ENTITY.name} or our licensors. We grant you a personal, limited, revocable, non-exclusive licence to use the app for its intended purpose. You may not copy, modify, distribute, resell or create derivative works from it, or remove any notice of ownership from it.`,
        },
      ],
    },
    {
      heading: "Third parties",
      blocks: [
        {
          kind: "text",
          text: "Jumpa depends on things we do not run: public blockchains, liquidity and bridging protocols, payment and ramp partners, identity verification providers, and the AI provider behind the assistant. We choose our partners carefully, but we are not responsible for their acts, omissions, outages or terms, and a link or an integration is not an endorsement.",
        },
      ],
    },
    {
      heading: "Risks you accept",
      blocks: [
        {
          kind: "text",
          text: "Digital assets carry real risk. By using Jumpa you accept that:",
        },
        {
          kind: "list",
          items: [
            "prices are volatile, can fall sharply, and an asset can become worthless;",
            "a stablecoin can lose its peg, and a token can lose its liquidity;",
            "blockchains can congest, fork, halt or be attacked, and transactions can be delayed or fail;",
            "smart contracts can contain bugs or be exploited, including ones we integrate with;",
            "regulation can change, and may restrict or end our ability to offer a feature where you live;",
            "a mistake you make — a wrong address, a wrong network, a lost recovery phrase — is usually not recoverable by anyone.",
          ],
        },
      ],
    },
    {
      heading: "Availability and changes to the service",
      blocks: [
        {
          kind: "text",
          text: "We work to keep Jumpa available, but we do not promise it will be uninterrupted or error-free. We may suspend part of the service for maintenance, security or a partner outage, and we may add, change or withdraw features. Where a change materially reduces what you get, we will give you reasonable notice unless we cannot.",
        },
      ],
    },
    {
      heading: "Disclaimers and our liability",
      blocks: [
        {
          kind: "text",
          text: "To the fullest extent the law allows, Jumpa is provided as is and as available, without warranties of any kind.",
        },
        { kind: "text", text: "We are not liable to you for:" },
        {
          kind: "list",
          items: [
            "any transaction you authorised, including one you approved after a mistake of your own;",
            "loss of a recovery phrase, private key, password or PIN, or unauthorised access to your device;",
            "the acts, omissions, delays or failures of a blockchain, a protocol or a third-party partner;",
            "movement in the price or liquidity of any asset;",
            "loss of profit, revenue, opportunity, goodwill or data, or any indirect or consequential loss.",
          ],
        },
        {
          kind: "text",
          text: `Nothing in these terms excludes liability we cannot exclude by law — including for fraud, for death or personal injury caused by our negligence, or for rights you have as a consumer. Where our liability is not excluded, it is limited to ${LEGAL_ENTITY.liabilityCap}.`,
        },
      ],
    },
    {
      heading: "Your indemnity to us",
      blocks: [
        {
          kind: "text",
          text: "You agree to cover us against claims, losses and reasonable costs arising from your breach of these terms, your misuse of Jumpa, or your breach of any law or of anyone else's rights.",
        },
      ],
    },
    {
      heading: "If something goes wrong",
      blocks: [
        {
          kind: "text",
          text: `Contact us first — Help and Support in the app, or ${LEGAL_CONTACT.legal}. Tell us what happened, when, and what you would like us to do. We will acknowledge your complaint and come back to you with an answer or an explanation of what we are doing about it. If you are still unhappy, you may be able to refer the matter to a regulator or an ombudsman where you live.`,
        },
      ],
    },
    {
      heading: "Changes to these terms",
      blocks: [
        {
          kind: "text",
          text: "We may update these terms as Jumpa changes and as the law changes. We will post the new version here and update the date at the top. Where a change materially affects you, we will tell you in the app or by email before it takes effect. Continuing to use Jumpa after that means you accept the new terms; if you do not, stop using Jumpa and close your account.",
        },
      ],
    },
    {
      heading: "Governing law",
      blocks: [
        {
          kind: "text",
          text: `These terms are governed by the laws of ${LEGAL_ENTITY.country}, and disputes will be dealt with by ${LEGAL_ENTITY.courts}. If you are a consumer, this does not take away the protection of the law of the country you live in.`,
        },
      ],
    },
    {
      heading: "Contact us",
      blocks: [
        {
          kind: "text",
          text: `${LEGAL_ENTITY.name} (${LEGAL_ENTITY.registration}), ${LEGAL_ENTITY.address}. Email ${LEGAL_CONTACT.legal}, or reach us from Help and Support in the app.`,
        },
      ],
    },
  ],
};

const PRIVACY: LegalDocument = {
  title: "Privacy Policy",
  short: "Privacy Policy",
  summary: "What we collect, why we collect it, and what you can ask us to do.",
  intro: `This policy explains what ${LEGAL_ENTITY.name} ("${LEGAL_ENTITY.short}", "we", "us") does with your personal data when you use the Jumpa app or our website, and the choices you have. We have tried to write it in plain language rather than in legal shorthand.`,
  sections: [
    {
      heading: "The short version",
      blocks: [
        {
          kind: "list",
          items: [
            "We never see your recovery phrase, your private keys or your PIN.",
            "We collect what we need to run your account, verify who you are, move money, and keep the service safe.",
            "Your chat messages are sent to our AI provider so the assistant can answer them.",
            "We do not sell your personal data, and we do not share it with advertisers.",
            "Anything written to a public blockchain is permanent and outside our control.",
            "You can ask us for a copy of your data, ask us to correct it, or delete your account from Settings.",
          ],
        },
      ],
    },
    {
      heading: "Your keys are not ours to see",
      blocks: [
        {
          kind: "callout",
          text: "Your recovery phrase and private keys are generated on your device and stored encrypted. Your PIN is stored only as a one-way hash, which cannot be turned back into your PIN. Nobody at Jumpa can read any of them, and nobody at Jumpa will ever ask you for them.",
        },
      ],
    },
    {
      heading: "What we collect",
      blocks: [
        { kind: "text", text: "Depending on what you use, this includes:" },
        {
          kind: "list",
          items: [
            "Account and profile — your name or nickname, email address, phone number, Jumpa tag, country, referral code, and the hashed form of your password and PINs.",
            "Identity verification — images of a government ID, a selfie, your date of birth and address, and the result of the checks run on them.",
            "Wallet and transaction — your public wallet addresses, balances, transaction history, the assets and networks you use, savings plans, and card and bill activity.",
            "Chat — the messages you send, the assistant's replies, and any file you attach to them.",
            "Payment details — the bank or mobile money account names and numbers you enter to deposit or withdraw, and the reference and status of each transfer.",
            "Device and usage — your IP address, device and browser type, approximate location derived from your IP, sign-in times, active sessions, and which parts of the app you use.",
            "Communications — your support conversations with us, and emails you send us.",
          ],
        },
      ],
    },
    {
      heading: "Where it comes from",
      blocks: [
        {
          kind: "list",
          items: [
            "From you, when you register, verify your identity, transact or contact us.",
            "From your device, automatically, when you use the app.",
            "From our partners — verification results, payment status, and fraud or sanctions screening outcomes.",
            "From public blockchains, which we read to show your balances and history.",
          ],
        },
      ],
    },
    {
      heading: "Why we use it",
      blocks: [
        {
          kind: "list",
          items: [
            "To run your account and do what you have asked us to do — because we need to, to perform our contract with you.",
            "To verify your identity and to meet anti-money-laundering, sanctions and other regulatory duties — because the law requires it.",
            "To detect and prevent fraud, abuse and unauthorised access, and to keep the service secure — because we and our users have a legitimate interest in that.",
            "To answer your questions and support you.",
            "To understand how the app is used and to improve it — where analytics rely on cookies, with your consent.",
            "To send you service messages about your account and your transactions, and marketing only where you have asked for it.",
          ],
        },
      ],
    },
    {
      heading: "Public blockchains are permanent",
      blocks: [
        {
          kind: "callout",
          text: "When you transact, the details — wallet addresses, amounts and timestamps — are written to a public ledger by the network, not by us. Anyone can read them, they are outside our control, and they cannot be changed or erased, including by a deletion request to us.",
        },
      ],
    },
    {
      heading: "The assistant and your messages",
      blocks: [
        {
          kind: "list",
          items: [
            "To generate a reply, the content of your message is sent to our third-party AI provider. Files you attach stay on our servers; we send the assistant a description of them, and it cannot open them.",
            "Your conversations are stored against your account so you can come back to them, and you can delete a conversation at any time.",
            "Please do not put your recovery phrase, private key, PIN, password or anyone else's personal data into the chat.",
            "TODO(legal): confirm with the AI provider whether message content is retained, or used to train their models, and state the answer here plainly.",
          ],
        },
      ],
    },
    {
      heading: "Who we share it with",
      blocks: [
        {
          kind: "list",
          items: [
            "Service providers who help us run Jumpa — identity verification, payment and ramp partners, blockchain infrastructure, our AI provider, hosting and database providers, analytics, and email and notification providers. They may only use your data to do the job we have given them.",
            "Regulators, law enforcement, courts and our professional advisers, where we are legally required or where we need to establish or defend a legal claim.",
            "A buyer or successor, if the business is sold, merged or reorganised — with the same protections carried over.",
            "We do not sell your personal data, and we do not share it with advertisers.",
          ],
        },
      ],
    },
    {
      heading: "Where your data goes",
      blocks: [
        {
          kind: "text",
          text: "Some of our providers are outside the country you live in. When your data is transferred, we rely on appropriate safeguards — such as standard contractual clauses or an adequacy decision — and you can ask us for details.",
        },
      ],
    },
    {
      heading: "How long we keep it",
      blocks: [
        {
          kind: "list",
          items: [
            "Account and profile data, for as long as you have an account.",
            `Identity verification records and transaction records, for at least ${RETENTION_YEARS} after our relationship ends, because anti-money-laundering law requires it. That obligation overrides a request to delete them.`,
            "Chat messages and attachments, until you delete them or close your account.",
            "Support conversations and security logs, for as long as we need them to handle disputes and protect the service.",
            "Data written to a public blockchain, which we cannot delete at all.",
          ],
        },
      ],
    },
    {
      heading: "How we protect it",
      blocks: [
        {
          kind: "text",
          text: "We encrypt data in transit and at rest, store passwords and PINs only as one-way hashes, restrict who can access production systems, and let you see and end your active sessions in Settings. No service can promise perfect security, so please use a strong, unique password and keep your device locked.",
        },
      ],
    },
    {
      heading: "Your rights",
      blocks: [
        { kind: "text", text: "You can ask us to:" },
        {
          kind: "list",
          items: [
            "give you a copy of the personal data we hold about you;",
            "correct anything that is wrong or out of date;",
            "delete your data, where we are not required to keep it;",
            "restrict or object to how we use it, including for analytics;",
            "send your data to you or to someone else in a portable format;",
            "stop sending you marketing, which you can also do from any message we send.",
          ],
        },
        {
          kind: "text",
          text: `Email ${LEGAL_CONTACT.privacy} and we will respond within 30 days. You can delete your account yourself in Settings, under Account. We may need to confirm who you are first. If you are unhappy with how we have handled your data, you can complain to the data protection authority where you live.`,
        },
      ],
    },
    {
      heading: "Cookies and analytics",
      blocks: [
        {
          kind: "text",
          text: "We use cookies and similar technology to keep you signed in and to keep your session secure — those are essential and cannot be turned off — and, with your consent, to measure how the app is used so we can improve it. You can clear or block cookies in your browser, though the app will not work properly without the essential ones.",
        },
      ],
    },
    {
      heading: "Children",
      blocks: [
        {
          kind: "text",
          text: "Jumpa is not for anyone under 18. We do not knowingly collect data from children, and if we discover we have, we will delete it and close the account.",
        },
      ],
    },
    {
      heading: "Changes to this policy",
      blocks: [
        {
          kind: "text",
          text: "We will post any update here and change the date at the top. Where a change materially affects you, we will tell you in the app or by email before it takes effect.",
        },
      ],
    },
    {
      heading: "Contact us",
      blocks: [
        {
          kind: "text",
          text: `${LEGAL_ENTITY.name} (${LEGAL_ENTITY.registration}), ${LEGAL_ENTITY.address}. For anything about your data, email ${LEGAL_CONTACT.privacy}.`,
        },
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalDoc, LegalDocument> = {
  terms: TERMS,
  privacy: PRIVACY,
};
