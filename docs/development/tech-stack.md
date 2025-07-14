# React Native（Expo）× xStock × Solana Mobile Tech Stack

2025年のSolana Mobile Stack統合Androidアプリ開発ハッカソン要件に基づき、ExpoとxStock API統合を活用したReact Native開発スタックガイドです。

## コア要件（ハッカソン）

### 必須機能
- **Androidアプリ**: dApp Store公開可能なAndroidアプリ
- **Solana Mobile Stack (SMS)**: SMSコンポーネントとネイティブ機能の活用
- **Mobile Wallet Adapter**: MWAによるウォレット連携
- **BONK統合**: （任意）BONKトークン連携でボーナス
- **xStock統合**: equity token取引とポートフォリオ管理にxStock APIを利用
- **Expo**: クロスプラットフォーム開発・ビルドにExpoを利用

## React Native（Expo）開発スタック

### 1. 開発フレームワーク

#### Expo + React Native for Android
- **Expo**: Expo CLIでプロジェクト管理・ビルド・OTAアップデート
- **React Native**: クロスプラットフォームUI開発
- **利点**:
  - Expo Goで即時プレビュー
  - OTAアップデート・ビルド自動化
  - Android/iOS両対応
  - 豊富なExpo/React Nativeライブラリ
- **Solana対応**: ExpoでもSolana Mobile Stack連携可能
- **xStock対応**: Expo環境でxStock equity token API利用可

### 2. xStock API統合

#### xStockの役割
- **equity token取引**: 株式のトークン化と取引
- **リアルタイム価格**: ライブ株価データ
- **ポートフォリオ管理**: 株式ポートフォリオの統合管理
- **市場データ**: NASDAQ、NYSE等主要市場データ

#### 推奨パッケージ
```bash
expo install axios react-query
```

#### 例: xStock API初期化
```typescript
import axios from 'axios';

const xStockAPI = axios.create({
  baseURL: process.env.XSTOCK_API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.XSTOCK_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// equity token価格取得
const getEquityTokenPrice = async (symbol: string) => {
  const response = await xStockAPI.get(`/tokens/${symbol}/price`);
  return response.data;
};
```

### 3. Solana Mobile Stack & Wallet連携

#### 必須パッケージ
```typescript
expo install @solana-mobile/mobile-wallet-adapter-protocol @solana-mobile/mobile-wallet-adapter-protocol-web3js @solana/web3.js
```

#### MWA（Mobile Wallet Adapter）
- WebSocketベースでdAppとウォレットを接続
- Phantom, Backpack, Solflare等に対応
- 署名・認証・残高取得
- equity tokenトランザクション実行

#### Seed Vault
- Androidのセキュアエレメント活用
- MWA経由でアクセス

### 4. UI/UXフレームワーク

#### Expo対応UIライブラリ
```typescript
expo install react-native-paper react-native-elements react-native-vector-icons victory-native
```
- **react-native-paper**: マテリアルデザイン
- **react-native-elements**: クロスプラットフォームUI
- **react-native-vector-icons**: アイコン
- **victory-native**: 高性能チャート（株価チャート等）

#### Equity Trading特化UI例
- ウォレット接続ボタン
- 株価チャート表示
- ポートフォリオ円グラフ
- 1タップ取引ボタン

### 5. ステート管理

#### 推奨ソリューション
```typescript
expo install @reduxjs/toolkit zustand react-query
```
- **Redux Toolkit**: 複雑な状態管理
- **zustand**: 軽量な状態管理
- **react-query**: サーバー状態管理（xStock APIとも相性良）

#### ウォレット・xStock連携例
- 認証状態・ユーザー情報をローカルで管理
- equity tokenトランザクション履歴や残高をxStock APIで管理
- リアルタイム株価データをreact-queryでキャッシュ

### 6. テスト・品質管理

#### テストフレームワーク
```typescript
expo install jest @testing-library/react-native
```
- **jest**: JSテスト
- **@testing-library/react-native**: RNテスト
- **detox**: E2Eテスト（必要に応じて）

#### コード品質
```typescript
expo install eslint prettier typescript
```

### 7. ビルド・デプロイ

#### Expoビルド
```json
// package.json scripts例
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
- **EAS Build**: Expo公式のビルド/配信サービス
- **GitHub Actions**: CI/CD自動化
- **Fastlane**: ストア配信自動化（必要に応じて）
- **Solana dApp Store**: 配信先

### 8. 開発環境セットアップ

#### Android/Expo/xStock
```bash
# Node.js 18+ & npm
# Expo CLI
npm install -g expo-cli

# Android Studio（SDK Platform 31+）
# ANDROID_HOME設定

# xStock API key取得
# XSTOCK_API_URL, XSTOCK_API_KEY設定
```

#### Expoプロジェクト初期化
```bash
expo init sloomo-equity-app
cd sloomo-equity-app
expo install axios react-query @solana/web3.js
expo start
```

### 9. プロジェクト構成例

```
sloomo/
├── app/                  # Expo App Router
├── components/           # UIコンポーネント
│   ├── portfolio/        # ポートフォリオ関連
│   ├── trading/          # equity token取引関連
│   └── charts/           # 株価チャート関連
├── screens/              # 画面
├── services/             # ビジネスロジック
│   ├── xstock/           # xStock API連携
│   └── solana/           # Solana連携
├── api/                  # xStock/外部API
├── store/                # 状態管理
├── constants/            # 定数
├── assets/               # 画像・フォント
├── docs/                 # ドキュメント
└── ...
```

### 10. xStock × Solana連携例
- ウォレット認証→xStock equity token取引
- Solana上でequity tokenトランザクション実行
- xStock APIでリアルタイム株価・ポートフォリオ管理
- 1タップでequity token売買とリバランス実行
- BONKトークンでの手数料支払い（ボーナス対象）

### 11. ポートフォリオ管理機能

#### コア機能実装
```typescript
// ポートフォリオ可視化
import { VictoryPie, VictoryChart } from 'victory-native';

// 1タップリバランス
const rebalancePortfolio = async (allocations: PortfolioAllocation[]) => {
  const transactions = await xStockAPI.post('/portfolio/rebalance', {
    allocations,
    walletAddress: wallet.publicKey
  });
  
  // Solanaトランザクション実行
  return await executeTransactions(transactions.data);
};
```

---

このスタックで、Expoの高速開発・xStock APIのequity token取引・Solana Mobile StackのWeb3連携を組み合わせ、Android向け株式投資dAppを効率的に開発できます。