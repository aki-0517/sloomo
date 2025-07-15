use anchor_lang::prelude::*;

#[error_code]
pub enum SloomoError {
    #[msg("Invalid allocation percentage")]
    InvalidAllocationPercentage,
    #[msg("Insufficient balance for rebalancing")]
    InsufficientBalance,
    #[msg("Portfolio not found")]
    PortfolioNotFound,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    #[msg("Rebalance execution too frequent")]
    RebalanceTooFrequent,
    #[msg("Total allocation exceeds 100%")]
    AllocationOverflow,
    #[msg("Yield update too frequent")]
    YieldUpdateTooFrequent,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid APY value")]
    InvalidApy,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("No rebalance needed")]
    NoRebalanceNeeded,
    #[msg("Rebalance in progress")]
    RebalanceInProgress,
    #[msg("Jupiter API error")]
    JupiterApiError,
    #[msg("Swap execution failed")]
    SwapExecutionFailed,
    #[msg("Quote retrieval failed")]
    QuoteRetrievalFailed,
}