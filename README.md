# Sloomo - xStock Equity Token Portfolio Allocation Platform

![Sloomo Logo](app/assets/sloomo-logo.png)

**Sloomo** is a mobile-first equity token portfolio management application that revolutionizes stock investment on Solana through xStock integration. By combining intuitive visual portfolio editing features with 1-tap automated allocation, it makes traditional equity investing accessible on-chain with the speed and efficiency of blockchain technology.

## 🚀 Project Overview

Sloomo consists of the following main components:

- **Mobile App** (`app/`): Modern equity portfolio management app using Expo SDK 52 and React Native 0.76
- **Smart Contracts** (`contract/`): Solana programs built with the Anchor framework for portfolio management
- **Token Scripts** (`mint-scripts/`): Scripts for deploying and managing equity token operations
- **Documentation** (`docs/`): Project-related technical specifications

## 📱 Key Features

### 🎯 Visual Portfolio Management
- **Interactive Pie Chart Interface**: Drag & drop interface for intuitive equity allocation
- **Real-time Price Tracking**: Portfolio value tracking with live stock price visualization
- **1-Tap Allocation**: Simple portfolio adjustments with automatic transaction generation
- **Progressive Feature Disclosure**: Natural guidance to advanced equity trading features

### 📊 Intelligent Equity Allocation
- **Automatic Stock Discovery**: Automated discovery of trending and recommended equity opportunities
- **Multi-Market Support**: Real-time price tracking across major equity markets via xStock integration
- **Smart Rebalancing Suggestions**: Optimization suggestions based on market conditions and performance
- **Historical Analysis**: Performance analysis and trend analysis for equity holdings

### 🔐 Seamless Mobile Integration
- **Solana Mobile Stack**: Native wallet integration and secure equity token transactions
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
- **xStock API Integration** for live equity data and tokenization
- **Real-time Price APIs** for market data
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

# Token script dependencies
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

# Deploy equity token management contracts
yarn ts-node deploy-equity-token-manager.ts
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
2. **Portfolio Import**: Automatic discovery of existing equity token holdings
3. **Risk Assessment**: Setting risk tolerance and investment goals
4. **Initial Allocation**: Guided optimization of initial portfolio

### Daily Usage
1. **Quick Check**: At-a-glance view of portfolio value and daily P&L
2. **Market Alerts**: Notifications for significant price movements
3. **1-Tap Actions**: Buying, selling, and rebalancing with minimal friction
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
- Assets Under Management: $10M+ total equity token value
- Transaction Volume: 10,000+ allocation operations
- User Retention: 70%+ monthly retention rate

### Technical Performance
- App Store Rating: 4.5+ stars
- Transaction Success Rate: 99%+
- Load Time: Portfolio updates under 3 seconds
- Uptime: 99.9% availability

---

**Solana Mobile Stack Compatible | Optimized for Equity Trading | Designed for Everyone**