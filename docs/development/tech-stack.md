# React Native (Expo) × xStock × Solana Mobile Tech Stack

A React Native development stack guide utilizing Expo and xStock API integration, based on the 2025 Solana Mobile Stack integrated Android app development hackathon requirements.

## Core Requirements (Hackathon)

### Essential Features
- **Android App**: Android app publishable to dApp Store
- **Solana Mobile Stack (SMS)**: Utilizing SMS components and native features
- **Mobile Wallet Adapter**: Wallet integration via MWA
- **BONK Integration**: (Optional) BONK token integration for bonus
- **xStock Integration**: Using xStock API for equity token trading and portfolio management
- **Expo**: Using Expo for cross-platform development and builds

## React Native (Expo) Development Stack

### 1. Development Framework

#### Expo + React Native for Android
- **Expo**: Project management, builds, and OTA updates with Expo CLI
- **React Native**: Cross-platform UI development
- **Benefits**:
  - Instant preview with Expo Go
  - OTA updates and build automation
  - Support for both Android/iOS
  - Rich Expo/React Native library ecosystem
- **Solana Support**: Solana Mobile Stack integration possible with Expo
- **xStock Support**: xStock equity token API usable in Expo environment

### 2. xStock API Integration

#### xStock Role
- **Equity token trading**: Stock tokenization and trading
- **Real-time pricing**: Live stock price data
- **Portfolio management**: Integrated stock portfolio management
- **Market data**: Major market data from NASDAQ, NYSE, etc.

#### Recommended Packages
```bash
expo install axios react-query
```

#### Example: xStock API Initialization
```typescript
import axios from 'axios';

const xStockAPI = axios.create({
  baseURL: process.env.XSTOCK_API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.XSTOCK_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Get equity token price
const getEquityTokenPrice = async (symbol: string) => {
  const response = await xStockAPI.get(`/tokens/${symbol}/price`);
  return response.data;
};
```

### 3. Solana Mobile Stack & Wallet Integration

#### Required Packages
```typescript
expo install @solana-mobile/mobile-wallet-adapter-protocol @solana-mobile/mobile-wallet-adapter-protocol-web3js @solana/web3.js
```

#### MWA (Mobile Wallet Adapter)
- WebSocket-based connection between dApp and wallet
- Supports Phantom, Backpack, Solflare, etc.
- Signing, authentication, balance retrieval
- Equity token transaction execution

#### Seed Vault
- Utilizes Android secure element
- Access via MWA

### 4. UI/UX Framework

#### Expo-Compatible UI Libraries
```typescript
expo install react-native-paper react-native-elements react-native-vector-icons victory-native
```
- **react-native-paper**: Material Design
- **react-native-elements**: Cross-platform UI
- **react-native-vector-icons**: Icons
- **victory-native**: High-performance charts (stock price charts, etc.)

#### Equity Trading Specialized UI Examples
- Wallet connection button
- Stock price chart display
- Portfolio pie chart
- One-tap trading button

### 5. State Management

#### Recommended Solutions
```typescript
expo install @reduxjs/toolkit zustand react-query
```
- **Redux Toolkit**: Complex state management
- **zustand**: Lightweight state management
- **react-query**: Server state management (works well with xStock API)

#### Wallet & xStock Integration Examples
- Manage authentication state and user info locally
- Manage equity token transaction history and balances via xStock API
- Cache real-time stock price data with react-query

### 6. Testing & Quality Management

#### Testing Framework
```typescript
expo install jest @testing-library/react-native
```
- **jest**: JS testing
- **@testing-library/react-native**: RN testing
- **detox**: E2E testing (as needed)

#### Code Quality
```typescript
expo install eslint prettier typescript
```

### 7. Build & Deploy

#### Expo Build
```json
// package.json scripts example
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "build": "expo build",
    "test": "jest"
  }
}
```
- **EAS Build**: Official Expo build/distribution service
- **GitHub Actions**: CI/CD automation
- **Fastlane**: Store distribution automation (as needed)
- **Solana dApp Store**: Distribution destination

### 8. Development Environment Setup

#### Android/Expo/xStock
```bash
# Node.js 18+ & npm
# Expo CLI
npm install -g expo-cli

# Android Studio (SDK Platform 31+)
# ANDROID_HOME configuration

# xStock API key acquisition
# XSTOCK_API_URL, XSTOCK_API_KEY configuration
```

#### Expo Project Initialization
```bash
expo init sloomo-equity-app
cd sloomo-equity-app
expo install axios react-query @solana/web3.js
expo start
```

### 9. Project Structure Example

```
sloomo/
├── app/                  # Expo App Router
├── components/           # UI Components
│   ├── portfolio/        # Portfolio-related
│   ├── trading/          # Equity token trading-related
│   └── charts/           # Stock price chart-related
├── screens/              # Screens
├── services/             # Business Logic
│   ├── xstock/           # xStock API integration
│   └── solana/           # Solana integration
├── api/                  # xStock/External API
├── store/                # State management
├── constants/            # Constants
├── assets/               # Images & Fonts
├── docs/                 # Documentation
└── ...
```

### 10. xStock × Solana Integration Examples
- Wallet authentication → xStock equity token trading
- Execute equity token transactions on Solana
- Real-time stock prices and portfolio management with xStock API
- One-tap equity token trading and rebalancing
- Fee payment with BONK tokens (bonus eligible)

### 11. Portfolio Management Features

#### Core Feature Implementation
```typescript
// Portfolio visualization
import { VictoryPie, VictoryChart } from 'victory-native';

// One-tap rebalancing
const rebalancePortfolio = async (allocations: PortfolioAllocation[]) => {
  const transactions = await xStockAPI.post('/portfolio/rebalance', {
    allocations,
    walletAddress: wallet.publicKey
  });
  
  // Execute Solana transactions
  return await executeTransactions(transactions.data);
};
```

---

With this stack, you can efficiently develop Android-focused equity investment dApps by combining Expo's rapid development, xStock API equity token trading, and Solana Mobile Stack's Web3 integration.