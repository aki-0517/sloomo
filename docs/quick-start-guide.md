# Sloomo Portfolio クイックスタートガイド

## 5分で始めるdevnet操作

### 1. 環境準備（1分）

```bash
# Solana devnetに切り替え
solana config set --url devnet

# ウォレット確認
solana address

# SOL残高確認
solana balance

# SOLが不足している場合
solana airdrop 5
```

### 2. プロジェクト準備（1分）

```bash
# プロジェクトディレクトリに移動
cd /path/to/sloomo/contract

# 依存関係インストール
yarn install

# コントラクトビルド
anchor build

# devnetにデプロイ（必要に応じて）
anchor deploy --provider.cluster devnet
```

### 3. ポートフォリオ作成（1分）

```bash
# ポートフォリオ初期化（SOL 60% + USDC 40%）
yarn portfolio:init

# 結果確認
yarn portfolio:check
```

### 4. 投資実行（1分）

```bash
# SOLに1 SOL投資
yarn portfolio:invest SOL 1.0

# USDCに0.5 SOL相当投資
yarn portfolio:invest USDC 0.5

# 投資後の状態確認
yarn portfolio:check
```

### 5. リバランス実行（1分）

```bash
# 利回り更新
yarn portfolio:update-yields

# リバランス実行（0.5%スリッページ）
yarn portfolio:rebalance 50

# 最終状態確認
yarn portfolio:check
```

## 利用可能なコマンド一覧

### 基本操作

| コマンド | 機能 | 使用例 |
|---------|------|--------|
| `yarn portfolio:init` | ポートフォリオ初期化 | 初回のみ実行 |
| `yarn portfolio:check` | 状態確認 | いつでも実行可能 |
| `yarn portfolio:invest` | 投資実行 | `yarn portfolio:invest SOL 1.5` |
| `yarn portfolio:rebalance` | リバランス実行 | `yarn portfolio:rebalance 100` |
| `yarn portfolio:update-yields` | 利回り更新 | 定期実行推奨 |

### 開発・テスト

| コマンド | 機能 |
|---------|------|
| `yarn test:unit` | ユニットテスト |
| `yarn test:integration` | 統合テスト |
| `yarn test:jupiter` | Jupiterテスト |
| `yarn build` | コントラクトビルド |
| `yarn deploy:devnet` | devnetデプロイ |

## トラブル時の対処法

### よくあるエラー

**1. ポートフォリオが見つからない**
```bash
❌ ポートフォリオが見つかりません
💡 まず 'yarn portfolio:init' を実行してください
```

**2. SOL残高不足**
```bash
❌ insufficient funds
💡 'solana airdrop 5' でSOLを取得してください
```

**3. プログラムが見つからない**
```bash
❌ Account does not exist
💡 'anchor deploy --provider.cluster devnet' を実行してください
```

**4. エアドロップ制限**
```bash
❌ 429 Too Many Requests
💡 時間をおいて再実行するか、faucet.solana.com を使用してください
```

### デバッグ方法

```bash
# 詳細ログ出力
RUST_LOG=debug yarn portfolio:check

# トランザクション確認
solana confirm <TRANSACTION_SIGNATURE>

# Explorer確認
# https://explorer.solana.com/tx/<TX_SIGNATURE>?cluster=devnet
```

## 実用的な使用例

### 例1: 基本的なポートフォリオ管理

```bash
# 1. 初期化
yarn portfolio:init

# 2. 初期投資
yarn portfolio:invest SOL 2.0
yarn portfolio:invest USDC 1.0

# 3. 状態確認
yarn portfolio:check

# 4. 利回り更新
yarn portfolio:update-yields

# 5. リバランス
yarn portfolio:rebalance

# 6. 最終確認
yarn portfolio:check
```

### 例2: 継続的な投資とリバランス

```bash
# 定期投資（週次）
yarn portfolio:invest SOL 0.5

# 月次利回り更新
yarn portfolio:update-yields

# 四半期リバランス
yarn portfolio:rebalance 50

# パフォーマンス確認
yarn portfolio:check
```

### 例3: エラー回復手順

```bash
# 1. 環境確認
solana config get
solana balance

# 2. プログラム状態確認
solana account EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC

# 3. 必要に応じて再デプロイ
anchor build
anchor deploy --provider.cluster devnet

# 4. ポートフォリオ状態確認
yarn portfolio:check
```

## セキュリティとベストプラクティス

### ⚠️ 重要な注意事項

1. **devnet専用**: このガイドはdevnet専用です
2. **テスト用途**: 実際の資産は使用しないでください
3. **秘密鍵管理**: `~/.config/solana/id.json` を安全に管理してください
4. **Jupiter統合**: 実際のスワップはクライアントサイドで別途実行が必要です

### 推奨事項

- 定期的なバックアップ
- トランザクション履歴の記録
- 大きな操作前の状態確認
- エラーログの保存

## リソースリンク

- **コントラクトExplorer**: https://explorer.solana.com/account/EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC?cluster=devnet
- **Solana Faucet**: https://faucet.solana.com
- **Jupiter API**: https://docs.jup.ag/
- **詳細ドキュメント**: [devnet-cli-guide.md](./devnet-cli-guide.md)

---

**🚀 準備完了！** 上記の手順でdevnet環境でのポートフォリオ管理を開始できます。