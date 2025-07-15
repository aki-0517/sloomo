# Devnet CLI Operation Guide

## Overview

This document explains how to directly operate the Sloomo Portfolio smart contract in the devnet environment from the terminal. Supports both USDC and SOL investments.

## Basic Information

### Contract Information
- **Program ID**: `EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC`
- **Network**: Solana Devnet
- **RPC Endpoint**: `https://api.devnet.solana.com`

### Required Tools
- Solana CLI
- Anchor CLI
- Node.js & yarn

## Environment Setup

### 1. Solana CLI Setup

```bash
# Switch to devnet
solana config set --url devnet

# Check wallet settings
solana config get

# Show current settings
Config File: ~/.config/solana/cli/config.yml
RPC URL: https://api.devnet.solana.com
WebSocket URL: wss://api.devnet.solana.com/
Keypair Path: ~/.config/solana/id.json
Commitment: confirmed
```

### 2. Prepare Wallet

```bash
# Create a new wallet (if needed)
solana-keygen new --outfile ~/.config/solana/id.json

# Check public key
solana address

# Check balance
solana balance

# Get devnet SOL
solana airdrop 5
```

### 3. Project Environment Setup

```bash
# Move to project directory
cd /path/to/sloomo/contract

# Install dependencies
yarn install

# Build contract
anchor build

# Check IDL generation
ls -la target/idl/sloomo_portfolio.json
```

## How to Call Main Functions

### 1. Initialize Portfolio

#### Run in TypeScript

```typescript
// scripts/initialize_portfolio.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";

async function initializePortfolio() {
  // Set provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // Generate Portfolio PDA
  const [portfolioPda] = await PublicKey.findProgramAddress(
    [Buffer.from("portfolio"), user.publicKey.toBuffer()],
    program.programId
  );

  // Set initial allocations
  const initialAllocations = [
    {
      mint: new PublicKey("So11111111111111111111111111111111111111112"), // WSOL
      symbol: "SOL",
      targetPercentage: 6000, // 60%
    },
    {
      mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), // devnet USDC
      symbol: "USDC",
      targetPercentage: 4000, // 40%
    },
  ];

  // Execute portfolio initialization
  const tx = await program.methods
    .initializePortfolio({ initialAllocations })
    .accounts({
      portfolio: portfolioPda,
      owner: user.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Portfolio initialization complete:", tx);
  console.log("Portfolio PDA:", portfolioPda.toString());
}

initializePortfolio().catch(console.error);
```

#### Run Command

```bash
# Run script
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
yarn run ts-node scripts/initialize_portfolio.ts
```

### 2. Token Deposit (USDC/SOL)

#### Run with Command Line Arguments

```bash
# USDC investment
yarn portfolio:deposit 100 USDC

# SOL investment
yarn portfolio:deposit 1 SOL

# Default (USDC)
yarn portfolio:deposit 100
```

#### Run in TypeScript

