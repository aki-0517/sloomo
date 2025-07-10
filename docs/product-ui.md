

## 概要

# プロダクト名: Sloomo

* Bloomo の「Target Portfolio」機能をベースに、**Pie Chart ＋ Allocation Table** でポートフォリオ編集を行う投資 UI を踏襲する。([bloomapp.com][1], [play.google.com][2])
* チャートは **victory-native** と **react-native-reanimated** を組み合わせ、高パフォーマンスでアニメーション対応。([commerce.nearform.com][3], [github.com][4])
* 取扱銘柄は Solana 上の主要 Stablecoin（金利付き）を初期ロードし、Solend や Meteora など利回り情報を API 経由で取得。([helius.dev][5], [squads.so][6], [reddit.com][7])
* モバイル設計パターンは近年のリテンション重視 UI／マイクロサービス構成を参考にする。([tekrevol.com][8], [procreator.design][9], [uxmatters.com][10])
* 資産配分の視覚化には円グラフが一般的で、個人投資家フォーラムでも需要が高い。([reddit.com][11])
* RN コミュニティでは Victory 系ライブラリがチャート用途で推奨される。([reddit.com][12])

---

## デザイン原則

### 1. 情報階層

| レベル | 画面                    | 目的                |
| --- | --------------------- | ----------------- |
| L1  | Home/Dashboard        | 残高・累積 APY・主要アクション |
| L2  | Portfolio Edit        | 配分調整・リバランス        |
| L3  | Asset Detail          | 個別 APY・TVL・履歴     |
| L4  | Settings / Tx History | 補助機能              |

### 2. UX パターン

* **プログレッシブ・オンボーディング**：機能を段階的に出す。([procreator.design][9])
* **ファセット検索モーダル**：銘柄追加時にタグ／シンボル検索。([uxmatters.com][10])
* **ワンタップ・リバランス**：パイチャート変更 → 差分 Tx を自動生成。

---

## 技術スタック

| レイヤ            | ライブラリ / サービス                                               | 備考                  |
| -------------- | ---------------------------------------------------------- | ------------------- |
| **UI**         | React Native + Expo                                        | iOS / Android 両対応   |
| **チャート**       | victory-native, react-native-reanimated, react-native-skia | 円グラフ・APY 折れ線        |
| **Navigation** | @react-navigation/native-stack                             | Typed route params  |
| **Wallet**     | @solana/wallet-adapter-react-native                        | Phantom, Solflare   |
| **Data API**   | Helius / Meteora / Solend 公開 API                           | APY, TVL, price     |
| **Testing**    | Jest, React Native Testing Library                         |                     |

---

## 画面仕様

### 1. HomeScreen (`screens/Home.tsx`)

| セクション           | コンポーネント                        | 説明 (英語表示)                                          |
| --------------- | ------------------------------ | -------------------------------------------------- |
| Header          | `<AppBar title="Sol-Yield" />` |                                                    |
| Portfolio Value | `<BalanceCard />`              | "\$12,345.67"                                      |
| Growth Graph    | `<LineChart period="1M" />`    |                                                    |
| Quick Actions   | `<ActionButtons />`            | \["Edit Portfolio","Deposit/Withdraw","Rebalance"] |

### 2. EditPortfolioScreen (`screens/EditPortfolio.tsx`)

* **PieChart**: `<AllocationPie data={targets} animate />`
* **AllocationTable**: `<AllocationRow>` を FlatList で描画

  ```tsx
  interface AllocationRowProps {
    symbol: string;      // "USDC-SOLEND"
    current: number;     // 25 (％)
    target: number;      // bind to TextInput
    apy: number;         // 4.25
    onRemove(): void;
  }
  ```
* **Live Updates**: `onChangeTarget → setDraftTargets → PieChart re-renders`
* **Footer**: Save / Cancel Buttons + FeePreviewModal

### 3. AddAssetModal (`modals/AddAsset.tsx`)

| UI要素       | 内容                           |
| ---------- | ---------------------------- |
| SearchBar  | プレースホルダ "Search stablecoin…" |
| AssetCard  | Logo, Name, APY, “Add” ボタン   |
| EmptyState | "No results"                 |

### 4. AssetDetailScreen

タブ構成（react-native-tab-view）:

1. **Stats**: price, apy, liquidity
2. **Chart**: `<LineChart metric="apy" />`
3. **History**: Tx list

### 5. TxHistoryScreen

| 列      | サンプル             |
| ------ | ---------------- |
| Date   | 2025-07-09 14:32 |
| Action | Rebalance        |
| Amount | +120 USDC        |
| Status | Confirmed        |

### 6. SettingsScreen

* Wallet connections
* Notification toggles (Price Drop, APY Spike)
* Gas mode selector (Fast / Standard / Slow)

---

## データモデル

```ts
/** stablecoin.ts */
export interface Stablecoin {
  symbol: string;         // "USDC-SOLEND"
  name: string;           // "Solend Deposited USDC"
  apy: number;            // 4.25
  tvl: number;            // USD
  logo: string;           // CDN URL
}

/** allocation.ts */
export interface Allocation {
  symbol: string;
  currentPct: number;
  targetPct: number;
}
```

