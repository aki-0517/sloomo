# Devnet CLI 操作ガイド

## 概要

このドキュメントでは、Sloomo Portfolio スマートコントラクトをdevnet環境でターミナルから直接操作する方法を説明します。

## 基本情報

### コントラクト情報
- **プログラムID**: `EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC`
- **ネットワーク**: Solana Devnet
- **RPC エンドポイント**: `https://api.devnet.solana.com`

### 必要なツール
- Solana CLI
- Anchor CLI
- Node.js & yarn

## 環境設定

### 1. Solana CLI設定

```bash
# devnetに切り替え
solana config set --url devnet

# ウォレット設定確認
solana config get

# 現在の設定表示
Config File: ~/.config/solana/cli/config.yml
RPC URL: https://api.devnet.solana.com
WebSocket URL: wss://api.devnet.solana.com/
Keypair Path: ~/.config/solana/id.json
Commitment: confirmed
```

### 2. ウォレット準備

```bash
# 新しいウォレットを作成（必要に応じて）
solana-keygen new --outfile ~/.config/solana/id.json

# 公開鍵確認
solana address

# 残高確認
solana balance

# devnet SOLを取得
solana airdrop 5
```

### 3. プロジェクト環境設定

```bash
# プロジェクトディレクトリに移動
cd /path/to/sloomo/contract

# 依存関係インストール
yarn install

# コントラクトビルド
anchor build

# IDL生成確認
ls -la target/idl/sloomo_portfolio.json
```

## 主要機能の呼び出し方法

### 1. ポートフォリオ初期化

#### TypeScript での実行

```typescript
// scripts/initialize_portfolio.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";

async function initializePortfolio() {
  // プロバイダー設定
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // Portfolio PDA生成
  const [portfolioPda] = await PublicKey.findProgramAddress(
    [Buffer.from("portfolio"), user.publicKey.toBuffer()],
    program.programId
  );

  // 初期配分設定
  const initialAllocations = [
    {
      mint: new PublicKey("So11111111111111111111111111111111111111112"), // WSOL
      symbol: "SOL",
      targetPercentage: 6000, // 60%
    },
    {
      mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), // devnet USDC
      symbol: "USDC",
      targetPercentage: 4000, // 40%
    },
  ];

  // ポートフォリオ初期化実行
  const tx = await program.methods
    .initializePortfolio({ initialAllocations })
    .accounts({
      portfolio: portfolioPda,
      owner: user.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("ポートフォリオ初期化完了:", tx);
  console.log("Portfolio PDA:", portfolioPda.toString());
}

initializePortfolio().catch(console.error);
```

#### 実行コマンド

```bash
# スクリプト実行
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
yarn run ts-node scripts/initialize_portfolio.ts
```

### 2. USDC Deposit

#### TypeScript での実行

```typescript
// scripts/deposit_usdc.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

async function depositUsdc() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // Portfolio PDA取得
  const [portfolioPda] = await PublicKey.findProgramAddress(
    [Buffer.from("portfolio"), user.publicKey.toBuffer()],
    program.programId
  );

  // USDC設定
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const userUsdcAccount = await getAssociatedTokenAddress(
    usdcMint,
    user.publicKey
  );

  // Portfolio USDC vault PDA
  const [portfolioUsdcVault] = await PublicKey.findProgramAddress(
    [Buffer.from("vault"), portfolioPda.toBuffer(), usdcMint.toBuffer()],
    program.programId
  );

  // USDC deposit実行
  const amount = 1000 * 1e6; // 1000 USDC
  const tx = await program.methods
    .depositUsdc(new anchor.BN(amount))
    .accounts({
      portfolio: portfolioPda,
      userUsdcAccount,
      portfolioUsdcVault,
      usdcMint,
      owner: user.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("USDC deposit完了:", tx);
}

depositUsdc().catch(console.error);
```

### 3. アロケーション追加/編集

#### TypeScript での実行