```typescript
// scripts/deposit_token.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

async function depositToken(amount?: number, tokenType: 'USDC' | 'SOL' = 'USDC') {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // Get Portfolio PDA
  const [portfolioPda] = await PublicKey.findProgramAddress(
    [Buffer.from("portfolio"), user.publicKey.toBuffer()],
    program.programId
  );

  if (tokenType === 'SOL') {
    await depositSol(program, user, portfolioPda, amount);
  } else {
    await depositUsdc(program, user, portfolioPda, amount);
  }
}

async function depositUsdc(program: any, user: any, portfolioPda: PublicKey, amount?: number) {
  // USDC settings
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const userUsdcAccount = await getAssociatedTokenAddress(usdcMint, user.publicKey);
  
  // Portfolio USDC vault PDA
  const [portfolioUsdcVault] = await PublicKey.findProgramAddress(
    [Buffer.from("vault"), portfolioPda.toBuffer(), usdcMint.toBuffer()],
    program.programId
  );

  // Set investment amount (if not specified, use half of balance)
  const userBalance = await program.provider.connection.getTokenAccountBalance(userUsdcAccount);
  const depositAmount = amount || Math.floor((userBalance.value.uiAmount || 0) * 0.5);
  const depositAmountLamports = Math.floor(depositAmount * 1_000_000);

  // Execute USDC deposit
  const tx = await program.methods
    .depositUsdc(new anchor.BN(depositAmountLamports))
    .accounts({
      portfolio: portfolioPda,
      userUsdcAccount,
      portfolioUsdcVault,
      usdcMint,
      owner: user.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("USDC deposit complete:", tx);
}

async function depositSol(program: any, user: any, portfolioPda: PublicKey, amount?: number) {
  // wrapped SOL (wSOL) mint address
  const wsolMint = new PublicKey("So11111111111111111111111111111111111111112");
  
  // Check SOL balance
  const userBalance = await program.provider.connection.getBalance(user.publicKey);
  const userBalanceSol = userBalance / LAMPORTS_PER_SOL;
  
  // Set investment amount (if not specified, use half of balance minus fee)
  const depositAmount = amount || Math.floor((userBalanceSol - 0.01) * 0.5 * 100) / 100;
  const depositAmountLamports = Math.floor(depositAmount * LAMPORTS_PER_SOL);

  // Get user's wSOL token account
  const userWsolAccount = await getAssociatedTokenAddress(wsolMint, user.publicKey);
  
  // Get portfolio's wSOL vault PDA
  const [portfolioWsolVault] = await PublicKey.findProgramAddress(
    [Buffer.from("vault"), portfolioPda.toBuffer(), wsolMint.toBuffer()],
    program.programId
  );

  // Execute SOL investment (use existing deposit_usdc method as wSOL)
  const tx = await program.methods
    .depositUsdc(new anchor.BN(depositAmountLamports))
    .accounts({
      portfolio: portfolioPda,
      userUsdcAccount: userWsolAccount,
      portfolioUsdcVault: portfolioWsolVault,
      usdcMint: wsolMint,
      owner: user.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("SOL deposit complete:", tx);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const amount = args[0] ? parseFloat(args[0]) : undefined;
  const tokenType = args[1]?.toUpperCase() as 'USDC' | 'SOL' | undefined;
  return { amount, tokenType: tokenType || 'USDC' };
}

// Execute
if (require.main === module) {
  const { amount, tokenType } = parseArgs();
  depositToken(amount, tokenType).catch(console.error);
}
```

### 3. Add/Edit Allocation

#### Run in TypeScript

```typescript
// scripts/add_allocation.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

async function addAllocation() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // Get Portfolio PDA
  const [portfolioPda] = await PublicKey.findProgramAddress(
    [Buffer.from("portfolio"), user.publicKey.toBuffer()],
    program.programId
  );

  // Add allocation
  const tx = await program.methods
    .addOrUpdateAllocation(
      new PublicKey("So11111111111111111111111111111111111111112"), // SOL
      "WSOL",
      3000 // 30%
    )
    .accounts({
      portfolio: portfolioPda,
      owner: user.publicKey,
    })
    .rpc();

  console.log("Allocation addition complete:", tx);
}

addAllocation().catch(console.error);
```

### 4. Execute Rebalance

#### Run in TypeScript

```typescript
// scripts/jupiter_rebalance.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

async function jupiterRebalance() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // Get Portfolio PDA
  const [portfolioPda] = await PublicKey.findProgramAddress(
    [Buffer.from("portfolio"), user.publicKey.toBuffer()],
    program.programId
  );

  // USDC settings
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const usdcTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    user.publicKey
  );

  // Set target allocations
  const targetAllocations = [
    {
      mint: new PublicKey("So11111111111111111111111111111111111111112"),
      targetPercentage: 7000, // 70%
    },
    {
      mint: usdcMint,
      targetPercentage: 3000, // 30%
    },
  ];

  // Execute rebalance
  const tx = await program.methods
    .realJupiterRebalance(targetAllocations, 50) // 0.5% slippage
    .accounts({
      portfolio: portfolioPda,
      owner: user.publicKey,
      usdcTokenAccount: usdcTokenAccount,
      usdcMint: usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Jupiter rebalance complete:", tx);
}

jupiterRebalance().catch(console.error);
```

