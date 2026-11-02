export interface DocSection {
  id: string;
  title: string;
  content: string;
  callout?: {
    type: "note" | "tip" | "important" | "warning";
    title?: string;
    text: string;
  };
  codeBlock?: {
    language: string;
    filename?: string;
    code: string;
  };
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface DocPage {
  id: string;
  category: string;
  categoryId?: string;
  title: string;
  description: string;
  lastUpdated: string;
  readTime?: string;
  sections: DocSection[];
}

export interface DocCategory {
  title: string;
  id: string;
  items: {
    title: string;
    id: string;
    description?: string;
  }[];
}

export const DOCS_CATEGORIES: DocCategory[] = [
  {
    title: "Getting Started",
    id: "getting-started",
    items: [
      {
        title: "What is Jumpa?",
        id: "overview",
        description: "An introduction to Jumpa's conversational multi-chain neo-bank and smart wallet.",
      },
      {
        title: "Quickstart Guide",
        id: "quickstart",
        description: "Set up your account, choose your @tag, configure your security PIN, and start transacting.",
      },
      {
        title: "Core Features",
        id: "core-features",
        description: "Explore chat banking, direct bank settlements, cross-chain swaps, and automated savings.",
      },
    ],
  },
  {
    title: "Architecture",
    id: "architecture",
    items: [
      {
        title: "Direct Settlement Engine",
        id: "settlement-engine",
        description: "How Jumpa's high-speed direct fiat rails and liquidity pools process bank payouts in seconds.",
      },
      {
        title: "Gas Abstraction & Relaying",
        id: "gas-abstraction",
        description: "How Jumpa sponsors network transaction fees so users never need native gas tokens.",
      },
      {
        title: "Dedicated Virtual Accounts",
        id: "virtual-accounts",
        description: "Personalized Nigerian bank virtual accounts with instant automated reconciliation.",
      },
    ],
  },
  {
    title: "Security & Safeguards",
    id: "security",
    items: [
      {
        title: "Security & Privacy Safeguards",
        id: "security-features",
        description: "A non-technical summary of how Jumpa protects your funds, personal identity, and transactions.",
      },
      {
        title: "Self-Custody Guarantee",
        id: "self-custody",
        description: "Why Jumpa cannot freeze or access your funds without your authorized signature.",
      },
    ],
  },
  {
    title: "Customer Support",
    id: "support",
    items: [
      {
        title: "Help, Support & Inquiries",
        id: "help-support",
        description: "How to open support tickets, resolve transaction questions, and access FAQs.",
      },
    ],
  },
];

export const DOCS_PAGES: Record<string, DocPage> = {
  overview: {
    id: "overview",
    category: "Getting Started",
    categoryId: "getting-started",
    title: "What is Jumpa?",
    description: "Jumpa is a non-custodial financial assistant that abstracts blockchain complexity through an AI-driven conversational interface. Users can manage funds, query live balances, swap digital assets, and bridge fiat currencies simply by chatting naturally in plain English.",
    lastUpdated: "November 2026",
    readTime: "4 min read",
    sections: [
      {
        id: "the-mission",
        title: "The Vision Behind Jumpa",
        content: `Traditional cryptocurrency platforms and traditional banking services have historically lived in completely separate worlds. Withdrawing digital assets to a local bank account or paying daily bills often requires multiple hops, complex bridges, manual exchange orders, and paying native blockchain gas fees across four different networks.\n\nJumpa dissolves these barriers entirely. It combines an **AI-powered conversational interface** with a **self-custodial, multi-chain smart wallet**, allowing users to manage everyday banking, cross-chain crypto, and automated savings from a single web app interface at [usejumpa.com](https://usejumpa.com).`,
        callout: {
          type: "tip",
          title: "Conversational Finance",
          text: "You can interact with Jumpa exactly like chatting with a private banker: 'Send ₦25,000 to my GTBank account', 'Swap 50 USDC for SOL', or 'Save $20 every Friday'. Jumpa prepares and verifies the transaction for your approval.",
        },
      },
      {
        id: "core-pillars",
        title: "Jumpa's Four Core Pillars",
        content: `Jumpa is built upon four foundational pillars that define our service:`,
        table: {
          headers: ["Pillar", "Traditional Experience", "Jumpa Experience"],
          rows: [
            [
              "Fiat Settlement",
              "P2P marketplaces with fraud risks, escrow delays, or 3-step withdrawal hops.",
              "Direct instant settlement to all 200+ Nigerian commercial banks within 30 to 90 seconds.",
            ],
            [
              "Custody & Ownership",
              "Centralized exchanges hold your keys and can freeze or suspend your withdrawals.",
              "Self-custodial: Your seed phrase belongs to you. Jumpa never holds or store your private keys in plaintext.",
            ],
            [
              "Blockchain Gas",
              "Users get stuck when they hold USDC but have no native SOL, ETH, or XLM to pay gas fees.",
              "Complete Gas Abstraction: Jumpa sponsors transaction gas behind the scenes so users don't need to worry about having gas in the chain they want to transact in.",
            ],
            [
              "Interface Simplicity",
              "Complex order books, slippage sliders, hex addresses, and fragmented dApps.",
              "Conversational AI: Chat, speak, or type natural requests with deterministic transaction receipts.",
            ],
          ],
        },
      },
      {
        id: "supported-networks",
        title: "Supported Networks & Assets",
        content: `Jumpa operates natively across the world's most performant blockchain ecosystems while providing direct settlement in Nigerian Naira (NGN):\n\n- **Stellar Network (XLM & USDC):** Ultra-fast, institutional-grade payment settlement with sub-cent execution.\n- **Solana Network (SOL, USDC, USDT):** High-throughput decentralized finance and micro-transactions.\n- **Base & Ethereum (ETH, USDC, USDT):** Seamless EVM liquidity and smart contract access.\n- **Tron Network (TRX & USDT):** Widespread stablecoin transfer liquidity.\n- **Fiat Banking (NGN):** Dedicated virtual account numbers and instant NIBSS/bank transfer rails.`,
      },
      {
        id: "who-is-jumpa-for",
        title: "Who Jumpa is Built For",
        content: `Whether you are a freelancer earning in stablecoins, a trader moving funds across chains, or an everyday saver protecting purchasing power against inflation, Jumpa delivers:\n\n1. **Remote Workers & Freelancers:** Receive client payments in USDC/USDT and cash out to any Nigerian bank immediately at live market rates.\n2. **Everyday Savers:** Lock funds in high-yield automated dollar savings vaults that accrue daily compound interest.\n3. **DeFi Users:** Bridge and swap assets across Solana, Base, and Stellar in seconds without juggling separate browser extensions.\n4. **Everyday Spenders:** Buy airtime and mobile data or pay utility bills directly from your crypto or fiat balance.`,
        // callout: {
        //   type: "note",
        //   title: "Direct Rails Guarantee",
        //   text: "Jumpa operates its own direct liquidity channels and bank settlement routers. There are no middlemen, no peer-to-peer wait times, and no chargeback risks.",
        // },
      },
    ],
  },
  quickstart: {
    id: "quickstart",
    category: "Getting Started",
    categoryId: "getting-started",
    title: "Quickstart Guide",
    description: "Create your account, initialize your multi-chain smart wallet, and execute your first transaction in under 2 minutes.",
    lastUpdated: "November 2026",
    sections: [
      {
        id: "step-1-signup",
        title: "Step 1: Sign Up & Verification",
        content: `Getting started on the Jumpa web app takes less than 60 seconds. You can create an account using your email address or Google account:\n\n1. Visit [usejumpa.com](https://usejumpa.com) and click [Get Started](/sign-up).\n2. Enter your email address (and an optional referral code) or click **Continue with Google**.\n3. Check your inbox for your 6-digit one-time verification passcode and enter it on screen to confirm your email.`,
      },
      {
        id: "step-2-password-tag",
        title: "Step 2: Password & Unique @Tag",
        content: `After verifying your email:\n\n1. **Set your Password:** Create a strong, secure password. You will need this password to unlock your wallet after periods of inactivity.\n2. **Choose your @Tag:** Choose your unique Jumpa handle (e.g. \`@john\`). Your tag allows other Jumpa users to send funds to you instantly.`,
        callout: {
          type: "tip",
          title: "Instant P2P Transfers",
          text: "Your Jumpa @Tag is universal across all supported currencies. Sending money to another @Tag settles instantly.",
        },
      },
      {
        id: "step-3-pin",
        title: "Step 3: Setting Your 4-Digit Security PIN",
        content: `Every outbound transaction such as bank withdrawals, crypto transfers, airtime purchases, and savings plan creation requires your personal **4-Digit Security PIN**.\n\n1. Choose a memorable 4-digit PIN.\n2. Confirm your PIN on the confirmation screen.\n\nYour PIN acts as your private digital signature. It is securely stored and never exposed to anyone. No transaction can ever leave your wallet without your manual PIN entry.`,
        callout: {
          type: "important",
          title: "Protect Your PIN",
          text: "Jumpa staff will never ask for your 4-digit PIN or your 12-word seed phrase. Never share your credentials with anyone.",
        },
      },
      {
        id: "step-4-wallet",
        title: "Step 4: Non-Custodial Multi-Chain Wallet Generation",
        content: `Once your PIN is set, Jumpa automatically initializes your **deterministic multi-chain smart wallet** addresses for you.\n\nYou can view and backup your seed phrase at any time in **Profile → Settings → Export Seed Phrase**.`,
      },
      {
        id: "step-5-first-tx",
        title: "Step 5: Executing Your First Transaction",
        content: `With your account active, Jumpa puts the entire financial universe at your fingertips. You can do **everything directly inside the AI Chat**, or use traditional visual menus:\n\n- **Do Everything in the AI Chat (Recommended):** Click the **Chat** tab to converse directly with Jumpa just like speaking with a private banker. You can:\n- **Cash out to any bank:** *'Send ₦15,000 to my Zenith account'* or *'Withdraw 40 USDC to my OPay'*.\n- **Deposit Naira:** *'How do I fund my account?'* to instantly pull up your dedicated virtual account details.\n- **Swap & Bridge tokens:** *'Swap 20 USDC for SOL'* or *'Bridge $30 from Solana to Base'*.\n- **Automated Dollar Savings:** *'Create a vacation savings goal for $500'* or *'Deposit $20 into my savings vault'*.\n- **Airtime & Mobile Data:** *'Buy ₦1,000 MTN airtime for 08012345678'* or *'Recharge Airtel data'*.\n- **Send to Friends (@Tag):** *'Send 10 USDC to @alex'* or *'Transfer ₦5,000 to @mary'* with zero fees.\n- **Check live exchange rates:** *'What is the USDC rate today?'* or *'Show Stellar rates'*.\n- **Check balances & net worth:** *'What is my total portfolio balance?'* or *'How much Naira do I have?'*.\n- **Track Spending & Insights:** *'How much did I spend this week?'* or *'Show my recent transactions'*.\n- **Scan Invoices & QR Codes:** Upload an image of an invoice, receipt, or QR code and ask Jumpa to analyze or pay it.\n- **Customer Support & Disputes:** *'Track my pending withdrawal'* or *'I need help with my last transaction'*.\n- **Instant PIN Confirmation:** The AI prepares an interactive confirmation card with exact amounts, beneficiary name, and fees; simply enter your 4-digit PIN to authorize.\n\n **Manual Visual Menus:** If you prefer point-and-click buttons, you can navigate using dedicated tabs:\n- **Deposit Naira:** Tap **Receive → Bank Transfer** to view your dedicated virtual account number.\n- **Receive Crypto:** Tap **Receive → Crypto** and choose your network (Stellar, Solana, Base, Tron) to view your public address and QR code.\n- **Send to Bank:** Tap **Send → Bank Account**, select your bank, enter your 10-digit account number, and confirm with your PIN.\n- **Send to @Tag:** Tap **Send → Jumpa Tag** for zero-fee, instant transfers to any friend.`,
      },
    ],
  },
  "core-features": {
    id: "core-features",
    category: "Getting Started",
    categoryId: "getting-started",
    title: "Core Features",
    description: "A comprehensive breakdown of Jumpa's banking, liquidity, cross-chain, and savings products.",
    lastUpdated: "November 2026",
    sections: [
      {
        id: "chat-banking",
        title: "1. Conversational AI Chat Banking (Do Everything in Chat)",
        content: `Jumpa's flagship interface is an intelligent financial AI that lets you manage your entire financial life through natural human conversation. You never need to hunt through menus or complex settings—virtually every feature in Jumpa can be completed right inside the chat:\n\n- **Instant Bank Cash-Outs (Offramp):** Cash out to 200+ Nigerian banks in seconds by simply chatting. Say *'Send ₦20,000 to 0123456789 GTBank'* or *'Withdraw 50 USDC to my OPay'*. The AI automatically looks up the bank, verifies the beneficiary name in real time, locks in a live rate, and presents an interactive verification card.\n- **Direct Naira Deposits (Onramp):** Ask *'How do I fund my account?'* or *'Deposit ₦50,000'*. The AI instantly displays your dedicated virtual account number and bank details for 1-tap transfer.\n- **Cross-Chain Swaps & Bridges:** Move assets seamlessly without leaving the chat. Say *'Swap 25 USDC for SOL'* or *'Bridge $40 from Solana to Base'*. The AI handles route selection, slippage checks, and network gas sponsorship.\n- **Automated Dollar Savings:** Build wealth and hedge currency risk conversationally. Say *'Create a 90-day savings goal for $500'* or *'Put $30 into my emergency vault'*. You can also ask *'How much interest have I earned in savings?'* to get an instant yield breakdown.\n- **Airtime, Data & Utility Bills:** Recharge phones or pay utility bills on demand. Say *'Buy ₦2,000 MTN airtime for 08012345678'* or *'Recharge Airtel 10GB data'*. The AI completes the purchase with zero extra convenience fees.\n- **Zero-Fee Peer-to-Peer (@Tag) Transfers:** Transfer funds to friends and family in seconds. Say *'Send 15 USDC to @chidi'* or *'Pay ₦10,000 to @amaka'*. The AI verifies the handle and avatar before confirming.\n- **Live Exchange Rates & Currency Inquiries:** Ask *'What is the current USDC to NGN rate?'*, *'How much is 100 USDC in Naira today?'*, or *'Show live crypto spreads'* to get real-time institutional rate quotes.\n- **Portfolio Balances & Financial Insights:** Ask *'What is my total portfolio balance?'*, *'How much do I have in Stellar USDC?'*, or *'How much did I spend on airtime this month?'* for clear financial tracking.\n- **Multi-Modal Receipt & Invoice Scanning:** Upload an image or screenshot of a bill, paper receipt, or payment QR code and say *'Pay this invoice'*. The vision AI parses the account number, amount, and reference automatically.\n- **Instant Support & Transaction Tracking:** Ask *'What is the status of my withdrawal #tx-1234?'* or *'I need help with my last payment'*. The AI checks settlement rail logs and can assist in opening a support ticket.\n- **Secure 4-Digit PIN Authorization:** Security is strictly non-negotiable. The AI cannot move funds unilaterally. For every outgoing transaction, the AI generates an interactive confirmation card displaying exact amounts, beneficiary details, and fees; you authorize it by entering your secret 4-digit PIN.`,
        callout: {
          type: "tip",
          title: "All-in-One Conversational Banking",
          text: "Whether you're cashing out to a bank, buying airtime, swapping across chains, saving in dollars, or scanning an invoice, you can do it all in chat without ever leaving the conversation.",
        },
      },
      {
        id: "direct-bank-settlement",
        title: "2. Direct Bank Settlement (Onramp & Offramp)",
        content: `Jumpa provides institutional-grade direct onramp and offramp rails connecting Nigerian banks with digital stablecoins (USDC and USDT):\n\n- **Instant Bank Withdrawals (Offramp):** Cash out crypto to any verified account across 200+ Nigerian commercial and microfinance banks (Access, GTBank, Zenith, OPay, PalmPay, Kuda, etc.) in under 90 seconds.\n- **Instant Naira Deposits (Onramp):** Send Naira from any banking app to your dedicated Jumpa virtual account, and your balance is instantly credited in crypto or digital Naira at live market rates.\n- **Zero P2P Risk:** Transactions are executed directly against Jumpa's automated liquidity engine, eliminating buyer/seller disputes, fake alerts, and delayed bank confirmations.`,
      },
      {
        id: "swaps-and-bridges",
        title: "3. Cross-Chain Swaps & Bridges",
        content: `Move value seamlessly across chains without leaving the Jumpa app:\n\n- **Instant Swaps:** Swap between USDC, USDT, XLM, SOL, and ETH at competitive rates with minimal slippage.\n- **Cross-Chain Bridge:** Move assets directly between Solana, Base, Stellar, and Tron using Jumpa's high-speed cross-chain relayers.\n- **Zero Gas Obstacles:** Jumpa sponsors the network gas fees required for execution, ensuring you never need to purchase native gas tokens just to swap or bridge.`,
      },
      {
        id: "automated-savings",
        title: "4. High-Yield Automated Savings Vaults",
        content: `Hedge against currency devaluation and build wealth with automated dollar savings:\n\n- **Target & Flexible Plans:** Create goal-oriented savings plans (e.g. 'Vacation', 'Emergency Fund', 'Rent') or keep flexible withdraw-anytime balances.\n- **Daily Compound Yield:** Earn competitive daily compound interest calculated and credited automatically to your vault.\n- **Auto-Debit Automation:** Set recurring weekly or monthly top-ups directly from your Jumpa balance.`,
      },
      {
        id: "bills-airtime",
        title: "5. Utility Bills & Airtime",
        content: `Pay for daily essentials directly from your digital wallet:\n\n- **Instant Airtime & Mobile Data:** Recharge MTN, Airtel, Glo, and 9mobile numbers with a single chat command.\n- **Zero Convenience Surcharges:** Enjoy discounted rates and zero extra fees on all bill payments.\n- **Automated Receipts:** Every bill payment generates an instant downloadable PDF receipt for your records.`,
      },
      {
        id: "p2p-tag-transfers",
        title: "6. Zero-Fee Peer-to-Peer (@Tag) Transfers",
        content: `Send and receive money with friends and family anywhere using Jumpa tags:\n\n- **Zero Transaction Fees:** Transfers between \`@tags\` are 100% free.\n- **Instant Settlement:** Money arrives in the recipient's balance immediately.\n- **Universal Support:** Works for Naira, USDC, and all supported tokens.`,
      },
    ],
  },
  "settlement-engine": {
    id: "settlement-engine",
    category: "Architecture",
    categoryId: "architecture",
    title: "Direct Settlement Engine",
    description: "How Jumpa connects decentralized crypto liquidity with Nigeria's instant banking network in under 90 seconds.",
    lastUpdated: "November 2026",
    sections: [
      {
        id: "what-is-settlement",
        title: "The Problem with Traditional P2P",
        content: `If you have ever tried to convert crypto to cash on conventional exchanges, you know how frustrating Peer-to-Peer (P2P) trading can be:\n\n- **Long Escrow Delays:** You have to wait for an unknown stranger online to send you money, check their banking app, and manually release escrow.\n- **Risk of Frozen Bank Accounts:** If a counterparty sends funds using an account associated with suspicious activities, Nigerian commercial banks can freeze your bank account without warning.\n- **Fake Payment Alerts & Disputes:** Scammers routinely use edited SMS receipts or fraudulent chargebacks to steal funds.\n\nJumpa completely eliminates P2P trading. Instead of matching you with random individuals, Jumpa operates an **Automated Direct Settlement Engine** that interfaces straight into Nigerian interbank payment switches.`,
        callout: {
          type: "tip",
          title: "Zero Counterparty Risk",
          text: "On Jumpa, you are never trading with random individuals online. Jumpa serves as your direct liquidity partner with automated bank transfers.",
        },
      },
      {
        id: "how-cashout-works",
        title: "How an Instant Bank Cash-Out Works (Step-by-Step)",
        content: `When you request a bank cash-out on Jumpa, the process is fast and seamless:\n\n1. **Real-Time Account Name Verification:** Enter your 10-digit Nigerian bank account number and select your bank. Jumpa instantly checks the banking directory and displays the registered account name so you can verify the recipient before sending.\n2. **Transparent Quote & PIN Approval:** Jumpa locks in a guaranteed live exchange rate with no hidden fees. You confirm the transfer using your secret 4-digit PIN.\n3. **Instant Automated Settlement:** Jumpa's settlement rails automatically verify the transaction and immediately dispatch an instant bank transfer directly to your account.\n4. **Fast Bank Credit:** Funds reflect in your Nigerian bank account within 30 to 90 seconds, and a downloadable receipt is generated for your records.`,
      },
      {
        id: "supported-banks",
        title: "Supported Financial Institutions",
        content: `Jumpa's settlement engine is integrated with every licensed financial institution in Nigeria:\n\n- **Tier-1 Commercial Banks:** Access Bank, GTBank, Zenith Bank, First Bank of Nigeria, United Bank for Africa (UBA).\n- **National Commercial Banks:** Fidelity Bank, Stanbic IBTC, FCMB, Sterling Bank, Union Bank, Wema Bank, Ecobank.\n- **Leading Digital Banks & MFBs:** OPay, PalmPay, Kuda Bank, Moniepoint MFB, VBank, FairMoney, Carbon.\n\nOver 200+ commercial banks, merchant banks, and licensed microfinance institutions are reachable instantly 24/7, 365 days a year.`,
        table: {
          headers: ["Feature", "Traditional P2P", "Jumpa Direct Settlement"],
          rows: [
            ["Counterparty", "Unknown individual or stranger", "Jumpa Direct Institutional Rails"],
            ["Average Settlement Time", "15 to 45 minutes", "30 to 90 seconds"],
            ["Bank Account Safety", "High risk of flag or freeze from dirty funds", "100% clean institutional settlement"],
            ["Price Slippage", "Ad-hoc prices with hidden seller markups", "Live institutional market rates"],
            ["Weekend / Holiday Availability", "Depends on seller availability", "24/7/365 Fully Automated"],
          ],
        },
      },
    ],
  },
  "gas-abstraction": {
    id: "gas-abstraction",
    category: "Architecture",
    categoryId: "architecture",
    title: "Gas Abstraction & Relaying",
    description: "Why you never have to worry about buying network gas tokens like SOL or XLM on Jumpa.",
    lastUpdated: "November 2026",
    sections: [
      {
        id: "the-gas-problem",
        title: "The 'Gas Fee' Nightmare Explained",
        content: `In the traditional cryptocurrency world, every blockchain requires a specific native currency to pay for network processing fees (called **Gas**):\n\n- If you hold **USDC on Stellar**, you need **XLM** to pay network fees.\n- If you hold **USDC on Solana**, you need **SOL** to pay network fees.\n- If you hold **USDT on Base**, you need **ETH** to pay network fees.\n\nThis creates a major roadblock for everyday people. Imagine having $100 in USDC in your wallet, but being completely unable to send $20 to a friend because your wallet has $0.00 in native gas tokens! To fix it, you would normally have to find an exchange, purchase the gas coin, wait for confirmations, and transfer it over. Most people simply give up.`,
        callout: {
          type: "note",
          title: "The Gas Barrier",
          text: "Gas fees are the number one reason beginners abandon crypto wallets. Jumpa removes this barrier entirely.",
        },
      },
      {
        id: "how-jumpa-solves-it",
        title: "How Jumpa's Gas Relaying Works",
        content: `Jumpa implements **Complete Gas Abstraction**. This means you only ever need to hold the asset you want to spend (such as USDC, USDT, or Naira), and Jumpa takes care of the network gas fees behind the scenes:\n\n- **Automatic Network Fee Sponsorship:** Across supported chains like Stellar, Solana, and Base, Jumpa covers the on-chain network fee on your behalf.\n- **Spend Only What You Have:** You never have to go out of your way to purchase or hold volatile secondary tokens like SOL, ETH, or XLM just to send or withdraw your dollars or Naira.\n- **Predictable, Transparent Pricing:** When transaction fees apply, they are clearly quoted in the token you are already using (such as a fraction of a cent in USDC) rather than forcing you to acquire separate blockchain gas tokens.`,
      },
      {
        id: "stellar-activation",
        title: "Stellar Account Activation & USDC Trustlines",
        content: `The Stellar network has two unique on-chain requirements that can easily confuse beginners:\n\n1. **Account Activation (Base Reserve):** A new Stellar address does not exist on the public ledger until it is funded with a minimum starting reserve of at least 1 XLM.\n2. **USDC Trustlines:** To protect users from receiving spam tokens, Stellar requires an address to explicitly open a 'trustline' before it can receive tokens like Circle USDC.\n\n**How Jumpa Handles It Automatically:**\nJumpa completely automates this process for you. When your Jumpa Stellar wallet is initialized, Jumpa's platform sponsor automatically funds the 1.6 XLM base reserve to activate your account on-chain and establishes the official Circle USDC trustline behind the scenes.\n\nYou never have to purchase XLM or configure blockchain settings—your Stellar address is active and ready to receive USDC immediately.\n\n*(Note: If you withdraw funds from Jumpa to a friend's external Stellar wallet, their external address must already be activated with at least 1 XLM).*`,
        callout: {
          type: "tip",
          title: "Zero Setup Friction",
          text: "Jumpa covers the Stellar activation fee and trustline configuration automatically, so you can receive USDC instantly with zero prior setup.",
        },
      },
      {
        id: "benefits-for-users",
        title: "What This Means For You",
        content: `Because of gas abstraction, using Jumpa feels just like using a modern digital banking app:\n\n1. **Zero Stuck Funds:** You will never be unable to withdraw or move your money because of a missing gas token.\n2. **No Extra Swaps:** You don't need to waste money or time buying tiny amounts of SOL, ETH, or XLM just to perform a transfer.\n3. **One-Tap Ease:** You confirm the transfer with your 4-digit PIN, and Jumpa takes care of the technical blockchain mechanics instantly.`,
      },
    ],
  },
  "virtual-accounts": {
    id: "virtual-accounts",
    category: "Architecture",
    categoryId: "architecture",
    title: "Dedicated Virtual Accounts",
    description: "Your personalized Nigerian bank account number for instant, automated wallet deposits.",
    lastUpdated: "November 2026",
    sections: [
      {
        id: "what-is-a-virtual-account",
        title: "What is a Dedicated Virtual Account?",
        content: `When you create an account on Jumpa, you are provisioned with a **Personalized Dedicated Virtual Account Number** issued in your verified legal name through licensed Nigerian banking partners.\n\nThis account functions exactly like an ordinary bank account at GTBank, Access, or Zenith, but it is permanently attached to your personal Jumpa wallet.`,
        callout: {
          type: "tip",
          title: "Always Active & Permanent",
          text: "Your dedicated virtual account number belongs to you permanently. You can save it as a beneficiary in your regular banking app for quick top-ups anytime.",
        },
      },
      {
        id: "how-to-fund",
        title: "How to Deposit Money (Step-by-Step)",
        content: `Funding your Jumpa account with Naira is as simple as sending money to a friend:\n\n1. **View Your Details:** In the Jumpa web app, tap **Receive → Bank Transfer** to see your assigned bank name, 10-digit account number, and your name.\n2. **Make a Transfer:** Open any Nigerian banking app (or use your bank's USSD code) and make a standard transfer to your Jumpa account details.\n3. **Instant Automated Credit:** Jumpa's real-time webhook infrastructure immediately detects the incoming transfer from the interbank network.\n4. **Balance Updated in Seconds:** The funds are automatically credited to your Jumpa wallet at the current live rate with zero manual confirmation required.`,
      },
      {
        id: "virtual-account-benefits",
        title: "Key Advantages",
        content: `Jumpa's virtual account architecture provides distinct advantages over conventional funding methods:\n\n- **No Crypto Complexity:** You don't need to navigate hex addresses, network chains, or QR codes just to fund your account with Naira.\n- **Instant Automated Reconciliation:** Every transaction is tied specifically to your unique account number, eliminating manual payment proofs, delayed confirmations, or misrouted deposits.\n- **Bank-Grade Reliability:** Powered by Nigeria's Central Bank-licensed clearing switches, ensuring 99.9% uptime and immediate payment notifications.`,
      },
    ],
  },
  "security-features": {
    id: "security-features",
    category: "Security & Safeguards",
    categoryId: "security",
    title: "Security & Privacy Safeguards",
    description: "A non-technical summary of how Jumpa protects your funds, personal identity, and transactions.",
    lastUpdated: "November 2026",
    sections: [
      {
        id: "core-protection",
        title: "Your 4-Digit Security PIN (Your Digital Signature)",
        content: `Every outward financial action on Jumpa—withdrawing Naira to your bank, sending crypto to a friend, creating a savings vault, or purchasing airtime—requires your secret **4-Digit Security PIN**.\n\n- **Zero Unilateral Transfers:** No funds can leave your wallet without your manual PIN entry.\n- **AI Human-in-the-Loop:** Even when you ask Jumpa's conversational AI assistant to send money or make a transfer, the AI cannot move funds on its own. It prepares an interactive confirmation card, and only your physical PIN unlocks the transaction.\n- **Anti-Brute Force Protection:** Repeated incorrect PIN entries automatically lock transaction capabilities to prevent unauthorized guessing.`,
        callout: {
          type: "tip",
          title: "Keep Your PIN Secret",
          text: "Never share your 4-digit PIN with anyone. Jumpa staff will never ask for your PIN, password, or 12-word seed phrase.",
        },
      },
      {
        id: "bank-grade-encryption",
        title: "Bank-Grade Key & Data Encryption",
        content: `Jumpa uses the same authenticated cryptographic encryption standards trusted by leading international banks and payment networks:\n\n- **Zero-Plaintext Storage:** Your 12-word seed phrase and private keys are never stored as raw plain text. All sensitive data is encrypted using high-grade standards before being securely stored.\n- **Strict Separation of Privileges:** No single system or Jumpa employee can access your unencrypted seed phrase or initiate transactions on your behalf.\n- **End-to-End Transport Security:** Every interaction between your browser and Jumpa is protected with modern HTTPS/TLS encryption to prevent eavesdropping or interception.`,
      },
      {
        id: "conversational-privacy",
        title: "Conversational Privacy Safeguards",
        content: `When you interact with Jumpa's AI assistant, your privacy is safeguarded by design:\n\n- **No Key Access:** The AI engine has zero access to your private keys or cryptographic signing credentials.\n- **Strict Confidentiality:** Your chat history, account balances, and transaction records are private to your session and are never sold or used to train public machine learning models.`,
      },
      {
        id: "data-masking",
        title: "Automated Data Masking & PII Protection",
        content: `To safeguard your Personally Identifiable Information (PII) against snooping and shoulder-surfing:\n\n- **Masked Account Numbers:** Sensitive bank account numbers and payment details are masked (e.g. \`******4321\`) on screen so bystanders cannot copy your financial details.\n- **Protected Payment Credentials:** Authorization tokens and private credentials are never displayed or retained in readable form.\n- **Automatic Inactivity Timeouts:** If you leave your device unattended, your active session automatically locks to protect against unauthorized access.`,
        table: {
          headers: ["Security Layer", "How It Protects You", "Your Responsibility"],
          rows: [
            ["4-Digit Security PIN", "Prevents unauthorized withdrawals and actions", "Keep your PIN secret and unique"],
            ["Bank-Grade Encryption", "Guarantees keys and phrases are never readable in plain text", "Safely store your 12-word seed phrase offline"],
            ["AI Human-in-the-Loop", "Ensures the AI cannot move funds without your approval", "Always review confirmation cards before entering PIN"],
            ["Automated PII Masking", "Shields account numbers from shoulder-surfing", "Never display sensitive credentials in public spaces"],
            ["Session Timeouts", "Locks your session if you step away from your device", "Log out when using shared or public computers"],
          ],
        },
      },
    ],
  },
  "self-custody": {
    id: "self-custody",
    category: "Security & Safeguards",
    categoryId: "security",
    title: "Self-Custody Guarantee",
    description: "Why Jumpa cannot freeze or access your funds without your authorized signature.",
    lastUpdated: "November 2026",
    sections: [
      {
        id: "not-your-keys",
        title: "The Golden Rule: Not Your Keys, Not Your Coins",
        content: `When you leave your money on a centralized exchange, you do not actually own cryptocurrency—you own an IOU on the exchange's spreadsheet. If the exchange experiences financial trouble, regulatory freezes, or policy changes, they can lock your account and prevent you from withdrawing your own money.\n\nJumpa was built on the principle of **Genuine Self-Custody**. You hold the cryptographic keys to your wallet. Jumpa provides the intelligent conversational interface, direct fiat banking rails, and gas abstraction, but **you remain the sole owner of your assets**.`,
        callout: {
          type: "important",
          title: "Jumpa Cannot Freeze Your Wallet",
          text: "Because you own the underlying cryptographic seed phrase, Jumpa cannot confiscate, lock, or freeze your blockchain funds.",
        },
      },
      {
        id: "exporting-phrase",
        title: "How to Export Your 12-Word Seed Phrase",
        content: `You can view and backup your private 12-word recovery phrase at any time:\n\n1. Log in to your account at [usejumpa.com](https://usejumpa.com).\n2. Navigate to **Profile → Settings → Export Seed Phrase**.\n3. Enter your secret 4-digit PIN to authenticate.\n4. Your 12-word recovery seed phrase will be displayed on screen.\n\nWrite down your 12 words in sequential order and store them in a secure, offline location (such as on paper in a locked safe). Never take a screenshot or save them in an unencrypted email or cloud note.`,
      },
      {
        id: "the-guarantee",
        title: "The Jumpa Self-Custody Pledge",
        content: `Our commitment to you as a Jumpa user:\n\n- **Zero Unilateral Transfers:** We can never move, spend, or transfer your crypto assets without your explicit PIN authorization.\n- **True Financial Sovereignty:** You have the absolute right to take your 12 words and migrate to any other wallet on Earth at any time.\n- **Direct Bank Settlement on Your Terms:** Whether you want to hold your stablecoins long-term to beat inflation or cash out to your Nigerian bank account in 60 seconds, the choice is always yours.`,
        table: {
          headers: ["Attribute", "Centralized Exchanges (CEX)", "Jumpa Smart Neo-Bank"],
          rows: [
            ["Asset Custody", "Exchange holds all keys (Custodial)", "You hold the 12-word seed phrase (Self-Custodial)"],
            ["Withdrawal Freezes", "Common during market volatility or reviews", "Impossible on-chain: you own the keys"],
            ["Bank Settlement", "P2P delays with fraud and frozen account risks", "Direct instant institutional bank transfers in <90s"],
            ["Portability", "Locked within the exchange ecosystem", "Universal 12 words: import into external wallets anytime"],
          ],
        },
      },
    ],
  },
  "help-support": {
    id: "help-support",
    category: "Customer Support",
    categoryId: "support",
    title: "Help, Support & Inquiries",
    description: "How to open support tickets, resolve transaction questions in real time, and access our FAQs.",
    lastUpdated: "November 2026",
    sections: [
      {
        id: "accessing-support",
        title: "How to Access Customer Support",
        content: `Jumpa provides dedicated customer support directly inside the web application at [usejumpa.com/support](/support):\n\n- **Live In-App Chat:** Start a conversation with a Jumpa support specialist in real time.\n- **Ticket History & Threads:** View all past inquiries, updates, and agent responses in one place under **Support Messages**.\n- **Instant AI Escalation:** You can also ask Jumpa's conversational AI assistant in the main chat (*"I need help with my last withdrawal"* or *"Open a support ticket"*), and the assistant will guide you directly to the support flow.`,
        callout: {
          type: "tip",
          title: "Direct Support Access",
          text: "You can reach customer support at any time by navigating to Help & Support in the main menu or directly at /support.",
        },
      },
      {
        id: "transaction-linked-disputes",
        title: "1-Tap Transaction-Linked Support",
        content: `If you ever have a question about a specific deposit, bank cash-out, cross-chain swap, or airtime recharge, you don't need to copy-paste bank reference numbers or write down complex codes:\n\n1. Open your **Transaction History** in the Jumpa web app.\n2. Tap the specific transaction you need help with.\n3. Click **Get Help** or **Open Dispute**.\n4. A dedicated support conversation is instantly opened with your transaction details, amounts, and bank reference pre-attached.\n\nOur support team immediately sees the exact transaction details, allowing us to resolve interbank delays or verify payouts in minutes.`,
      },
      {
        id: "faqs-knowledge-base",
        title: "Built-In FAQs & Self-Service",
        content: `For fast answers to common questions without waiting for an agent, visit the **FAQs** tab in the support hub:\n\n- **Withdrawals & Bank Payouts:** Average processing times, supported Nigerian banks, and weekend bank transfer behavior.\n- **Deposits & Virtual Accounts:** How to fund your account, NIP clearing speeds, and account limits.\n- **Account & Security:** What to do if you forgot your password or need to export your 12-word seed phrase.\n- **Crypto & Swaps:** Supported chains, gas fee coverage, and transaction confirmations.`,
      },
    ],
  },
};

/**
 * Calculates human reading time dynamically based on the industry-standard 
 * 200 words-per-minute (WPM) adult reading speed benchmark.
 */
export function calculateReadTime(sections: DocSection[]): string {
  const totalWords = sections
    .map((s) => `${s.title} ${s.content} ${s.callout?.text || ""}`)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = Math.max(1, Math.ceil(totalWords / 200));
  return `${minutes} min read`;
}

export function getDocPage(id: string): DocPage | undefined {
  const page = DOCS_PAGES[id];
  if (!page) return undefined;
  return {
    ...page,
    readTime: calculateReadTime(page.sections),
  };
}

export function getAllDocIds(): string[] {
  return Object.keys(DOCS_PAGES);
}

// Backward-compatibility alias
export const getAllDocSlugs = getAllDocIds;
