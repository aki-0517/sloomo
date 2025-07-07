# React Native（Expo）× Supabase × Solana Mobile Tech Stack

2025年のSolana Mobile Stack統合Androidアプリ開発ハッカソン要件に基づき、ExpoとSupabaseを活用したReact Native開発スタックガイドです。

## コア要件（ハッカソン）

### 必須機能
- **Androidアプリ**: dApp Store公開可能なAndroidアプリ
- **Solana Mobile Stack (SMS)**: SMSコンポーネントとネイティブ機能の活用
- **Mobile Wallet Adapter**: MWAによるウォレット連携
- **BONK統合**: （任意）BONKトークン連携でボーナス
- **Supabase**: バックエンド（認証・DB・API）にSupabaseを利用
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
- **Supabase対応**: Expo環境で公式Supabase JS SDK利用可

### 2. Supabase バックエンド統合

#### Supabaseの役割
- **認証**: メール/ソーシャル/OTP認証
- **データベース**: PostgresベースのリアルタイムDB
- **API**: REST/GraphQL自動生成
- **ストレージ**: ファイルアップロード
- **サーバーレス関数**: Edge Functions

#### 推奨パッケージ
```bash
expo install @supabase/supabase-js
```

#### 例: Supabase初期化
```typescript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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

#### Seed Vault
- Androidのセキュアエレメント活用
- MWA経由でアクセス

### 4. UI/UXフレームワーク

#### Expo対応UIライブラリ
```typescript
expo install react-native-paper react-native-elements react-native-vector-icons
```
- **react-native-paper**: マテリアルデザイン
- **react-native-elements**: クロスプラットフォームUI
- **react-native-vector-icons**: アイコン

#### Solana特化UI例
- ウォレット接続ボタン
- トランザクション状況表示
- 残高表示

### 5. ステート管理

#### 推奨ソリューション
```typescript
expo install @reduxjs/toolkit zustand react-query
```
- **Redux Toolkit**: 複雑な状態管理
- **zustand**: 軽量な状態管理
- **react-query**: サーバー状態管理（Supabase APIとも相性良）

#### ウォレット・Supabase連携例
- 認証状態・ユーザー情報をSupabaseで管理
- トランザクション履歴や残高をSupabase DBで管理

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

#### Android/Expo/Supabase
```bash
# Node.js 18+ & npm
# Expo CLI
npm install -g expo-cli

# Android Studio（SDK Platform 31+）
# ANDROID_HOME設定

# Supabase CLI（必要に応じて）
npm install -g supabase
```

#### Expoプロジェクト初期化
```bash
expo init my-app
cd my-app
expo install @supabase/supabase-js @solana/web3.js
expo start
```

### 9. プロジェクト構成例

```
credit-pay/
├── app/                  # Expo App Router
├── components/           # UIコンポーネント
├── screens/              # 画面
├── services/             # ビジネスロジック
├── api/                  # Supabase/外部API
├── store/                # 状態管理
├── constants/            # 定数
├── assets/               # 画像・フォント
├── docs/                 # ドキュメント
└── ...
```

### 10. Supabase × Solana連携例
- Supabaseでユーザー認証→Solanaウォレット連携
- Supabase DBでトランザクション履歴・残高管理
- Supabase Edge FunctionsでSolana RPC/APIラップ
- BONKトークンの支払・報酬履歴もSupabaseで管理

---

このスタックで、Expoの高速開発・SupabaseのBaaS・Solana Mobile StackのWeb3連携を組み合わせ、Android向けdAppを効率的に開発できます。