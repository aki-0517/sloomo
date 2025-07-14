# Sloomo スマートコントラクト実装ガイド

Anchor/Rust を使用したSolana プログラム開発のための完全ガイド

---

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [環境設定](#環境設定)
3. [アーキテクチャ設計](#アーキテクチャ設計)
4. [コア機能実装](#コア機能実装)
5. [セキュリティ対策](#セキュリティ対策)
6. [テスト戦略](#テスト戦略)
7. [呼び出し動作確認手順](#呼び出し動作確認手順)
8. [デプロイメント](#デプロイメント)
9. [クライアント統合](#クライアント統合)

---

## プロジェクト概要

### 目標
yield-bearing stablecoinを活用したポートフォリオ管理プラットフォームのSolanaスマートコントラクト実装

### 主要機能
- ユーザーポートフォリオ管理
- stablecoin配分調整
- Jupiter統合によるリバランス機能
- クライアントサイドでのAPY追跡

### 技術スタック
- **Anchor Framework**: 0.31.1
- **Rust**: 1.75+
- **Solana CLI**: 1.18+
- **SPL Token 2022**: yield-bearing tokens対応

---

## 環境設定

### 1. 開発環境セットアップ

```bash
# Rust & Solana CLI インストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"

# Anchor CLI インストール
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli --locked

# プロジェクト初期化
cd contract
anchor build
anchor test
```

### 2. Anchor.toml設定

```toml
[toolchain]
package_manager = "yarn"

[features]
resolution = true
skip-lint = false
idl-build = ["idl-parse", "no-entrypoint"]

[programs.localnet]
sloomo_portfolio = "F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS"

[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### 3. Cargo.toml設定

```toml
[package]
name = "sloomo-portfolio"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "sloomo_portfolio"

[features]
no-entrypoint = []
no-idl = []
idl-build = ["anchor-lang/idl-build", "anchor-spl/idl-build"]

[dependencies]
anchor-lang = { version = "0.31.1", features = ["init-if-needed"] }
anchor-spl = { version = "0.31.1", features = ["token_interface"] }
solana-program = "~1.18"
```

---

## アーキテクチャ設計

### 1. プログラム構造

```rust
use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked},
    associated_token::AssociatedToken,
};

declare_id!("F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS");

#[program]
pub mod sloomo_portfolio {
    use super::*;

    // コア命令
    pub fn initialize_portfolio(ctx: Context<InitializePortfolio>, params: InitPortfolioParams) -> Result<()> {
        // 実装
    }

    pub fn deposit_usdc(ctx: Context<DepositUsdc>, amount: u64) -> Result<()> {
        // USDCをdeposit
    }

    pub fn add_or_update_allocation(ctx: Context<AddOrUpdateAllocation>, mint: Pubkey, symbol: String, target_percentage: u16) -> Result<()> {
        // 株式トークン選択・%設定してアロケーション作成/編集
    }

    pub fn real_jupiter_rebalance(ctx: Context<RealJupiterRebalance>, target_allocations: Vec<AllocationTarget>, slippage_bps: Option<u16>) -> Result<()> {
        // USDC残高をベースに各stablecoinへの配分指示を出力
    }
}
```

### 2. データ構造定義

```rust
#[account]
pub struct Portfolio {
    pub owner: Pubkey,
    pub bump: u8,
    pub total_value: u64,
    pub last_rebalance: i64,
    pub allocations: Vec<AllocationData>,
    pub performance_history: Vec<PerformanceSnapshot>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AllocationData {
    pub mint: Pubkey,
    pub symbol: String,
    pub current_amount: u64,
    pub target_percentage: u16, // basis points (10000 = 100%)
    pub apy: u16, // basis points (クライアントサイドで管理)
    pub last_yield_update: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PerformanceSnapshot {
    pub timestamp: i64,
    pub total_value: u64,
    pub growth_rate: i16, // basis points
}
```

### 3. エラー定義

```rust
#[error_code]
pub enum SloomoError {
    #[msg("無効な配分比率")]
    InvalidAllocationPercentage,
    #[msg("リバランスに必要な残高が不足")]
    InsufficientBalance,
    #[msg("ポートフォリオが見つかりません")]
    PortfolioNotFound,
    #[msg("認証されていないアクセス")]
    Unauthorized,
    #[msg("無効なトークンミント")]
    InvalidTokenMint,
    #[msg("リバランス実行が頻繁すぎます")]
    RebalanceTooFrequent,
    #[msg("総配分が100%を超えています")]
    AllocationOverflow,
    #[msg("利回り更新が頻繁すぎます")]
    YieldUpdateTooFrequent,
    #[msg("数値オーバーフロー")]
    MathOverflow,
    #[msg("無効なAPY値")]
    InvalidApy,
}
```

---

## コア機能実装

### 1. ポートフォリオ初期化

```rust
#[derive(Accounts)]
#[instruction(params: InitPortfolioParams)]
pub struct InitializePortfolio<'info> {
    #[account(
        init,
        payer = owner,
        space = Portfolio::SIZE,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump
    )]
    pub portfolio: Account<'info, Portfolio>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitPortfolioParams {
    pub initial_allocations: Vec<AllocationParams>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AllocationParams {
    pub mint: Pubkey,
    pub symbol: String,
    pub target_percentage: u16,
}

pub fn initialize_portfolio(ctx: Context<InitializePortfolio>, params: InitPortfolioParams) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let owner = &ctx.accounts.owner;
    
    // バリデーション
    require!(
        params.initial_allocations.len() <= MAX_ALLOCATIONS,
        SloomoError::AllocationOverflow
    );
    
    let total_percentage: u16 = params.initial_allocations
        .iter()
        .map(|a| a.target_percentage)
        .sum();
    
    require!(
        total_percentage <= 10000,
        SloomoError::AllocationOverflow
    );
    
    // ポートフォリオ初期化
    portfolio.owner = owner.key();
    portfolio.bump = ctx.bumps.portfolio;
    portfolio.total_value = 0;
    portfolio.last_rebalance = Clock::get()?.unix_timestamp;
    portfolio.created_at = Clock::get()?.unix_timestamp;
    portfolio.updated_at = Clock::get()?.unix_timestamp;
    portfolio.allocations = params.initial_allocations
        .into_iter()
        .map(|params| AllocationData {
            mint: params.mint,
            symbol: params.symbol,
            current_amount: 0,
            target_percentage: params.target_percentage,
            apy: 0,
            last_yield_update: Clock::get().unwrap().unix_timestamp,
        })
        .collect();
    
    emit!(PortfolioInitialized {
        owner: owner.key(),
        portfolio: portfolio.key(),
        allocations_count: portfolio.allocations.len() as u8,
    });
    
    Ok(())
}

// イベント定義
#[event]
pub struct PortfolioInitialized {
    pub owner: Pubkey,
    pub portfolio: Pubkey,
    pub allocations_count: u8,
}
```

### 2. Stablecoinリバランス機能

```rust
#[derive(Accounts)]
pub struct RealJupiterRebalance<'info> {
    #[account(
        mut,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump = portfolio.bump,
        has_one = owner
    )]
    pub portfolio: Account<'info, Portfolio>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// USDC（ベースカレンシー）のトークンアカウント
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = owner,
    )]
    pub usdc_token_account: Account<'info, TokenAccount>,

    /// USDCミント
    pub usdc_mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AllocationTarget {
    pub mint: Pubkey,
    pub target_percentage: u16,
}

pub fn real_jupiter_rebalance(
    ctx: Context<RealJupiterRebalance>,
    target_allocations: Vec<AllocationTarget>,
    slippage_bps: Option<u16>,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let clock = Clock::get()?;

    // 共通バリデーション
    validate_rebalance_frequency(portfolio, &clock)?;
    validate_reentrancy(portfolio)?;
    
    // リバランス開始フラグを設定
    portfolio.is_rebalancing = true;

    // バリデーション: 目標配分の妥当性チェック
    let total_target: u16 = target_allocations.iter()
        .map(|t| t.target_percentage)
        .sum();
    validate_allocation_percentage(total_target)?;

    // USDC残高をベースとした総ポートフォリオ価値
    let usdc_balance = ctx.accounts.usdc_token_account.amount;
    require!(usdc_balance > 0, SloomoError::InsufficientBalance);

    msg!("リバランス開始: USDC残高 {} をベースに目標配分に応じて各 stablecoin に配分", usdc_balance);

    // 各目標配分に対してJupiter swap指示を出力
    for target in &target_allocations {
        let target_amount = (usdc_balance as u128 * target.target_percentage as u128 / 10000u128) as u64;
        
        if target_amount > 0 {
            msg!(
                "Jupiter swap 指示: USDC {} -> target_mint {} (目標金額: {}, 配分: {}%)",
                usdc_balance,
                target.mint,
                target_amount,
                target.target_percentage as f64 / 100.0
            );
        }
    }

    // ポートフォリオの配分データを更新
    update_portfolio_allocations(
        portfolio,
        &target_allocations,
        usdc_balance,
    )?;

    // 状態更新
    portfolio.last_rebalance = clock.unix_timestamp;
    portfolio.updated_at = clock.unix_timestamp;
    portfolio.total_value = usdc_balance;
    portfolio.is_rebalancing = false;

    // イベント発行
    emit!(StablecoinPortfolioRebalanced {
        owner: portfolio.owner,
        usdc_amount: usdc_balance,
        target_allocations_count: target_allocations.len() as u8,
        timestamp: clock.unix_timestamp,
        slippage_bps: slippage_bps.unwrap_or(50),
    });

    msg!(
        "ポートフォリオリバランス完了: USDC {} を {} 種類の stablecoin に配分",
        usdc_balance,
        target_allocations.len()
    );

    Ok(())
}

#[event]
pub struct StablecoinPortfolioRebalanced {
    pub owner: Pubkey,
    pub usdc_amount: u64,
    pub target_allocations_count: u8,
    pub timestamp: i64,
    pub slippage_bps: u16,
}
```

### 削除された機能

以下の機能はクライアントサイドで管理されるため、コントラクトから削除されました：

- **利回り更新機能**: APY計算と追跡はクライアントサイドで実行
- **個別token投資/引出機能**: stablecoinポートフォリオではJupiterスワップベースのリバランスのみ使用
- **equity token管理**: yield-bearing stablecoinに特化

// 定数定義
const MAX_ALLOCATIONS: usize = 10;
const MAX_PERFORMANCE_SNAPSHOTS: usize = 100;
```

---

## セキュリティ対策

### 1. アカウント検証

```rust
// PDA シードベースの検証
#[account(
    seeds = [b"portfolio", owner.key().as_ref()],
    bump = portfolio.bump,
    has_one = owner
)]
pub portfolio: Account<'info, Portfolio>,

// 所有者チェック
#[account(
    mut,
    constraint = portfolio.owner == owner.key() @ SloomoError::Unauthorized
)]
pub portfolio: Account<'info, Portfolio>,

// トークンアカウント検証
#[account(
    mut,
    associated_token::mint = mint,
    associated_token::authority = owner
)]
pub token_account: InterfaceAccount<'info, TokenAccount>,
```

### 2. 数値オーバーフロー対策

```rust
use anchor_lang::solana_program::program_pack::Pack;

fn safe_add(a: u64, b: u64) -> Result<u64> {
    a.checked_add(b).ok_or(SloomoError::MathOverflow.into())
}

fn safe_mul(a: u64, b: u64) -> Result<u64> {
    a.checked_mul(b).ok_or(SloomoError::MathOverflow.into())
}

fn calculate_percentage(amount: u64, percentage: u16) -> Result<u64> {
    amount
        .checked_mul(percentage as u64)
        .ok_or(SloomoError::MathOverflow)?
        .checked_div(10000)
        .ok_or(SloomoError::MathOverflow.into())
}
```

### 3. リエントランシー対策

```rust
#[account]
pub struct Portfolio {
    pub owner: Pubkey,
    pub bump: u8,
    pub is_rebalancing: bool, // リバランス中フラグ
    // ... その他のフィールド
}

pub fn rebalance_portfolio(ctx: Context<RebalancePortfolio>) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    
    // リエントランシーチェック
    require!(!portfolio.is_rebalancing, SloomoError::RebalanceInProgress);
    
    portfolio.is_rebalancing = true;
    
    // リバランス処理...
    
    portfolio.is_rebalancing = false;
    Ok(())
}
```

---

## テスト戦略

### 1. 単体テスト

```typescript
// tests/portfolio.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";
import { expect } from "chai";
import { 
    createMint, 
    getOrCreateAssociatedTokenAccount, 
    mintTo 
} from "@solana/spl-token";

describe("sloomo-portfolio", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SloomoPortfolio as Program<SloomoPortfolio>;
  const owner = provider.wallet;

  let portfolioPda: anchor.web3.PublicKey;
  let portfolioBump: number;
  let usdcMint: anchor.web3.PublicKey;
  let solMint: anchor.web3.PublicKey;

  before(async () => {
    // PDAアドレス計算
    [portfolioPda, portfolioBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("portfolio"), owner.publicKey.toBuffer()],
      program.programId
    );

    // テスト用トークンミント作成
    usdcMint = await createMint(
      provider.connection,
      owner.payer,
      owner.publicKey,
      owner.publicKey,
      6 // USDC decimals
    );

    solMint = await createMint(
      provider.connection,
      owner.payer,
      owner.publicKey,
      owner.publicKey,
      9 // SOL decimals
    );
  });

  describe("ポートフォリオ初期化", () => {
    it("正常な初期化", async () => {
      const initParams = {
        initialAllocations: [
          {
            mint: usdcMint,
            symbol: "USDC-YIELD",
            targetPercentage: 6000, // 60%
          },
          {
            mint: solMint,
            symbol: "SOL-YIELD",
            targetPercentage: 4000, // 40%
          },
        ],
      };

      const tx = await program.methods
        .initializePortfolio(initParams)
        .accounts({
          portfolio: portfolioPda,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("初期化トランザクション署名:", tx);

      // ポートフォリオデータ検証
      const portfolio = await program.account.portfolio.fetch(portfolioPda);
      expect(portfolio.owner.toString()).to.equal(owner.publicKey.toString());
      expect(portfolio.allocations).to.have.length(2);
      expect(portfolio.allocations[0].targetPercentage).to.equal(6000);
      expect(portfolio.allocations[1].targetPercentage).to.equal(4000);
      expect(portfolio.totalValue.toNumber()).to.equal(0);
    });

    it("無効な配分でエラー", async () => {
      const invalidParams = {
        initialAllocations: [
          {
            mint: usdcMint,
            symbol: "INVALID",
            targetPercentage: 15000, // 150% - 無効
          },
        ],
      };

      try {
        await program.methods
          .initializePortfolio(invalidParams)
          .accounts({
            portfolio: portfolioPda,
            owner: owner.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        expect.fail("エラーが発生するはずです");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("AllocationOverflow");
        expect(error.error.errorMessage).to.include("総配分が100%を超えています");
      }
    });

    it("重複初期化でエラー", async () => {
      const initParams = {
        initialAllocations: [
          {
            mint: usdcMint,
            symbol: "USDC-YIELD",
            targetPercentage: 5000,
          },
        ],
      };

      try {
        await program.methods
          .initializePortfolio(initParams)
          .accounts({
            portfolio: portfolioPda,
            owner: owner.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        expect.fail("重複初期化エラーが発生するはずです");
      } catch (error) {
        expect(error.message).to.include("already in use");
      }
    });
  });

  describe("リバランス機能", () => {
    let userUsdcAccount: anchor.web3.PublicKey;
    let userSolAccount: anchor.web3.PublicKey;

    before(async () => {
      // ユーザーのトークンアカウント作成
      const usdcAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        owner.payer,
        usdcMint,
        owner.publicKey
      );
      userUsdcAccount = usdcAccount.address;

      const solAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        owner.payer,
        solMint,
        owner.publicKey
      );
      userSolAccount = solAccount.address;

      // テスト用トークンをミント
      await mintTo(
        provider.connection,
        owner.payer,
        usdcMint,
        userUsdcAccount,
        owner.publicKey,
        1000_000000 // 1000 USDC
      );

      await mintTo(
        provider.connection,
        owner.payer,
        solMint,
        userSolAccount,
        owner.publicKey,
        100_000000000 // 100 SOL
      );
    });

    it("正常なリバランス", async () => {
      const targetAllocations = [
        { mint: usdcMint, targetPercentage: 7000 }, // 70%
        { mint: solMint, targetPercentage: 3000 },  // 30%
      ];

      // 1日後の時間をシミュレート
      await new Promise(resolve => setTimeout(resolve, 1000));

      const tx = await program.methods
        .rebalancePortfolio(targetAllocations)
        .accounts({
          portfolio: portfolioPda,
          owner: owner.publicKey,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .remainingAccounts([
          {
            pubkey: userUsdcAccount,
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: userSolAccount,
            isWritable: true,
            isSigner: false,
          },
        ])
        .rpc();

      console.log("リバランストランザクション署名:", tx);

      // 結果検証
      const portfolio = await program.account.portfolio.fetch(portfolioPda);
      expect(portfolio.allocations[0].targetPercentage).to.equal(7000);
      expect(portfolio.allocations[1].targetPercentage).to.equal(3000);
    });

    it("頻繁なリバランスでエラー", async () => {
      const targetAllocations = [
        { mint: usdcMint, targetPercentage: 5000 },
        { mint: solMint, targetPercentage: 5000 },
      ];

      try {
        await program.methods
          .rebalancePortfolio(targetAllocations)
          .accounts({
            portfolio: portfolioPda,
            owner: owner.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .rpc();
        expect.fail("頻繁なリバランスエラーが発生するはずです");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("RebalanceTooFrequent");
      }
    });
  });
});
```

### 2. 統合テスト

```typescript
// tests/integration.ts
describe("統合テスト", () => {
  describe("完全なポートフォリオライフサイクル", () => {
    it("初期化→資金投入→リバランス→パフォーマンス追跡", async () => {
      // 1. ポートフォリオ初期化
      const initParams = {
        initialAllocations: [
          { mint: usdcMint, symbol: "USDC", targetPercentage: 5000 },
          { mint: solMint, symbol: "SOL", targetPercentage: 5000 },
        ],
      };

      await program.methods
        .initializePortfolio(initParams)
        .accounts({
          portfolio: portfolioPda,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // 2. 初期資金投入をシミュレート
      const portfolio = await program.account.portfolio.fetch(portfolioPda);
      expect(portfolio.allocations).to.have.length(2);

      // 3. 24時間後のリバランス
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newAllocations = [
        { mint: usdcMint, targetPercentage: 6000 }, // 60%
        { mint: solMint, targetPercentage: 4000 },  // 40%
      ];

      await program.methods
        .rebalancePortfolio(newAllocations)
        .accounts({
          portfolio: portfolioPda,
          owner: owner.publicKey,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .rpc();

      // 4. 結果検証
      const updatedPortfolio = await program.account.portfolio.fetch(portfolioPda);
      expect(updatedPortfolio.allocations[0].targetPercentage).to.equal(6000);
      expect(updatedPortfolio.allocations[1].targetPercentage).to.equal(4000);
      expect(updatedPortfolio.lastRebalance.toNumber()).to.be.greaterThan(0);
    });
  });

  describe("エラーハンドリング", () => {
    it("認証されていないユーザーでエラー", async () => {
      const unauthorizedUser = anchor.web3.Keypair.generate();
      
      try {
        await program.methods
          .rebalancePortfolio([])
          .accounts({
            portfolio: portfolioPda,
            owner: unauthorizedUser.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("認証エラーが発生するはずです");
      } catch (error) {
        expect(error.message).to.include("failed");
      }
    });
  });
});
```

### 3. ファズテスト

```typescript
// tests/fuzz.ts
describe("ファズテスト", () => {
  function generateRandomAllocations(count: number = 3): any[] {
    const allocations = [];
    const mints = [usdcMint, solMint, wbtcMint]; // テスト用ミント
    
    for (let i = 0; i < count; i++) {
      allocations.push({
        mint: mints[i % mints.length],
        targetPercentage: Math.floor(Math.random() * 10000), // 0-100%
      });
    }
    
    return allocations;
  }

  it("ランダム配分でのリバランステスト", async () => {
    const iterations = 50;
    let successCount = 0;
    let expectedErrorCount = 0;

    for (let i = 0; i < iterations; i++) {
      const randomAllocations = generateRandomAllocations();
      const totalPercentage = randomAllocations.reduce(
        (sum, a) => sum + a.targetPercentage, 0
      );

      try {
        if (totalPercentage <= 10000) {
          await program.methods
            .rebalancePortfolio(randomAllocations)
            .accounts({
              portfolio: portfolioPda,
              owner: owner.publicKey,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            })
            .rpc();
          
          successCount++;
          
          // 成功した場合の検証
          const portfolio = await program.account.portfolio.fetch(portfolioPda);
          const actualTotal = portfolio.allocations
            .reduce((sum, a) => sum + a.targetPercentage, 0);
          expect(actualTotal).to.be.lte(10000);
        }
      } catch (error) {
        if (totalPercentage > 10000 && 
            error.error?.errorCode?.code === "AllocationOverflow") {
          expectedErrorCount++;
        } else if (error.error?.errorCode?.code === "RebalanceTooFrequent") {
          expectedErrorCount++;
        } else {
          console.log(`予期しないエラー: ${error.message}`);
        }
      }
      
      // 次のテストのために少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`ファズテスト結果: 成功=${successCount}, 予期されるエラー=${expectedErrorCount}`);
    expect(successCount + expectedErrorCount).to.equal(iterations);
  });

  it("極端な値でのテスト", async () => {
    const extremeValues = [
      0,        // 最小値
      1,        // 最小有効値
      5000,     // 50%
      9999,     // 99.99%
      10000,    // 100%
      10001,    // 100.01% - 無効
      65535,    // u16最大値
    ];

    for (const value of extremeValues) {
      const allocation = [{ mint: usdcMint, targetPercentage: value }];
      
      try {
        await program.methods
          .rebalancePortfolio(allocation)
          .accounts({
            portfolio: portfolioPda,
            owner: owner.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .rpc();
        
        if (value <= 10000) {
          console.log(`値 ${value} でリバランス成功`);
        } else {
          expect.fail(`値 ${value} でエラーが発生するはずです`);
        }
      } catch (error) {
        if (value > 10000) {
          expect(error.error.errorCode.code).to.equal("AllocationOverflow");
        } else {
          console.log(`予期しないエラー (値: ${value}): ${error.message}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });
});
```

### 4. パフォーマンステスト

```typescript
// tests/performance.ts
describe("パフォーマンステスト", () => {
  it("大量配分でのガス使用量測定", async () => {
    const maxAllocations = 10;
    const allocations = [];
    
    for (let i = 0; i < maxAllocations; i++) {
      allocations.push({
        mint: anchor.web3.Keypair.generate().publicKey,
        targetPercentage: Math.floor(10000 / maxAllocations),
      });
    }

    const beforeBalance = await provider.connection.getBalance(owner.publicKey);
    
    const tx = await program.methods
      .rebalancePortfolio(allocations)
      .accounts({
        portfolio: portfolioPda,
        owner: owner.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const afterBalance = await provider.connection.getBalance(owner.publicKey);
    const gasUsed = beforeBalance - afterBalance;
    
    console.log(`ガス使用量: ${gasUsed} lamports`);
    console.log(`配分数: ${maxAllocations}`);
    
    // ガス使用量が妥当な範囲内であることを確認
    expect(gasUsed).to.be.lt(0.01 * anchor.web3.LAMPORTS_PER_SOL); // 0.01 SOL未満
  });

  it("連続トランザクションのスループット測定", async () => {
    const transactionCount = 5;
    const startTime = Date.now();
    
    for (let i = 0; i < transactionCount; i++) {
      const allocation = [
        { mint: usdcMint, targetPercentage: 5000 + (i * 100) },
        { mint: solMint, targetPercentage: 5000 - (i * 100) },
      ];
      
      try {
        await program.methods
          .rebalancePortfolio(allocation)
          .accounts({
            portfolio: portfolioPda,
            owner: owner.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .rpc();
      } catch (error) {
        if (error.error?.errorCode?.code !== "RebalanceTooFrequent") {
          throw error;
        }
      }
      
      // 制限を回避するために待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / transactionCount;
    
    console.log(`平均トランザクション時間: ${averageTime}ms`);
    expect(averageTime).to.be.lt(5000); // 5秒未満
  });
});
```

---

## 呼び出し動作確認手順

### 1. ローカル環境でのテスト実行

```bash
# 1. ローカルバリデータ起動
solana-test-validator --reset

# 2. 別ターミナルでテスト実行
cd contract
anchor test
```

### 2. 個別機能のテスト

```bash
# 特定のテストファイル実行
anchor test -- --grep "ポートフォリオ初期化"

# 特定のテストケース実行
anchor test -- --grep "正常な初期化"

# ファズテスト実行
anchor test tests/fuzz.ts

# パフォーマンステスト実行
anchor test tests/performance.ts
```

### 3. デバッグ付きテスト実行

```typescript
// tests/debug.ts
describe("デバッグテスト", () => {
  it("詳細ログ付きポートフォリオ初期化", async () => {
    console.log("=== ポートフォリオ初期化デバッグ ===");
    
    const initParams = {
      initialAllocations: [
        {
          mint: usdcMint,
          symbol: "USDC-YIELD",
          targetPercentage: 6000,
        },
      ],
    };

    console.log("初期化パラメータ:", JSON.stringify(initParams, null, 2));
    console.log("ポートフォリオPDA:", portfolioPda.toString());
    console.log("オーナー:", owner.publicKey.toString());

    const tx = await program.methods
      .initializePortfolio(initParams)
      .accounts({
        portfolio: portfolioPda,
        owner: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("トランザクション署名:", tx);

    const portfolio = await program.account.portfolio.fetch(portfolioPda);
    console.log("作成されたポートフォリオ:", {
      owner: portfolio.owner.toString(),
      totalValue: portfolio.totalValue.toString(),
      allocationsCount: portfolio.allocations.length,
      createdAt: new Date(portfolio.createdAt.toNumber() * 1000),
    });

    // トランザクション詳細取得
    const txDetails = await provider.connection.getTransaction(tx);
    console.log("ガス使用量:", txDetails?.meta?.fee);
    console.log("ログ出力:", txDetails?.meta?.logMessages);
  });

  it("エラーケースのデバッグ", async () => {
    console.log("=== エラーケースデバッグ ===");
    
    const invalidParams = {
      initialAllocations: [
        {
          mint: usdcMint,
          symbol: "INVALID",
          targetPercentage: 15000, // 150%
        },
      ],
    };

    try {
      await program.methods
        .initializePortfolio(invalidParams)
        .accounts({
          portfolio: portfolioPda,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch (error) {
      console.log("キャッチされたエラー:", {
        message: error.message,
        errorCode: error.error?.errorCode?.code,
        errorMessage: error.error?.errorMessage,
        programLogs: error.logs,
      });
      
      // エラーが期待されるものかを確認
      expect(error.error.errorCode.code).to.equal("AllocationOverflow");
    }
  });
});
```

### 4. 手動テスト用CLIスクリプト

```typescript
// scripts/manual-test.ts
import * as anchor from "@coral-xyz/anchor";

async function manualTest() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.SloomoPortfolio;
  const owner = provider.wallet;

  console.log("=== 手動テスト開始 ===");
  console.log("プログラムID:", program.programId.toString());
  console.log("オーナー:", owner.publicKey.toString());

  // 1. ポートフォリオPDA計算
  const [portfolioPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("portfolio"), owner.publicKey.toBuffer()],
    program.programId
  );
  console.log("ポートフォリオPDA:", portfolioPda.toString());

  // 2. 既存ポートフォリオ確認
  try {
    const existingPortfolio = await program.account.portfolio.fetch(portfolioPda);
    console.log("既存ポートフォリオ発見:", {
      totalValue: existingPortfolio.totalValue.toString(),
      allocationsCount: existingPortfolio.allocations.length,
    });
  } catch (error) {
    console.log("ポートフォリオが存在しません。新規作成します。");
  }

  // 3. 新規ポートフォリオ作成（存在しない場合）
  const initParams = {
    initialAllocations: [
      {
        mint: new anchor.web3.PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC
        symbol: "USDC",
        targetPercentage: 7000, // 70%
      },
      {
        mint: new anchor.web3.PublicKey("So11111111111111111111111111111111111111112"), // SOL
        symbol: "SOL",
        targetPercentage: 3000, // 30%
      },
    ],
  };

  try {
    const tx = await program.methods
      .initializePortfolio(initParams)
      .accounts({
        portfolio: portfolioPda,
        owner: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("ポートフォリオ初期化成功:", tx);
  } catch (error) {
    console.log("初期化エラー（既に存在する可能性）:", error.message);
  }

  // 4. ポートフォリオ状態確認
  const portfolio = await program.account.portfolio.fetch(portfolioPda);
  console.log("現在のポートフォリオ状態:", {
    owner: portfolio.owner.toString(),
    totalValue: portfolio.totalValue.toString(),
    lastRebalance: new Date(portfolio.lastRebalance.toNumber() * 1000),
    allocations: portfolio.allocations.map(a => ({
      symbol: a.symbol,
      targetPercentage: a.targetPercentage,
      currentAmount: a.currentAmount.toString(),
    })),
  });

  console.log("=== 手動テスト完了 ===");
}

manualTest().catch(console.error);
```

```bash
# スクリプト実行
cd contract
yarn ts-node scripts/manual-test.ts
```

### 5. リアルタイムログ監視

```bash
# ローカルバリデータのログ監視
solana logs

# 特定のプログラムIDのログ監視
solana logs F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS
```

### 6. トランザクション詳細確認

```typescript
// scripts/tx-inspector.ts
async function inspectTransaction(signature: string) {
  const provider = anchor.AnchorProvider.env();
  
  const tx = await provider.connection.getTransaction(signature, {
    commitment: "confirmed",
  });

  console.log("=== トランザクション詳細 ===");
  console.log("署名:", signature);
  console.log("スロット:", tx?.slot);
  console.log("ブロック時間:", new Date((tx?.blockTime || 0) * 1000));
  console.log("ガス使用量:", tx?.meta?.fee);
  console.log("エラー:", tx?.meta?.err);
  console.log("ログ:");
  tx?.meta?.logMessages?.forEach((log, i) => {
    console.log(`  ${i}: ${log}`);
  });

  // アカウント変更追跡
  console.log("アカウント変更:");
  tx?.meta?.preBalances?.forEach((preBalance, i) => {
    const postBalance = tx.meta?.postBalances?.[i] || 0;
    const change = postBalance - preBalance;
    if (change !== 0) {
      console.log(`  ${tx.transaction.message.accountKeys[i]}: ${change} lamports`);
    }
  });
}

// 使用例
// inspectTransaction("your-transaction-signature-here");
```

---

## デプロイメント

### 1. ローカルデプロイ

```bash
# ローカルバリデータ起動
solana-test-validator

# プログラムビルド
anchor build

# テスト実行
anchor test

# ローカルデプロイ
anchor deploy
```

### 2. Devnetデプロイ

```bash
# Devnet設定
solana config set --url devnet
solana airdrop 2

# Anchor.toml更新
[provider]
cluster = "devnet"

# デプロイ
anchor deploy --provider.cluster devnet
```

### 3. Mainnetデプロイ準備

```toml
[programs.mainnet]
sloomo_portfolio = "YourMainnetProgramId"

[provider]
cluster = "mainnet"
wallet = "~/.config/solana/mainnet-wallet.json"
```

### 4. プログラムアップグレード

```rust
#[account]
pub struct ProgramData {
    pub version: u16,
    pub upgrade_authority: Pubkey,
    pub is_emergency_stop: bool,
}

pub fn upgrade_program(ctx: Context<UpgradeProgram>, new_version: u16) -> Result<()> {
    let program_data = &mut ctx.accounts.program_data;
    
    require!(
        program_data.upgrade_authority == ctx.accounts.authority.key(),
        SloomoError::Unauthorized
    );
    
    require!(
        new_version > program_data.version,
        SloomoError::InvalidVersion
    );
    
    program_data.version = new_version;
    
    emit!(ProgramUpgraded {
        old_version: program_data.version,
        new_version,
        authority: ctx.accounts.authority.key(),
    });
    
    Ok(())
}

#[event]
pub struct ProgramUpgraded {
    pub old_version: u16,
    pub new_version: u16,
    pub authority: Pubkey,
}
```

---

## クライアント統合

### 1. TypeScript型生成

```bash
# IDL生成
anchor build --idl

# TypeScript型生成
npx @coral-xyz/anchor idl fetch -o target/types/sloomo_portfolio.ts F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS
```

### 2. React Native統合

```typescript
// src/hooks/useSloomoProgram.ts
import * as anchor from "@coral-xyz/anchor";
import { SloomoPortfolio } from "../types/sloomo_portfolio";
import { useMemo } from "react";
import { useConnection } from "./useConnection";
import { useAuthorization } from "./useAuthorization";

export function useSloomoProgram() {
  const { connection } = useConnection();
  const { selectedAccount } = useAuthorization();
  
  const program = useMemo(() => {
    if (!selectedAccount) return null;
    
    const provider = new anchor.AnchorProvider(
      connection,
      {
        publicKey: selectedAccount.publicKey,
        signTransaction: async (tx) => {
          // MWA統合
          return await signTransaction(tx);
        },
        signAllTransactions: async (txs) => {
          return await signAllTransactions(txs);
        },
      },
      { commitment: "confirmed" }
    );
    
    return new anchor.Program<SloomoPortfolio>(
      IDL,
      PROGRAM_ID,
      provider
    );
  }, [connection, selectedAccount]);
  
  return { program };
}
```

### 3. ポートフォリオ操作Hook

```typescript
// src/hooks/usePortfolio.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSloomoProgram } from "./useSloomoProgram";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export function usePortfolio(owner: PublicKey) {
  const { program } = useSloomoProgram();
  const queryClient = useQueryClient();
  
  const portfolioPda = useMemo(() => {
    if (!program || !owner) return null;
    return PublicKey.findProgramAddressSync(
      [Buffer.from("portfolio"), owner.toBuffer()],
      program.programId
    )[0];
  }, [program, owner]);
  
  const portfolioQuery = useQuery({
    queryKey: ["portfolio", portfolioPda?.toString()],
    queryFn: async () => {
      if (!program || !portfolioPda) return null;
      return await program.account.portfolio.fetch(portfolioPda);
    },
    enabled: !!program && !!portfolioPda,
  });
  
  const initializePortfolio = useMutation({
    mutationFn: async (params: InitPortfolioParams) => {
      if (!program || !portfolioPda) throw new Error("プログラムが準備されていません");
      
      return await program.methods
        .initializePortfolio(params)
        .accounts({
          portfolio: portfolioPda,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["portfolio", portfolioPda?.toString()],
      });
    },
  });
  
  const rebalancePortfolio = useMutation({
    mutationFn: async (targetAllocations: AllocationTarget[]) => {
      if (!program || !portfolioPda) throw new Error("プログラムが準備されていません");
      
      return await program.methods
        .rebalancePortfolio(targetAllocations)
        .accounts({
          portfolio: portfolioPda,
          owner,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["portfolio"],
      });
    },
  });
  
  return {
    portfolio: portfolioQuery.data,
    isLoading: portfolioQuery.isLoading,
    initializePortfolio,
    rebalancePortfolio,
  };
}
```

### 4. エラーハンドリング

```typescript
// src/utils/anchorErrors.ts
export function parseAnchorError(error: any): string {
  if (error.error?.errorCode?.code) {
    const errorCode = error.error.errorCode.code;
    
    switch (errorCode) {
      case "InvalidAllocationPercentage":
        return "配分比率が無効です";
      case "InsufficientBalance":
        return "残高が不足しています";
      case "AllocationOverflow":
        return "配分の合計が100%を超えています";
      case "RebalanceTooFrequent":
        return "リバランスの実行間隔が短すぎます";
      case "Unauthorized":
        return "認証されていないアクセスです";
      case "InvalidTokenMint":
        return "無効なトークンミントです";
      case "YieldUpdateTooFrequent":
        return "利回り更新が頻繁すぎます";
      case "MathOverflow":
        return "数値オーバーフローが発生しました";
      case "InvalidApy":
        return "無効なAPY値です";
      default:
        return `プログラムエラー: ${errorCode}`;
    }
  }
  
  return "不明なエラーが発生しました";
}
```

---

## パフォーマンス最適化

### 1. 計算単位最適化

```rust
// 効率的なアカウント読み込み
#[derive(Accounts)]
pub struct RebalancePortfolio<'info> {
    #[account(
        mut,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump = portfolio.bump
    )]
    pub portfolio: Account<'info, Portfolio>,
    
    // 必要最小限のアカウントのみ
}

// バッチ処理での最適化
pub fn batch_rebalance(
    ctx: Context<BatchRebalance>,
    operations: Vec<RebalanceOperation>,
) -> Result<()> {
    // 単一トランザクションで複数操作を実行
    for operation in operations {
        execute_rebalance_operation(ctx, operation)?;
    }
    Ok(())
}
```

### 2. メモリ最適化

```rust
impl Portfolio {
    pub const SIZE: usize = 8 + // discriminator
        32 + // owner
        1 +  // bump
        8 +  // total_value
        8 +  // last_rebalance
        4 + (MAX_ALLOCATIONS * AllocationData::SIZE) + // allocations
        4 + (MAX_PERFORMANCE_SNAPSHOTS * PerformanceSnapshot::SIZE) + // performance_history
        8 +  // created_at
        8;   // updated_at
}

impl AllocationData {
    pub const SIZE: usize = 
        32 + // mint
        32 + // symbol (max)
        8 +  // current_amount
        2 +  // target_percentage
        2 +  // apy
        8;   // last_yield_update
}
```

---

## 実装ロードマップ

### フェーズ1: MVP (2週間)
- [x] 基本的なポートフォリオ管理
- [x] 簡単な配分調整
- [x] セキュリティ基盤

### フェーズ2: 拡張機能 (4週間)
- [ ] xStock API統合
- [ ] 自動リバランス
- [ ] 利回り追跡

### フェーズ3: 高度な機能 (6週間)
- [ ] AI最適化
- [ ] クロスプログラム統合
- [ ] 高度な分析

---

## まとめ

このドキュメントは、Sloomoプロジェクトのスマートコントラクト実装における完全なガイドを提供します。Anchor/Rustを使用したSolanaプログラム開発のベストプラクティスに従い、セキュリティ、パフォーマンス、保守性を重視した設計となっています。

実装時は、段階的な開発とテストを心がけ、セキュリティ監査を必ず実施してください。特にテスト戦略と呼び出し動作確認手順を活用して、堅牢なプログラムを構築してください。