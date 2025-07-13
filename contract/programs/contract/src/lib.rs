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

declare_id!("F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS");

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

    /// ポートフォリオのリバランス実行
    pub fn rebalance_portfolio(
        ctx: Context<RebalancePortfolio>,
        target_allocations: Vec<AllocationTarget>,
    ) -> Result<()> {
        instructions::rebalance_portfolio::handler(ctx, target_allocations)
    }

    /// 利回り情報の更新
    pub fn update_yields(
        ctx: Context<UpdateYields>,
        yield_updates: Vec<YieldUpdate>,
    ) -> Result<()> {
        instructions::update_yields::handler(ctx, yield_updates)
    }
}