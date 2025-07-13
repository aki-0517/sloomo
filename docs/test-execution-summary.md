# テスト実行サマリー

## テストコマンド一覧

### 基本テストコマンド

| コマンド | 対象 | 実行時間目安 | 説明 |
|---------|------|------------|------|
| `yarn test:unit` | ユニットテスト | 30-60秒 | コア機能の個別テスト |
| `yarn test:integration` | 統合テスト | 2-5分 | 完全なフロー統合テスト |
| `yarn test:jupiter` | Jupiterテスト | 2-3分 | Jupiter統合特化テスト |
| `yarn test:all` | 全テスト | 3-8分 | 全テスト実行 |

### 追加テストコマンド

| コマンド | 機能 | 使用場面 |
|---------|------|----------|
| `yarn test:watch` | ウォッチモード | 開発中の継続テスト |
| `yarn test:coverage` | カバレッジ計測 | コードカバレッジ確認 |
| `yarn test` | Anchorテスト | 従来のテスト実行 |

## テスト内容別実行コマンド

### 1. ユニットテスト実行

```bash
# 全ユニットテスト実行
yarn test:unit

# 特定のテストファイル実行
yarn run ts-mocha -p ./tsconfig.json tests/unit/portfolio_core.test.ts
yarn run ts-mocha -p ./tsconfig.json tests/unit/jupiter_utils.test.ts

# ドライラン（実際に実行せずテスト構造確認）
yarn test:unit --dry-run
```

**実行内容**:
- Portfolio Core Tests: 29テストケース
- Jupiter Utils Tests: 12テストケース
- **合計**: 41テストケース

### 2. 統合テスト実行

```bash
# 全統合テスト実行
yarn test:integration

# 特定のテストファイル実行
yarn run ts-mocha -p ./tsconfig.json tests/integration/real_jupiter_integration.test.ts
```

**実行内容**:
- 完全なポートフォリオ管理フロー
- エラーケース統合テスト
- 実際のトークン残高確認
- **合計**: 10テストケース

### 3. Jupiterリバランステスト実行

```bash
# Jupiterリバランステスト実行
yarn test:jupiter

# 詳細出力で実行
yarn test:jupiter --reporter spec
```

**実行内容**:
- 実際の資産移動を伴うJupiterリバランス
- Jupiterクォート記録機能
- 複数トークンでのリバランスシナリオ
- **合計**: 4テストケース

## 実行前準備

### 1. 環境変数設定

```bash
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json
```

### 2. Solanaウォレット準備

```bash
# ウォレット作成（未作成の場合）
solana-keygen new --outfile ~/.config/solana/id.json

# devnetに切り替え
solana config set --url devnet

# テスト用SOL取得
solana airdrop 5
```

### 3. コントラクトビルド・デプロイ

```bash
# コントラクトビルド
anchor build

# devnetにデプロイ
anchor deploy --provider.cluster devnet
```

## テスト実行例

### 成功例

```bash
$ yarn test:unit

Jupiter Utils Unit Tests
  スワップ操作計算
    ✔ リバランスが不要な場合は空の操作を返す
    ✔ 配分増加が必要な場合は購入操作を生成する
    ...
  
Portfolio Core Unit Tests
  ポートフォリオ初期化
    ✔ 正常なパラメータでポートフォリオを初期化できる
    ✔ 配分の合計が100%を超える場合エラーになる
    ...

  29 passing (45s)
```

### エラー例と対処法

#### 1. SOL不足エラー
```bash
Error: insufficient funds for spend
```
**対処法**:
```bash
solana airdrop 2
```

#### 2. プログラム未デプロイエラー
```bash
Error: Account does not exist
```
**対処法**:
```bash
anchor build
anchor deploy --provider.cluster devnet
```

#### 3. エアドロップ制限エラー
```bash
Error: 429 Too Many Requests
```
**対処法**:
- 時間をおいて再実行
- https://faucet.solana.com を使用

## 推奨テスト実行フロー

### 開発時

```bash
# 1. ユニットテストで基本機能確認
yarn test:unit

# 2. 問題なければ統合テスト実行
yarn test:integration

# 3. Jupiter機能確認
yarn test:jupiter
```

### デプロイ前

```bash
# 1. 全テスト実行
yarn test:all

# 2. カバレッジ確認
yarn test:coverage

# 3. ビルド確認
anchor build
```

### CI/CD

```bash
# 1. ユニットテストのみ（SOL制限対応）
yarn test:unit

# 2. 静的解析
yarn lint

# 3. ビルド確認
anchor build
```

## パフォーマンス指標

### 実行時間

| テストタイプ | 最小時間 | 平均時間 | 最大時間 |
|-------------|---------|---------|---------|
| ユニットテスト | 30秒 | 45秒 | 60秒 |
| 統合テスト | 2分 | 3分 | 5分 |
| Jupiterテスト | 2分 | 2.5分 | 3分 |
| 全テスト | 3分 | 5分 | 8分 |

### リソース使用量

- **SOL消費**: テストあたり0.01-0.05 SOL
- **RPC呼び出し**: 50-200回/テスト
- **メモリ使用量**: 100-500MB

## トラブルシューティング

### よくある問題

1. **ネットワーク接続エラー**
   - devnet RPC の応答確認
   - インターネット接続確認

2. **タイムアウトエラー**
   - テストタイムアウト時間調整
   - ネットワーク状況確認

3. **アカウント状態エラー**
   - ウォレット残高確認
   - プログラムデプロイ状況確認

### ログの見方

```bash
# 詳細ログ出力
yarn test:all --reporter spec

# 失敗時のデバッグ情報
yarn test:all --bail --reporter tap
```

## 注意事項

1. **devnet制限**: エアドロップ制限があるため、連続実行時は注意
2. **実行順序**: 統合テストは状態を変更するため、順序を考慮
3. **クリーンアップ**: テスト間でのアカウント状態リセット
4. **Mock vs Real**: 現在はdevnet実行、将来的にはmock対応予定

---

**最終更新**: 2024年12月
**バージョン**: v0.1.0