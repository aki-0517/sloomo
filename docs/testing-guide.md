# Sloomo Portfolio Contract テストガイド

## 概要

このドキュメントでは、Sloomo Portfolioスマートコントラクトのテストスイートについて説明します。テストは **ユニットテスト** と **統合テスト** に分かれており、実際のJupiter API統合を含む包括的なテストカバレッジを提供しています。

## テスト構成

### ディレクトリ構造

```
tests/
├── unit/                          # ユニットテスト
│   ├── portfolio_core.test.ts     # ポートフォリオコア機能
│   └── jupiter_utils.test.ts      # Jupiter ユーティリティ関数
├── integration/                   # 統合テスト
│   └── real_jupiter_integration.test.ts  # 実際のJupiter統合
└── jupiter_integration.ts         # Jupiterリバランステスト
```

## テスト実行方法

### 1. 環境設定

テスト実行前に以下の環境変数が設定されていることを確認してください：

```bash
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json
```

### 2. 利用可能なテストコマンド

#### 個別テスト実行

```bash
# ユニットテストのみ実行
yarn test:unit

# 統合テストのみ実行
yarn test:integration

# Jupiterリバランステストのみ実行
yarn test:jupiter

# 全テスト実行
yarn test:all
```

#### その他のテストコマンド

```bash
# ウォッチモード（ファイル変更時に自動実行）
yarn test:watch

# カバレッジ計測付きテスト実行
yarn test:coverage

# 従来のAnchorテスト実行
yarn test
```

### 3. テスト実行例

```bash
# 基本的なテスト実行
cd contract
yarn test:unit

# 詳細な出力でテスト実行
yarn test:all --reporter spec

# 特定のテストファイルのみ実行
yarn run ts-mocha -p ./tsconfig.json tests/unit/portfolio_core.test.ts
```

## テスト内容詳細

### ユニットテスト

#### 1. Portfolio Core Tests (`tests/unit/portfolio_core.test.ts`)

**目的**: ポートフォリオの基本機能を個別にテストします。

**テスト項目**:

##### ポートフォリオ初期化
- ✅ 正常なパラメータでポートフォリオを初期化できる
- ✅ 配分の合計が100%を超える場合エラーになる
- ✅ 空の配分でポートフォリオを初期化できる
- ✅ 最大配分数でポートフォリオを初期化できる
- ✅ 同じユーザーが複数回初期化しようとするとエラーになる

##### 投資操作
- ✅ 正常に投資を追加できる
- ✅ 存在しないトークンへの投資でエラーになる
- ✅ ゼロ金額の投資でエラーになる

##### 引出操作
- ✅ 正常に引出できる
- ✅ 残高不足で引出エラーになる
- ✅ 存在しないトークンからの引出でエラーになる

##### 利回り更新
- ✅ 正常に利回りを更新できる
- ✅ 存在しないトークンの利回り更新でエラーになる
- ✅ 空の利回り更新でエラーになる

##### Jupiter クォート記録
- ✅ 正常にクォート情報を記録できる
- ✅ 無効なパラメータでクォート記録を拒否する

**実行コマンド**:
```bash
yarn test:unit
```

#### 2. Jupiter Utils Tests (`tests/unit/jupiter_utils.test.ts`)

**目的**: Jupiter統合のユーティリティ関数とロジックをテストします。

**テスト項目**:

##### スワップ操作計算
- ✅ リバランスが不要な場合は空の操作を返す
- ✅ 配分増加が必要な場合は購入操作を生成する
- ✅ 新しいトークンの投資が必要な場合は購入操作を生成する
- ✅ 複数トークンの複雑なリバランス操作を正しく計算する
- ✅ ゼロ金額の操作は生成されない

##### 共通ミント定数
- ✅ devnet USDCアドレスが正しい
- ✅ WSOLアドレスが正しい
- ✅ devnet USDTアドレスが正しい

##### パーセンテージ計算
- ✅ ベーシスポイントから正しい金額を計算する
- ✅ 小数点以下は切り捨てられる
- ✅ ゼロ値での計算が正しく動作する

##### エラーハンドリング
- ✅ 無効なPublicKeyでエラーになる
- ✅ 負の金額での計算を処理する

**実行コマンド**:
```bash
yarn run ts-mocha -p ./tsconfig.json tests/unit/jupiter_utils.test.ts
```

### 統合テスト

#### 1. Real Jupiter Integration Tests (`tests/integration/real_jupiter_integration.test.ts`)

**目的**: 実際のJupiter統合を含む完全なポートフォリオ管理フローをテストします。

**テスト項目**:

##### 完全なポートフォリオ管理フロー
- ✅ **ポートフォリオを初期化し、投資を行い、リバランスする**
  - ポートフォリオ初期化（AAPL 60%, GOOGL 40%）
  - 初期投資実行（600 + 400 = 1000トークン）
  - ポートフォリオ状態確認
  - 利回り更新（AAPL 5%, GOOGL 7.5%）
  - リバランス実行（AAPL 70%, GOOGL 30%）
  - リバランス後の状態確認

