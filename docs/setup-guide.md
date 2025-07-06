# Solana Mobile CreditPay 環境構築ガイド

このドキュメントでは、Solana Mobile CreditPayアプリの開発環境構築から動作確認までの手順を説明します。

## 📋 前提条件

**⚠️ 重要**: 開発環境のセットアップがまだの場合は、先に **[installation-guide.md](./installation-guide.md)** を参照して基本環境を構築してください。

### 確認必須項目
- ✅ Node.js 18+ がインストール済み
- ✅ Android Studio と Android SDK がセットアップ済み
- ✅ Android Virtual Device (AVD) が作成済み
- ✅ ANDROID_HOME 環境変数が設定済み
- ✅ React Native CLI がインストール済み

### 必要なアカウント
- **Supabase**: データベース用（無料アカウント）
- **Solana Devnet**: テスト用SOL取得（無料）

## 🚀 1. プロジェクトのセットアップ

### 1.1 リポジトリのクローンと依存関係のインストール

```bash
# プロジェクトディレクトリに移動
cd /Users/user/Desktop/metamask-hack

# 依存関係のインストール
npm install

# React Nativeの依存関係チェック
npx react-native doctor

# Android固有の依存関係をクリーン
cd android && ./gradlew clean && cd ..
```

### 1.2 Supabaseの設定

