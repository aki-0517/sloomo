
## Overview

# Product Name: Sloomo

* Based on Bloomo's "Target Portfolio" feature, the investment UI follows the style of editing portfolios with **Pie Chart + Allocation Table**. ([bloomapp.com][1], [play.google.com][2])
* The chart uses **victory-native** and **react-native-reanimated** for high performance and animation. ([commerce.nearform.com][3], [github.com][4])
* The available assets initially load major **xStock equity tokens** on Solana, and real-time stock prices are fetched via the xStock API. ([xstock.io][5])
* The mobile design pattern references recent retention-focused UIs and microservice structures. ([tekrevol.com][8], [procreator.design][9], [uxmatters.com][10])
* Pie charts are commonly used for visualizing asset allocation and are in high demand among individual investors. ([reddit.com][11])
* In the RN community, Victory libraries are recommended for charting. ([reddit.com][12])

---

## Design Principles

### 1. Information Hierarchy

| Level | Screen                    | Purpose                |
| ----- | ------------------------ | ---------------------- |
| L1    | Home/Dashboard           | Balance, cumulative performance, main actions |
| L2    | Portfolio Edit           | Adjust allocation, rebalance |
| L3    | Asset Detail             | Individual stock price, market cap, history |
| L4    | Settings / Tx History    | Auxiliary features     |

### 2. UX Patterns

* **Progressive Onboarding**: Features are introduced step by step. ([procreator.design][9])
* **Facet Search Modal**: Search by ticker/sector when adding assets. ([uxmatters.com][10])
* **One-tap Rebalance**: Pie chart change → auto-generate delta Tx.

---

## Tech Stack

| Layer            | Library / Service                                               | Notes                  |
| ---------------- | -------------------------------------------------------------- | ---------------------- |
| **UI**           | React Native + Expo                                            | Supports iOS/Android   |
| **Chart**        | victory-native, react-native-reanimated, react-native-skia     | Pie chart, stock line  |
| **Navigation**   | @react-navigation/native-stack                                 | Typed route params     |
| **Wallet**       | @solana/wallet-adapter-react-native                            | Phantom, Solflare      |
| **Data API**     | xStock API Integration                                         | Price, Volume, Market Cap |
| **Testing**      | Jest, React Native Testing Library                             |                        |

---

## Screen Specifications

### 1. HomeScreen (`screens/Home.tsx`)

| Section           | Component                        | Description (in English)           |
| ----------------- | -------------------------------- | ---------------------------------- |
| Header            | `<AppBar title="Sloomo Equity" />` |                                    |
| Portfolio Value   | `<BalanceCard />`                | "$12,345.67"                      |
| Growth Graph      | `<LineChart period="1M" />`      |                                    |
| Quick Actions     | `<ActionButtons />`              | ["Edit Portfolio","Buy/Sell","Rebalance"] |

### 2. EditPortfolioScreen (`screens/EditPortfolio.tsx`)

* **PieChart**: `<AllocationPie data={targets} animate />`
* **AllocationTable**: Render `<AllocationRow>` with FlatList

  ```tsx
  interface AllocationRowProps {
    symbol: string;      // "AAPL"
    current: number;     // 25 (%)
    target: number;      // bind to TextInput
    price: number;       // 150.25
    onRemove(): void;
  }
  ```
* **Live Updates**: `onChangeTarget → setDraftTargets → PieChart re-renders`
* **Footer**: Save / Cancel Buttons + FeePreviewModal

### 3. AddAssetModal (`modals/AddAsset.tsx`)

| UI Element   | Content                           |
| ------------ | --------------------------------- |
| SearchBar    | Placeholder "Search stocks…"      |
| AssetCard    | Logo, Name, Price, "Add" button   |
| EmptyState   | "No results"                      |

### 4. AssetDetailScreen

Tab structure (react-native-tab-view):

1. **Stats**: price, market cap, volume
2. **Chart**: `<LineChart metric="price" />`
3. **History**: Tx list

### 5. TxHistoryScreen

| Column   | Sample             |
| -------- | ------------------ |
| Date     | 2025-07-09 14:32   |
| Action   | Rebalance          |
| Amount   | +120 AAPL          |
| Status   | Confirmed          |

### 6. SettingsScreen

* Wallet connections
* Notification toggles (Price Drop, Price Spike)
* Gas mode selector (Fast / Standard / Slow)

---

## Data Model