---

## API エンドポイント例

| リソース            | メソッド | Path                         | 説明            |
| --------------- | ---- | ---------------------------- | ------------- |
| List assets     | GET  | `/v1/stablecoins`            | APY, TVL 一覧   |
| Portfolio       | GET  | `/v1/user/:wallet/portfolio` | 現在配分          |
| Rebalance quote | POST | `/v1/rebalance/quote`        | 差分トランザクション返却  |
| Execute         | POST | `/v1/rebalance/execute`      | 署名済 Tx Submit |

---

## 配色 & タイポグラフィ

| トークン        | 値                      |
| ----------- | ---------------------- |
| `primary`   | `#2E90FA`              |
| `secondary` | `#00C6A2`              |
| `error`     | `#FF5A5F`              |
| `bg`        | `#F7F9FC`              |
| フォント        | Inter / SF Pro Rounded |

---

## Mock データ生成

```ts
// utils/mock.ts
import { Stablecoin } from "../types/stablecoin";

export const mockAssets: Stablecoin[] = [
  { symbol: "USDC-SOLEND", name: "Solend USDC", apy: 4.25, tvl: 120_000_000, logo: "https://..." },
  { symbol: "USDT-MET", name: "Meteora USDT", apy: 3.90, tvl: 80_000_000, logo: "https://..." },
  ...
];
```

---

## アニメーションガイド

1. **PieChart**

   * `animate={{ duration: 400 }}` でスムーズにセグメント移動
2. **Rowスライダー**

   * 数値入力時 `react-native-reanimated` の `useSharedValue` で連動
3. **Screen遷移**

   * `createNativeStackNavigator` の `slide_from_right`

---

## アクセシビリティ

* VoiceOver / TalkBack で PieChart セグメントに `aria-label="USDC 25 percent"` を提供
* コントラスト比 WCAG 4.5:1 以上
* 動画モーション削減 (`useReducedMotion`) に対応

---

## ローカライズ指針

* UI テキストはすべて **英語**。
* i18n ライブラリで将来的に多言語対応可能にするが、`en` のみ同梱。

---

### 期待される成果物

```
✨ Expo で即確認可能なモック UI
✨ Edit Portfolio 画面で比率をいじると PieChart がリアルタイム更新
✨ Rebalance ボタンでダミー Tx フローが走る
```

---

> **補足**：API 本実装が未完成でも、`mockAssets` と `mockPortfolio` を useEffect でロードすれば画面遷移検証が可能です。実ネットワーク連携は後続スプリントで差し替えください。

---

## 参考文献

上記で引用した外部情報はすべてオンライン公開ソースを参照しています。ソースは文中脚注形式で記載済みです。

[1]: https://bloomapp.com/learn/lesson/260/?utm_source=chatgpt.com "Portfolio Value & The Graph - Bloom"
[2]: https://play.google.com/store/apps/details?hl=en_US&id=com.bloom.invest&utm_source=chatgpt.com "Bloom AI: Investing Research - Apps on Google Play"
[3]: https://commerce.nearform.com/open-source/victory-native/?utm_source=chatgpt.com "Victory Native - Nearform"
[4]: https://github.com/FormidableLabs/victory-native-xl?utm_source=chatgpt.com "FormidableLabs/victory-native-xl: A charting library for ... - GitHub"
[5]: https://www.helius.dev/blog/solanas-stablecoin-landscape?utm_source=chatgpt.com "Solana's Stablecoin Landscape - Helius"
[6]: https://squads.so/blog/stablecoins-overview-solana?utm_source=chatgpt.com "The Current Stablecoin Landscape on Solana for Enterprise Treasury"
[7]: https://www.reddit.com/r/solana/comments/1cz3b64/best_place_to_earn_yield_on_usdc/?utm_source=chatgpt.com "Best place to earn yield on USDC? : r/solana - Reddit"
[8]: https://www.tekrevol.com/blogs/mobile-app-design-patterns/?utm_source=chatgpt.com "Key Microservices Design Patterns for Mobile App Development ..."
[9]: https://procreator.design/blog/mobile-app-design-patterns-boost-retention/?utm_source=chatgpt.com "12 Mobile App Design Patterns That Boost Retention - ProCreator"
[10]: https://www.uxmatters.com/mt/archives/2010/04/design-patterns-for-mobile-faceted-search-part-i.php?utm_source=chatgpt.com "Design Patterns for Mobile Faceted Search: Part I - UXmatters"
[11]: https://www.reddit.com/r/Bogleheads/comments/1docwh1/asset_allocation_pie_chart_what_softwareapp/?utm_source=chatgpt.com "Asset Allocation Pie Chart - What Software/App? : r/Bogleheads"
[12]: https://www.reddit.com/r/reactnative/comments/1e6wdn5/any_recommendations_for_a_charting_library/?utm_source=chatgpt.com "Any recommendations for a charting library? : r/reactnative - Reddit"
