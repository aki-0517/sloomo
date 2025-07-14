# Setup Guide / セットアップガイド

Complete environment setup and quick start guide for Sloomo Portfolio development.
Sloomo Portfolioの完全な環境セットアップとクイックスタートガイド。

## 🚀 Quick Start (5 minutes) / クイックスタート（5分）

### 1. Environment Preparation (1 minute)

```bash
# Switch to Solana devnet
solana config set --url devnet

# Check wallet address
solana address

# Check SOL balance
solana balance

# Airdrop SOL if needed
solana airdrop 5
```

### 2. Project Setup (1 minute)

```bash
# Navigate to contract directory
cd /path/to/sloomo/contract

# Install dependencies
yarn install

# Build contract
anchor build

# Deploy to devnet (if needed)
anchor deploy --provider.cluster devnet
```

### 3. Portfolio Creation (1 minute)

```bash
# Initialize portfolio (60% SOL + 40% USDC)
yarn portfolio:init

# Check results
yarn portfolio:check
```

### 4. Investment Execution (1 minute)

```bash
# Invest 1 SOL in SOL
yarn portfolio:invest SOL 1.0

# Invest 0.5 SOL equivalent in USDC
yarn portfolio:invest USDC 0.5

# Check post-investment state
yarn portfolio:check
```

### 5. Rebalance Execution (1 minute)

```bash
# Update yields
yarn portfolio:update-yields

# Execute rebalance (0.5% slippage)
yarn portfolio:rebalance 50

# Check final state
yarn portfolio:check
```

## 🔧 Detailed Environment Setup

### Prerequisites

- **macOS environment** (for mobile development)
- **Java 17 (OpenJDK)** - Required for Android
- **Node.js & yarn** - JavaScript runtime and package manager
- **Solana CLI** - Blockchain interaction
- **Anchor CLI** - Smart contract framework
- **Android Studio** - Mobile development (optional for contract-only development)

### Java Environment Setup

```bash
# Check current Java version
java -version

# Install Java 17 if not present
brew install openjdk@17

# Set environment variables
export JAVA_HOME=/usr/local/opt/openjdk@17
export PATH="/usr/local/opt/openjdk@17/bin:$PATH"

# Add to your shell profile for persistence
echo 'export JAVA_HOME=/usr/local/opt/openjdk@17' >> ~/.zshrc
echo 'export PATH="/usr/local/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
```

### Solana CLI Setup

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"

# Add to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Generate new keypair (if needed)
solana-keygen new

# Set devnet configuration
solana config set --url devnet
solana config set --keypair ~/.config/solana/id.json

# Verify configuration
solana config get
```

### Anchor CLI Setup

```bash
# Install Anchor CLI
npm install -g @coral-xyz/anchor-cli

# Verify installation
anchor --version

# Install Rust (if not present)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Add Solana target
rustup target add bpf-unknown-unknown
```

## 📱 Android Development Setup

### Android SDK Environment

```bash
# Check Android SDK location
ls ~/Library/Android/sdk

# Set environment variables
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$ANDROID_HOME/platform-tools:$PATH

# Add to shell profile
echo 'export ANDROID_HOME=~/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$ANDROID_HOME/platform-tools:$PATH' >> ~/.zshrc
```

### Android Emulator Setup

```bash
# List available AVDs
cd ~/Library/Android/sdk/emulator
./emulator -list-avds

# Start emulator (example: Pixel_Fold_API_35)
./emulator -avd Pixel_Fold_API_35 &

# Verify ADB connection
adb devices
```

### Mobile App Development

```bash
# Navigate to app directory
cd /path/to/sloomo/app

# Install dependencies
yarn install

# Create custom development build (required for Solana Mobile SDK)
npx eas build --profile development --platform android --local

# Install APK to emulator
find /var/folders -name "*.apk" -type f 2>/dev/null | head -5
adb install [APK_FILE_PATH]

