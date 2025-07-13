# Product Specification

Comprehensive product overview, features, and UI/UX design for Sloomo Portfolio.

## 📋 Product Overview

**Sloomo** is a mobile-first portfolio management application that revolutionizes xStock equity token investment management on Solana. By combining intuitive visual portfolio editing with 1-tap automatic allocation functionality, it makes traditional stock investing accessible with blockchain speed and efficiency.

### Vision

Transform traditional stock investment through:
- **Visual Portfolio Management**: Interactive pie chart interface for intuitive stock allocation
- **1-Tap Rebalancing**: Automatic transaction generation for portfolio rebalancing
- **Real-time Market Data**: Live stock price visualization via xStock integration
- **Mobile-First Design**: Optimized for Solana Mobile Stack

## 🎯 Problem Statement

Current stock investment solutions are fragmented and complex:

### Pain Points

- **Manual Tracking**: Users must manually track stock prices across multiple brokers (E*TRADE, Robinhood, etc.)
- **Complex Rebalancing**: Portfolio rebalancing requires technical knowledge and multiple trades
- **Lack of Unified Interface**: No single interface for visualizing and adjusting stock allocations
- **High Cognitive Load**: Optimal investment strategy execution requires significant mental effort
- **Time Limitations**: Traditional securities trading is limited to market hours

### Market Opportunity

- Growing retail investor market seeking simplified portfolio management
- Increasing demand for mobile-first financial applications
- Blockchain-native users looking for DeFi alternatives to traditional finance
- Need for visual, intuitive investment interfaces

## 💡 Solution

Sloomo provides a comprehensive xStock equity token 1-tap portfolio allocation platform:

### 🎯 Visual Portfolio Management

- **Interactive Pie Chart Interface**: Intuitive stock allocation with drag-and-drop editing
- **Real-time Portfolio Value Tracking**: Live stock price visualization and portfolio monitoring
- **1-Tap Rebalancing**: Automatic transaction generation with single-tap execution
- **Progressive Disclosure**: Advanced trading features revealed gradually

### 📊 Intelligent Stock Allocation

- **Automated Discovery**: Trending stocks and recommended equity opportunities
- **xStock Integration**: Real-time price tracking across major equity markets
- **Smart Rebalancing Suggestions**: AI-driven recommendations based on market conditions and performance
- **Historical Analysis**: Portfolio holding performance analysis and trend tracking

### 🚀 Blockchain-Native Features

- **24/7 Trading**: No market hour limitations with blockchain infrastructure
- **Instant Settlement**: Immediate transaction finality on Solana
- **Low Fees**: Minimal transaction costs compared to traditional brokers
- **Wallet Integration**: Seamless Mobile Wallet Adapter connectivity

## 🏗️ Technical Architecture

### Frontend Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | React Native + Expo | Cross-platform mobile development |
| **Charts** | victory-native, react-native-reanimated | Interactive pie charts and price charts |
| **Navigation** | @react-navigation/native-stack | Typed route parameters and screen management |
| **Animations** | react-native-reanimated, react-native-skia | High-performance animations |
| **Wallet** | @solana/wallet-adapter-react-native | Phantom, Solflare integration |
| **Testing** | Jest, React Native Testing Library | Comprehensive test coverage |

### Backend Integration

| Service | Technology | Purpose |
|---------|------------|---------|
| **Blockchain** | Solana + Anchor | Smart contract execution |
| **Price Data** | xStock API | Real-time equity token prices |
| **Jupiter** | Jupiter API | Token swapping and liquidity |
| **Storage** | AsyncStorage | Local state persistence |

## 🎨 UI/UX Design Principles

### Design Philosophy

Based on successful patterns from Bloom app and modern mobile design:

#### 1. Information Hierarchy

| Level | Screen | Purpose |
|-------|--------|---------|
| **L1** | Home/Dashboard | Balance, cumulative performance, primary actions |
| **L2** | Portfolio Edit | Allocation adjustment and rebalancing |
| **L3** | Asset Detail | Individual stock prices, market cap, history |
| **L4** | Settings/History | Auxiliary functions |

