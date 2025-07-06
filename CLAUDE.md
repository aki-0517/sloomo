# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Solana Mobile hackathon project building **Solana Mobile CreditPay** - a mobile payment app that provides QR code payments, P2P transfers, and automatic unsecured credit lines using USDC deposits on Solana.

### Target Users
- Retail store customers (retail/restaurant)
- P2P transfer users
- Crypto asset holders with liquidity constraints
- Emerging market users without bank accounts

## Hackathon Context

- **Event**: "Hack the Duopoly: Build the next big mobile app on Solana" (July 1st - August 4th, 2025)
- **Requirements**: Functional Android app with Solana Mobile Stack (SMS) integration, Mobile Wallet Adapter, publishable on dApp Store
- **Platform**: Android-only (optimized for Saga phone and Android 12+ devices)
- **Bonus Prize**: $5k for best BONK token integration

## Project Status

This is currently a **planning/documentation phase** project. The codebase contains only documentation files outlining the product vision, technical architecture, and development approach.

## Architecture Overview

### Core Components (Planned)
1. **Frontend**: React Native app with Solana Mobile Stack integration
2. **Backend**: Serverless/Edge functions for credit scoring API
3. **Smart Contracts**: Solana programs for deposit management and credit lines
4. **Credit System**: Hybrid on-chain/off-chain credit scoring using ZK proofs

### Key Features (Planned)

#### 1. USDC Deposit Management
- Wallet integration via Solana Mobile Wallet Adapter
- In-app USDC deposit/charge functionality
- Real-time balance display (USDC + available credit line)

#### 2. QR Code Payments & P2P Transfers
- QR code generation for merchants (receive) and scanning for users (send)
- Solana Pay Transfer Request for instant transfers
- On-screen payment status notifications

#### 3. Unsecured Credit Line Provision
- Automatic balance shortage detection
- Credit scoring algorithm combining:
  - On-chain evaluation: transaction frequency, asset history, staking history
  - Off-chain evaluation: proxy credit info (VantageScore, Plaid bank data)
  - ZK proofs: zkTLS/zkCoprocessor for data verification
- Smart contract-based credit line management (CL, APR, repayment terms)
- Instant micro-loan provision with repayment schedules

## Technical Stack (Planned)

### Architecture Components

#### 1. Frontend (React Native)
- Solana Pay Rust library wrapper
- Wallet Adapter integration components
- QR code display/scan UI
- **Framework**: React Native + Expo
- **Solana Integration**: 
  - `@solana-mobile/mobile-wallet-adapter-protocol`
  - `@solana-mobile/mobile-wallet-adapter-protocol-web3js`
  - `@solana/web3.js`
- **UI**: React Native Paper / React Native Elements
- **State Management**: Redux Toolkit or Zustand

#### 2. Backend (Serverless/Edge Functions)
- Credit scoring API Gateway
- Off-chain data acquisition (Plaid, Cred Protocol, Blockchain Bureau)
- ZK proof services (Reclaim, Lagrange)

#### 3. Smart Contracts (Solana Programs)
- Deposit management program
- Credit line manager
- Repayment and delinquency logic

### Development Commands
React Native Android development commands:
```bash
# Development
npm start                        # Start Metro bundler
npm run android                  # Run on Android device/emulator
npm run build:android-debug     # Build debug APK
npm run build:android           # Build production APK
npm run clean:android           # Clean Android build
npm test                        # Run tests
npm run lint                    # Lint code
npm run typecheck               # TypeScript type checking
```

## API & Smart Contract Specifications

### API Endpoints (Planned)
- `POST /api/v1/deposit` - USDC deposit transaction registration
- `GET /api/v1/balance` - USDC balance & credit line information
- `POST /api/v1/score` - Credit score calculation request
- `POST /api/v1/loan` - Credit provision transaction
- `POST /api/v1/repay` - Repayment transaction

### Solana Programs (Planned)
- `initialize_user` - User account initialization
- `deposit_usdc` - USDC deposit
- `request_credit_line` - Credit line issuance
- `borrow_usdc` - Loan execution
- `repay_usdc` - Repayment execution

## Data Requirements

- User wallet address
- USDC token account balance
- Transaction history (past 90 days - 1 year)
- Bank account balance/transaction history (Plaid)
- Off-chain credit score
- ZK proof metadata

## UX Flow

1. **Initial Launch**: Wallet connection → Account initialization
2. **USDC Deposit**: App deposit → Balance display
3. **Payment/Transfer**: QR code scan → Amount input → Send
4. **Balance Shortage**: Credit display → Loan consent → Payment completion
5. **Repayment Management**: Repayment schedule confirmation and auto-payment setup

## Development Approach

When implementing this Android-focused project:

1. **Start with Solana Mobile Scaffold**: Use the official React Native Android scaffold
2. **Set up Android environment**: Android Studio, SDK 31+, device/emulator
3. **Implement wallet integration**: Mobile Wallet Adapter for Android
4. **Build core payment features**: QR codes and Solana Pay with Android camera
5. **Add credit scoring**: Integrate on-chain analysis and off-chain data sources
6. **Implement BONK integration**: For $5k bonus prize eligibility
7. **Test on Saga phone**: Optimize for Solana Mobile Stack hardware

## Security & Privacy

### Key Management
- All keyless transactions handled through Wallet Adapter
- Private keys never stored in app

### Data Protection
- Personal information encrypted end-to-end with ZK protection
- KYC/AML compliance with external KYC providers as needed
- Smart contract security audits required

### Testing & QA Requirements
- Unit tests: Frontend/Backend/Solana Programs
- Integration tests: End-to-end flow simulation
- Security tests: Penetration testing, smart contract formal verification

## Future Roadmap

- Cash flow-based evaluation model migration
- AI agent automatic credit provision
- Multi-chain support (Ethereum, BSC, etc.)
- Reward program integration

## Project Structure

```
src/
├── components/          # UI components (WalletConnect, TokenBalance, QR Scanner, etc.)
├── screens/            # App screens (Home, Wallet, Payment, Credit, Settings)
├── services/           # Solana integration and Supabase services
├── api/                # API integration layer
├── store/              # Redux state management with Supabase middleware
├── config/             # Supabase and environment configuration
├── utils/              # Utility functions
├── types/              # TypeScript definitions
└── constants/          # App constants and configuration
android/                # Android-specific files and build configurations
database/               # Supabase schema and migrations
docs/                   # Project documentation
```

## Documentation References

- Product specifications: `docs/product.md`
- Technical architecture: `docs/tech-stack.md`
- Credit system design: `docs/credit-system.md`
- Hackathon requirements: `docs/hackathon.md`