### 4. Check Portfolio State

#### Run in TypeScript

```typescript
// scripts/check_portfolio.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

async function checkPortfolio() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // Get Portfolio PDA
  const [portfolioPda] = await PublicKey.findProgramAddress(
    [Buffer.from("portfolio"), user.publicKey.toBuffer()],
    program.programId
  );

  try {
    // Get portfolio data
    const portfolioData = await program.account.portfolio.fetch(portfolioPda);

    console.log("=== Portfolio Info ===");
    console.log("Owner:", portfolioData.owner.toString());
    console.log("Total Value:", portfolioData.totalValue.toString());
    console.log("Last Rebalance:", new Date(portfolioData.lastRebalance.toNumber() * 1000));
    console.log("Is Rebalancing:", portfolioData.isRebalancing);
    
    console.log("\n=== Allocation Info ===");
    portfolioData.allocations.forEach((allocation, index) => {
      console.log(`${index + 1}. ${allocation.symbol}`);
      console.log(`   Mint: ${allocation.mint.toString()}`);
      console.log(`   Current Amount: ${allocation.currentAmount.toString()}`);
      console.log(`   Target Ratio: ${allocation.targetPercentage / 100}%`);
      console.log(`   APY: ${allocation.apy / 100}%`);
      console.log("");
    });

    console.log("=== Performance History ===");
    console.log("History Count:", portfolioData.performanceHistory.length);
    
    if (portfolioData.performanceHistory.length > 0) {
      const latest = portfolioData.performanceHistory[portfolioData.performanceHistory.length - 1];
      console.log("Latest Record:");
      console.log(`  Time: ${new Date(latest.timestamp.toNumber() * 1000)}`);
      console.log(`  Value: ${latest.totalValue.toString()}`);
      console.log(`  Growth Rate: ${latest.growthRate / 100}%`);
    }

  } catch (error) {
    console.error("Portfolio not found:", error.message);
    console.log("Please run initialize_portfolio first");
  }
}

checkPortfolio().catch(console.error);
```

### 5. Check Balance

#### Check USDC Balance

```bash
# Check USDC balance and vault
yarn portfolio:check-usdc
```

#### Check SOL Balance

```bash
# Check SOL balance and wSOL vault
yarn portfolio:check-sol
```

#### Run in TypeScript

```typescript
// scripts/check_usdc.ts - Check USDC balance
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

async function checkUsdc() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // Get Portfolio PDA
  const [portfolioPda] = await PublicKey.findProgramAddress(
    [Buffer.from("portfolio"), user.publicKey.toBuffer()],
    program.programId
  );

  // USDC settings
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const userUsdcAccount = await getAssociatedTokenAddress(usdcMint, user.publicKey);
  
  // Check user USDC balance
  try {
    const userUsdcAccountInfo = await program.provider.connection.getTokenAccountBalance(userUsdcAccount);
    console.log("USDC balance:", userUsdcAccountInfo.value.uiAmount || 0, "USDC");
  } catch (error) {
    console.log("USDC account not found");
    console.log("Get USDC from devnet faucet: https://spl-token-faucet.com/");
  }
}

// scripts/check_sol.ts - Check SOL balance
import { LAMPORTS_PER_SOL, NATIVE_MINT } from "@solana/web3.js";

async function checkSol() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // Native SOL balance
  const solBalance = await program.provider.connection.getBalance(user.publicKey);
  const solBalanceFormatted = solBalance / LAMPORTS_PER_SOL;
  console.log("SOL balance:", solBalanceFormatted.toFixed(6), "SOL");

  // Check wSOL account
  const userWsolAccount = await getAssociatedTokenAddress(NATIVE_MINT, user.publicKey);
  try {
    const wsolAccountInfo = await program.provider.connection.getTokenAccountBalance(userWsolAccount);
    console.log("wSOL balance:", wsolAccountInfo.value.uiAmount || 0, "wSOL");
  } catch (error) {
    console.log("wSOL account not found (will be auto-created when investing SOL)");
  }

  if (solBalanceFormatted < 0.01) {
    console.log("SOL balance is low. Get more from https://faucet.solana.com/");
  }
}
```

