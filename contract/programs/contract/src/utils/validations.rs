use anchor_lang::prelude::*;
use crate::error::SloomoError;
use crate::state::Portfolio;

/// Reentrancy check (common for all instructions)
pub fn validate_reentrancy(portfolio: &Portfolio) -> Result<()> {
    require!(!portfolio.is_rebalancing, SloomoError::RebalanceInProgress);
    Ok(())
}

/// Amount validation (common for investment and withdrawal)
pub fn validate_amount(amount: u64) -> Result<()> {
    require!(amount > 0, SloomoError::InvalidAmount);
    Ok(())
}

/// Token symbol validation (common for investment and yield updates)
pub fn validate_token_symbol(symbol: &str) -> Result<()> {
    require!(
        symbol.len() <= 32 && !symbol.is_empty(),
        SloomoError::InvalidTokenMint
    );
    Ok(())
}

/// Total allocation percentage check (common for initialization and rebalancing)
pub fn validate_allocation_percentage(total: u16) -> Result<()> {
    require!(total <= 10000, SloomoError::AllocationOverflow);
    Ok(())
}

/// APY value validation (used for yield updates)
pub fn validate_apy(apy: u64) -> Result<()> {
    require!(apy <= 100000, SloomoError::InvalidAmount); // Maximum 1000%
    Ok(())
}

/// Rebalancing frequency limit check
pub fn validate_rebalance_frequency(portfolio: &Portfolio, clock: &Clock) -> Result<()> {
    require!(
        clock.unix_timestamp - portfolio.last_rebalance >= 86400, // Once per day
        SloomoError::RebalanceTooFrequent
    );
    Ok(())
}