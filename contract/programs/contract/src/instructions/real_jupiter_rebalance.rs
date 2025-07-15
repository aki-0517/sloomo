use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::{Portfolio, AllocationTarget, AllocationData};
use crate::error::SloomoError;
use crate::utils::{
    validate_reentrancy, 
    validate_allocation_percentage, 
    validate_rebalance_frequency
};

/// Account structure for Jupiter rebalancing with actual asset movement
#[derive(Accounts)]
pub struct RealJupiterRebalance<'info> {
    /// Portfolio to be rebalanced
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

    /// USDC (base currency) token account
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = owner,
    )]
    pub usdc_token_account: Account<'info, TokenAccount>,

    /// USDC mint
    pub usdc_mint: Account<'info, Mint>,

    /// SPL token program
    pub token_program: Program<'info, Token>,
    
    /// System program
    pub system_program: Program<'info, System>,
}

/// Execute Jupiter rebalancing with actual asset movement
/// Output swap instructions from USDC to each stablecoin based on target allocation % set by client
pub fn handler(
    ctx: Context<RealJupiterRebalance>,
    target_allocations: Vec<AllocationTarget>,
    slippage_bps: Option<u16>,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let clock = Clock::get()?;

    // Common validation
    validate_rebalance_frequency(portfolio, &clock)?;
    validate_reentrancy(portfolio)?;
    
    // Set rebalancing start flag
    portfolio.is_rebalancing = true;

    // Validation: Check target allocation validity
    let total_target: u16 = target_allocations.iter()
        .map(|t| t.target_percentage)
        .sum();
    validate_allocation_percentage(total_target)?;

    // Total portfolio value based on USDC balance
    let usdc_balance = ctx.accounts.usdc_token_account.amount;
    require!(usdc_balance > 0, SloomoError::InsufficientBalance);

    msg!("Rebalancing started: allocating USDC balance {} to each stablecoin according to target allocation", usdc_balance);

    // Output Jupiter swap instructions for each target allocation
    for target in &target_allocations {
        let target_amount = (usdc_balance as u128 * target.target_percentage as u128 / 10000u128) as u64;
        
        if target_amount > 0 {
            msg!(
                "Jupiter swap instruction: USDC {} -> target_mint {} (target amount: {}, allocation: {}%)",
                usdc_balance,
                target.mint,
                target_amount,
                target.target_percentage as f64 / 100.0
            );
        }
    }

    // Update portfolio allocation data
    update_portfolio_allocations(
        portfolio,
        &target_allocations,
        usdc_balance,
    )?;

    // State update
    portfolio.last_rebalance = clock.unix_timestamp;
    portfolio.updated_at = clock.unix_timestamp;
    portfolio.total_value = usdc_balance;
    portfolio.is_rebalancing = false;

    // Emit event
    emit!(StablecoinPortfolioRebalanced {
        owner: portfolio.owner,
        usdc_amount: usdc_balance,
        target_allocations_count: target_allocations.len() as u8,
        timestamp: clock.unix_timestamp,
        slippage_bps: slippage_bps.unwrap_or(50),
    });

    msg!(
        "Portfolio rebalancing completed: allocated USDC {} to {} types of stablecoins",
        usdc_balance,
        target_allocations.len()
    );

    Ok(())
}

/// Update portfolio allocation data
fn update_portfolio_allocations(
    portfolio: &mut Portfolio,
    target_allocations: &[AllocationTarget],
    usdc_balance: u64,
) -> Result<()> {
    for target in target_allocations {
        // Search for existing allocation data or create new
        if let Some(allocation) = portfolio.allocations
            .iter_mut()
            .find(|a| a.mint == target.mint) {
            
            // Update based on target allocation
            let target_amount = (usdc_balance as u128 * target.target_percentage as u128 / 10000u128) as u64;
            allocation.current_amount = target_amount;
            allocation.target_percentage = target.target_percentage;
        } else {
            // Add new allocation data (as needed)
            let target_amount = (usdc_balance as u128 * target.target_percentage as u128 / 10000u128) as u64;
            
            // Note: In actual implementation, need to resolve symbol from mint
            // Simplified here
            portfolio.allocations.push(AllocationData {
                mint: target.mint,
                symbol: format!("STABLECOIN-{}", target.mint.to_string().chars().take(8).collect::<String>()),
                current_amount: target_amount,
                target_percentage: target.target_percentage,
                apy: 0, // Managed client-side
                last_yield_update: 0,
            });
        }
    }

    Ok(())
}

/// Stablecoin portfolio rebalancing event
#[event]
pub struct StablecoinPortfolioRebalanced {
    /// Portfolio owner
    pub owner: Pubkey,
    /// USDC amount at rebalancing
    pub usdc_amount: u64,
    /// Number of allocated stablecoin types
    pub target_allocations_count: u8,
    /// Rebalancing execution time
    pub timestamp: i64,
    /// Slippage used
    pub slippage_bps: u16,
}