## Batch Execution Scripts

### Add to package.json

```json
{
  "scripts": {
    "portfolio:init": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/initialize_portfolio.ts",
    "portfolio:deposit": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/deposit_token.ts",
    "portfolio:add-allocation": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/add_allocation.ts",
    "portfolio:rebalance": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/jupiter_rebalance.ts",
    "portfolio:check": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/check_portfolio.ts",
    "portfolio:check-usdc": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/check_usdc.ts",
    "portfolio:check-sol": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/check_sol.ts"
  }
}
```

### Example Execution

#### Preparation

```bash
# 1. Environment setup
cd /path/to/sloomo/contract
yarn install                # Install dependencies
anchor build                # Build contract

# 2. Solana CLI setup
solana config set --url devnet
solana airdrop 5            # Get devnet SOL

# 3. Get USDC (for USDC investment)
# Get devnet USDC at https://spl-token-faucet.com/
```

#### Basic Workflow

```bash
# 1. Initial check
solana balance               # Check SOL balance
solana address              # Check wallet address

# 2. Initialize portfolio
yarn portfolio:init

# 3. Check balance
yarn portfolio:check-sol    # Check SOL balance

# 4. Execute investment
yarn portfolio:deposit 1 SOL        # Invest 1 SOL

# 5. Check state
yarn portfolio:check                 # Check entire portfolio

# 6. Adjust allocation (if needed)
yarn portfolio:add-allocation

# 7. Execute rebalance
yarn portfolio:rebalance

# 8. Final state check
yarn portfolio:check
```

#### Debug/Check Commands

```bash
# Check overall status
yarn portfolio:check

# Check individual tokens
yarn portfolio:check-sol     # SOL/wSOL related

# Check basic info
solana balance               # Native SOL balance
solana address              # Wallet address
solana config get           # Check settings
```

#### Complete Test Scenario

```bash
# === Environment Preparation ===
cd /path/to/sloomo/contract
yarn install
anchor build
solana config set --url devnet
solana airdrop 5

# === Basic Function Test ===
# 1. Initialize portfolio
yarn portfolio:init

# 2. Initial state check
yarn portfolio:check
yarn portfolio:check-sol

# 3. SOL investment test
yarn portfolio:deposit 1 SOL
yarn portfolio:check-sol
yarn portfolio:check

# 6. Additional SOL investment test (various amounts)
yarn portfolio:deposit 0.5 SOL
yarn portfolio:check

# 7. Default investment test (no amount specified)
yarn portfolio:deposit  # Default is half of SOL balance invested
yarn portfolio:check

# === Error Handling Test ===
# Insufficient balance test
yarn portfolio:deposit 1000 SOL  # ✅ Should fail (insufficient balance)

# Invalid argument test  
yarn portfolio:deposit abc SOL   # ✅ Should fail (invalid amount)
yarn portfolio:deposit 1 ETH     # ✅ Should fail (invalid token)
yarn portfolio:deposit -5 SOL    # ✅ Should fail (negative amount)

# === Success Confirmation ===
yarn portfolio:check
solana balance  # Check remaining SOL
echo "🎉 All tests completed"

# === Expected Results ===
# - Portfolio total value: about 5.79 SOL
# - User balance: about 2.8 SOL
# - All error tests fail as expected
# - SOL investment works correctly
```

#### USDC Investment Test (Optional)

If you want to test with USDC:

```bash
# Get USDC (devnet faucet)
# Get USDC at https://spl-token-faucet.com/

# Check USDC balance
yarn portfolio:check-usdc

# USDC investment test
yarn portfolio:deposit 100 USDC
yarn portfolio:check-usdc
yarn portfolio:check

# Note: If you don't have USDC, rebalance will fail
# yarn portfolio:rebalance  # Error if no USDC account
```

