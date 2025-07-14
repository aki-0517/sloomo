# Solana React Native dApp Guide

This guide covers how to interact with the Solana network in a React Native environment, including making RPC requests, building and sending transactions, integrating Mobile Wallet Adapter, and using Anchor programs.

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

Use generated instructions and the `Program.rpc()` helper:

```js
// Manual:
const incrementIx = await counterProgram.methods.increment(new anchor.BN(1))
  .accounts({ counter: counterPDA })
  .instruction();

// Build & sign:
const signed = await anchorWallet.signTransaction(
  new Transaction({ ...latestBlockhash, feePayer: anchorWallet.publicKey }).add(incrementIx)
);

// Quick rpc:
const sig = await counterProgram.methods.increment(new anchor.BN(1))
  .accounts({ counter: counterPDA })
  .rpc();
```