#### 2. UX Patterns

- **Progressive Onboarding**: Features revealed gradually
- **Faceted Search Modal**: Ticker/sector search for asset addition
- **1-Tap Rebalancing**: Pie chart changes → automatic transaction generation

### Visual Design

#### Color Scheme

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#2E90FA` | Primary actions, links |
| `secondary` | `#00C6A2` | Success states, gains |
| `error` | `#FF5A5F` | Errors, losses |
| `background` | `#F7F9FC` | Background surfaces |

#### Typography

- **Primary**: Inter / SF Pro Rounded
- **Hierarchy**: Clear size and weight differentiation
- **Accessibility**: WCAG 4.5:1 contrast ratio minimum

## 📱 Screen Specifications

### 1. HomeScreen (`screens/Home.tsx`)

| Section | Component | Description |
|---------|-----------|-------------|
| Header | `<AppBar title="Sloomo Equity" />` | App branding and navigation |
| Portfolio Value | `<BalanceCard />` | "\$12,345.67" with 24h change |
| Growth Chart | `<LineChart period="1M" />` | Historical performance visualization |
| Quick Actions | `<ActionButtons />` | ["Edit Portfolio", "Buy/Sell", "Rebalance"] |

### 2. EditPortfolioScreen (`screens/EditPortfolio.tsx`)

**Main Components:**
- **PieChart**: `<AllocationPie data={targets} animate />`
- **AllocationTable**: Scrollable list of allocation rows

```tsx
interface AllocationRowProps {
  symbol: string;      // "AAPL"
  current: number;     // 25 (%)
  target: number;      // bind to TextInput
  price: number;       // 150.25
  onRemove(): void;
}
```

**Features:**
- **Live Updates**: `onChangeTarget → setDraftTargets → PieChart re-renders`
- **Footer**: Save/Cancel buttons + fee preview modal

### 3. AddAssetModal (`modals/AddAsset.tsx`)

| UI Element | Content |
|------------|---------|
| SearchBar | Placeholder "Search stocks…" |
| AssetCard | Logo, Name, Price, "Add" button |
| EmptyState | "No results" with search suggestions |

### 4. AssetDetailScreen

**Tab Structure** (react-native-tab-view):

1. **Stats**: Price, market cap, volume, fundamentals
2. **Chart**: `<LineChart metric="price" />` with timeframe selection
3. **History**: Transaction list and portfolio impact

### 5. TransactionHistoryScreen

| Column | Example |
|--------|---------|
| Date | 2025-07-09 14:32 |
| Action | Rebalance |
| Amount | +120 AAPL |
| Status | Confirmed ✅ |

### 6. SettingsScreen

**Configuration Options:**
- Wallet connections management
- Notification preferences (Price Drop, Price Spike)
- Transaction speed selector (Fast/Standard/Slow)
- Security settings

## 📊 Data Models

```typescript
/** equity-token.ts */
export interface EquityToken {
  symbol: string;         // "AAPL"
  name: string;           // "Apple Inc."
  price: number;          // 150.25
  marketCap: number;      // USD
  logo: string;           // CDN URL
  sector: string;         // "Technology"
  change24h: number;      // Percentage change
}

/** allocation.ts */
export interface Allocation {
  symbol: string;
  currentPct: number;     // Current allocation percentage
  targetPct: number;      // Target allocation percentage
  currentValue: number;   // USD value of holdings
}

/** portfolio.ts */
export interface Portfolio {
  totalValue: number;
  allocations: Allocation[];
  lastRebalance: Date;
  performance: PerformanceMetrics;
}

/** transaction.ts */
export interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'rebalance';
  symbol: string;
  amount: number;
  price: number;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
  signature: string;      // Solana transaction signature
}
```

## 🔌 API Specifications

### RESTful Endpoints

| Resource | Method | Path | Description |
|----------|--------|------|-------------|
| List Assets | GET | `/v1/equity-tokens` | Price, Market Cap listing |
| Portfolio | GET | `/v1/user/:wallet/portfolio` | Current allocation |
| Rebalance Quote | POST | `/v1/rebalance/quote` | Transaction difference calculation |
| Execute | POST | `/v1/rebalance/execute` | Signed transaction submission |