```ts
/** equity-token.ts */
export interface EquityToken {
  symbol: string;         // "AAPL"
  name: string;           // "Apple Inc."
  price: number;          // 150.25
  marketCap: number;      // USD
  logo: string;           // CDN URL
  sector: string;         // "Technology"
}

/** allocation.ts */
export interface Allocation {
  symbol: string;
  currentPct: number;
  targetPct: number;
}
```

---

## API Endpoint Examples

| Resource         | Method | Path                         | Description         |
| ---------------- | ------ | ---------------------------- | ------------------- |
| List assets      | GET    | `/v1/equity-tokens`          | Price, Market Cap   |
| Portfolio        | GET    | `/v1/user/:wallet/portfolio` | Current allocation  |
| Rebalance quote  | POST   | `/v1/rebalance/quote`        | Returns delta Tx    |
| Execute          | POST   | `/v1/rebalance/execute`      | Submit signed Tx    |

---

## Colors & Typography

| Token        | Value                   |
| ------------ | ---------------------- |
| `primary`    | `#2E90FA`              |
| `secondary`  | `#00C6A2`              |
| `error`      | `#FF5A5F`              |
| `bg`         | `#F7F9FC`              |
| Font         | Inter / SF Pro Rounded |

---

## Mock Data Generation

```ts
// utils/mock.ts
import { EquityToken } from "../types/equity-token";

export const mockAssets: EquityToken[] = [
  { symbol: "AAPL", name: "Apple Inc.", price: 150.25, marketCap: 2_400_000_000_000, logo: "https://...", sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 135.50, marketCap: 1_700_000_000_000, logo: "https://...", sector: "Technology" },
  { symbol: "TSLA", name: "Tesla Inc.", price: 220.75, marketCap: 700_000_000_000, logo: "https://...", sector: "Automotive" },
  ...
];
```

---

## Animation Guide

1. **PieChart**

   * Use `animate={{ duration: 400 }}` for smooth segment transitions
2. **Row Slider**

   * When entering numbers, use `react-native-reanimated`'s `useSharedValue` for linkage
3. **Screen Transitions**

   * Use `createNativeStackNavigator`'s `slide_from_right`

---

## Accessibility

* Provide `aria-label="AAPL 25 percent"` for PieChart segments for VoiceOver / TalkBack
* Contrast ratio of at least WCAG 4.5:1
* Support for reduced motion (`useReducedMotion`)

---

## Localization Policy

* All UI text is **English**.
* i18n library will allow for future multi-language support, but only `en` is bundled for now.

---

### Expected Deliverables

```
✨ Mock UI instantly viewable with Expo
✨ PieChart updates in real time when editing ratios in Edit Portfolio screen
✨ Dummy Tx flow runs with Rebalance button
```

---

> **Note**: Even if the xStock API implementation is incomplete, you can verify screen transitions by loading `mockAssets` and `mockPortfolio` with useEffect. Replace with real network integration in later sprints.

---

## References

All external information cited above is referenced from publicly available online sources. Sources are listed as in-text footnotes.

[1]: https://bloomapp.com/learn/lesson/260/?utm_source=chatgpt.com "Portfolio Value & The Graph - Bloom"
[2]: https://play.google.com/store/apps/details?hl=en_US&id=com.bloom.invest&utm_source=chatgpt.com "Bloom AI: Investing Research - Apps on Google Play"
[3]: https://commerce.nearform.com/open-source/victory-native/?utm_source=chatgpt.com "Victory Native - Nearform"
[4]: https://github.com/FormidableLabs/victory-native-xl?utm_source=chatgpt.com "FormidableLabs/victory-native-xl: A charting library for ... - GitHub"
[5]: https://xstock.io "xStock API Documentation"
[8]: https://www.tekrevol.com/blogs/mobile-app-design-patterns/?utm_source=chatgpt.com "Key Microservices Design Patterns for Mobile App Development ..."
[9]: https://procreator.design/blog/mobile-app-design-patterns-boost-retention/?utm_source=chatgpt.com "12 Mobile App Design Patterns That Boost Retention - ProCreator"
[10]: https://www.uxmatters.com/mt/archives/2010/04/design-patterns-for-mobile-faceted-search-part-i.php?utm_source=chatgpt.com "Design Patterns for Mobile Faceted Search: Part I - UXmatters"
[11]: https://www.reddit.com/r/Bogleheads/comments/1docwh1/asset_allocation_pie_chart_what_softwareapp/?utm_source=chatgpt.com "Asset Allocation Pie Chart - What Software/App? : r/Bogleheads"
[12]: https://www.reddit.com/r/reactnative/comments/1e6wdn5/any_recommendations_for_a_charting_library/?utm_source=chatgpt.com "Any recommendations for a charting library? : r/reactnative - Reddit"