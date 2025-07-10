# Sloomo - Smart Stablecoin Yield Optimization Platform

![Sloomo Logo](app/assets/sloomo-logo.png)

**Sloomo** is a mobile-first DeFi portfolio management application that revolutionizes stablecoin investment management on Solana. By combining intuitive visual portfolio editing features with automated yield optimization, it makes advanced DeFi strategies accessible to everyday investors.

## 🚀 Project Overview

Sloomo consists of the following main components:

- **Mobile App** (`app/`): Modern portfolio management app using Expo SDK 52 and React Native 0.76
- **Smart Contracts** (`contract/`): Solana programs built with the Anchor framework
- **Token Scripts** (`mint-scripts/`): Scripts for minting and deploying yield-bearing stablecoins
- **Documentation** (`docs/`): Project-related technical specifications

## 📱 Key Features

### 🎯 Visual Portfolio Management
- **Interactive Pie Chart Interface**: Drag & drop interface for intuitive asset allocation
- **Real-time APY Tracking**: Portfolio value tracking with yield visualization
- **One-tap Rebalancing**: Simple portfolio adjustments with automatic transaction generation
- **Progressive Feature Disclosure**: Natural guidance to advanced features

### 📊 Intelligent Yield Optimization
- **Automatic Yield Discovery**: Automated discovery of highest yield stablecoin opportunities
- **Multi-protocol Support**: Real-time APY tracking across major Solana protocols like Solend and Meteora
- **Smart Rebalancing Suggestions**: Optimization suggestions based on market conditions
- **Historical Analysis**: Performance analysis and trend analysis

### 🔐 Seamless Mobile Integration
- **Solana Mobile Stack**: Native wallet integration and secure transactions
- **Touch-first Design**: Interactions optimized for Android devices
- **Offline Support**: Continuous user experience through local data sync
- **Progressive Web App**: Web support for broader accessibility

## 🛠 Tech Stack

### Frontend
- **React Native 0.76** with **Expo SDK 52**
- **TypeScript** for type safety
- **React Native Paper** for Material Design components
- **TanStack React Query** for efficient data fetching and caching
- **React Navigation 6** for navigation
- **Victory Native** for high-performance animated charts

### Blockchain Integration
- **Solana Blockchain** (Devnet/Mainnet)
- **Anchor Framework** for smart contract development
- **SPL Token 2022** for advanced token features
- **Mobile Wallet Adapter** for secure wallet interactions
- **Multi-RPC Support** for reliability (Helius, QuickNode)

### Data Layer
- **Real-time APIs** for live yield data (Helius, Meteora, Solend)
- **AsyncStorage** for offline functionality
- **Background Sync** for automatic data updates

### Development Tools
- **Yarn** for package management
- **EAS Build** for cloud builds
- **Jest** for testing
- **ESLint** for code quality

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- Yarn package manager
- Android Studio (for Android development)
- Rust toolchain (for contract development)
- Solana CLI

### 1. Clone Repository
```bash
git clone https://github.com/your-username/sloomo.git
cd sloomo
```

### 2. Install Dependencies
```bash
# Root dependencies
yarn install

# Mobile app dependencies
cd app
yarn install

# Smart contract dependencies
cd ../contract
yarn install

# Mint script dependencies
cd ../mint-scripts
yarn install
```

## 🚀 Development & Build

### Mobile App Development

```bash
cd app

# Start Expo dev server
yarn start

# Start Android development build
yarn android

# Start iOS development build (macOS only)
yarn ios

# Start web development
yarn web

# Production build
yarn build
```

### Smart Contract Development

```bash
cd contract

# Build Solana program
anchor build

# Run tests
anchor test

# Deploy (to configured cluster)
anchor deploy
```

### Token Script Execution

```bash
cd mint-scripts

# Deploy yield-bearing stablecoin
yarn ts-node deploy-yield-bearing-stablecoin.ts
```

## 🧪 Testing & Quality Assurance

### Mobile App
```bash
cd app
yarn test           # Run Jest tests
yarn lint           # Run ESLint code quality check
yarn typecheck      # Run TypeScript type checking
```

### Root Level
```bash
yarn test           # Run Jest tests
yarn lint           # Run ESLint code quality check
yarn typecheck      # Run TypeScript type checking
```

### Smart Contracts
```bash
cd contract
anchor test         # Anchor test framework
```

## 📁 Project Structure

```
sloomo/
├── app/                    # Expo React Native app
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── screens/        # Screen components
│   │   ├── navigators/     # Navigation configuration
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   ├── assets/             # Images & icon assets
│   └── android/            # Android native code
├── contract/               # Solana smart contracts
│   ├── programs/           # Anchor programs
│   └── tests/              # Contract tests
├── mint-scripts/           # Token deployment scripts
├── docs/                   # Project documentation
└── README.md
```

## 📱 Supported Platforms

- **Android**: Solana Mobile Stack support (recommended)
- **iOS**: Limited support (Mobile Wallet Adapter not supported)
- **Web**: Progressive Web App support for broader accessibility

## 🔐 Security

- Secure wallet connection through Mobile Wallet Adapter
- Private key non-storage policy
- Transaction signature separation
- Authentication information caching with AsyncStorage

## 🌐 Network Support

- **Devnet**: Development & testing (default)
- **Testnet**: Staging environment
- **Mainnet**: Production environment

## 🎯 User Experience

### Onboarding
1. **Wallet Connection**: Seamless integration with Phantom and Solflare
2. **Portfolio Import**: Automatic discovery of existing stablecoin holdings
3. **Goal Setting**: Setting risk tolerance and yield targets
4. **Initial Rebalancing**: Guided optimization of initial portfolio

### Daily Usage
1. **Quick Check**: At-a-glance view of portfolio value and daily P&L
2. **Opportunity Alerts**: Notifications for significant yield changes
3. **One-tap Actions**: Deposits, withdrawals, and rebalancing with minimal friction
4. **Performance Review**: Weekly/monthly portfolio analysis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## 📝 License

This project is released under the MIT License. Please see the [LICENSE](LICENSE) file for details.

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/your-username/sloomo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/sloomo/discussions)
- **Documentation**: Detailed documentation in the [docs/](docs/) folder

## 📈 Success Metrics

### User Engagement
- Daily Active Users: Target 1,000+ within 3 months
- Managed Portfolio Value: $10M+ total assets under management
- Transaction Volume: 10,000+ rebalancing operations
- User Retention: 70%+ monthly retention rate

### Technical Performance
- App Store Rating: 4.5+ stars
- Transaction Success Rate: 99%+
- Load Time: Portfolio updates under 3 seconds
- Uptime: 99.9% availability

---

**Solana Mobile Stack Compatible | Optimized for DeFi Yields | Designed for Everyone**