# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

**Use yarn as the package manager for this project.**

All dependency management and script execution should use yarn instead of npm:
- `yarn install` instead of `npm install`
- `yarn add <package>` instead of `npm install <package>`
- `yarn run <script>` instead of `npm run <script>`

## Project Structure

This is a Solana ecosystem project with multiple components:

- **Root level**: Contains main `package.json` for the Solana Mobile app
- **app/**: Contains the Expo-based React Native app with modern setup
- **contract/**: Contains Solana smart contracts built with Anchor framework
- **mint-scripts/**: Contains scripts for minting yield-bearing stablecoins
- **docs/**: Project documentation

The active development should focus on the `app/` directory for mobile app development.

## Development Commands

### Root Level Commands (React Native - Legacy)
```bash
yarn android        # Run Android app
yarn start         # Start React Native packager
yarn test          # Run Jest tests
yarn lint          # Run ESLint
yarn typecheck     # Run TypeScript type checking
yarn build:android # Build Android release
```

### Expo App Commands (app/)
```bash
cd app
yarn start         # Start Expo dev server
yarn android       # Start Android development build
yarn ios          # Start iOS development build
yarn web          # Start web development
yarn build        # Build using EAS Build
yarn build:local  # Build locally using EAS
```

### Contract Commands (contract/)
```bash
cd contract
yarn install      # Install dependencies
anchor build       # Build Solana program
anchor test        # Run Anchor tests
anchor deploy      # Deploy to configured cluster
```

### Mint Scripts Commands (mint-scripts/)
```bash
cd mint-scripts
yarn install      # Install dependencies
yarn ts-node deploy-yield-bearing-stablecoin.ts  # Deploy yield-bearing stablecoin
```

## Architecture Overview

### Core Technologies

#### Mobile App (app/)
- **React Native 0.76** with **Expo SDK 52**
- **Solana Mobile Stack** with Mobile Wallet Adapter (MWA)
- **React Navigation 6** for navigation
- **React Native Paper** for Material Design components
- **TanStack React Query** for server state management
- **TypeScript** for type safety
- **AsyncStorage** for persistence

#### Smart Contracts (contract/)
- **Anchor Framework** for Solana program development
- **Rust** for smart contract implementation
- **Solana Web3.js** for client interactions

#### Token Scripts (mint-scripts/)
- **SPL Token 2022** for advanced token features
- **Yield-bearing stablecoins** implementation
- **TypeScript** for deployment scripts

### Key Components Structure (app/)

#### Providers & Context
- `ConnectionProvider`: Manages Solana RPC connection based on selected cluster
- `QueryClientProvider`: TanStack React Query for caching and state management

#### Navigation
- `AppNavigator`: Main navigation stack using React Navigation
- `HomeNavigator`: Nested navigation for home screens
- `screens/`: Contains all screen components

#### Utilities
- `useAuthorization`: Mobile Wallet Adapter authorization management
- `useMobileWallet`: High-level wallet interaction hooks
- `ConnectionProvider`: Solana connection management

#### Polyfills
- `polyfills.ts`: Required polyfills for crypto, Buffer, and random values in React Native environment

### Mobile Wallet Adapter Integration

The app uses Solana Mobile Wallet Adapter for secure wallet interactions:
- Authorization is cached in AsyncStorage
- Supports connect, disconnect, transaction signing, and message signing
- Configured for devnet by default (`CHAIN_IDENTIFIER = "solana:devnet"`)

### Component Architecture (app/src/)

Components are organized in feature-based folders:
- `components/account/`: Account-related components
- `components/cluster/`: Network/cluster selection
- `components/sign-in/`: Authentication components
- `components/top-bar/`: Navigation components
- `components/home/`: Home screen specific components (ActionButtons, BalanceCard, LineChart)
- `components/portfolio/`: Portfolio management components
- `components/ui/`: Reusable UI components
- `modals/`: Modal components
- `types/`: TypeScript type definitions
- `theme/`: App theming and colors

### Build Configuration

#### EAS Build (app/)
- Uses EAS Build for cloud builds
- Configured in `eas.json` with development, preview, and production profiles
- Project name: `credit-pay`

#### App Configuration
- Bundle ID: `com.solana.mobile.expo.template`
- Supports both light and dark themes
- Android-focused (Solana Mobile Stack is Android-only)

#### Contract Build (contract/)
- Uses Anchor framework for Solana program builds
- Rust toolchain required
- Configured in `Anchor.toml` for cluster deployment

## Testing

### Mobile App Testing (app/)
- Minimal test setup currently
- Expo test configuration available

### Root Level Testing
- Jest configured for React Native
- Testing Library for React Native available
- Proper test configuration in place

### Contract Testing (contract/)
- Anchor test framework
- Test files in `tests/` directory

## Common Development Patterns

### Mobile App (app/)
1. **Wallet Operations**: Use `useMobileWallet` hook for all wallet interactions
2. **Network Switching**: Use connection provider for cluster management
3. **Styling**: Use React Native Paper theming with automatic dark/light mode support
4. **State Management**: TanStack React Query for server state, React hooks for local state
5. **Navigation**: Follow React Navigation patterns with typed navigation

### Smart Contracts (contract/)
1. **Program Structure**: Follow Anchor framework patterns
2. **Account Management**: Use proper PDA derivation and account validation
3. **Error Handling**: Implement comprehensive error types and handling

### Token Operations (mint-scripts/)
1. **SPL Token 2022**: Use advanced features for yield-bearing tokens
2. **Deployment**: Use TypeScript scripts for reproducible deployments

## Important Notes

- This is an **Android-only** app due to Solana Mobile Stack requirements
- All crypto operations require proper polyfills (already configured)
- Mobile Wallet Adapter requires physical device or emulator with MWA-compatible wallet
- The app identity is configured in `useAuthorization.tsx` (`APP_IDENTITY`)

## Development Workflow

### Mobile App Development
1. Work primarily in the `app/` directory
2. Use Expo development builds, not Expo Go
3. Test on Android devices/emulators with MWA-compatible wallets
4. Run `yarn typecheck` and `yarn lint` before committing
5. Use EAS Build for production builds targeting Solana dApp Store

### Smart Contract Development
1. Work in the `contract/` directory
2. Use `anchor build` and `anchor test` for development
3. Deploy to devnet for testing before mainnet
4. Ensure proper program validation and security

### Token Script Development
1. Work in the `mint-scripts/` directory
2. Test deployments on devnet first
3. Use proper configuration management for different environments