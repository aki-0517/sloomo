# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a Solana Mobile dApp built with React Native and Expo. The project has a dual structure:

- **Root level**: Contains main `package.json` with React Native scripts and dependencies
- **credit-pay/**: Contains the Expo app with modern React Native setup

The active development should focus on the `credit-pay/` directory which contains the current Expo-based implementation.

## Development Commands

### Root Level Commands (Legacy React Native)
```bash
npm run android        # Run Android app
npm run start         # Start React Native packager
npm run test          # Run Jest tests
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript type checking
npm run build:android # Build Android release
```

### Expo App Commands (credit-pay/)
```bash
cd credit-pay
npm run start         # Start Expo dev server
npm run android       # Start Android development build
npm run ios          # Start iOS development build
npm run web          # Start web development
npm run build        # Build using EAS Build
npm run build:local  # Build locally using EAS
```

## Architecture Overview

### Core Technologies
- **React Native 0.76** with **Expo SDK 52**
- **Solana Mobile Stack** with Mobile Wallet Adapter (MWA)
- **React Navigation 6** for navigation
- **React Native Paper** for Material Design components
- **React Query** for server state management
- **TypeScript** for type safety
- **AsyncStorage** for persistence

### Key Components Structure

#### Providers & Context
- `ConnectionProvider`: Manages Solana RPC connection based on selected cluster
- `ClusterProvider`: Handles cluster/network selection (devnet, testnet, mainnet)
- `QueryClientProvider`: React Query for caching and state management

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

### Component Architecture

Components are organized in feature-based folders:
- `components/account/`: Account-related components
- `components/cluster/`: Network/cluster selection
- `components/sign-in/`: Authentication components
- `components/top-bar/`: Navigation components
- `components/ui/`: Reusable UI components

### Build Configuration

#### EAS Build (credit-pay/)
- Uses EAS Build for cloud builds
- Configured in `eas.json` with development, preview, and production profiles
- Project ID: `5c0cf63c-017f-48d2-93ba-43a2aabf1410`

#### App Configuration
- Bundle ID: `com.solana.mobile.expo.template`
- Supports both light and dark themes
- Android-focused (Solana Mobile Stack is Android-only)

## Testing

Currently minimal test setup:
- Jest configured for React Native
- Testing Library for React Native available
- Root level has proper test configuration, credit-pay/ has placeholder

## Common Development Patterns

1. **Wallet Operations**: Use `useMobileWallet` hook for all wallet interactions
2. **Network Switching**: Use `ClusterProvider` and `useCluster` for network management
3. **Styling**: Use React Native Paper theming with automatic dark/light mode support
4. **State Management**: React Query for server state, React hooks for local state
5. **Navigation**: Follow React Navigation patterns with typed navigation

## Important Notes

- This is an **Android-only** app due to Solana Mobile Stack requirements
- All crypto operations require proper polyfills (already configured)
- Mobile Wallet Adapter requires physical device or emulator with MWA-compatible wallet
- The app identity is configured in `useAuthorization.tsx` (`APP_IDENTITY`)

## Development Workflow

1. Work primarily in the `credit-pay/` directory
2. Use Expo development builds, not Expo Go
3. Test on Android devices/emulators with MWA-compatible wallets
4. Run `npm run typecheck` and `npm run lint` before committing
5. Use EAS Build for production builds targeting Solana dApp Store