#### Supabaseプロジェクトの作成
1. [Supabase](https://supabase.com)にアクセスしてアカウント作成
2. **New Project**で新しいプロジェクトを作成
3. プロジェクト設定から**API Keys**と**Project URL**をメモ

#### データベーススキーマの設定
1. Supabaseダッシュボードで**SQL Editor**を開く
2. `database/schema.sql`の内容をコピー&ペースト
3. **Run**をクリックしてスキーマを作成

#### 環境変数の設定
```bash
# .envファイルを作成
cp .env.example .env

# .envファイルを編集して以下を設定
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 1.3 React Nativeアプリの起動

```bash
# エミュレーターが起動していることを確認
# Android Studio → AVD Manager → ▶️ ボタンでエミュレーター起動

# Metro bundlerの起動（新しいターミナル）
npm start

# 別のターミナルでAndroidアプリを起動
npm run android

# 初回ビルドは5-10分かかる場合があります
```

#### 起動確認
- [ ] エミュレーターが正常に起動している
- [ ] Metro bundlerが起動している
- [ ] アプリが正常にインストール・起動している
- [ ] ホーム画面が表示されている

## 📱 2. 動作確認

### 2.1 基本動作の確認

#### アプリの起動確認
1. AVDまたは実機でアプリが正常に起動することを確認
2. スプラッシュスクリーンが表示されることを確認
3. ホーム画面が正常に読み込まれることを確認

#### ウォレット接続のテスト
1. **Connect Wallet**ボタンをタップ
2. Mobile Wallet Adapterが起動することを確認
3. テスト用ウォレット（Phantom、Solflare等）で接続

### 2.2 Solana Mobile Stack機能のテスト

#### 必要なアプリのインストール
```bash
# Solana Mobile Stack開発用アプリ
# Google Play StoreまたはGitHubから以下をインストール:
# - Phantom Wallet (Mobile Wallet Adapter対応版)
# - Solflare Wallet (Mobile Wallet Adapter対応版)
```

#### ウォレット機能のテスト
1. **残高表示**: USDC/SOL残高が正しく表示されることを確認
2. **QRコード生成**: 支払い用QRコードが正常に生成されることを確認
3. **QRコードスキャン**: カメラでQRコードを読み取れることを確認

### 2.3 信用スコア機能のテスト

#### オンチェーンデータの評価
1. **信用スコア計算**: ウォレットアドレスから信用スコアが算出されることを確認
2. **取引履歴分析**: 過去の取引履歴が正しく分析されることを確認
3. **スコア表示**: 計算されたスコアがUIに表示されることを確認

### 2.4 決済機能のテスト

#### テスト用トークンの取得
```bash
# Solana Devnetでテスト用SOLを取得
solana airdrop 2 [your-wallet-address] --url devnet

# テスト用USDCの取得（Solana faucet使用）
# https://spl-token-faucet.com でUSDCを取得
```

#### 決済フローのテスト
1. **QR決済**: QRコードを使った支払いが正常に動作することを確認
2. **P2P送金**: ユーザー間の送金が正常に処理されることを確認
3. **トランザクション確認**: 取引がブロックチェーンで確認されることを確認

## 🧪 3. デバッグとログ確認

### 3.1 React Nativeデバッガーの使用

```bash
# Flipperでのデバッグ（推奨）
npx flipper

# React Native Debuggerの使用
# Chrome Dev Toolsでのデバッグも可能
```

### 3.2 ログの確認

```bash
# Androidログの確認
npx react-native log-android

# またはadbコマンドで直接確認
adb logcat | grep "ReactNativeJS"
```

### 3.3 Supabaseデータベースの確認

1. Supabaseダッシュボードで**Table Editor**を開く
2. 各テーブル（users, credit_scores, transactions等）のデータを確認
3. **Logs**セクションでAPI呼び出しを監視

## 🔧 4. トラブルシューティング

### よくある問題と解決方法

#### Metro bundlerが起動しない
```bash
# キャッシュをクリア
npx react-native start --reset-cache

# node_modulesを再インストール
rm -rf node_modules && npm install
```

#### Androidビルドエラー
```bash
# Gradleキャッシュをクリア
cd android && ./gradlew clean && cd ..

# Androidプロジェクトをクリーンビルド
npm run clean:android
npm run android
```

#### ウォレット接続エラー
1. **Mobile Wallet Adapter対応ウォレット**がインストールされているか確認
2. **Devnetモード**になっているか確認
3. **アプリ権限**（インターネット、カメラ等）が許可されているか確認

#### Supabase接続エラー
1. **環境変数**が正しく設定されているか確認
2. **Row Level Security**ポリシーが正しく設定されているか確認
3. **API Keys**の権限が適切か確認

## 📦 5. APKビルドと配布

### 5.1 デバッグAPKの作成

```bash
# デバッグ用APKを作成
npm run build:android-debug

# APKファイルの場所
# android/app/build/outputs/apk/debug/app-debug.apk
```

### 5.2 リリースAPKの作成

```bash
# リリース用APKを作成（要: キーストア設定）
npm run build:android

# APKファイルの場所
# android/app/build/outputs/apk/release/app-release.apk
```

### 5.3 Solana dApp Storeへの準備

1. **APKファイル**の準備
2. **アプリアイコン**の準備（512x512px）
3. **スクリーンショット**の準備（複数サイズ）
4. **アプリ説明文**の準備（英語・日本語）

## ✅ 6. 最終チェックリスト

### 開発環境
- [ ] Node.js 18+ インストール済み
- [ ] Android Studio セットアップ完了
- [ ] ANDROID_HOME 環境変数設定済み
- [ ] AVD 作成済み（API 31+）

### プロジェクト設定
- [ ] 依存関係インストール完了
- [ ] Supabaseプロジェクト作成済み
- [ ] データベーススキーマ適用済み
- [ ] 環境変数設定済み

### 機能テスト
- [ ] アプリ起動確認
- [ ] ウォレット接続テスト
- [ ] 残高表示テスト
- [ ] QRコード機能テスト
- [ ] 信用スコア計算テスト
- [ ] 決済機能テスト

### APKビルド
- [ ] デバッグAPK作成成功
- [ ] 実機での動作確認
- [ ] リリースAPK作成準備

## 🎯 次のステップ

環境構築が完了したら、以下のドキュメントと開発フェーズに進んでください：

### 📚 関連ドキュメント
1. **[installation-guide.md](./installation-guide.md)** - 詳細な環境構築手順
2. **[testing-guide.md](./testing-guide.md)** - 包括的なテスト手順
3. **[tech-stack.md](./tech-stack.md)** - 技術仕様とアーキテクチャ

### 🚀 開発フェーズ
1. **UI/UXの改善**: React Native Paperコンポーネントのカスタマイズ
2. **Solana Pay統合**: QR決済フローの最適化
3. **信用スコア精度向上**: オンチェーンデータ分析の改善
4. **BONK統合**: ボーナス賞金獲得のための機能追加
5. **パフォーマンス最適化**: レスポンス速度とバッテリー消費の改善

ハッカソン成功を祈っています！🏆