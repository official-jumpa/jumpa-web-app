# How to Test: End-to-End Tranche 1 & Tranche 2 Testing Guide

This guide provides step-by-step instructions for testing Jumpa's core features on the Stellar Testnet, including seamless onboarding, automated wallet generation, AI-powered conversational swaps via Soroswap, on-chain settlement, DeFindex yield savings, and Allbridge cross-chain bridging.

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
       ↓
9. DeFindex Yield Savings (Create Goal & Top-Up USDC from `/savings`)
       ↓
10. Allbridge Cross-Chain Bridge ("Bridge 25 USDC from Base to Stellar")
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
1. Set a **6-digit transaction PIN** (e.g. `123456`).
2. Confirm the PIN. Your mnemonic is encrypted with **AES-256-GCM** using a unique salt and IV.
3. Once confirmed, you will be redirected to the **Home Screen** (`/home`).
4. View your unified balance panel across supported chains (Stellar, Base, Solana).
5. Click the **Chat** icon in the bottom navigation bar to open the conversational interface.

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

### Step 4: Execute a Conversational Token Swap (Soroswap Router)
1. Send a swap prompt in chat, for example:
   - *"Swap 10 XLM to USDC on testnet"* (or *"Swap 10 stellar to usdc"*)
2. **Interactive Quote Card:** The AI queries the **Soroswap Router contract on-chain** via Soroban RPC (`router_get_amounts_out`) and displays a structured card in the chat showing:
   - **You Pay:** `10 XLM`
   - **You Receive:** Expected USDC output (derived from live pool reserves)
   - **Rate, Slippage, & Estimated Fee:** Dynamically calculated from Soroban RPC `minResourceFee` (e.g. `0.00144 XLM`, zero hardcoded values)
   - **Protocol:** `Soroswap Router`
3. **Confirm the Transaction:**
   - Click the **Confirm** button on the Quote Card.
   - The **PIN Sheet modal** will appear from the bottom of the screen.
   - Enter your **6-digit wallet PIN**.
4. **Signing & On-Chain Broadcast:**
   - The server verifies available balance and trustline prerequisites.
   - Decrypts the mnemonic keypair using your PIN.
   - Constructs the Soroban `invoke_host_function` smart contract transaction calling `swap_exact_tokens_for_tokens` on the Soroswap Router (`CCJUD55...`).
   - Simulates transaction auth and footprint via Soroban RPC, signs with your Ed25519 secret key, and submits to the Stellar network.
5. **Verified Receipt:**
   - A **Receipt Card** is rendered in the chat transcript with the confirmed transaction status, hash, and a clickable link to view the transaction on the **Stellar Expert Explorer**.

> **Standalone Swap UI:** You can also test swaps directly via the dedicated `/swap` page in the application, which shares the identical on-chain Soroswap Router pipeline.

---

### Step 5: Target Savings & DeFindex Yield Module (Tranche 2)
1. Navigate to the **Savings** dashboard (`/savings`) from the bottom navigation.
2. **Create a Savings Goal:**
   - Click **Create Target Goal** or **Lock Savings**.
   - Enter a title (e.g. *"Emergency Fund"*), target amount (e.g. `100`), and duration.
   - Jumpa creates the plan linked to the pre-configured DeFindex testnet vault pool.
3. **Automated USDC Top-Up:**
   - Open your created plan.
   - Click **Top Up**, enter an amount (e.g. `10 USDC`), and input your 6-digit wallet PIN.
   - Jumpa checks available USDC balance, ensures the USDC trustline, generates the deposit XDR with `defindexClient.deposit()`, signs it using your decrypted keypair, and broadcasts to the Stellar network via `defindexClient.send()`.
4. **Live Yield & Balance Tracking:**
   - The savings dashboard displays live underlying asset balances (`defindexClient.getBalance()`) and active Net APY (`defindexClient.getApy()`).

---

### Step 6: Cross-Chain Bridging via Allbridge Core (Tranche 2)
1. Navigate back to **Chat** (`/home/chat`).
2. Send a bridge request, for example:
   - *"Bridge 25 USDC from Base to Stellar"*
3. **Allbridge Quote Card:**
   - The AI assistant calls `bridge_tokens` using Allbridge Core's mathematical fee model:
     - **LP Fee:** `0.30%` (`0.075 USDC`)
     - **Relayer Gas Fee:** `0.15 USDC`
     - **Est. Settlement Time:** `2-4 minutes`
     - **Provider:** `Allbridge Core`
   - Displays the **Bridge Card** in the transcript showing:
     - **You Pay:** `25 USDC` on Base
     - **You Receive:** `24.775 USDC` on Stellar
     - **Rate, Fee & Est. Time**
4. **Unified Confirmation & Receipt:**
   - Click **Confirm** on the Bridge Card.
   - The **PIN Sheet drawer** slides up. Enter your 6-digit PIN.
   - Jumpa verifies the PIN, records the confirmed transaction, and renders a **Receipt Card** with Allbridge delivery stats and recipient Stellar account explorer link.

---

## Troubleshooting & Tips

- **Testnet Liquidity / Orderbook Depth:**  
  On the Stellar Testnet, orderbook liquidity can fluctuate. If a swap fails with an insufficient liquidity or `op_too_few_offers` error, try a smaller amount (e.g. `5 XLM` or `10 XLM`) and retry.
- **Account Not Found:**  
  If an operation fails stating the account does not exist, trigger the faucet first (*"Claim test tokens for my wallet"*).
- **Session & Wallet State:**  
  To test the fresh onboarding flow again, log out from settings or clear browser cookies / storage for `localhost:3000`.
