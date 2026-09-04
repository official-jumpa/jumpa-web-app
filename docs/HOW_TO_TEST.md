# How to Test: End-to-End Tranche 1 Testing Guide

This guide provides step-by-step instructions for testing Jumpa's core features on the Stellar Testnet, including seamless onboarding, automated wallet generation, AI-powered conversational swaps via Soroswap, and on-chain settlement.

---

## Quick Overview of the Testing Flow

```
1. Sign Up / Login (Email + OTP)
       ↓
2. Set 6-Digit Wallet PIN (Sovereign Key Derivation m/44'/148'/0')
       ↓
3. Home Dashboard (Unified Multi-Chain Balance & Bottom Nav)
       ↓
4. Open Chat (`/home/chat`)
       ↓
5. Fund Wallet via Friendbot ("Claim test tokens for my wallet")
       ↓
6. Conversational Swap ("Swap 10 stellar to usdc")
       ↓
7. Confirm Quote Card & Enter PIN
       ↓
8. On-Chain Settlement & Verified Transaction Receipt
```

---

## Step-by-Step Instructions

### Step 1: User Onboarding & Non-Custodial Wallet Creation
1. Navigate to **`http://localhost:3000`** in your browser.
2. Enter your email address to initiate sign-in / registration.
3. Check your email (or terminal logs if in development mode) for the One-Time Password (OTP) and enter the 6-digit code.
4. Jumpa automatically generates a BIP-39 mnemonic seed phrase in the background, abstracting away complex seed management.

---

### Step 2: Set Transaction PIN & Access Dashboard
1. Set a **6-digit transaction PIN** (e.g. `123456`)
2. Once confirmed, you will be redirected to the **Home Screen** (`/home`).
3. View your unified balance panel across supported chains (Stellar, Base, Solana).
4. Click the **Chat** icon in the bottom navigation bar to open the conversational interface.

---

### Step 3: Activate & Fund Your Stellar Testnet Account
> [!IMPORTANT]
> Unfunded Stellar testnet accounts do not exist on the ledger until funded with minimum reserve XLM.

1. In the chat interface, send either of the following messages:
   - *"Claim test tokens for my wallet"*
   - *"Fund my testnet wallet with XL from the faucet"*
2. The AI assistant will invoke the **Stellar Friendbot faucet** tool on your behalf to fund your wallet with **10,000 testnet XLM**.
3. Verify your live balance at any time by asking:
   - *"What's my Stellar balance?"*

---

### Step 4: Execute a Conversational Token Swap (Soroswap DEX)
1. Send a swap prompt in chat, for example:
   - *"Swap 10 XLM to USDC on testnet"* (or *"Swap 10 stellar to usdc"*)
2. **Interactive Quote Card:** The AI fetches a live quote from the **Soroswap DEX API** (`/quote`) and displays a structured card in the chat showing:
   - **You Pay:** `10 XLM`
   - **You Receive:** Expected USDC output
   - **Rate, Slippage, & Estimated Fee:** (`0.00001 XLM`)
   - **Protocol:** `Soroswap (soroswap)`
3. **Confirm the Transaction:**
   - Click the **Confirm** button on the Quote Card.
   - The **PIN Sheet modal** will appear from the bottom of the screen.
   - Enter your **6-digit wallet PIN**.
4. **Signing & On-Chain Broadcast:**
   - The server decrypts the mnemonic keypair using your PIN.
   - Soroswap constructs the unsigned transaction XDR envelope (`/quote/build`).
   - The transaction is signed with your Ed25519 secret key and submitted to the **Stellar Horizon Testnet**.
5. **Verified Receipt:**
   - A **Receipt Card** is rendered in the chat transcript with the confirmed transaction status, hash, and a clickable link to view the transaction on the **Stellar Expert Explorer**.

---

## Troubleshooting & Tips

- **Testnet Liquidity / Orderbook Depth:**  
  On the Stellar Testnet, orderbook liquidity can fluctuate. If a swap fails with an insufficient liquidity or `op_too_few_offers` error, try a smaller amount (e.g. `5 XLM` or `10 XLM`) and retry.
- **Account Not Found:**  
  If an operation fails stating the account does not exist, trigger the faucet first (*"Claim test tokens for my wallet"*).
- **Session & Wallet State:**  
  To test the fresh onboarding flow again, log out from settings or clear browser cookies / storage for `localhost:3000`.
