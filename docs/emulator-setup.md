# Emulator Setup Guide

*This document is a translation of the original Japanese guide for setting up the emulator. Please refer to the latest official documentation for updates.*

## Overview

This guide explains how to set up a local Solana validator and emulator environment for development and testing of the Sloomo project.

## Prerequisites

- Node.js (v16 or later)
- Yarn
- Solana CLI
- Anchor CLI
- Docker (for optional containerized setup)

## 1. Install Solana CLI

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.16.16/install)"
solana --version
```

## 2. Install Anchor CLI

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
anchor --version
```

## 3. Start Local Validator

```bash
solana-test-validator --reset --quiet &
```

- The `--reset` flag clears previous state.
- The `--quiet` flag suppresses logs.

## 4. Set CLI to Localnet

```bash
solana config set --url localhost
```

## 5. Airdrop SOL for Testing

```bash
solana airdrop 10
```

## 6. Build and Deploy Contract

```bash
cd contract
anchor build
anchor deploy --provider.cluster localnet
```

## 7. Run Tests

```bash
anchor test --provider.cluster localnet
```

## 8. (Optional) Use Docker for Emulator

If you want to use Docker for isolation:

```bash
docker run -it --rm -p 8899:8899 -p 8900:8900 solanalabs/solana:v1.16.16 solana-test-validator
```

## 9. Connect Client App to Local Emulator

- Set the RPC endpoint in your client app to `http://localhost:8899`.
- For React Native, update the connection provider or environment variable accordingly.

## 10. Troubleshooting

- If you encounter port conflicts, stop other validators or change the port.
- For Anchor errors, ensure the program is built and deployed to localnet.
- For wallet errors, check the keypair path and airdrop status.

## References

- [Solana Docs: Local Validator](https://docs.solana.com/developing/test-validator)
- [Anchor Book: Testing](https://book.anchor-lang.com/chapter_6.html)

---

**Last updated:** December 2024