## Direct Call with Anchor CLI

### 1. Using IDL

```bash
# Call method using IDL
anchor run initialize-portfolio

# Run custom script
anchor run invest --provider.cluster devnet

# Run tests
anchor test --skip-deploy --provider.cluster devnet
```

### 2. Raw Transaction

```bash
# Direct call using Solana CLI (advanced)
solana program invoke \
  --program-id EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC \
  --instruction-data <base58-encoded-data> \
  --account <account1> \
  --account <account2>
```

## Troubleshooting

### Common Errors

#### 1. Program Not Found
```bash
Error: Account EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC not found
```
**Solution:**
```bash
# Check if program exists
solana account EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC

# Redeploy
anchor deploy --provider.cluster devnet
```

#### 2. Insufficient Balance
```bash
Error: insufficient funds for transaction
```
**Solution:**
```bash
# Check SOL balance
solana balance

# Get SOL
solana airdrop 5

# Or use faucet.solana.com
```

#### 3. Account Does Not Exist
```bash
Error: Account does not exist or has no data
```
**Solution:**
```bash
# Check if Portfolio PDA is calculated correctly
# Run initialize_portfolio first
```

#### 4. Permission Error
```bash
Error: ConstraintHasOne
```
**Solution:**
```bash
# Check if using correct wallet
solana address

# Check wallet path
echo $ANCHOR_WALLET
```

#### 5. wSOL Account Error (when investing SOL)
```bash
Error: Account does not exist
```
**Solution:**
```bash
# Create wSOL token account
spl-token create-account So11111111111111111111111111111111111111112

# Or convert SOL to wSOL
spl-token wrap 1
```

#### 6. Script Execution Error
```bash
Error: Cannot find module
```
**Solution:**
```bash
# Reinstall dependencies
cd contract
yarn install

# Check TypeScript compilation
yarn run tsc --noEmit scripts/deposit_token.ts
```

#### 7. Program ID Error
```bash
Error: Program account does not exist
```
**Solution:**
```bash
# Check if program exists
solana account EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC

# Redeploy program
anchor build
anchor deploy --provider.cluster devnet
```

#### 8. USDC Faucet Access Issue
**Solution:**
```bash
# Alternative way to create USDC token
spl-token create-token --decimals 6
spl-token create-account <TOKEN_MINT>
spl-token mint <TOKEN_MINT> 1000

# Or use another faucet site
# https://faucet.quicknode.com/solana/devnet
```

### Debugging Methods

#### 1. Log Output

```bash
# Run with detailed logs
RUST_LOG=debug yarn portfolio:init

# Anchor logs
export ANCHOR_LOG=true
```

#### 2. State Check

```bash
# List program accounts
solana account EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC

# Details of specific account
solana account <PDA_ADDRESS> --output json
```

#### 3. Check Transaction

```bash
# Check transaction details
solana confirm <TRANSACTION_SIGNATURE>

# Check in Explorer
# https://explorer.solana.com/tx/<TRANSACTION_SIGNATURE>?cluster=devnet
```

## Security Notes

1. **Devnet Only**: This guide is for devnet only. Do not use on mainnet.
2. **Private Key Management**: Be careful managing private key files.
3. **For Testing**: Do not use with real assets.
4. **Jupiter Integration**: Actual swaps must be executed separately on the client side.
5. **SOL Investment**: SOL is processed as wrapped SOL (wSOL). You may need to create a wSOL token account.

## Additional Resources

- [Solana CLI Documentation](https://docs.solana.com/cli)
- [Anchor Documentation](https://project-serum.github.io/anchor/)
- [Solana Explorer (devnet)](https://explorer.solana.com/?cluster=devnet)
- [Jupiter API Documentation](https://docs.jup.ag/)

---

**Last updated**: December 2024  
**Version**: v0.1.1 - USDC/SOL investment supported