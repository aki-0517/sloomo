# Testing Guide / テストガイド

Comprehensive testing documentation for Sloomo Portfolio smart contracts.
Sloomo Portfolioスマートコントラクトの包括的テストドキュメント。

## 🧪 Test Overview / テスト概要

This document covers the complete testing suite featuring **unit tests** and **integration tests** with real Jupiter API integration.
ユニットテストと統合テストを含む完全なテストスイートについて説明します。

### Test Structure / テスト構成

```
tests/
├── unit/                               # Unit Tests / ユニットテスト
│   ├── portfolio_core.test.ts         # Portfolio core functionality
│   └── jupiter_utils.test.ts          # Jupiter utility functions
└── integration/                       # Integration Tests / 統合テスト
    └── real_jupiter_integration.test.ts  # Real Jupiter integration
```

## ⚡ Quick Test Execution / クイック実行

### Basic Test Commands / 基本コマンド

| Command | Target | Duration | Description |
|---------|--------|----------|-------------|
| `yarn test:unit` | Unit tests | 30-60s | Individual component testing |
| `yarn test:integration` | Integration tests | 2-5min | Complete flow integration testing |
| `yarn test:jupiter` | Jupiter tests | 2-3min | Jupiter integration specialized testing |
| `yarn test:all` | All tests | 3-8min | Complete test suite execution |

### Environment Setup / 環境設定

Before running tests, ensure these environment variables are set:
テスト実行前に以下の環境変数を設定してください：

```bash
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json
```

### Prerequisites / 前提条件

- **Solana CLI** configured for devnet
- **Anchor CLI** installed and configured
- **Node.js** and **yarn** package manager
- **Active internet connection** for devnet operations
- **SOL balance** in test wallet for transaction fees

### Setup Commands / セットアップコマンド

```bash
# 1. Configure Solana for devnet / devnet設定
solana config set --url devnet

# 2. Check SOL balance (airdrop if needed) / SOL残高確認
solana balance
solana airdrop 5  # if balance is low

# 3. Install dependencies / 依存関係インストール
yarn install

# 4. Build contracts / コントラクトビルド
anchor build
```

## 📋 Test Categories / テストカテゴリ

### 1. Unit Tests (`yarn test:unit`) / ユニットテスト

#### Portfolio Core Tests (`portfolio_core.test.ts`)

**Test Count**: 29 test cases / **テスト数**: 29ケース

**Coverage Areas / カバー範囲**:

##### Portfolio Initialization (8 tests) / ポートフォリオ初期化
- ✅ Normal parameter portfolio initialization / 正常なパラメータでの初期化
- ✅ Error when allocation total exceeds 100% / 配分合計が100%を超える場合のエラー
- ✅ Handling empty allocation arrays / 空の配分配列の処理
- ✅ Maximum allocation stress testing / 最大配分のストレステスト
- ✅ Duplicate initialization prevention / 重複初期化の防止

##### Investment Operations (6 tests) / 投資操作
- ✅ Normal investment execution / 正常な投資実行
- ✅ Investment amount validation / 投資金額の検証
- ✅ Token symbol validation / トークンシンボルの検証
- ✅ Zero amount investment errors / ゼロ金額投資のエラー
- ✅ Portfolio state updates / ポートフォリオ状態の更新

##### Withdrawal Operations (5 tests) / 引出操作
- ✅ Normal withdrawal execution / 正常な引出実行
- ✅ Insufficient balance handling / 残高不足の処理
- ✅ Invalid token symbol errors / 無効なトークンシンボルのエラー
- ✅ Amount validation / 金額検証
- ✅ Portfolio state consistency / ポートフォリオ状態の整合性

##### Yield Management (4 tests) / 利回り管理
- ✅ Yield rate updates / 利回り率の更新
- ✅ Invalid yield data handling / 無効な利回りデータの処理
- ✅ Empty update arrays / 空の更新配列
- ✅ APY calculations / APY計算

##### Jupiter Integration (6 tests) / Jupiter統合
- ✅ Quote recording functionality / クォート記録機能
- ✅ Invalid mint validation / 無効なミントの検証
- ✅ Amount parameter validation / 金額パラメータの検証
- ✅ Slippage parameter handling / スリッページパラメータの処理
- ✅ Event emission verification / イベント発行の検証

### 2. Integration Tests (`yarn test:integration`) / 統合テスト

#### Real Jupiter Integration (`real_jupiter_integration.test.ts`)

**Test Count**: 10 test cases covering complete portfolio management flow
**テスト数**: 完全なポートフォリオ管理フローをカバーする10ケース

**Test Scenarios / テストシナリオ**:

##### Complete Portfolio Management Flow / 完全なポートフォリオ管理フロー
- ✅ Portfolio initialization with custom allocations / カスタム配分でのポートフォリオ初期化
- ✅ Multi-step investment execution / 複数段階の投資実行
- ✅ Portfolio state verification / ポートフォリオ状態の検証
- ✅ Yield rate updates / 利回り率の更新
- ✅ Jupiter rebalancing execution / Jupiterリバランスの実行