# Start development server
npx expo start --dev-client
```

### Solana Wallet Setup

#### Install Phantom Wallet on Emulator

```bash
# Open Google Play Store directly to Phantom
adb shell am start -n com.android.vending/.AssetBrowserActivity -a android.intent.action.VIEW -d "market://details?id=app.phantom"
```

#### Wallet Configuration

1. Open Phantom Wallet app
2. Select **Create New Wallet**
3. Save seed phrase securely (test purposes only)
4. Set PIN/password
5. Connect to Solana devnet

## 🛠️ Available Commands

### Basic Operations

| Command | Function | Example |
|---------|----------|---------|
| `yarn portfolio:init` | Initialize portfolio | One-time setup |
| `yarn portfolio:check` | Check status | Run anytime |
| `yarn portfolio:invest` | Execute investment | `yarn portfolio:invest SOL 1.5` |
| `yarn portfolio:rebalance` | Execute rebalance | `yarn portfolio:rebalance 100` |
| `yarn portfolio:update-yields` | Update yields | Regular execution recommended |

### Development & Testing

| Command | Function |
|---------|----------|
| `yarn test:unit` | Unit tests |
| `yarn test:integration` | Integration tests |
| `yarn test:jupiter` | Jupiter tests |
| `yarn build` | Build contract |
| `yarn deploy:devnet` | Deploy to devnet |

## 🔧 Troubleshooting

### Common Errors

#### 1. Portfolio Not Found
```bash
❌ Portfolio not found
💡 Run 'yarn portfolio:init' first
```

#### 2. Insufficient SOL Balance
```bash
❌ insufficient funds
💡 Get SOL with 'solana airdrop 5'
```

#### 3. Program Not Found
```bash
❌ Account does not exist
💡 Run 'anchor deploy --provider.cluster devnet'
```

#### 4. Airdrop Rate Limit
```bash
❌ 429 Too Many Requests
💡 Wait and retry, or use faucet.solana.com
```

#### 5. Java Version Issues
```bash
❌ Java 11 error
💡 Update to Java 17 using instructions above
```

#### 6. Android SDK Issues
```bash
❌ SDK location not found
💡 Set ANDROID_HOME environment variable
```

### Debug Commands

```bash
# Verbose logging
RUST_LOG=debug yarn portfolio:check

# Verify transaction
solana confirm <TRANSACTION_SIGNATURE>

# Explorer verification
# https://explorer.solana.com/tx/<TX_SIGNATURE>?cluster=devnet

# Check environment configuration
solana config get
anchor --version
java -version
```

## 📝 Practical Examples

### Example 1: Basic Portfolio Management

```bash
# 1. Initialize
yarn portfolio:init

# 2. Initial investment
yarn portfolio:invest SOL 2.0
yarn portfolio:invest USDC 1.0

# 3. Check status
yarn portfolio:check

# 4. Update yields
yarn portfolio:update-yields

# 5. Rebalance
yarn portfolio:rebalance

# 6. Final verification
yarn portfolio:check
```

### Example 2: Continuous Investment and Rebalancing

```bash
# Weekly investment
yarn portfolio:invest SOL 0.5

# Monthly yield updates
yarn portfolio:update-yields

# Quarterly rebalancing
yarn portfolio:rebalance 50

# Performance check
yarn portfolio:check
```

### Example 3: Error Recovery Procedure

```bash
# 1. Environment verification
solana config get
solana balance

# 2. Program state check
solana account EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC

# 3. Redeploy if necessary
anchor build
anchor deploy --provider.cluster devnet

# 4. Portfolio state verification
yarn portfolio:check
```

## 🔒 Security & Best Practices

### ⚠️ Important Notes

1. **Devnet Only**: This guide is for devnet use only
2. **Test Purposes**: Do not use real assets
3. **Key Management**: Safely manage `~/.config/solana/id.json`
4. **Jupiter Integration**: Actual swaps require separate client-side execution

### Recommendations

- Regular backups
- Transaction history recording
- State verification before major operations
- Error log preservation
- Use test wallets for development
- Never use production assets in development

## 🔗 Resources

- **Contract Explorer**: [EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC](https://explorer.solana.com/account/EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC?cluster=devnet)
- **Solana Faucet**: https://faucet.solana.com
- **Jupiter API**: https://docs.jup.ag/
- **Anchor Documentation**: https://www.anchor-lang.com/
- **Solana CLI Guide**: https://docs.solana.com/cli

---

**🚀 Ready!** Follow the steps above to start portfolio management in the devnet environment.