# Anchor/Rust ベストプラクティス - Sloomoプロジェクト向け詳細ガイド

## 目次

1. [Anchor Framework 0.31.x の最新機能と推奨パターン](#1-anchor-framework-031x-の最新機能と推奨パターン)
2. [Solana Program開発のセキュリティベストプラクティス](#2-solana-program開発のセキュリティベストプラクティス)
3. [SPL Token 2022との統合方法](#3-spl-token-2022との統合方法)
4. [PDA（Program Derived Address）の効果的な使用方法](#4-pdaprogram-derived-addressの効果的な使用方法)
5. [エラーハンドリングとバリデーション](#5-エラーハンドリングとバリデーション)
6. [テスト戦略（TypeScript/Mocha）](#6-テスト戦略typescriptmocha)
7. [型安全性とIDL生成](#7-型安全性とidl生成)
8. [ガス効率化とパフォーマンス最適化](#8-ガス効率化とパフォーマンス最適化)
9. [upgrade可能なプログラム設計](#9-upgrade可能なプログラム設計)
10. [Cross-Program Invocation (CPI) パターン](#10-cross-program-invocation-cpi-パターン)

---

## 1. Anchor Framework 0.31.x の最新機能と推奨パターン

### 最新の技術要件 (2025年)

```toml
# 推奨バージョン構成
[toolchain]
anchor_version = "0.31.1"

# Cargo.toml - 必須設定
[features]
idl-build = ["anchor-lang/idl-build", "anchor-spl/idl-build"]

[profile.release]
overflow-checks = true
lto = "fat"
codegen-units = 1

[profile.release.build-override]
opt-level = 3
incremental = false
codegen-units = 1
```

### 推奨開発環境
- **Rust**: rustc 1.85.0
- **Solana CLI**: solana-cli 2.1.15
- **Anchor CLI**: anchor-cli 0.31.1
- **Node.js**: v23.9.0
- **Yarn**: 1.22.1

### Sloomoプロジェクトへの適用

```rust
// programs/sloomo/src/lib.rs
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked
};

declare_id!("F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS");

#[program]
pub mod sloomo {
    use super::*;

    /// ポートフォリオ初期化
    pub fn initialize_portfolio(
        ctx: Context<InitializePortfolio>,
        name: String,
        target_allocations: Vec<TargetAllocation>,
    ) -> Result<()> {
        require!(name.len() <= 50, ErrorCode::NameTooLong);
        require!(!target_allocations.is_empty(), ErrorCode::EmptyAllocations);
        
        let portfolio = &mut ctx.accounts.portfolio;
        portfolio.authority = ctx.accounts.authority.key();
        portfolio.name = name;
        portfolio.target_allocations = target_allocations;
        portfolio.total_value = 0;
        portfolio.bump = ctx.bumps.portfolio;
        
        msg!("Portfolio initialized: {}", portfolio.name);
        Ok(())
    }

    /// xStock equity token投資
    pub fn invest_in_xstock(
        ctx: Context<InvestInXStock>,
        amount: u64,
        token_symbol: String,
    ) -> Result<()> {
        let portfolio = &mut ctx.accounts.portfolio;
        
        // 投資額バリデーション
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(
            ctx.accounts.user_token_account.amount >= amount,
            ErrorCode::InsufficientFunds
        );

        // CPI: SPL Token転送
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.user_token_account.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.portfolio_vault.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        transfer_checked(
            cpi_ctx,
            amount,
            ctx.accounts.token_mint.decimals
        )?;

        // ポートフォリオ更新
        portfolio.add_investment(token_symbol, amount)?;
        
        Ok(())
    }

    /// 自動リバランス実行
    pub fn rebalance_portfolio(ctx: Context<RebalancePortfolio>) -> Result<()> {
        let portfolio = &mut ctx.accounts.portfolio;
        
        // 現在の配分を計算
        let current_allocations = portfolio.calculate_current_allocations()?;
        
        // リバランス必要性を確認
        let rebalance_required = portfolio.needs_rebalancing(&current_allocations)?;
        require!(rebalance_required, ErrorCode::NoRebalanceNeeded);
        
        // リバランス実行ロジック
        portfolio.execute_rebalance(&current_allocations)?;
        
        emit!(RebalanceEvent {
            portfolio: portfolio.key(),
            timestamp: Clock::get()?.unix_timestamp,
            old_allocations: current_allocations.clone(),
            new_allocations: portfolio.target_allocations.clone(),
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializePortfolio<'info> {
    #[account(
        init,
        payer = authority,
        space = Portfolio::LEN,
        seeds = [b"portfolio", authority.key().as_ref()],
        bump
    )]
    pub portfolio: Account<'info, Portfolio>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InvestInXStock<'info> {
    #[account(
        mut,
        seeds = [b"portfolio", authority.key().as_ref()],
        bump = portfolio.bump,
        has_one = authority
    )]
    pub portfolio: Account<'info, Portfolio>,
    
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = authority
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"vault", portfolio.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = portfolio
    )]
    pub portfolio_vault: InterfaceAccount<'info, TokenAccount>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Portfolio {
    pub authority: Pubkey,
    pub name: String,
    pub target_allocations: Vec<TargetAllocation>,
    pub current_investments: Vec<Investment>,
    pub total_value: u64,
    pub last_rebalance: i64,
    pub bump: u8,
}

impl Portfolio {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        4 + 50 + // name (max 50 chars)
        4 + (10 * TargetAllocation::LEN) + // max 10 target allocations
        4 + (50 * Investment::LEN) + // max 50 investments
        8 + // total_value
        8 + // last_rebalance
        1; // bump

    pub fn add_investment(&mut self, symbol: String, amount: u64) -> Result<()> {
        // 既存投資を検索
        if let Some(investment) = self.current_investments
            .iter_mut()
            .find(|inv| inv.symbol == symbol) {
            investment.amount = investment.amount
                .checked_add(amount)
                .ok_or(ErrorCode::MathOverflow)?;
        } else {
            // 新規投資追加
            require!(
                self.current_investments.len() < 50,
                ErrorCode::TooManyInvestments
            );
            
            self.current_investments.push(Investment {
                symbol,
                amount,
                last_updated: Clock::get()?.unix_timestamp,
            });
        }
        
        self.total_value = self.total_value
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;
            
        Ok(())
    }

    pub fn calculate_current_allocations(&self) -> Result<Vec<CurrentAllocation>> {
        let mut allocations = Vec::new();
        
        for investment in &self.current_investments {
            let percentage = if self.total_value > 0 {
                (investment.amount as f64 / self.total_value as f64) * 100.0
            } else {
                0.0
            };
            
            allocations.push(CurrentAllocation {
                symbol: investment.symbol.clone(),
                amount: investment.amount,
                percentage,
            });
        }
        
        Ok(allocations)
    }

    pub fn needs_rebalancing(&self, current: &[CurrentAllocation]) -> Result<bool> {
        const THRESHOLD: f64 = 5.0; // 5%の閾値
        
        for target in &self.target_allocations {
            if let Some(current_alloc) = current.iter()
                .find(|c| c.symbol == target.symbol) {
                
                let diff = (current_alloc.percentage - target.percentage).abs();
                if diff > THRESHOLD {
                    return Ok(true);
                }
            } else if target.percentage > THRESHOLD {
                return Ok(true);
            }
        }
        
        Ok(false)
    }

    pub fn execute_rebalance(&mut self, _current: &[CurrentAllocation]) -> Result<()> {
        // リバランス実行ロジック（簡略化）
        self.last_rebalance = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TargetAllocation {
    pub symbol: String,
    pub percentage: f64,
}

impl TargetAllocation {
    pub const LEN: usize = 4 + 32 + 8; // symbol (max 32 chars) + percentage
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Investment {
    pub symbol: String,
    pub amount: u64,
    pub last_updated: i64,
}

impl Investment {
    pub const LEN: usize = 4 + 32 + 8 + 8; // symbol + amount + timestamp
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CurrentAllocation {
    pub symbol: String,
    pub amount: u64,
    pub percentage: f64,
}

#[event]
pub struct RebalanceEvent {
    pub portfolio: Pubkey,
    pub timestamp: i64,
    pub old_allocations: Vec<CurrentAllocation>,
    pub new_allocations: Vec<TargetAllocation>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Name is too long")]
    NameTooLong,
    #[msg("Target allocations cannot be empty")]
    EmptyAllocations,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Too many investments")]
    TooManyInvestments,
    #[msg("No rebalance needed")]
    NoRebalanceNeeded,
}
```

---

## 2. Solana Program開発のセキュリティベストプラクティス

### アカウントバリデーション

```rust
// セキュアなアカウント制約
#[derive(Accounts)]
pub struct SecureInstruction<'info> {
    #[account(
        mut,
        seeds = [b"portfolio", authority.key().as_ref()],
        bump = portfolio.bump,
        has_one = authority @ ErrorCode::UnauthorizedAccess,
        constraint = portfolio.is_active @ ErrorCode::PortfolioInactive
    )]
    pub portfolio: Account<'info, Portfolio>,
    
    #[account(
        mut,
        constraint = user_account.owner == authority.key() @ ErrorCode::InvalidOwner,
        constraint = user_account.mint == expected_mint @ ErrorCode::InvalidMint
    )]
    pub user_account: InterfaceAccount<'info, TokenAccount>,
    
    pub authority: Signer<'info>,
}
```

### 整数オーバーフロー対策

```rust
impl Portfolio {
    pub fn safe_add_value(&mut self, amount: u64) -> Result<()> {
        self.total_value = self.total_value
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;
        Ok(())
    }

    pub fn safe_multiply(&self, a: u64, b: u64) -> Result<u64> {
        a.checked_mul(b).ok_or(ErrorCode::MathOverflow)
    }

    pub fn safe_percentage_calculation(&self, amount: u64) -> Result<f64> {
        if self.total_value == 0 {
            return Ok(0.0);
        }
        
        // 精度を保つため先に大きな数値にキャスト
        let percentage = (amount as f64 / self.total_value as f64) * 100.0;
        
        // 不正な値チェック
        require!(percentage.is_finite(), ErrorCode::InvalidCalculation);
        require!(percentage >= 0.0 && percentage <= 100.0, ErrorCode::InvalidPercentage);
        
        Ok(percentage)
    }
}
```

### リエントランシー攻撃対策

```rust
#[account]
pub struct Portfolio {
    // ... 他のフィールド
    pub locked: bool, // リエントランシー防止フラグ
}

pub fn protected_operation(ctx: Context<ProtectedOperation>) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    
    // ロック状態チェック
    require!(!portfolio.locked, ErrorCode::OperationInProgress);
    
    // ロック設定
    portfolio.locked = true;
    
    // 危険な操作実行
    let result = execute_dangerous_operation(ctx);
    
    // 操作完了後、必ずロック解除
    portfolio.locked = false;
    
    result
}
```

### 時間ベースの攻撃対策

```rust
pub fn time_sensitive_operation(ctx: Context<TimeSensitiveOp>) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let portfolio = &mut ctx.accounts.portfolio;
    
    // 最小待機時間チェック
    const MIN_INTERVAL: i64 = 3600; // 1時間
    require!(
        current_time - portfolio.last_rebalance >= MIN_INTERVAL,
        ErrorCode::TooFrequentOperation
    );
    
    // 最大有効期限チェック
    const MAX_DELAY: i64 = 86400; // 24時間
    require!(
        current_time - portfolio.last_update <= MAX_DELAY,
        ErrorCode::DataTooOld
    );
    
    Ok(())
}
```

---

## 3. SPL Token 2022との統合方法

### Token-2022とレガシーTokenの統一対応

```rust
use anchor_spl::token_interface::*;

// Token-2022対応のユニバーサル実装
#[derive(Accounts)]
pub struct UniversalTokenTransfer<'info> {
    #[account(
        mut,
        token::mint = mint,
        token::authority = authority
    )]
    pub from_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        token::mint = mint,
        token::authority = authority
    )]
    pub to_account: InterfaceAccount<'info, TokenAccount>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    pub authority: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn universal_transfer(
    ctx: Context<UniversalTokenTransfer>,
    amount: u64,
) -> Result<()> {
    // Token-2022とレガシーToken両方に対応
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.from_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.to_account.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;
    
    Ok(())
}
```

### イールドベアリングトークンの実装

```rust
use anchor_spl::token_2022::{
    Token2022,
    Interest, InterestBearingMint,
    interest_bearing_mint_initialize,
    interest_bearing_mint_update_rate,
};

#[derive(Accounts)]
pub struct CreateYieldBearingToken<'info> {
    #[account(
        init,
        payer = payer,
        mint::decimals = 6,
        mint::authority = authority,
        mint::token_program = token_program,
        extensions::interest_bearing_mint::rate_authority = rate_authority,
        extensions::interest_bearing_mint::rate = initial_rate,
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: This is safe because we're just setting it as an authority
    pub authority: UncheckedAccount<'info>,
    
    /// CHECK: Rate authority for interest updates
    pub rate_authority: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_yield_bearing_stablecoin(
    ctx: Context<CreateYieldBearingToken>,
    initial_rate: i16, // basis points (100 = 1%)
    name: String,
    symbol: String,
) -> Result<()> {
    msg!("Creating yield-bearing stablecoin: {} ({})", name, symbol);
    msg!("Initial interest rate: {} basis points", initial_rate);
    
    // メタデータ設定（Token-2022拡張機能）
    // 実装は省略（詳細なメタデータ設定が必要）
    
    Ok(())
}

pub fn update_interest_rate(
    ctx: Context<UpdateInterestRate>,
    new_rate: i16,
) -> Result<()> {
    let portfolio = &ctx.accounts.portfolio;
    
    // レート更新権限チェック
    require!(
        ctx.accounts.rate_authority.key() == portfolio.rate_authority,
        ErrorCode::UnauthorizedRateUpdate
    );
    
    // CPIでレート更新
    let cpi_accounts = interest_bearing_mint_update_rate(
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.rate_authority.to_account_info(),
        &[],
        new_rate,
    );
    
    msg!("Interest rate updated to: {} basis points", new_rate);
    Ok(())
}
```

---

## 4. PDA（Program Derived Address）の効果的な使用方法

### セキュアなPDA設計パターン

```rust
// 階層的PDA構造
#[derive(Accounts)]
pub struct HierarchicalPDA<'info> {
    // レベル1: ユーザーのマスターアカウント
    #[account(
        init_if_needed,
        payer = authority,
        space = UserMaster::LEN,
        seeds = [b"user_master", authority.key().as_ref()],
        bump
    )]
    pub user_master: Account<'info, UserMaster>,
    
    // レベル2: 特定のポートフォリオ
    #[account(
        init,
        payer = authority,
        space = Portfolio::LEN,
        seeds = [
            b"portfolio",
            user_master.key().as_ref(),
            portfolio_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub portfolio: Account<'info, Portfolio>,
    
    // レベル3: ポートフォリオ内のトークンボルト
    #[account(
        init,
        payer = authority,
        seeds = [
            b"vault",
            portfolio.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump,
        token::mint = token_mint,
        token::authority = portfolio
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,
    pub authority: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

// PDA生成ヘルパー関数
impl Portfolio {
    pub fn get_vault_seeds(&self) -> [&[u8]; 3] {
        [
            b"vault",
            self.key().as_ref(),
            // token_mintは動的なので、実際の使用時に追加
        ]
    }
    
    pub fn get_vault_address(
        &self,
        token_mint: &Pubkey,
        program_id: &Pubkey,
    ) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[
                b"vault",
                self.key().as_ref(),
                token_mint.as_ref(),
            ],
            program_id,
        )
    }
}
```

### PDAを使った署名権限の委譲

```rust
pub fn pda_signed_transfer(ctx: Context<PDASignedTransfer>) -> Result<()> {
    let portfolio = &ctx.accounts.portfolio;
    
    // PDA署名のためのシード準備
    let authority_seeds = &[
        b"portfolio",
        portfolio.authority.as_ref(),
        &[portfolio.bump],
    ];
    let signer = &[&authority_seeds[..]];
    
    // CPI with PDA signature
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.source_vault.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.destination_vault.to_account_info(),
        authority: portfolio.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    
    transfer_checked(
        cpi_ctx,
        ctx.accounts.source_vault.amount,
        ctx.accounts.token_mint.decimals,
    )?;
    
    Ok(())
}
```

---

## 5. エラーハンドリングとバリデーション

### 包括的エラー定義

```rust
#[error_code]
pub enum SloomoErrorCode {
    // 一般的なエラー
    #[msg("Math overflow detected")]
    MathOverflow,
    #[msg("Invalid calculation result")]
    InvalidCalculation,
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
    
    // ポートフォリオ関連
    #[msg("Portfolio is inactive")]
    PortfolioInactive,
    #[msg("Portfolio name too long (max 50 characters)")]
    PortfolioNameTooLong,
    #[msg("Target allocations cannot be empty")]
    EmptyTargetAllocations,
    #[msg("Allocation percentages must sum to 100%")]
    InvalidAllocationSum,
    
    // 投資関連
    #[msg("Investment amount must be greater than zero")]
    InvalidInvestmentAmount,
    #[msg("Insufficient funds for investment")]
    InsufficientFunds,
    #[msg("Maximum number of investments reached")]
    TooManyInvestments,
    #[msg("Investment not found")]
    InvestmentNotFound,
    
    // リバランス関連
    #[msg("No rebalancing needed at this time")]
    NoRebalanceNeeded,
    #[msg("Rebalancing too frequent (min 1 hour interval)")]
    TooFrequentRebalance,
    #[msg("Rebalancing operation in progress")]
    RebalanceInProgress,
    
    // xStock関連
    #[msg("Invalid xStock equity token")]
    InvalidXStockToken,
    #[msg("xStock market is closed")]
    MarketClosed,
    #[msg("xStock price feed unavailable")]
    PriceFeedUnavailable,
    
    // 時間関連
    #[msg("Operation timestamp too old")]
    TimestampTooOld,
    #[msg("Operation scheduled for future")]
    FutureTimestamp,
    
    // セキュリティ関連
    #[msg("Account is locked for security")]
    AccountLocked,
    #[msg("Invalid signature provided")]
    InvalidSignature,
    #[msg("Rate limit exceeded")]
    RateLimitExceeded,
}
```

### 高度なバリデーション実装

```rust
pub struct ValidationContext {
    pub clock: Clock,
    pub current_slot: Slot,
}

impl Portfolio {
    pub fn validate_investment(
        &self,
        amount: u64,
        token_symbol: &str,
        ctx: &ValidationContext,
    ) -> Result<()> {
        // 基本バリデーション
        require!(amount > 0, SloomoErrorCode::InvalidInvestmentAmount);
        require!(
            token_symbol.len() <= 32,
            SloomoErrorCode::InvalidXStockToken
        );
        
        // 投資上限チェック
        let current_investment = self.get_investment_amount(token_symbol);
        let total_after_investment = current_investment
            .checked_add(amount)
            .ok_or(SloomoErrorCode::MathOverflow)?;
        
        // ポートフォリオの最大配分制限（50%）
        let max_allocation = self.total_value / 2;
        require!(
            total_after_investment <= max_allocation,
            SloomoErrorCode::ExceedsMaxAllocation
        );
        
        // 時間ベースバリデーション
        self.validate_timing(&ctx.clock)?;
        
        Ok(())
    }
    
    fn validate_timing(&self, clock: &Clock) -> Result<()> {
        let current_time = clock.unix_timestamp;
        
        // 最後の取引から最小間隔チェック（1分）
        const MIN_INTERVAL: i64 = 60;
        if let Some(last_trade) = self.last_trade_timestamp {
            require!(
                current_time - last_trade >= MIN_INTERVAL,
                SloomoErrorCode::TooFrequentOperation
            );
        }
        
        // 営業時間チェック（UTC 14:30-21:00 = NYSE時間）
        let hour_utc = (current_time / 3600) % 24;
        require!(
            hour_utc >= 14 && hour_utc < 21,
            SloomoErrorCode::MarketClosed
        );
        
        Ok(())
    }

    pub fn validate_allocation_percentages(
        allocations: &[TargetAllocation]
    ) -> Result<()> {
        let total_percentage: f64 = allocations
            .iter()
            .map(|a| a.percentage)
            .sum();
        
        // 合計が100%に近いかチェック（±0.01%の誤差許容）
        const TOLERANCE: f64 = 0.01;
        require!(
            (total_percentage - 100.0).abs() <= TOLERANCE,
            SloomoErrorCode::InvalidAllocationSum
        );
        
        // 各配分が有効範囲内かチェック
        for allocation in allocations {
            require!(
                allocation.percentage >= 0.0 && allocation.percentage <= 100.0,
                SloomoErrorCode::InvalidPercentage
            );
            require!(
                !allocation.symbol.is_empty() && allocation.symbol.len() <= 32,
                SloomoErrorCode::InvalidXStockToken
            );
        }
        
        Ok(())
    }
}
```

---

## 6. テスト戦略（TypeScript/Mocha）

### Anchor 0.31.1対応テスト設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["mocha", "chai"],
    "typeRoots": ["./node_modules/@types"],
    "lib": ["es6"],
    "module": "commonjs",
    "target": "es6",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "resolveJsonModule": true
  },
  "exclude": ["node_modules", "target"]
}
```

```toml
# Anchor.toml
[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### 包括的テストスイート

```typescript
// tests/sloomo.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Sloomo } from "../target/types/sloomo";
import { 
  Keypair, 
  PublicKey, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createMint,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("Sloomo Portfolio Management", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Sloomo as Program<Sloomo>;
  const authority = provider.wallet as anchor.Wallet;
  
  let portfolioPDA: PublicKey;
  let portfolioBump: number;
  let testTokenMint: PublicKey;
  let userTokenAccount: PublicKey;
  let portfolioVault: PublicKey;

  before(async () => {
    // Portfolio PDA計算
    [portfolioPDA, portfolioBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("portfolio"), authority.publicKey.toBuffer()],
      program.programId
    );

    // テスト用トークンミント作成
    testTokenMint = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      6, // decimals
      Keypair.generate(),
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    // ユーザーのトークンアカウント
    userTokenAccount = getAssociatedTokenAddressSync(
      testTokenMint,
      authority.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Portfolio vault PDA
    [portfolioVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        portfolioPDA.toBuffer(),
        testTokenMint.toBuffer()
      ],
      program.programId
    );

    // ユーザーアカウントにテストトークンをミント
    await mintTo(
      provider.connection,
      authority.payer,
      testTokenMint,
      userTokenAccount,
      authority.publicKey,
      1_000_000 * 10**6, // 1M tokens
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
  });

  describe("Portfolio Initialization", () => {
    it("ポートフォリオを正常に初期化", async () => {
      const targetAllocations = [
        { symbol: "AAPL", percentage: 40.0 },
        { symbol: "GOOGL", percentage: 30.0 },
        { symbol: "MSFT", percentage: 30.0 },
      ];

      const tx = await program.methods
        .initializePortfolio("Tech Growth Portfolio", targetAllocations)
        .accounts({
          portfolio: portfolioPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // ポートフォリオ状態確認
      const portfolioAccount = await program.account.portfolio.fetch(portfolioPDA);
      
      expect(portfolioAccount.authority.toString()).to.equal(
        authority.publicKey.toString()
      );
      expect(portfolioAccount.name).to.equal("Tech Growth Portfolio");
      expect(portfolioAccount.targetAllocations).to.have.length(3);
      expect(portfolioAccount.totalValue.toNumber()).to.equal(0);
      expect(portfolioAccount.bump).to.equal(portfolioBump);
    });

    it("無効な配分で初期化を拒否", async () => {
      const invalidAllocations = [
        { symbol: "AAPL", percentage: 60.0 },
        { symbol: "GOOGL", percentage: 50.0 }, // 合計110%
      ];

      try {
        await program.methods
          .initializePortfolio("Invalid Portfolio", invalidAllocations)
          .accounts({
            portfolio: portfolioPDA,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("Should have thrown error for invalid allocations");
      } catch (error) {
        expect(error.toString()).to.include("InvalidAllocationSum");
      }
    });
  });

  describe("xStock Investment", () => {
    it("xStock equity tokenへの投資実行", async () => {
      const investmentAmount = 100_000 * 10**6; // 100K tokens

      const tx = await program.methods
        .investInXstock(new anchor.BN(investmentAmount), "AAPL")
        .accounts({
          portfolio: portfolioPDA,
          userTokenAccount: userTokenAccount,
          portfolioVault: portfolioVault,
          tokenMint: testTokenMint,
          authority: authority.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // 投資後の状態確認
      const portfolioAccount = await program.account.portfolio.fetch(portfolioPDA);
      expect(portfolioAccount.totalValue.toNumber()).to.equal(investmentAmount);
      
      const vaultAccount = await getAccount(
        provider.connection,
        portfolioVault,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(vaultAccount.amount)).to.equal(investmentAmount);
    });

    it("不十分な残高での投資を拒否", async () => {
      const excessiveAmount = 2_000_000 * 10**6; // 2M tokens (残高を超過)

      try {
        await program.methods
          .investInXstock(new anchor.BN(excessiveAmount), "GOOGL")
          .accounts({
            portfolio: portfolioPDA,
            userTokenAccount: userTokenAccount,
            portfolioVault: portfolioVault,
            tokenMint: testTokenMint,
            authority: authority.publicKey,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("Should have thrown insufficient funds error");
      } catch (error) {
        expect(error.toString()).to.include("InsufficientFunds");
      }
    });
  });

  describe("Portfolio Rebalancing", () => {
    it("自動リバランスの実行", async () => {
      // 追加投資でバランスを崩す
      const additionalInvestment = 50_000 * 10**6;
      
      await program.methods
        .investInXstock(new anchor.BN(additionalInvestment), "AAPL")
        .accounts({
          portfolio: portfolioPDA,
          userTokenAccount: userTokenAccount,
          portfolioVault: portfolioVault,
          tokenMint: testTokenMint,
          authority: authority.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // リバランス実行
      const tx = await program.methods
        .rebalancePortfolio()
        .accounts({
          portfolio: portfolioPDA,
          authority: authority.publicKey,
        })
        .rpc();

      // リバランス後の状態確認
      const portfolioAccount = await program.account.portfolio.fetch(portfolioPDA);
      expect(portfolioAccount.lastRebalance.toNumber()).to.be.greaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("認証されていないユーザーの操作を拒否", async () => {
      const unauthorizedUser = Keypair.generate();
      
      // 一部SOLを送金（トランザクション料金のため）
      await provider.connection.requestAirdrop(
        unauthorizedUser.publicKey,
        LAMPORTS_PER_SOL
      );

      try {
        await program.methods
          .investInXstock(new anchor.BN(1000), "AAPL")
          .accounts({
            portfolio: portfolioPDA,
            userTokenAccount: userTokenAccount,
            portfolioVault: portfolioVault,
            tokenMint: testTokenMint,
            authority: unauthorizedUser.publicKey,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorizedUser])
          .rpc();
        
        expect.fail("Should have thrown unauthorized access error");
      } catch (error) {
        expect(error.toString()).to.include("UnauthorizedAccess");
      }
    });
  });

  describe("Integration Tests", () => {
    it("完全な投資フロー - 初期化から利益実現まで", async () => {
      // 新しいポートフォリオ作成
      const newUser = Keypair.generate();
      await provider.connection.requestAirdrop(
        newUser.publicKey,
        2 * LAMPORTS_PER_SOL
      );

      const [newPortfolioPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), newUser.publicKey.toBuffer()],
        program.programId
      );

      // ステップ1: ポートフォリオ初期化
      await program.methods
        .initializePortfolio("Integration Test Portfolio", [
          { symbol: "AAPL", percentage: 50.0 },
          { symbol: "GOOGL", percentage: 50.0 },
        ])
        .accounts({
          portfolio: newPortfolioPDA,
          authority: newUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([newUser])
        .rpc();

      // ステップ2: 投資実行
      // （実装省略 - 複数の投資を順次実行）

      // ステップ3: リバランス
      // （実装省略）

      // ステップ4: 利益実現
      // （実装省略）

      // 最終状態確認
      const finalPortfolio = await program.account.portfolio.fetch(newPortfolioPDA);
      expect(finalPortfolio.currentInvestments.length).to.be.greaterThan(0);
    });
  });

  describe("Performance Tests", () => {
    it("大量取引での性能テスト", async () => {
      const startTime = Date.now();
      const transactions = [];

      // 100回の小額投資を並列実行
      for (let i = 0; i < 100; i++) {
        const tx = program.methods
          .investInXstock(new anchor.BN(1000), "PERF_TEST")
          .accounts({
            portfolio: portfolioPDA,
            userTokenAccount: userTokenAccount,
            portfolioVault: portfolioVault,
            tokenMint: testTokenMint,
            authority: authority.publicKey,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        transactions.push(tx);
      }

      await Promise.all(transactions);
      const endTime = Date.now();
      
      console.log(`100 transactions completed in ${endTime - startTime}ms`);
      expect(endTime - startTime).to.be.lessThan(30000); // 30秒以内
    });
  });
});
```

### モッキングとテストユーティリティ

```typescript
// tests/utils/test-helpers.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export class TestHelpers {
  static async setupTestEnvironment() {
    const provider = anchor.AnchorProvider.env();
    const program = anchor.workspace.Sloomo;
    
    return { provider, program };
  }

  static async createTestUser(
    connection: anchor.web3.Connection,
    airdropAmount: number = 2
  ) {
    const user = Keypair.generate();
    await connection.requestAirdrop(
      user.publicKey,
      airdropAmount * anchor.web3.LAMPORTS_PER_SOL
    );
    
    // 確認を待つ
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return user;
  }

  static async createTestToken(
    connection: anchor.web3.Connection,
    authority: Keypair,
    decimals: number = 6
  ) {
    // Token-2022でテストトークン作成
    // 実装省略
  }

  static generateValidTargetAllocations() {
    return [
      { symbol: "AAPL", percentage: 30.0 },
      { symbol: "GOOGL", percentage: 25.0 },
      { symbol: "MSFT", percentage: 25.0 },
      { symbol: "AMZN", percentage: 20.0 },
    ];
  }

  static generateInvalidTargetAllocations() {
    return [
      { symbol: "AAPL", percentage: 60.0 },
      { symbol: "GOOGL", percentage: 50.0 }, // 合計110%
    ];
  }

  static async waitForSlot(
    connection: anchor.web3.Connection,
    targetSlot: number
  ) {
    let currentSlot = await connection.getSlot();
    while (currentSlot < targetSlot) {
      await new Promise(resolve => setTimeout(resolve, 100));
      currentSlot = await connection.getSlot();
    }
  }
}

// テスト用のモックOracle実装
export class MockPriceOracle {
  private prices: Map<string, number> = new Map();

  constructor() {
    // デフォルト価格設定
    this.prices.set("AAPL", 150.00);
    this.prices.set("GOOGL", 2500.00);
    this.prices.set("MSFT", 300.00);
    this.prices.set("AMZN", 3200.00);
  }

  setPrice(symbol: string, price: number) {
    this.prices.set(symbol, price);
  }

  getPrice(symbol: string): number {
    return this.prices.get(symbol) || 0;
  }

  simulateMarketMovement(volatility: number = 0.05) {
    for (const [symbol, price] of this.prices.entries()) {
      const change = (Math.random() - 0.5) * volatility * price;
      this.prices.set(symbol, Math.max(0.01, price + change));
    }
  }
}
```

---

## 7. 型安全性とIDL生成

### Anchor 0.31.1のIDL生成設定

```toml
# programs/sloomo/Cargo.toml
[package]
name = "sloomo"
version = "0.1.0"
edition = "2021"

[features]
idl-build = ["anchor-lang/idl-build"]
default = []

[dependencies]
anchor-lang = { version = "0.31.1", features = ["init-if-needed"] }
anchor-spl = { version = "0.31.1", features = ["idl-build"] }
```

### TypeScript型生成の最適化

```typescript
// anchor/idl.ts - 生成されたIDLの型安全な利用
import { IdlAccounts, IdlTypes } from "@coral-xyz/anchor";
import { Sloomo } from "../target/types/sloomo";

// アカウント型の抽出
export type PortfolioAccount = IdlAccounts<Sloomo>["portfolio"];
export type UserMasterAccount = IdlAccounts<Sloomo>["userMaster"];

// カスタム型の抽出
export type TargetAllocation = IdlTypes<Sloomo>["TargetAllocation"];
export type Investment = IdlTypes<Sloomo>["Investment"];
export type CurrentAllocation = IdlTypes<Sloomo>["CurrentAllocation"];

// イベント型の抽出
export type RebalanceEvent = IdlTypes<Sloomo>["RebalanceEvent"];

// エラー型の抽出
export type SloomoError = IdlTypes<Sloomo>["SloomoErrorCode"];

// 型安全なプログラムインタフェース
export interface TypeSafeSloomoProgram {
  initializePortfolio(
    name: string,
    targetAllocations: TargetAllocation[]
  ): Promise<string>;

  investInXstock(
    amount: anchor.BN,
    tokenSymbol: string
  ): Promise<string>;

  rebalancePortfolio(): Promise<string>;

  getPortfolio(authority: PublicKey): Promise<PortfolioAccount>;
  
  calculateCurrentAllocations(
    portfolio: PortfolioAccount
  ): CurrentAllocation[];
}
```

### クライアント側の型安全実装

```typescript
// clients/sloomo-client.ts
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { Sloomo } from "../target/types/sloomo";
import {
  TypeSafeSloomoProgram,
  PortfolioAccount,
  TargetAllocation,
  CurrentAllocation,
} from "../anchor/idl";

export class SloomoClient implements TypeSafeSloomoProgram {
  private program: Program<Sloomo>;
  private provider: AnchorProvider;

  constructor(
    connection: Connection,
    wallet: anchor.Wallet,
    programId: PublicKey
  ) {
    this.provider = new AnchorProvider(connection, wallet, {});
    this.program = new Program(
      require("../target/idl/sloomo.json"),
      programId,
      this.provider
    ) as Program<Sloomo>;
  }

  async initializePortfolio(
    name: string,
    targetAllocations: TargetAllocation[]
  ): Promise<string> {
    // 入力バリデーション
    this.validatePortfolioName(name);
    this.validateTargetAllocations(targetAllocations);

    const [portfolioPDA] = this.getPortfolioPDA(
      this.provider.wallet.publicKey
    );

    const tx = await this.program.methods
      .initializePortfolio(name, targetAllocations)
      .accounts({
        portfolio: portfolioPDA,
        authority: this.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async investInXstock(
    amount: anchor.BN,
    tokenSymbol: string
  ): Promise<string> {
    // 型安全なバリデーション
    if (amount.lte(new anchor.BN(0))) {
      throw new Error("Investment amount must be positive");
    }
    
    if (!this.isValidTokenSymbol(tokenSymbol)) {
      throw new Error("Invalid token symbol");
    }

    const [portfolioPDA] = this.getPortfolioPDA(
      this.provider.wallet.publicKey
    );

    // 必要なアカウントを動的に解決
    const accounts = await this.resolveInvestmentAccounts(
      portfolioPDA,
      tokenSymbol
    );

    const tx = await this.program.methods
      .investInXstock(amount, tokenSymbol)
      .accounts(accounts)
      .rpc();

    return tx;
  }

  async rebalancePortfolio(): Promise<string> {
    const [portfolioPDA] = this.getPortfolioPDA(
      this.provider.wallet.publicKey
    );

    // リバランス前の状態チェック
    const portfolio = await this.getPortfolio(
      this.provider.wallet.publicKey
    );
    
    if (!this.needsRebalancing(portfolio)) {
      throw new Error("Portfolio does not need rebalancing");
    }

    const tx = await this.program.methods
      .rebalancePortfolio()
      .accounts({
        portfolio: portfolioPDA,
        authority: this.provider.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  async getPortfolio(authority: PublicKey): Promise<PortfolioAccount> {
    const [portfolioPDA] = this.getPortfolioPDA(authority);
    
    try {
      return await this.program.account.portfolio.fetch(portfolioPDA);
    } catch (error) {
      throw new Error(`Portfolio not found for authority: ${authority.toBase58()}`);
    }
  }

  calculateCurrentAllocations(
    portfolio: PortfolioAccount
  ): CurrentAllocation[] {
    if (portfolio.totalValue.eq(new anchor.BN(0))) {
      return [];
    }

    return portfolio.currentInvestments.map(investment => ({
      symbol: investment.symbol,
      amount: investment.amount,
      percentage: investment.amount
        .mul(new anchor.BN(10000))
        .div(portfolio.totalValue)
        .toNumber() / 100,
    }));
  }

  // ヘルパーメソッド
  private getPortfolioPDA(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("portfolio"), authority.toBuffer()],
      this.program.programId
    );
  }

  private validatePortfolioName(name: string): void {
    if (!name || name.length === 0) {
      throw new Error("Portfolio name cannot be empty");
    }
    if (name.length > 50) {
      throw new Error("Portfolio name too long (max 50 characters)");
    }
  }

  private validateTargetAllocations(allocations: TargetAllocation[]): void {
    if (allocations.length === 0) {
      throw new Error("Target allocations cannot be empty");
    }

    const totalPercentage = allocations.reduce(
      (sum, alloc) => sum + alloc.percentage,
      0
    );

    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error("Target allocations must sum to 100%");
    }

    for (const alloc of allocations) {
      if (alloc.percentage < 0 || alloc.percentage > 100) {
        throw new Error("Allocation percentage must be between 0 and 100");
      }
      if (!this.isValidTokenSymbol(alloc.symbol)) {
        throw new Error(`Invalid token symbol: ${alloc.symbol}`);
      }
    }
  }

  private isValidTokenSymbol(symbol: string): boolean {
    return /^[A-Z]{1,10}$/.test(symbol);
  }

  private needsRebalancing(portfolio: PortfolioAccount): boolean {
    const currentAllocations = this.calculateCurrentAllocations(portfolio);
    const threshold = 5.0; // 5%の閾値

    for (const target of portfolio.targetAllocations) {
      const current = currentAllocations.find(c => c.symbol === target.symbol);
      const currentPercentage = current ? current.percentage : 0;
      
      if (Math.abs(currentPercentage - target.percentage) > threshold) {
        return true;
      }
    }

    return false;
  }

  private async resolveInvestmentAccounts(
    portfolioPDA: PublicKey,
    tokenSymbol: string
  ) {
    // トークンミントアドレスの解決
    const tokenMint = await this.getTokenMintForSymbol(tokenSymbol);
    
    // 必要なアカウントアドレスを計算
    const userTokenAccount = await this.getAssociatedTokenAccount(
      tokenMint,
      this.provider.wallet.publicKey
    );
    
    const [portfolioVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        portfolioPDA.toBuffer(),
        tokenMint.toBuffer()
      ],
      this.program.programId
    );

    return {
      portfolio: portfolioPDA,
      userTokenAccount,
      portfolioVault,
      tokenMint,
      authority: this.provider.wallet.publicKey,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    };
  }

  private async getTokenMintForSymbol(symbol: string): Promise<PublicKey> {
    // 実際の実装では、外部APIまたはオンチェーンレジストリから
    // シンボルに対応するミントアドレスを取得
    const symbolToMint: Record<string, string> = {
      "AAPL": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // 例
      "GOOGL": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "MSFT": "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E",
    };

    const mintAddress = symbolToMint[symbol];
    if (!mintAddress) {
      throw new Error(`Unknown token symbol: ${symbol}`);
    }

    return new PublicKey(mintAddress);
  }

  private async getAssociatedTokenAccount(
    mint: PublicKey,
    owner: PublicKey
  ): Promise<PublicKey> {
    return anchor.utils.token.associatedAddress({
      mint,
      owner,
    });
  }
}

// React Native統合用のフック
export function useSloomoClient(): SloomoClient | null {
  const [client, setClient] = useState<SloomoClient | null>(null);
  
  // Mobile Wallet Adapter統合
  const { connection } = useConnection();
  const { wallet } = useMobileWallet();

  useEffect(() => {
    if (connection && wallet) {
      const programId = new PublicKey("F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS");
      const sloomoClient = new SloomoClient(connection, wallet, programId);
      setClient(sloomoClient);
    }
  }, [connection, wallet]);

  return client;
}
```

---

## 8. ガス効率化とパフォーマンス最適化

### 計算単位（Compute Units）の最適化

```rust
// 効率的なループ処理
impl Portfolio {
    pub fn optimized_rebalance(&mut self) -> Result<()> {
        // 一度の計算で必要な情報をすべて取得
        let total_value = self.total_value;
        let mut rebalance_operations = Vec::new();
        
        // O(n)の単一パスで必要な操作を決定
        for (i, target) in self.target_allocations.iter().enumerate() {
            if let Some(current) = self.current_investments
                .iter()
                .find(|inv| inv.symbol == target.symbol) {
                
                let target_amount = (total_value as f64 * target.percentage / 100.0) as u64;
                let diff = target_amount.abs_diff(current.amount);
                
                if diff > (total_value / 100) { // 1%以上の差の場合のみ
                    rebalance_operations.push(RebalanceOp {
                        symbol: target.symbol.clone(),
                        from_amount: current.amount,
                        to_amount: target_amount,
                        operation_type: if target_amount > current.amount {
                            OpType::Buy
                        } else {
                            OpType::Sell
                        },
                    });
                }
            }
        }
        
        // バッチ処理で操作実行
        self.execute_rebalance_batch(&rebalance_operations)?;
        
        Ok(())
    }
    
    // メモリ効率的な大きなデータの処理
    pub fn process_large_dataset(&self, data: &[u8]) -> Result<Vec<u8>> {
        const CHUNK_SIZE: usize = 1024; // 1KBずつ処理
        let mut result = Vec::new();
        
        for chunk in data.chunks(CHUNK_SIZE) {
            let processed = self.process_chunk(chunk)?;
            result.extend_from_slice(&processed);
        }
        
        Ok(result)
    }
}

// 不要な計算を避ける
#[derive(Accounts)]
pub struct OptimizedAccounts<'info> {
    #[account(
        mut,
        seeds = [b"portfolio", authority.key().as_ref()],
        bump = portfolio.bump,
        // constraintで事前計算済みの値を使用
        constraint = portfolio.total_value > 0 @ ErrorCode::EmptyPortfolio
    )]
    pub portfolio: Account<'info, Portfolio>,
    
    // 必要最小限のアカウントのみ含める
    pub authority: Signer<'info>,
}
```

### メモリ使用量の最適化

```rust
// 固定サイズの配列を使用してheap allocationを避ける
#[account]
pub struct OptimizedPortfolio {
    pub authority: Pubkey,
    // 動的なVecの代わりに固定配列を使用
    pub target_allocations: [TargetAllocation; 10],
    pub target_allocations_len: u8,
    pub current_investments: [Investment; 50],
    pub current_investments_len: u8,
    // パディングで確実にアライメント
    pub _reserved: [u8; 64],
}

impl OptimizedPortfolio {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        (10 * TargetAllocation::LEN) + // fixed array
        1 + // length
        (50 * Investment::LEN) + // fixed array
        1 + // length
        64; // reserved
    
    pub fn add_target_allocation(&mut self, allocation: TargetAllocation) -> Result<()> {
        require!(
            (self.target_allocations_len as usize) < self.target_allocations.len(),
            ErrorCode::TooManyAllocations
        );
        
        self.target_allocations[self.target_allocations_len as usize] = allocation;
        self.target_allocations_len += 1;
        
        Ok(())
    }
    
    pub fn get_target_allocations(&self) -> &[TargetAllocation] {
        &self.target_allocations[..self.target_allocations_len as usize]
    }
}
```

### 効率的なCPI実装

```rust
// バッチCPI処理
pub fn batch_token_transfers(ctx: Context<BatchTransfer>) -> Result<()> {
    let portfolio = &ctx.accounts.portfolio;
    let authority_seeds = &[
        b"portfolio",
        portfolio.authority.as_ref(),
        &[portfolio.bump],
    ];
    let signer = &[&authority_seeds[..]];
    
    // 複数の転送を一度に処理
    for (i, transfer_info) in ctx.accounts.transfer_infos.iter().enumerate() {
        // remaining_accountsから必要なアカウントを取得
        let from_account = &ctx.remaining_accounts[i * 3];
        let to_account = &ctx.remaining_accounts[i * 3 + 1];
        let mint_account = &ctx.remaining_accounts[i * 3 + 2];
        
        let cpi_accounts = TransferChecked {
            from: from_account.to_account_info(),
            mint: mint_account.to_account_info(),
            to: to_account.to_account_info(),
            authority: portfolio.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        transfer_checked(cpi_ctx, transfer_info.amount, transfer_info.decimals)?;
    }
    
    Ok(())
}

// 効率的なアカウント初期化
pub fn efficient_vault_creation(ctx: Context<CreateVaults>) -> Result<()> {
    // 複数のボルトを一度に作成
    let portfolio = &ctx.accounts.portfolio;
    let rent = Rent::get()?;
    
    for (i, mint) in ctx.accounts.mints.iter().enumerate() {
        let vault_account = &ctx.remaining_accounts[i];
        
        // 手動でアカウント作成（rent計算を一度だけ実行）
        let space = TokenAccount::LEN;
        let lamports = rent.minimum_balance(space);
        
        // System Programでアカウント作成
        let create_account_ix = system_instruction::create_account(
            &ctx.accounts.payer.key(),
            &vault_account.key(),
            lamports,
            space as u64,
            &ctx.accounts.token_program.key(),
        );
        
        anchor_lang::solana_program::program::invoke_signed(
            &create_account_ix,
            &[
                ctx.accounts.payer.to_account_info(),
                vault_account.clone(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[
                b"vault",
                portfolio.key().as_ref(),
                mint.key().as_ref(),
                &[ctx.bumps.get(&format!("vault_{}", i)).unwrap().clone()]
            ]],
        )?;
    }
    
    Ok(())
}
```

---

## 9. upgrade可能なプログラム設計

### バージョン管理システム

```rust
#[account]
pub struct ProgramState {
    pub version: u32,
    pub admin: Pubkey,
    pub upgrade_authority: Pubkey,
    pub paused: bool,
    pub last_upgrade: i64,
    pub feature_flags: u64, // ビットフラグで機能の有効/無効を管理
    pub _reserved: [u8; 200], // 将来の拡張用
}

impl ProgramState {
    pub const CURRENT_VERSION: u32 = 1;
    
    pub const LEN: usize = 8 + // discriminator
        4 + // version
        32 + // admin
        32 + // upgrade_authority
        1 + // paused
        8 + // last_upgrade
        8 + // feature_flags
        200; // reserved
    
    pub fn is_feature_enabled(&self, feature: FeatureFlag) -> bool {
        (self.feature_flags & feature as u64) != 0
    }
    
    pub fn enable_feature(&mut self, feature: FeatureFlag) {
        self.feature_flags |= feature as u64;
    }
    
    pub fn disable_feature(&mut self, feature: FeatureFlag) {
        self.feature_flags &= !(feature as u64);
    }
}

#[repr(u64)]
pub enum FeatureFlag {
    AutoRebalance = 1 << 0,
    AdvancedOrders = 1 << 1,
    CrossChainIntegration = 1 << 2,
    AIOptimization = 1 << 3,
    SocialTrading = 1 << 4,
    // 最大64の機能フラグ
}

// バージョン互換性チェック
pub fn check_version_compatibility(ctx: Context<AnyInstruction>) -> Result<()> {
    let program_state = &ctx.accounts.program_state;
    
    require!(
        program_state.version <= ProgramState::CURRENT_VERSION,
        ErrorCode::IncompatibleVersion
    );
    
    require!(!program_state.paused, ErrorCode::ProgramPaused);
    
    Ok(())
}
```

### マイグレーション機能

```rust
// データ構造のマイグレーション
#[derive(Accounts)]
pub struct MigratePortfolio<'info> {
    #[account(
        mut,
        seeds = [b"portfolio", authority.key().as_ref()],
        bump = old_portfolio.bump,
        has_one = authority
    )]
    pub old_portfolio: Account<'info, OldPortfolio>,
    
    #[account(
        init,
        payer = authority,
        space = NewPortfolio::LEN,
        seeds = [b"portfolio_v2", authority.key().as_ref()],
        bump
    )]
    pub new_portfolio: Account<'info, NewPortfolio>,
    
    #[account(
        seeds = [b"program_state"],
        bump,
        constraint = program_state.version >= 2 @ ErrorCode::MigrationNotAvailable
    )]
    pub program_state: Account<'info, ProgramState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn migrate_portfolio_to_v2(ctx: Context<MigratePortfolio>) -> Result<()> {
    let old_portfolio = &ctx.accounts.old_portfolio;
    let new_portfolio = &mut ctx.accounts.new_portfolio;
    
    // データ移行
    new_portfolio.authority = old_portfolio.authority;
    new_portfolio.name = old_portfolio.name.clone();
    new_portfolio.total_value = old_portfolio.total_value;
    
    // 新機能の初期化
    new_portfolio.risk_profile = RiskProfile::Conservative; // デフォルト値
    new_portfolio.auto_rebalance_enabled = false;
    new_portfolio.rebalance_threshold = 5.0; // 5%
    
    // 既存の投資データを新形式に変換
    for (i, old_investment) in old_portfolio.current_investments.iter().enumerate() {
        if i >= new_portfolio.investments.len() {
            break; // 配列サイズ制限
        }
        
        new_portfolio.investments[i] = NewInvestment {
            symbol: old_investment.symbol.clone(),
            amount: old_investment.amount,
            last_updated: old_investment.last_updated,
            cost_basis: old_investment.amount, // 移行時の値をコストベースとして設定
            unrealized_pnl: 0, // 新機能
        };
    }
    
    new_portfolio.investments_len = old_portfolio.current_investments_len;
    
    // 移行完了イベント
    emit!(PortfolioMigrationEvent {
        old_portfolio: old_portfolio.key(),
        new_portfolio: new_portfolio.key(),
        migration_timestamp: Clock::get()?.unix_timestamp,
    });
    
    msg!("Portfolio migrated to v2 successfully");
    Ok(())
}
```

### 段階的機能リリース

```rust
// 機能フラグベースの条件実行
pub fn advanced_rebalance(ctx: Context<AdvancedRebalance>) -> Result<()> {
    let program_state = &ctx.accounts.program_state;
    
    // 新機能が有効になっているかチェック
    require!(
        program_state.is_feature_enabled(FeatureFlag::AIOptimization),
        ErrorCode::FeatureNotEnabled
    );
    
    let portfolio = &mut ctx.accounts.portfolio;
    
    if program_state.is_feature_enabled(FeatureFlag::AdvancedOrders) {
        // 高度な注文機能を使用
        portfolio.execute_smart_rebalance()?;
    } else {
        // 基本的なリバランス機能
        portfolio.execute_basic_rebalance()?;
    }
    
    Ok(())
}

// A/Bテスト機能
pub fn ab_test_feature(ctx: Context<ABTestContext>) -> Result<()> {
    let user_seed = ctx.accounts.authority.key().to_bytes();
    let test_group = user_seed[31] % 2; // ユーザーの最後のバイトで決定
    
    match test_group {
        0 => {
            // グループA: 既存機能
            execute_existing_logic(ctx)?;
        },
        1 => {
            // グループB: 新機能
            if ctx.accounts.program_state.is_feature_enabled(FeatureFlag::AIOptimization) {
                execute_new_logic(ctx)?;
            } else {
                execute_existing_logic(ctx)?; // フォールバック
            }
        },
        _ => unreachable!(),
    }
    
    Ok(())
}
```

### 緊急停止機能

```rust
#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    #[account(
        mut,
        seeds = [b"program_state"],
        bump,
        has_one = admin
    )]
    pub program_state: Account<'info, ProgramState>,
    
    pub admin: Signer<'info>,
}

pub fn emergency_pause(ctx: Context<EmergencyPause>) -> Result<()> {
    let program_state = &mut ctx.accounts.program_state;
    program_state.paused = true;
    
    emit!(EmergencyPauseEvent {
        timestamp: Clock::get()?.unix_timestamp,
        admin: ctx.accounts.admin.key(),
    });
    
    msg!("Program paused by admin");
    Ok(())
}

pub fn emergency_unpause(ctx: Context<EmergencyPause>) -> Result<()> {
    let program_state = &mut ctx.accounts.program_state;
    program_state.paused = false;
    
    emit!(EmergencyUnpauseEvent {
        timestamp: Clock::get()?.unix_timestamp,
        admin: ctx.accounts.admin.key(),
    });
    
    msg!("Program unpaused by admin");
    Ok(())
}

// すべての命令に適用する緊急停止チェック
#[macro_export]
macro_rules! require_not_paused {
    ($program_state:expr) => {
        require!(!$program_state.paused, ErrorCode::ProgramPaused);
    };
}
```

---

## 10. Cross-Program Invocation (CPI) パターン

### セキュアなCPI実装

```rust
use anchor_spl::token::{self, Token, TokenAccount, Transfer, TransferChecked};
use anchor_spl::associated_token::AssociatedToken;

// 複数プログラムとの安全な連携
#[derive(Accounts)]
pub struct SecureCPI<'info> {
    #[account(mut)]
    pub portfolio: Account<'info, Portfolio>,
    
    // SPL Token Program CPI
    #[account(
        mut,
        constraint = source_token_account.owner == portfolio.key()
    )]
    pub source_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = destination_token_account.mint == source_token_account.mint
    )]
    pub destination_token_account: Account<'info, TokenAccount>,
    
    // プログラムアドレス検証
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    
    // 外部DeFiプロトコルとの連携（例：Solend）
    /// CHECK: This is validated by the Solend program
    #[account(mut)]
    pub solend_market: UncheckedAccount<'info>,
    
    /// CHECK: Solend program address is verified
    #[account(address = solend_program::ID)]
    pub solend_program: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn execute_defi_strategy(
    ctx: Context<SecureCPI>,
    amount: u64,
    strategy_type: DeFiStrategy,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    
    // 入力検証
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(
        ctx.accounts.source_token_account.amount >= amount,
        ErrorCode::InsufficientFunds
    );
    
    match strategy_type {
        DeFiStrategy::LendingProtocol => {
            execute_lending_strategy(ctx, amount)?;
        },
        DeFiStrategy::LiquidityPool => {
            execute_liquidity_strategy(ctx, amount)?;
        },
        DeFiStrategy::YieldFarming => {
            execute_yield_farming_strategy(ctx, amount)?;
        },
    }
    
    // ポートフォリオ状態更新
    portfolio.last_defi_operation = Clock::get()?.unix_timestamp;
    
    Ok(())
}

fn execute_lending_strategy(
    ctx: Context<SecureCPI>,
    amount: u64,
) -> Result<()> {
    let portfolio = &ctx.accounts.portfolio;
    
    // PDA署名の準備
    let authority_seeds = &[
        b"portfolio",
        portfolio.authority.as_ref(),
        &[portfolio.bump],
    ];
    let signer = &[&authority_seeds[..]];
    
    // ステップ1: SPL Token転送
    let transfer_accounts = Transfer {
        from: ctx.accounts.source_token_account.to_account_info(),
        to: ctx.accounts.destination_token_account.to_account_info(),
        authority: portfolio.to_account_info(),
    };
    
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
        signer,
    );
    
    token::transfer(transfer_ctx, amount)?;
    
    // ステップ2: 外部DeFiプロトコルへのCPI
    let solend_accounts = vec![
        ctx.accounts.solend_market.to_account_info(),
        ctx.accounts.destination_token_account.to_account_info(),
        portfolio.to_account_info(),
    ];
    
    let solend_instruction = solana_program::instruction::Instruction {
        program_id: ctx.accounts.solend_program.key(),
        accounts: solend_accounts.iter().map(|acc| AccountMeta {
            pubkey: acc.key(),
            is_signer: acc.is_signer,
            is_writable: acc.is_writable,
        }).collect(),
        data: create_solend_deposit_data(amount)?,
    };
    
    solana_program::program::invoke_signed(
        &solend_instruction,
        &solend_accounts,
        signer,
    )?;
    
    msg!("Lending strategy executed: {} tokens", amount);
    Ok(())
}

// オラクル価格取得のCPI
#[derive(Accounts)]
pub struct PriceOracleCPI<'info> {
    /// CHECK: Oracle program ID is verified
    #[account(address = pyth_oracle_program::ID)]
    pub oracle_program: UncheckedAccount<'info>,
    
    /// CHECK: Price account address is verified by oracle program
    pub price_account: UncheckedAccount<'info>,
}

pub fn get_price_from_oracle(
    ctx: Context<PriceOracleCPI>,
    token_symbol: String,
) -> Result<u64> {
    // Pyth Oracleからの価格取得
    let price_account_data = &ctx.accounts.price_account.data.borrow();
    
    // Pythの価格データ構造を解析
    let price_data = parse_pyth_price_data(price_account_data)?;
    
    require!(
        price_data.status == PythPriceStatus::Trading,
        ErrorCode::PriceNotAvailable
    );
    
    require!(
        Clock::get()?.unix_timestamp - price_data.timestamp < 60, // 1分以内
        ErrorCode::PriceDataTooOld
    );
    
    Ok(price_data.price as u64)
}
```

### エラーハンドリングとフォールバック

```rust
// CPI失敗時の回復機能
pub fn robust_multi_cpi(ctx: Context<MultiCPI>) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    
    // 操作の原子性を保証するためのロック
    require!(!portfolio.locked, ErrorCode::OperationInProgress);
    portfolio.locked = true;
    
    let result = execute_multi_step_operation(&ctx);
    
    match result {
        Ok(_) => {
            msg!("Multi-CPI operation completed successfully");
        },
        Err(error) => {
            // エラー時のロールバック処理
            rollback_partial_operations(&ctx, &error)?;
            portfolio.locked = false;
            return Err(error);
        }
    }
    
    portfolio.locked = false;
    Ok(())
}

fn execute_multi_step_operation(ctx: &Context<MultiCPI>) -> Result<()> {
    // ステップ1: 価格取得
    let current_price = get_oracle_price(&ctx)?;
    
    // ステップ2: スワップ実行
    execute_token_swap(&ctx, current_price)?;
    
    // ステップ3: 流動性プールへの預入
    deposit_to_liquidity_pool(&ctx)?;
    
    Ok(())
}

fn rollback_partial_operations(
    ctx: &Context<MultiCPI>,
    error: &Error,
) -> Result<()> {
    msg!("Rolling back due to error: {:?}", error);
    
    // 実行済みの操作を逆順で取り消し
    if let Err(rollback_error) = attempt_rollback(&ctx) {
        msg!("Rollback failed: {:?}", rollback_error);
        // 緊急事態: 管理者通知が必要
        emit!(EmergencyRollbackFailure {
            portfolio: ctx.accounts.portfolio.key(),
            original_error: error.to_string(),
            rollback_error: rollback_error.to_string(),
        });
    }
    
    Ok(())
}
```

### パフォーマンス最適化されたCPI

```rust
// バッチCPI処理
#[derive(Accounts)]
pub struct BatchCPI<'info> {
    #[account(mut)]
    pub portfolio: Account<'info, Portfolio>,
    
    // 複数の操作を一度に処理するためのremaining_accounts
    // remaining_accounts[0..n]: source token accounts
    // remaining_accounts[n..2n]: destination token accounts  
    // remaining_accounts[2n..3n]: mint accounts
}

pub fn batch_token_operations(
    ctx: Context<BatchCPI>,
    operations: Vec<TokenOperation>,
) -> Result<()> {
    require!(
        operations.len() <= 10, // 最大10操作まで
        ErrorCode::TooManyOperations
    );
    
    require!(
        ctx.remaining_accounts.len() >= operations.len() * 3,
        ErrorCode::InsufficientAccounts
    );
    
    let portfolio = &ctx.accounts.portfolio;
    let authority_seeds = &[
        b"portfolio",
        portfolio.authority.as_ref(),
        &[portfolio.bump],
    ];
    let signer = &[&authority_seeds[..]];
    
    // すべての操作を一度に検証
    validate_batch_operations(&operations, &ctx.remaining_accounts)?;
    
    // 並列で実行可能な操作を特定
    let independent_operations = group_independent_operations(&operations);
    
    for operation_group in independent_operations {
        execute_operation_group(
            &operation_group,
            &ctx,
            signer,
        )?;
    }
    
    Ok(())
}

fn validate_batch_operations(
    operations: &[TokenOperation],
    accounts: &[AccountInfo],
) -> Result<()> {
    for (i, operation) in operations.iter().enumerate() {
        let source_account = &accounts[i];
        let dest_account = &accounts[i + operations.len()];
        let mint_account = &accounts[i + (operations.len() * 2)];
        
        // アカウント所有者確認
        require!(
            source_account.owner == &token::ID || 
            source_account.owner == &spl_token_2022::ID,
            ErrorCode::InvalidTokenAccount
        );
        
        // 残高確認
        let source_token_account: TokenAccount = Account::try_from(source_account)?;
        require!(
            source_token_account.amount >= operation.amount,
            ErrorCode::InsufficientFunds
        );
        
        // ミント確認
        require!(
            source_token_account.mint == mint_account.key(),
            ErrorCode::MintMismatch
        );
    }
    
    Ok(())
}
```

---

## Sloomoプロジェクトへの統合戦略

### 段階的実装ロードマップ

#### フェーズ1: 基盤実装 (4-6週間)
1. **コア契約の実装**
   - Portfolio管理契約
   - 基本的なSPL Token統合
   - セキュアなPDAシステム

2. **テストフレームワークの構築**
   - TypeScript/Mochaテストスイート
   - モックサービスの実装
   - CI/CD統合

#### フェーズ2: xStock統合 (6-8週間)
1. **xStock equity token統合**
   - Token-2022対応
   - オラクル価格フィード統合
   - リアルタイム市場データ

2. **ポートフォリオ機能**
   - 自動リバランス機能
   - リスクプロファイル管理
   - パフォーマンス追跡

#### フェーズ3: 高度な機能 (8-10週間)
1. **DeFi統合**
   - イールドファーミング
   - 流動性マイニング
   - 複合投資戦略

2. **AI最適化**
   - 機械学習による配分最適化
   - 予測モデル統合
   - 自動投資戦略

### React Native統合例

```typescript
// hooks/usePortfolioManagement.ts
import { useSloomoClient } from '../clients/sloomo-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function usePortfolioManagement() {
  const client = useSloomoClient();
  const queryClient = useQueryClient();

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => client?.getPortfolio(authority),
    enabled: !!client && !!authority,
    staleTime: 1000 * 60 * 5, // 5分キャッシュ
  });

  const initializePortfolio = useMutation({
    mutationFn: ({ name, allocations }: {
      name: string;
      allocations: TargetAllocation[];
    }) => client!.initializePortfolio(name, allocations),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  const investInXStock = useMutation({
    mutationFn: ({ amount, symbol }: {
      amount: number;
      symbol: string;
    }) => client!.investInXstock(new anchor.BN(amount), symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  const rebalancePortfolio = useMutation({
    mutationFn: () => client!.rebalancePortfolio(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  return {
    portfolio,
    isLoading,
    initializePortfolio,
    investInXStock,
    rebalancePortfolio,
  };
}
```

このドキュメントは、SloomoプロジェクトでのxStock equity token統合、ポートフォリオ管理、自動リバランス機能の実装に必要なすべてのAnchor/Rustベストプラクティスを網羅しています。セキュリティ、パフォーマンス、型安全性、テスト可能性を重視した実装アプローチにより、堅牢で拡張性の高いSolanaプログラムの開発が可能になります。