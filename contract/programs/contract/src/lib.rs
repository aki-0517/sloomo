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

    /// xStock equity tokenに投資
    pub fn invest_in_equity(
        ctx: Context<InvestInEquity>,
        amount: u64,
        token_symbol: String,
    ) -> Result<()> {
        instructions::invest_in_equity::handler(ctx, amount, token_symbol)
    }

    /// equity tokenからの引出
    pub fn withdraw_from_equity(
        ctx: Context<WithdrawFromEquity>,
        amount: u64,
        token_symbol: String,
    ) -> Result<()> {
        instructions::withdraw_from_equity::handler(ctx, amount, token_symbol)
    }

    /// 実際の資産移動を伴うJupiterリバランス実行
    pub fn real_jupiter_rebalance(
        ctx: Context<RealJupiterRebalance>,
        target_allocations: Vec<AllocationTarget>,
        slippage_bps: Option<u16>,
    ) -> Result<()> {
        instructions::real_jupiter_rebalance::handler(ctx, target_allocations, slippage_bps)
    }

    /// Jupiterクォート情報記録
    pub fn record_jupiter_quote(
        ctx: Context<RecordJupiterQuote>,
        input_mint: String,
        output_mint: String,
        amount: u64,
        slippage_bps: Option<u16>,
    ) -> Result<()> {
        instructions::real_jupiter_rebalance::record_jupiter_quote(ctx, input_mint, output_mint, amount, slippage_bps)
    }

    /// 利回り情報の更新
    pub fn update_yields(
        ctx: Context<UpdateYields>,
        yield_updates: Vec<YieldUpdate>,
    ) -> Result<()> {
        instructions::update_yields::handler(ctx, yield_updates)
    }
}