- ✅ **Jupiter クォート記録機能をテストする**
  - Jupiter APIクォート情報のオンチェーン記録
  - イベント発行の確認

- ✅ **複数回のリバランス操作を連続で実行する**
  - 最初のリバランス（50-50分割）
  - 2回目のリバランス（80-20分割）
  - 連続実行での状態整合性確認

##### エラーケース統合テスト
- ✅ 無効な配分でリバランスエラーになる
- ✅ リバランス不要な場合にエラーになる
- ✅ 権限のないユーザーでエラーになる

##### 実際のトークン残高確認
- ✅ トークンアカウントの残高が正しく更新される
- ✅ ポートフォリオの総価値が実際の残高と整合する

**実行コマンド**:
```bash
yarn test:integration
```

#### 2. Jupiter Integration Tests (`tests/jupiter_integration.ts`)

**目的**: Jupiterリバランス機能の基本的な動作をテストします。

**テスト項目**:

##### 実際の資産移動を伴うJupiterリバランス
- ✅ ポートフォリオを初期化する
- ✅ 実際のJupiterリバランスを実行する
- ✅ Jupiterクォート記録をテストする
- ✅ 複数トークンでのリバランスシナリオ

**実行コマンド**:
```bash
yarn test:jupiter
```

## テスト環境要件

### 1. ネットワーク設定

- **使用ネットワーク**: Solana Devnet
- **RPC エンドポイント**: `https://api.devnet.solana.com`
- **必要なSOL**: テストアカウントあたり2-5 SOL（エアドロップで取得）

### 2. 依存関係

```json
{
  "devDependencies": {
    "chai": "^4.3.4",
    "mocha": "^9.0.3",
    "ts-mocha": "^10.0.0",
    "@types/chai": "^4.3.0",
    "@types/mocha": "^9.0.0"
  }
}
```

### 3. ウォレット設定

テスト実行には有効なSolanaウォレットが必要です：

```bash
# ウォレット作成（未作成の場合）
solana-keygen new --outfile ~/.config/solana/id.json

# devnetに切り替え
solana config set --url devnet

# テスト用SOLを取得
solana airdrop 5
```

## テスト実行時の注意点

### 1. エアドロップ制限

devnetでのSOLエアドロップには制限があります：

- **制限**: 1日あたりの上限あり
- **対処法**: 複数のウォレットを使用するか、時間をおいて再実行
- **エラー例**: `429 Too Many Requests` または `airdrop limit reached`

### 2. ネットワーク接続

- テスト実行時は安定したインターネット接続が必要
- devnet RPC の応答速度により実行時間が変動する可能性があります

### 3. Jupiter API統合

現在の実装では：

- **オンチェーン**: スワップ操作の計算とログ出力のみ
- **実際のスワップ**: クライアントサイドで別途実行が必要
- **目的**: コントラクトロジックの検証とイベント発行の確認

## トラブルシューティング

### よくあるエラーと対処法

#### 1. `Account does not exist`
```bash
# 原因: プログラムがデプロイされていない
# 対処法:
anchor build
anchor deploy --provider.cluster devnet
```

#### 2. `429 Too Many Requests`
```bash
# 原因: devnet エアドロップ制限
# 対処法: 時間をおいて再実行、または faucet.solana.com を使用
```

#### 3. `Simulation failed`
```bash
# 原因: トランザクション失敗
# 対処法: ログを確認し、アカウント状態やパラメータを検証
```

#### 4. `insufficient funds`
```bash
# 原因: SOL残高不足
# 対処法:
solana balance
solana airdrop 2
```

### ログの見方

テスト実行時のログには以下の情報が含まれます：

```
=== 実際のJupiter統合テスト セットアップ開始 ===
Portfolio PDA: [アドレス]
USDC Mint: [アドレス]
Test Token A Mint: [アドレス]
✅ 1. ポートフォリオ初期化完了
✅ 2. 初期投資完了
...
計算されたスワップ操作数: 2
スワップ操作 1/2 の詳細:
売却指示: [mint] から [mint] へ [amount] トークン
```

## パフォーマンス指標

### 実行時間目安

- **ユニットテスト**: 30-60秒
- **統合テスト**: 2-5分
- **全テスト**: 3-8分

※ネットワーク状況により変動

### リソース使用量

- **SOL消費**: テストあたり0.01-0.05 SOL
- **RPC呼び出し**: テストあたり50-200回
- **メモリ使用量**: 100-500MB

## 継続的インテグレーション

### GitHub Actionsでのテスト実行

```yaml
name: Contract Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: yarn install
      - run: anchor build
      - run: yarn test:unit
      # 注意: 統合テストはSOL制限のため本番CIでは制限的
```

## 今後の拡張予定

### 1. モックテスト

実際のJupiter APIを使用しないモックベースのテストの追加を予定しています。

### 2. パフォーマンステスト

大量データでのポートフォリオ操作のパフォーマンステストを予定しています。

### 3. セキュリティテスト

セキュリティホールや脆弱性のテストケースを追加予定です。

---

**注意**: このテストスイートは開発・検証目的です。実際のproduction環境での使用前には追加的なテストとコードレビューが必要です。