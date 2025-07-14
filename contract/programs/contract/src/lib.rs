use anchor_lang::prelude::*;

// モジュール宣言
mod error;
mod state;
mod instructions;
mod utils;

// パブリックエクスポート
pub use error::*;
pub use state::*;
pub use instructions::*;

declare_id!("EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC");

#[program]
pub mod sloomo_portfolio {
    use super::*;

    /// ポートフォリオを初期化
    pub fn initialize_portfolio(
        ctx: Context<InitializePortfolio>,
        params: InitPortfolioParams,
    ) -> Result<()> {
        instructions::initialize_portfolio::handler(ctx, params)
    }

    /// USDCをdeposit
    pub fn deposit_usdc(
        ctx: Context<DepositUsdc>,
        amount: u64,
    ) -> Result<()> {
        instructions::deposit_usdc::handler(ctx, amount)
    }

    /// アロケーション追加/編集
    pub fn add_or_update_allocation(
        ctx: Context<AddOrUpdateAllocation>,
        mint: Pubkey,
        symbol: String,
        target_percentage: u16,
    ) -> Result<()> {
        instructions::add_or_update_allocation::handler(ctx, mint, symbol, target_percentage)
    }

    /// 実際の資産移動を伴うJupiterリバランス実行
    pub fn real_jupiter_rebalance(
        ctx: Context<RealJupiterRebalance>,
        target_allocations: Vec<AllocationTarget>,
        slippage_bps: Option<u16>,
    ) -> Result<()> {
        instructions::real_jupiter_rebalance::handler(ctx, target_allocations, slippage_bps)
    }


}