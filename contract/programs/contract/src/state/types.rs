use anchor_lang::prelude::*;

/// Allocation data structure
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AllocationData {
    /// Token mint address
    pub mint: Pubkey,
    /// Token symbol (e.g.: AAPL, GOOGL)
    pub symbol: String,
    /// Current investment amount
    pub current_amount: u64,
    /// Target allocation percentage (basis points: 10000 = 100%)
    pub target_percentage: u16,
    /// Annual percentage yield (basis points: 100 = 1%)
    pub apy: u16,
    /// Last yield update timestamp
    pub last_yield_update: i64,
}

impl AllocationData {
    pub const SIZE: usize = 32 + // mint
        4 + 32 + // symbol (max 32 chars)
        8 + // current_amount
        2 + // target_percentage
        2 + // apy
        8; // last_yield_update
}

/// Performance snapshot
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PerformanceSnapshot {
    /// Record timestamp
    pub timestamp: i64,
    /// Total value at that time
    pub total_value: u64,
    /// Growth rate (basis points: 100 = 1%)
    pub growth_rate: i16,
}

impl PerformanceSnapshot {
    pub const SIZE: usize = 8 + // timestamp
        8 + // total_value
        2; // growth_rate
}

/// Portfolio initialization parameters
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitPortfolioParams {
    /// Initial allocation settings
    pub initial_allocations: Vec<AllocationParams>,
    /// Initial SOL investment amount (lamports)
    pub initial_sol_amount: u64,
    /// Whether to execute Jupiter auto-swap
    pub enable_jupiter_swap: bool,
}

/// Allocation parameters
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AllocationParams {
    /// Token mint address
    pub mint: Pubkey,
    /// Token symbol
    pub symbol: String,
    /// Target allocation percentage (basis points)
    pub target_percentage: u16,
}

/// Rebalance target allocation
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AllocationTarget {
    /// Token mint address
    pub mint: Pubkey,
    /// Target allocation percentage (basis points)
    pub target_percentage: u16,
}

