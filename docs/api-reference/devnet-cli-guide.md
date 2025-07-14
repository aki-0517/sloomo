# Devnet CLI 操作ガイド

## 概要

このドキュメントでは、Sloomo Portfolio スマートコントラクトをdevnet環境でターミナルから直接操作する方法を説明します。USDCとSOLの両方の投資に対応しています。

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

### 2. トークン Deposit (USDC/SOL)

#### コマンドライン引数での実行

```bash
# USDC投資
yarn portfolio:deposit 100 USDC

# SOL投資
yarn portfolio:deposit 1 SOL

# デフォルト（USDC）
yarn portfolio:deposit 100
```

#### TypeScript での実行

```typescript
// scripts/deposit_token.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

async function depositToken(amount?: number, tokenType: 'USDC' | 'SOL' = 'USDC') {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // Portfolio PDA取得
  const [portfolioPda] = await PublicKey.findProgramAddress(
    [Buffer.from("portfolio"), user.publicKey.toBuffer()],
    program.programId
  );

  if (tokenType === 'SOL') {
    await depositSol(program, user, portfolioPda, amount);
  } else {
    await depositUsdc(program, user, portfolioPda, amount);
  }
}

async function depositUsdc(program: any, user: any, portfolioPda: PublicKey, amount?: number) {
  // USDC設定
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const userUsdcAccount = await getAssociatedTokenAddress(usdcMint, user.publicKey);
  
  // Portfolio USDC vault PDA
  const [portfolioUsdcVault] = await PublicKey.findProgramAddress(
    [Buffer.from("vault"), portfolioPda.toBuffer(), usdcMint.toBuffer()],
    program.programId
  );

  // 投資金額設定（引数で指定されない場合は残高の半分）
  const userBalance = await program.provider.connection.getTokenAccountBalance(userUsdcAccount);
  const depositAmount = amount || Math.floor((userBalance.value.uiAmount || 0) * 0.5);
  const depositAmountLamports = Math.floor(depositAmount * 1_000_000);

  // USDC deposit実行
  const tx = await program.methods
    .depositUsdc(new anchor.BN(depositAmountLamports))
    .accounts({
      portfolio: portfolioPda,
      userUsdcAccount,
      portfolioUsdcVault,
      usdcMint,
      owner: user.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("USDC deposit完了:", tx);
}

async function depositSol(program: any, user: any, portfolioPda: PublicKey, amount?: number) {
  // wrapped SOL (wSOL) mint address
  const wsolMint = new PublicKey("So11111111111111111111111111111111111111112");
  
  // SOL残高確認
  const userBalance = await program.provider.connection.getBalance(user.publicKey);
  const userBalanceSol = userBalance / LAMPORTS_PER_SOL;
  
  // 投資金額設定（引数で指定されない場合は残高の半分、手数料分を除く）
  const depositAmount = amount || Math.floor((userBalanceSol - 0.01) * 0.5 * 100) / 100;
  const depositAmountLamports = Math.floor(depositAmount * LAMPORTS_PER_SOL);

  // ユーザーのwSOLトークンアカウント取得
  const userWsolAccount = await getAssociatedTokenAddress(wsolMint, user.publicKey);
  
  // ポートフォリオのwSOLボルト PDA取得
  const [portfolioWsolVault] = await PublicKey.findProgramAddress(
    [Buffer.from("vault"), portfolioPda.toBuffer(), wsolMint.toBuffer()],
    program.programId
  );

  // SOL投資実行（wSOLとして既存のdeposit_usdcメソッドを使用）
  const tx = await program.methods
    .depositUsdc(new anchor.BN(depositAmountLamports))
    .accounts({
      portfolio: portfolioPda,
      userUsdcAccount: userWsolAccount,
      portfolioUsdcVault: portfolioWsolVault,
      usdcMint: wsolMint,
      owner: user.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("SOL deposit完了:", tx);
}

// コマンドライン引数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const amount = args[0] ? parseFloat(args[0]) : undefined;
  const tokenType = args[1]?.toUpperCase() as 'USDC' | 'SOL' | undefined;
  return { amount, tokenType: tokenType || 'USDC' };
}

// 実行
if (require.main === module) {
  const { amount, tokenType } = parseArgs();
  depositToken(amount, tokenType).catch(console.error);
}
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

### 5. 残高確認

#### USDC残高確認

```bash
# USDC残高・ボルト確認
yarn portfolio:check-usdc
```

#### SOL残高確認

```bash
# SOL残高・wSOLボルト確認
yarn portfolio:check-sol
```

#### TypeScript での実行

```typescript
// scripts/check_usdc.ts - USDC残高確認
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