### WebSocket Events

```typescript
// Real-time price updates
interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  timestamp: number;
}

// Portfolio value updates
interface PortfolioUpdate {
  totalValue: number;
  change24h: number;
  allocations: Allocation[];
}
```

## 🎬 Animation Guidelines

### 1. PieChart Animations

- **Duration**: `animate={{ duration: 400 }}` for smooth segment transitions
- **Easing**: Natural easing curves for organic feel
- **Interaction**: Haptic feedback on segment touch

### 2. Row Slider Interactions

- **Real-time Updates**: `react-native-reanimated` `useSharedValue` for instant visual feedback
- **Smooth Transitions**: 60fps animations during value changes

### 3. Screen Transitions

- **Navigation**: `createNativeStackNavigator` with `slide_from_right`
- **Modal Presentations**: Fade with scale for overlays

## ♿ Accessibility

### Screen Reader Support

- **VoiceOver/TalkBack**: PieChart segments with `aria-label="AAPL 25 percent"`
- **Form Labels**: All inputs properly labeled
- **Navigation**: Logical focus order

### Visual Accessibility

- **Contrast**: WCAG 4.5:1 minimum ratio
- **Motion**: `useReducedMotion` support for accessibility preferences
- **Text Scaling**: Dynamic type support

## 🌍 Localization Strategy

### Current Implementation

- **Primary Language**: English UI text
- **Preparation**: i18n library structure for future multilingual support
- **Content**: `en` locale only initially

### Future Expansion

- Japanese, Korean, Spanish market opportunities
- Right-to-left language support considerations
- Cultural adaptation for financial interfaces

## 🧪 Mock Data Strategy

```typescript
// utils/mock.ts
export const mockAssets: EquityToken[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 150.25,
    marketCap: 2_400_000_000_000,
    logo: "https://logo.clearbit.com/apple.com",
    sector: "Technology",
    change24h: 2.1
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 135.50,
    marketCap: 1_700_000_000_000,
    logo: "https://logo.clearbit.com/google.com",
    sector: "Technology",
    change24h: -0.8
  },
  // Additional mock data...
];
```

## 🎯 Success Metrics

### User Experience Metrics

- **Time to First Investment**: < 60 seconds from app open
- **Rebalance Completion Rate**: > 90% of initiated rebalances
- **User Retention**: 7-day retention > 70%

### Technical Performance

- **App Load Time**: < 2 seconds on mid-range devices
- **Animation Performance**: 60fps during interactions
- **Transaction Success Rate**: > 99% on devnet

### Business Metrics

- **Daily Active Users**: Growth tracking
- **Transaction Volume**: Portfolio management activity
- **Feature Adoption**: Advanced feature usage rates

## 🔒 Security Considerations

### Wallet Security

- **Private Key Management**: Never store private keys
- **Secure Communication**: All API calls over HTTPS
- **Transaction Signing**: Client-side only

### Data Protection

- **Local Storage**: Encrypted sensitive data
- **API Security**: Rate limiting and authentication
- **Privacy**: Minimal data collection

## 🚀 Future Roadmap

### Phase 1: Core Features (MVP)
- ✅ Basic portfolio visualization
- ✅ Simple rebalancing
- ✅ xStock integration

### Phase 2: Advanced Features
- 🔄 AI-powered allocation suggestions
- 🔄 Advanced charting and analytics
- 🔄 Social features and sharing

### Phase 3: Ecosystem Expansion
- 📋 Additional DeFi integrations
- 📋 Cross-chain portfolio management
- 📋 Institutional features

---

**🎯 Expected Deliverables**

```
✨ Expo-ready mock UI for immediate testing
✨ Edit Portfolio screen with real-time PieChart updates
✨ Rebalance button triggering dummy transaction flow
✨ Comprehensive component library
✨ End-to-end user flows
```

This specification provides the foundation for building an intuitive, powerful, and accessible portfolio management application that bridges traditional finance and DeFi through superior user experience design.