use anchor_lang::prelude::*;

// Module declarations
mod error;
mod state;
mod instructions;
mod utils;

// Public exports
pub use error::*;
pub use state::*;
pub use instructions::*;

declare_id!("EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC");

#[program]
pub mod sloomo_portfolio {
    use super::*;

    /// Initialize portfolio
    pub fn initialize_portfolio(
        ctx: Context<InitializePortfolio>,
        params: InitPortfolioParams,
    ) -> Result<()> {
        instructions::initialize_portfolio::handler(ctx, params)
    }

    /// Deposit USDC
    pub fn deposit_usdc(
        ctx: Context<DepositUsdc>,
        amount: u64,
    ) -> Result<()> {
        instructions::deposit_usdc::handler(ctx, amount)
    }

    /// Add/edit allocation
    pub fn add_or_update_allocation(
        ctx: Context<AddOrUpdateAllocation>,
        mint: Pubkey,
        symbol: String,
        target_percentage: u16,
    ) -> Result<()> {
        instructions::add_or_update_allocation::handler(ctx, mint, symbol, target_percentage)
    }

    /// Execute Jupiter rebalance with actual asset movement
    pub fn real_jupiter_rebalance(
        ctx: Context<RealJupiterRebalance>,
        target_allocations: Vec<AllocationTarget>,
        slippage_bps: Option<u16>,
    ) -> Result<()> {
        instructions::real_jupiter_rebalance::handler(ctx, target_allocations, slippage_bps)
    }

    /// Execute SOL-based Jupiter rebalance
    pub fn sol_jupiter_rebalance(
        ctx: Context<SolJupiterRebalance>,
        target_allocations: Vec<AllocationTarget>,
        slippage_bps: Option<u16>,
    ) -> Result<()> {
        instructions::sol_jupiter_rebalance::handler(ctx, target_allocations, slippage_bps)
    }


}