async function checkUsdc() {
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
  const userUsdcAccount = await getAssociatedTokenAddress(usdcMint, user.publicKey);
  
  // ユーザーUSDC残高確認
  try {
    const userUsdcAccountInfo = await program.provider.connection.getTokenAccountBalance(userUsdcAccount);
    console.log("USDC残高:", userUsdcAccountInfo.value.uiAmount || 0, "USDC");
  } catch (error) {
    console.log("USDCアカウントが見つかりません");
    console.log("devnet faucetからUSDCを取得してください: https://spl-token-faucet.com/");
  }
}

// scripts/check_sol.ts - SOL残高確認
import { LAMPORTS_PER_SOL, NATIVE_MINT } from "@solana/web3.js";

async function checkSol() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const user = provider.wallet;

  // ネイティブSOL残高
  const solBalance = await program.provider.connection.getBalance(user.publicKey);
  const solBalanceFormatted = solBalance / LAMPORTS_PER_SOL;
  console.log("SOL残高:", solBalanceFormatted.toFixed(6), "SOL");

  // wSOLアカウント確認
  const userWsolAccount = await getAssociatedTokenAddress(NATIVE_MINT, user.publicKey);
  try {
    const wsolAccountInfo = await program.provider.connection.getTokenAccountBalance(userWsolAccount);
    console.log("wSOL残高:", wsolAccountInfo.value.uiAmount || 0, "wSOL");
  } catch (error) {
    console.log("wSOLアカウントが見つかりません（SOL投資時に自動作成されます）");
  }

  if (solBalanceFormatted < 0.01) {
    console.log("SOL残高が少ないです。https://faucet.solana.com/ から取得してください");
  }
}
```

## 一括実行スクリプト

### package.json への追加

```json
{
  "scripts": {
    "portfolio:init": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/initialize_portfolio.ts",
    "portfolio:deposit": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/deposit_token.ts",
    "portfolio:add-allocation": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/add_allocation.ts",
    "portfolio:rebalance": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/jupiter_rebalance.ts",
    "portfolio:check": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/check_portfolio.ts",
    "portfolio:check-usdc": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/check_usdc.ts",
    "portfolio:check-sol": "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-node scripts/check_sol.ts"
  }
}
```

### 実行例

#### 事前準備

```bash
# 1. 環境設定
cd /path/to/sloomo/contract
yarn install                # 依存関係インストール
anchor build                # コントラクトビルド

# 2. Solana CLI設定
solana config set --url devnet
solana airdrop 5            # devnet SOL取得

# 3. USDCの取得（USDC投資する場合）
# https://spl-token-faucet.com/ でdevnet USDCを取得
```

#### 基本的なワークフロー

```bash
# 1. 初期確認
solana balance               # SOL残高確認
solana address              # ウォレットアドレス確認

# 2. ポートフォリオ初期化
yarn portfolio:init

# 3. 残高確認
yarn portfolio:check-sol    # SOL残高確認

# 4. 投資実行
yarn portfolio:deposit 1 SOL        # 1 SOL投資

# 5. 状態確認
yarn portfolio:check                 # ポートフォリオ全体確認

# 6. アロケーション調整（必要に応じて）
yarn portfolio:add-allocation

# 7. リバランス実行
yarn portfolio:rebalance

# 8. 最終状態確認
yarn portfolio:check
```


#### デバッグ・確認用コマンド

```bash
# 全体状況確認
yarn portfolio:check

# 個別トークン確認
yarn portfolio:check-sol     # SOL/wSOL関連