##### Error Case Testing / エラーケーステスト
- ✅ Invalid allocation percentage handling / 無効な配分比率の処理
- ✅ Unnecessary rebalancing detection / 不要なリバランスの検出
- ✅ Unauthorized user access prevention / 未認証ユーザーアクセスの防止

## 🎯 Test Execution Examples / 実行例

### Unit Test Execution / ユニットテスト実行

```bash
# Run all unit tests / 全ユニットテスト実行
yarn test:unit

# Expected output example:
# Portfolio Core Unit Tests
#   ✓ Normal parameter portfolio initialization (234ms)
#   ✓ Investment amount validation (189ms)
#   ✓ Yield rate updates (156ms)
# Jupiter Utils Unit Tests
#   ✓ Devnet USDC address verification (45ms)
#   ✓ Complex multi-token rebalancing (78ms)
# 
# ✅ 29 tests passed (5.2s)
```

### Integration Test Execution / 統合テスト実行

```bash
# Run integration tests / 統合テスト実行
yarn test:integration

# Expected output example:
# Real Jupiter Integration Tests
#   ✓ Complete portfolio management flow (4.8s)
#   ✓ Jupiter quote recording functionality (2.1s)
#   ✓ Multiple rebalancing operations (3.2s)
#   ✓ Error case validation (1.9s)
# 
# ✅ 10 tests passed (12.0s)
```

## 🚨 Troubleshooting / トラブルシューティング

### Common Test Errors / よくあるエラー

#### 1. Environment Issues / 環境問題

**Error**: `Provider not found`
```bash
❌ Error: Provider not found
💡 Solution: Check ANCHOR_PROVIDER_URL and ANCHOR_WALLET environment variables
💡 解決法: ANCHOR_PROVIDER_URLとANCHOR_WALLET環境変数を確認
```

**Error**: `Insufficient SOL balance`
```bash
❌ Error: insufficient funds
💡 Solution: solana airdrop 5
💡 解決法: solana airdrop 5
```

#### 2. Network Issues / ネットワーク問題

**Error**: `Connection timeout`
```bash
❌ Error: Failed to connect to devnet
💡 Solution: Check internet connection and devnet status
💡 解決法: インターネット接続とdevnetステータスを確認
```

**Error**: `Rate limiting`
```bash
❌ Error: 429 Too Many Requests
💡 Solution: Wait 30 seconds and retry, or use different RPC endpoint
💡 解決法: 30秒待って再試行、または別のRPCエンドポイントを使用
```

#### 3. Program Issues / プログラム問題

**Error**: `Program not found`
```bash
❌ Error: Account does not exist
💡 Solution: anchor build && anchor deploy --provider.cluster devnet
💡 解決法: anchor build && anchor deploy --provider.cluster devnet
```

### Debug Commands / デバッグコマンド

```bash
# Verbose test output / 詳細テスト出力
RUST_LOG=debug yarn test:unit

# Specific test file execution / 特定テストファイル実行
yarn run ts-mocha tests/unit/portfolio_core.test.ts

# Check anchor configuration / Anchor設定確認
anchor config

# Verify program deployment / プログラムデプロイ確認
solana account EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC --url devnet
```

## 📊 Test Metrics and KPIs / テスト指標とKPI

### Performance Benchmarks / パフォーマンス指標

| Test Type | Target Duration | Actual Average | Pass Rate Target |
|-----------|----------------|----------------|------------------|
| Unit Tests | < 60s | 45s | > 99% |
| Integration Tests | < 5min | 3.2min | > 95% |
| Jupiter Tests | < 3min | 2.1min | > 90% |

### Quality Metrics / 品質指標

- **Code Coverage / コードカバレッジ**: > 90% across all modules
- **Test Reliability / テスト信頼性**: < 1% flaky test rate
- **Performance / パフォーマンス**: No degradation > 10% between runs

## 🎯 Success Criteria / 成功基準

### Test Completion Checklist / テスト完了チェックリスト

- [ ] All unit tests pass consistently / 全ユニットテストが一貫して成功
- [ ] Integration tests cover main user flows / 統合テストが主要ユーザーフローをカバー
- [ ] Error cases are properly handled / エラーケースが適切に処理される
- [ ] Performance requirements are met / パフォーマンス要件が満たされる
- [ ] Coverage targets are achieved / カバレッジ目標が達成される
- [ ] Documentation is up to date / ドキュメントが最新

---

**🧪 Testing Excellence**: This comprehensive testing suite ensures Sloomo Portfolio smart contracts maintain high quality, reliability, and performance standards throughout development and deployment.

**🧪 テストの卓越性**: この包括的なテストスイートにより、Sloomo Portfolioスマートコントラクトが開発からデプロイメントまでの間、高品質、信頼性、パフォーマンス基準を維持することを保証します。