```typescript
// scripts/add_allocation.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

async function addAllocation() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // Portfolio PDA取得
  const [portfolioPda] = await PublicKey.findProgramAddress(
    [Buffer.from("portfolio"), user.publicKey.toBuffer()],
    program.programId
  );

  // アロケーション追加
  const tx = await program.methods
    .addOrUpdateAllocation(
      new PublicKey("So11111111111111111111111111111111111111112"), // SOL
      "WSOL",
      3000 // 30%
    )
    .accounts({
      portfolio: portfolioPda,
      owner: user.publicKey,
    })
    .rpc();

  console.log("アロケーション追加完了:", tx);
}

addAllocation().catch(console.error);
```

### 4. リバランス実行

#### TypeScript での実行

```typescript
// scripts/jupiter_rebalance.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

async function jupiterRebalance() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // Portfolio PDA取得
  const [portfolioPda] = await PublicKey.findProgramAddress(
    [Buffer.from("portfolio"), user.publicKey.toBuffer()],
    program.programId
  );

  // USDC設定
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const usdcTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    user.publicKey
  );

  // 目標配分設定
  const targetAllocations = [
    {
      mint: new PublicKey("So11111111111111111111111111111111111111112"),
      targetPercentage: 7000, // 70%
    },
    {
      mint: usdcMint,
      targetPercentage: 3000, // 30%
    },
  ];

  // リバランス実行
  const tx = await program.methods
    .realJupiterRebalance(targetAllocations, 50) // 0.5% slippage
    .accounts({
      portfolio: portfolioPda,
      owner: user.publicKey,
      usdcTokenAccount: usdcTokenAccount,
      usdcMint: usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Jupiterリバランス完了:", tx);
}

jupiterRebalance().catch(console.error);
```

### 4. ポートフォリオ状態確認

#### TypeScript での実行

```typescript
// scripts/check_portfolio.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

async function checkPortfolio() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // Portfolio PDA取得
  const [portfolioPda] = await PublicKey.findProgramAddress(
    [Buffer.from("portfolio"), user.publicKey.toBuffer()],
    program.programId
  );

  try {
    // ポートフォリオデータ取得
    const portfolioData = await program.account.portfolio.fetch(portfolioPda);

    console.log("=== ポートフォリオ情報 ===");
    console.log("所有者:", portfolioData.owner.toString());
    console.log("総価値:", portfolioData.totalValue.toString());
    console.log("最後のリバランス:", new Date(portfolioData.lastRebalance.toNumber() * 1000));
    console.log("リバランス中:", portfolioData.isRebalancing);
    
    console.log("\n=== 配分情報 ===");
    portfolioData.allocations.forEach((allocation, index) => {
      console.log(`${index + 1}. ${allocation.symbol}`);
      console.log(`   ミント: ${allocation.mint.toString()}`);
      console.log(`   現在額: ${allocation.currentAmount.toString()}`);
      console.log(`   目標比率: ${allocation.targetPercentage / 100}%`);
      console.log(`   APY: ${allocation.apy / 100}%`);
      console.log("");
    });

    console.log("=== パフォーマンス履歴 ===");
    console.log("履歴数:", portfolioData.performanceHistory.length);
    
    if (portfolioData.performanceHistory.length > 0) {
      const latest = portfolioData.performanceHistory[portfolioData.performanceHistory.length - 1];
      console.log("最新の記録:");
      console.log(`  時刻: ${new Date(latest.timestamp.toNumber() * 1000)}`);
      console.log(`  価値: ${latest.totalValue.toString()}`);
      console.log(`  成長率: ${latest.growthRate / 100}%`);
    }

  } catch (error) {
    console.error("ポートフォリオが見つかりません:", error.message);
    console.log("まず initialize_portfolio を実行してください");
  }
}

checkPortfolio().catch(console.error);
```

### 5. USDC残高確認

#### TypeScript での実行

```typescript
// scripts/check_usdc_balance.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

async function checkUsdcBalance() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const connection = provider.connection;
  const user = provider.wallet;

  // USDC設定
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const usdcTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    user.publicKey
  );

  try {
    // USDC残高取得
    const balance = await connection.getTokenAccountBalance(usdcTokenAccount);
    
    console.log("=== USDC残高情報 ===");
    console.log("ユーザー:", user.publicKey.toString());
    console.log("USDCアカウント:", usdcTokenAccount.toString());
    console.log("残高:", balance.value.uiAmount, "USDC");
    console.log("生の残高:", balance.value.amount);
    console.log("小数点以下桁数:", balance.value.decimals);
    
  } catch (error) {
    console.error("USDCアカウントが見つかりません:", error.message);
    console.log("devnet faucetからUSDCを取得してください");
  }
}

checkUsdcBalance().catch(console.error);
```

