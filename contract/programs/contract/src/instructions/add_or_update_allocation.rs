use anchor_lang::prelude::*;
use crate::state::{Portfolio, AllocationData};
use crate::error::SloomoError;
use crate::utils::{validate_reentrancy, validate_token_symbol, validate_allocation_percentage};

/// Account structure for adding/editing allocations
#[derive(Accounts)]
pub struct AddOrUpdateAllocation<'info> {
    /// Portfolio to be edited
    #[account(
        mut,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump = portfolio.bump,
        has_one = owner
    )]
    pub portfolio: Account<'info, Portfolio>,

    /// Transaction executor (portfolio owner)
    #[account(mut)]
    pub owner: Signer<'info>,
}

/// Add or edit allocation
///
/// # Arguments
/// * `ctx` - Transaction context
/// * `mint` - Token mint address
/// * `symbol` - Token symbol (e.g.: USDC-SOLEND, USDT-MET)
/// * `target_percentage` - Target allocation percentage (basis points)
///
/// # Returns
/// * `Result<()>` - Ok(()) on success, error on failure
pub fn handler(
    ctx: Context<AddOrUpdateAllocation>,
    mint: Pubkey,
    symbol: String,
    target_percentage: u16,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let clock = Clock::get()?;

    // Use common validation functions
    validate_reentrancy(portfolio)?;
    validate_token_symbol(&symbol)?;
    
    // Validation: Target allocation percentage (0-100%)
    require!(target_percentage <= 10000, SloomoError::InvalidAllocationPercentage);

    // Search for existing allocation
    if let Some(existing_allocation) = portfolio.allocations
        .iter_mut()
        .find(|a| a.mint == mint) {
        
        // Update existing allocation
        existing_allocation.symbol = symbol.clone();
        existing_allocation.target_percentage = target_percentage;
        existing_allocation.last_yield_update = clock.unix_timestamp;

        msg!(
            "Allocation updated: {} -> {}%",
            symbol,
            target_percentage as f64 / 100.0
        );

        emit!(AllocationUpdated {
            portfolio: portfolio.key(),
            mint,
            symbol,
            target_percentage,
            timestamp: clock.unix_timestamp,
        });

    } else {
        // Add new allocation
        require!(
            portfolio.allocations.len() < 10, // MAX_ALLOCATIONS
            SloomoError::AllocationOverflow
        );

        let new_allocation = AllocationData {
            mint,
            symbol: symbol.clone(),
            current_amount: 0,
            target_percentage,
            apy: 0, // Managed client-side
            last_yield_update: clock.unix_timestamp,
        };

        portfolio.allocations.push(new_allocation);

        msg!(
            "Allocation added: {} ({}%) has been added",
            symbol,
            target_percentage as f64 / 100.0
        );

        emit!(AllocationAdded {
            portfolio: portfolio.key(),
            mint,
            symbol,
            target_percentage,
            timestamp: clock.unix_timestamp,
        });
    }

    // Check total allocation validity
    let total_target: u16 = portfolio.allocations.iter()
        .map(|a| a.target_percentage)
        .sum();
    
    require!(total_target <= 10000, SloomoError::AllocationOverflow);
    
    if total_target > 10000 {
        msg!("Warning: Total allocation exceeds 100% ({}%)", total_target as f64 / 100.0);
    }

    portfolio.updated_at = clock.unix_timestamp;

    Ok(())
}

/// Allocation added event
#[event]
pub struct AllocationAdded {
    /// Portfolio account
    pub portfolio: Pubkey,
    /// Token mint
    pub mint: Pubkey,
    /// Token symbol
    pub symbol: String,
    /// Target allocation percentage
    pub target_percentage: u16,
    /// Addition execution time
    pub timestamp: i64,
}

/// Allocation updated event
#[event]
pub struct AllocationUpdated {
    /// Portfolio account
    pub portfolio: Pubkey,
    /// Token mint
    pub mint: Pubkey,
    /// Token symbol
    pub symbol: String,
    /// New target allocation percentage
    pub target_percentage: u16,
    /// Update execution time
    pub timestamp: i64,
}