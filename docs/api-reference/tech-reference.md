# Solana React Native Stablecoin Portfolio dApp Guide

This guide covers how to interact with the Solana network in a React Native environment for yield-bearing stablecoin portfolio management, including making RPC requests, building and sending transactions, integrating Mobile Wallet Adapter, using Anchor programs, and Jupiter API integration.

---

## Table of Contents

- [Solana React Native dApp Guide](#solana-react-native-dapp-guide)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Making RPC Requests](#making-rpc-requests)
    - [Add Dependencies](#add-dependencies)
    - [Add Polyfills](#add-polyfills)
    - [Creating a Connection Client](#creating-a-connection-client)
    - [Usage Examples](#usage-examples)
    - [Next Steps](#next-steps)
  - [Building Transactions](#building-transactions)
    - [Add Dependencies](#add-dependencies-1)
    - [Add Polyfills](#add-polyfills-1)
    - [SOL Transfer Transaction Example](#sol-transfer-transaction-example)
    - [Versioned vs Legacy Transactions](#versioned-vs-legacy-transactions)
    - [Sending a Transaction](#sending-a-transaction)
    - [Next Steps](#next-steps-1)
  - [Using Mobile Wallet Adapter](#using-mobile-wallet-adapter)
    - [Add Dependencies](#add-dependencies-2)
    - [Establishing an MWA Session](#establishing-an-mwa-session)
    - [Connecting to a Wallet](#connecting-to-a-wallet)
    - [Authorization \& Reauthorization](#authorization--reauthorization)
    - [Deauthorizing a Wallet](#deauthorizing-a-wallet)
    - [Sign In with Solana (SIWS)](#sign-in-with-solana-siws)
    - [Signing and Sending Transactions](#signing-and-sending-transactions)
    - [Caching MWA Authorization](#caching-mwa-authorization)
  - [Anchor Integration Guide](#anchor-integration-guide)
    - [Add Dependencies](#add-dependencies-3)
    - [Create an Anchor Wallet](#create-an-anchor-wallet)
    - [Importing an Anchor Program](#importing-an-anchor-program)
    - [Signing Transactions with Anchor](#signing-transactions-with-anchor)
  - [Jupiter API Integration](#jupiter-api-integration)
    - [Add Jupiter Dependencies](#add-jupiter-dependencies)
    - [Jupiter Client Setup](#jupiter-client-setup)
    - [Stablecoin Swap Example](#stablecoin-swap-example)
    - [Portfolio Rebalancing with Jupiter](#portfolio-rebalancing-with-jupiter)

---

## Prerequisites

* React Native development environment set up for iOS/Android.
* Basic knowledge of JavaScript/TypeScript.
* Installed `@solana/web3.js`, React Native polyfills, and Mobile Wallet Adapter libraries.

---

## Making RPC Requests

A client interfaces with Solana by sending JSON RPC requests. The `@solana/web3.js` library provides the `Connection` class for this purpose.

### Add Dependencies

Install via Yarn or npm:

```bash
# Yarn
yarn add @solana/web3.js@1 react-native-get-random-values buffer

# npm
npm install @solana/web3.js@1 react-native-get-random-values buffer
```

### Add Polyfills

In your `index.js`, include the necessary polyfills:

```js
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
```

### Creating a Connection Client

Construct a reusable `Connection`:

```js
import { Connection } from '@solana/web3.js';

const connection = new Connection(
  'https://api.devnet.solana.com',
  'confirmed'
);
```

Optionally pass a commitment config (e.g., `'confirmed'`, `'processed'`).

### Usage Examples

* **Get Latest Blockhash**

  ```js
  const blockhash = await connection.getLatestBlockhash();
  ```

* **Get Balance**

  ```js
  const balanceInLamports = await connection.getBalance(publicKey);
  ```

* **Send a Transaction**

  ```js
  const signature = await connection.sendTransaction(signedTx);
  ```

### Next Steps

Read the [Building Transactions](#building-transactions) guide or browse the full list of Solana RPC HTTP Methods.

---

## Building Transactions

Transactions allow invocation of on-chain program instructions.

### Add Dependencies

```bash
# Yarn
yarn add @solana/web3.js

# npm
npm install @solana/web3.js
```

### Add Polyfills

Ensure the same polyfills as above are present.

### SOL Transfer Transaction Example

```js
import {
  Connection,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
} from '@solana/web3.js';

// Create transfer instruction
const instructions = [
  SystemProgram.transfer({
    fromPubkey: fromPublicKey,
    toPubkey: toPublicKey,
    lamports: 1_000_000,
  }),
];

// Connect & fetch blockhash
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const { blockhash } = await connection.getLatestBlockhash();

// Compile to V0Message
const txMessage = new TransactionMessage({
  payerKey: fromPublicKey,
  recentBlockhash: blockhash,
  instructions,
}).compileToV0Message();

// Construct VersionedTransaction
const versionedTx = new VersionedTransaction(txMessage);
```

### Versioned vs Legacy Transactions

* **Versioned Transactions**: New recommended format (`VersionedTransaction`).
* **Legacy Transactions**: Older format using `Transaction` from `@solana/web3.js`.

### Sending a Transaction

```js
import { sendTransaction, confirmTransaction } from '@solana/web3.js';

// After signing:
const signature = await connection.sendTransaction(signedTx);

const confirmation = await connection.confirmTransaction(
  signature,
  'confirmed'
);

if (confirmation.value.err) {
  throw new Error(JSON.stringify(confirmation.value.err));
}
```

### Next Steps

* Use the [Mobile Wallet Adapter](#using-mobile-wallet-adapter) to sign and send.
* Integrate with Anchor programs.

---

## Using Mobile Wallet Adapter

The Mobile Wallet Adapter (MWA) protocol enables secure dApp–wallet communication on React Native.

### Add Dependencies

```bash
# Yarn
yarn add @solana-mobile/mobile-wallet-adapter-protocol-web3js @solana-mobile/mobile-wallet-adapter-protocol

# npm
npm install @solana-mobile/mobile-wallet-adapter-protocol-web3js @solana-mobile/mobile-wallet-adapter-protocol
```

### Establishing an MWA Session

```js
import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

await transact(async (wallet: Web3MobileWallet) => {
  // Use wallet.session for requests
});
```

### Connecting to a Wallet

```js
export const APP_IDENTITY = {
  name: 'React Native dApp',
  uri: 'https://yourdapp.com',
  icon: 'favicon.ico',
};

const authResult = await transact(async (wallet) => {
  return await wallet.authorize({
    cluster: 'solana:devnet',
    identity: APP_IDENTITY,
  });
});

console.log('Connected:', authResult.accounts[0].address);
```

### Authorization & Reauthorization

Pass a stored `auth_token` to skip approval dialogs:

```js
await wallet.authorize({
  cluster: 'solana:devnet',
  identity: APP_IDENTITY,
  auth_token: storedAuthToken,
});
```

### Deauthorizing a Wallet

```js
await transact(async (wallet) => {
  await wallet.deauthorize({ auth_token: storedAuthToken });
});
```

### Sign In with Solana (SIWS)

Combine authorize + signMessage:

```js
const signIn = await transact(async (wallet) => {
  const result = await wallet.authorize({
    chain: 'solana:devnet',
    identity: APP_IDENTITY,
    sign_in_payload: {
      domain: 'yourdomain.com',
      statement: 'Sign into React Native Sample App',
      uri: 'https://yourdomain.com',
    },
  });
  return result.sign_in_result;
});
```

### Signing and Sending Transactions

```js
const txSignature = await transact(async (wallet) => {
  // authorize
  // build VersionedTransaction
  const sigs = await wallet.signAndSendTransactions({
    transactions: [transferTx],
  });
  return sigs[0];
});
```

### Caching MWA Authorization

Use `@react-native-async-storage/async-storage`:

```js
import AsyncStorage from '@react-native-async-storage/async-storage';

// On authorize:
AsyncStorage.setItem('authToken', authToken);
AsyncStorage.setItem('base64Address', address);

// On app boot:
const [token, addr] = await Promise.all([
  AsyncStorage.getItem('authToken'),
  AsyncStorage.getItem('base64Address'),
]);
```

---

## Anchor Integration Guide

Integrate Anchor programs into your React Native app.

### Add Dependencies

```bash
# Yarn
yarn add @coral-xyz/anchor@0.28.0

# npm
npm install @coral-xyz/anchor@0.28.0
```

### Create an Anchor Wallet

```js
import * as anchor from '@coral-xyz/anchor';
import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

const anchorWallet = useMemo(() => ({
  signTransaction: async (tx) =>
    await transact(async (wallet) => {
      await wallet.authorize({ cluster: RPC_ENDPOINT, identity: APP_IDENTITY });
      const [signed] = await wallet.signTransactions({ transactions: [tx] });
      return signed;
    }),
  signAllTransactions: async (txs) =>
    await transact(async (wallet) => {
      await wallet.authorize({ cluster: RPC_ENDPOINT, identity: APP_IDENTITY });
      return await wallet.signTransactions({ transactions: txs });
    }),
  get publicKey() {
    return userPubKey;
  },
}) as anchor.Wallet, [userPubKey]);
```

### Importing an Anchor Program

```js
import { BasicCounter as BasicCounterProgram } from '../target/types/basic_counter';
import { AnchorProvider, Program } from '@coral-xyz/anchor';

const programId = new PublicKey('ADraQ2ENAbVoVZhvH5SPxWPsF2hH5YmFcgx61TafHuwu');

const provider = new AnchorProvider(connection, anchorWallet, {
  preflightCommitment: 'confirmed',
  commitment: 'processed',
});

const counterProgram = new Program<BasicCounterProgram>(
  idl,
  programId,
  provider
);
```

### Signing Transactions with Anchor

Use generated instructions for stablecoin portfolio management:

```js
// Initialize Portfolio:
const initializeIx = await portfolioProgram.methods
  .initializePortfolio({
    initialAllocations: [
      { mint: usdcMint, symbol: 'USDC-SOLEND', targetPercentage: 5000 },
      { mint: usdtMint, symbol: 'USDT-MET', targetPercentage: 5000 },
    ]
  })
  .accounts({
    portfolio: portfolioPDA,
    owner: anchorWallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .instruction();

// Rebalance Portfolio with Jupiter:
const rebalanceIx = await portfolioProgram.methods
  .realJupiterRebalance(
    [
      { mint: usdcMint, targetPercentage: 6000 },
      { mint: usdtMint, targetPercentage: 4000 },
    ],
    50 // slippage bps
  )
  .accounts({
    portfolio: portfolioPDA,
    owner: anchorWallet.publicKey,
    usdcTokenAccount: userUsdcAccount,
    usdcMint,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .instruction();

// Build & sign:
const signed = await anchorWallet.signTransaction(
  new Transaction({ ...latestBlockhash, feePayer: anchorWallet.publicKey }).add(rebalanceIx)
);
```

---

## Jupiter API Integration

Jupiter aggregates liquidity for token swaps across Solana DeFi protocols.

### Add Jupiter Dependencies

```bash
# Yarn
yarn add @jup-ag/core @jup-ag/react-hook

# npm
npm install @jup-ag/core @jup-ag/react-hook
```

### Jupiter Client Setup

```js
import { Jupiter, RouteInfo } from '@jup-ag/core';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const jupiter = await Jupiter.load({
  connection,
  cluster: 'devnet',
  user: userPublicKey,
});
```

### Stablecoin Swap Example

```js
// USDC to USDT swap
const routes = await jupiter.computeRoutes({
  inputMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
  outputMint: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'), // USDT
  amount: 1000000, // 1 USDC (6 decimals)
  slippageBps: 50, // 0.5%
});

if (routes.routesInfos.length > 0) {
  const { execute } = await jupiter.exchange({
    route: routes.routesInfos[0],
  });
  
  const swapResult = await execute();
  console.log('Swap signature:', swapResult.txid);
}
```

### Portfolio Rebalancing with Jupiter

```js
async function rebalanceStablecoinPortfolio(targetAllocations, totalUsdcBalance) {
  const swapInstructions = [];
  
  for (const allocation of targetAllocations) {
    const targetAmount = Math.floor(
      totalUsdcBalance * allocation.targetPercentage / 10000
    );
    
    if (targetAmount > 0) {
      const routes = await jupiter.computeRoutes({
        inputMint: usdcMint,
        outputMint: allocation.mint,
        amount: targetAmount,
        slippageBps: 50,
      });
      
      if (routes.routesInfos.length > 0) {
        const { setupTransaction, swapTransaction, cleanupTransaction } = 
          await jupiter.exchange({
            route: routes.routesInfos[0],
          });
        
        if (setupTransaction) swapInstructions.push(setupTransaction);
        swapInstructions.push(swapTransaction);
        if (cleanupTransaction) swapInstructions.push(cleanupTransaction);
      }
    }
  }
  
  return swapInstructions;
}

// Usage with MWA
const portfolioRebalance = await transact(async (wallet) => {
  // 1. Get portfolio contract instruction
  const portfolioInstruction = await getPortfolioRebalanceInstruction(targetAllocations);
  
  // 2. Get Jupiter swap instructions
  const swapInstructions = await rebalanceStablecoinPortfolio(
    targetAllocations,
    usdcBalance
  );
  
  // 3. Combine and send
  const allInstructions = [portfolioInstruction, ...swapInstructions];
  const transaction = new VersionedTransaction(
    new TransactionMessage({
      payerKey: userPublicKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      instructions: allInstructions,
    }).compileToV0Message()
  );
  
  const [signed] = await wallet.signAndSendTransactions({
    transactions: [transaction],
  });
  
  return signed;
});
```