## 一括実行スクリプト

### package.json への追加

```json
{
  "scripts": {
    "portfolio:init": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/initialize_portfolio.ts",
    "portfolio:deposit": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/deposit_usdc.ts",
    "portfolio:add-allocation": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/add_allocation.ts",
    "portfolio:rebalance": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/jupiter_rebalance.ts",
    "portfolio:check": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/check_portfolio.ts",
    "portfolio:check-usdc": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/check_usdc_balance.ts"
  }
}
```

### 実行例

```bash
# ポートフォリオ初期化
yarn portfolio:init

# USDCをdeposit
yarn portfolio:deposit

# 株式トークン選択・%設定してアロケーション作成
yarn portfolio:add-allocation

# USDC残高確認
yarn portfolio:check-usdc

# 状態確認
yarn portfolio:check

# リバランス実行
yarn portfolio:rebalance

# 最終状態確認
yarn portfolio:check
```

## Anchor CLI での直接呼び出し

### 1. IDL使用

```bash
# IDLを使用してメソッド呼び出し
anchor run initialize-portfolio

# カスタムスクリプト実行
anchor run invest --provider.cluster devnet

# テスト実行
anchor test --skip-deploy --provider.cluster devnet
```

### 2. 生のトランザクション

```bash
# Solana CLI を使用した直接呼び出し（上級者向け）
solana program invoke \
  --program-id EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC \
  --instruction-data <base58-encoded-data> \
  --account <account1> \
  --account <account2>
```

## トラブルシューティング

### よくあるエラー

#### 1. プログラムが見つからない
```bash
Error: Account EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC not found
```
**対処法:**
```bash
# プログラムの存在確認
solana account EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC

# 再デプロイ
anchor deploy --provider.cluster devnet
```

#### 2. 残高不足
```bash
Error: insufficient funds for transaction
```
**対処法:**
```bash
# SOL残高確認
solana balance

# SOL取得
solana airdrop 5

# または faucet.solana.com を使用
```

#### 3. アカウントが存在しない
```bash
Error: Account does not exist or has no data
```
**対処法:**
```bash
# Portfolio PDAが正しく計算されているか確認
# まず initialize_portfolio を実行
```

#### 4. 権限エラー
```bash
Error: ConstraintHasOne
```
**対処法:**
```bash
# 正しいウォレットを使用しているか確認
solana address

# ウォレットパスの確認
echo $ANCHOR_WALLET
```

### デバッグ方法

#### 1. ログ出力

```bash
# 詳細ログ付きで実行
RUST_LOG=debug yarn portfolio:init

# Anchor ログ
export ANCHOR_LOG=true
```

#### 2. 状態確認

```bash
# プログラムアカウント一覧
solana account EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC

# 特定アカウントの詳細
solana account <PDA_ADDRESS> --output json
```

#### 3. トランザクション確認

```bash
# トランザクション詳細確認
solana confirm <TRANSACTION_SIGNATURE>

# Explorer で確認
# https://explorer.solana.com/tx/<TRANSACTION_SIGNATURE>?cluster=devnet
```

## セキュリティ注意事項

1. **devnet専用**: このガイドはdevnet専用です。mainnetでは使用しないでください
2. **秘密鍵管理**: 秘密鍵ファイルの管理に注意してください
3. **テスト用途**: 実際の資産を扱わないようにしてください
4. **Jupiter統合**: 実際のスワップはクライアントサイドで別途実行が必要です

## 追加リソース

- [Solana CLI ドキュメント](https://docs.solana.com/cli)
- [Anchor ドキュメント](https://project-serum.github.io/anchor/)
- [Solana Explorer (devnet)](https://explorer.solana.com/?cluster=devnet)
- [Jupiter API ドキュメント](https://docs.jup.ag/)

---

**最終更新**: 2024年12月  
**バージョン**: v0.1.0