# 基本情報確認
solana balance               # ネイティブSOL残高
solana address              # ウォレットアドレス
solana config get           # 設定確認
```

#### 完全テストシナリオ

```bash
# === 環境準備 ===
cd /path/to/sloomo/contract
yarn install
anchor build
solana config set --url devnet
solana airdrop 5

# === 基本機能テスト ===
# 1. ポートフォリオ初期化
yarn portfolio:init

# 2. 初期状態確認
yarn portfolio:check
yarn portfolio:check-sol

# 3. SOL投資テスト
yarn portfolio:deposit 1 SOL
yarn portfolio:check-sol
yarn portfolio:check

# 6. 追加SOL投資テスト（様々な金額）
yarn portfolio:deposit 0.5 SOL
yarn portfolio:check

# 7. デフォルト投資テスト（金額指定なし）
yarn portfolio:deposit  # SOL残高の半分がデフォルト投資される
yarn portfolio:check

# === エラーハンドリングテスト ===
# 残高不足テスト
yarn portfolio:deposit 1000 SOL  # ✅ 正常に失敗（残高不足）

# 無効な引数テスト  
yarn portfolio:deposit abc SOL   # ✅ 正常に失敗（無効な金額）
yarn portfolio:deposit 1 ETH     # ✅ 正常に失敗（無効なトークン）
yarn portfolio:deposit -5 SOL    # ✅ 正常に失敗（負の金額）

# === 成功確認 ===
yarn portfolio:check
solana balance  # 残りのSOL確認
echo "🎉 すべてのテストが完了しました"

# === 期待される結果 ===
# - ポートフォリオ総価値: 5.79 SOL程度
# - ユーザー残高: 2.8 SOL程度 
# - すべてのエラーテストが適切に失敗
# - SOL投資が正常に動作
```

#### USDC投資テスト（オプション）

USDCでもテストしたい場合：

```bash
# USDC取得（devnet faucet）
# https://spl-token-faucet.com/ でUSDC取得

# USDC残高確認
yarn portfolio:check-usdc

# USDC投資テスト
yarn portfolio:deposit 100 USDC
yarn portfolio:check-usdc
yarn portfolio:check

# 注意: USDCがない場合はリバランスが失敗する
# yarn portfolio:rebalance  # USDCアカウントがないとエラー
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

#### 5. wSOLアカウントエラー（SOL投資時）
```bash
Error: Account does not exist
```
**対処法:**
```bash
# wSOLトークンアカウントを作成
spl-token create-account So11111111111111111111111111111111111111112

# またはSOLをwSOLに変換
spl-token wrap 1
```

#### 6. スクリプト実行エラー
```bash
Error: Cannot find module
```
**対処法:**
```bash
# 依存関係の再インストール
cd contract
yarn install

# TypeScriptコンパイル確認
yarn run tsc --noEmit scripts/deposit_token.ts
```

#### 7. プログラムIDエラー
```bash
Error: Program account does not exist
```
**対処法:**
```bash
# プログラムの存在確認
solana account EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC

# プログラムの再デプロイ
anchor build
anchor deploy --provider.cluster devnet
```

#### 8. USDC Faucetアクセス問題
**対処法:**
```bash
# 代替USDCトークン作成方法
spl-token create-token --decimals 6
spl-token create-account <TOKEN_MINT>
spl-token mint <TOKEN_MINT> 1000

# または別のfaucetサイトを利用
# https://faucet.quicknode.com/solana/devnet
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
5. **SOL投資**: SOLはwrapped SOL (wSOL)として処理されます。wSOLトークンアカウントの作成が必要な場合があります

## 追加リソース

- [Solana CLI ドキュメント](https://docs.solana.com/cli)
- [Anchor ドキュメント](https://project-serum.github.io/anchor/)
- [Solana Explorer (devnet)](https://explorer.solana.com/?cluster=devnet)
- [Jupiter API ドキュメント](https://docs.jup.ag/)

---

**最終更新**: 2024年12月  
**バージョン**: v0.1.1 - USDC/SOL投資対応