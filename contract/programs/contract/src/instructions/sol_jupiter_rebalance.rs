use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::{Portfolio, AllocationTarget, AllocationData};
use crate::error::SloomoError;
use crate::utils::{
    validate_reentrancy, 
    validate_allocation_percentage, 
    validate_rebalance_frequency,
    JupiterSolSwapHelper
};

/// Account structure for SOL-based Jupiter rebalancing
#[derive(Accounts)]
pub struct SolJupiterRebalance<'info> {
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

    /// Wrapped SOL (wSOL) token account
    #[account(
        mut,
        associated_token::mint = wsol_mint,
        associated_token::authority = owner,
    )]
    pub wsol_token_account: Account<'info, TokenAccount>,

    /// wSOL mint (Native Mint)
    pub wsol_mint: Account<'info, Mint>,

    /// SPL token program
    pub token_program: Program<'info, Token>,
    
    /// System program
    pub system_program: Program<'info, System>,
}

/// Execute SOL-based Jupiter rebalancing
/// Calculate Jupiter swaps from wrapped SOL (wSOL) to each token and output rebalancing instructions
pub fn handler(
    ctx: Context<SolJupiterRebalance>,
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

    // Total portfolio value based on wSOL balance
    let wsol_balance = ctx.accounts.wsol_token_account.amount;
    require!(wsol_balance > 0, SloomoError::InsufficientBalance);

    msg!("SOL rebalancing started: allocating wSOL balance {} lamports to each token according to target allocation", wsol_balance);

    // Calculate swap operations from current and target allocations
    let swap_operations = JupiterSolSwapHelper::calculate_swap_operations(
        &portfolio.allocations,
        &target_allocations,
        wsol_balance,
    )?;

    // Log each swap operation (actual swap executed client-side)
    for operation in &swap_operations {
        JupiterSolSwapHelper::log_swap_operation(operation)?;
    }

    if swap_operations.is_empty() {
        msg!("No swap operations needed - already close to target allocation");
    } else {
        msg!("Calculated swap operations count: {}", swap_operations.len());
    }

    // Update portfolio allocation data
    update_portfolio_allocations(
        portfolio,
        &target_allocations,
        wsol_balance,
    )?;

    // State update
    portfolio.last_rebalance = clock.unix_timestamp;
    portfolio.updated_at = clock.unix_timestamp;
    portfolio.total_value = wsol_balance;
    portfolio.is_rebalancing = false;

    // Emit event
    emit!(SolPortfolioRebalanced {
        owner: portfolio.owner,
        wsol_amount: wsol_balance,
        target_allocations_count: target_allocations.len() as u8,
        timestamp: clock.unix_timestamp,
        slippage_bps: slippage_bps.unwrap_or(50),
    });

    msg!(
        "SOL portfolio rebalancing completed: allocated wSOL {} lamports to {} types of tokens",
        wsol_balance,
        target_allocations.len()
    );

    Ok(())
}

/// Update portfolio allocation data
fn update_portfolio_allocations(
    portfolio: &mut Portfolio,
    target_allocations: &[AllocationTarget],
    wsol_balance: u64,
) -> Result<()> {
    for target in target_allocations {
        // Search for existing allocation data or create new
        if let Some(allocation) = portfolio.allocations
            .iter_mut()
            .find(|a| a.mint == target.mint) {
            
            // Update based on target allocation
            let target_amount = (wsol_balance as u128 * target.target_percentage as u128 / 10000u128) as u64;
            allocation.current_amount = target_amount;
            allocation.target_percentage = target.target_percentage;
        } else {
            // Add new allocation data
            let target_amount = (wsol_balance as u128 * target.target_percentage as u128 / 10000u128) as u64;
            
            // Get appropriate symbol from mint (in implementation, use external service or mapping)
            let symbol = derive_symbol_from_mint(&target.mint);
            
            portfolio.allocations.push(AllocationData {
                mint: target.mint,
                symbol,
                current_amount: target_amount,
                target_percentage: target.target_percentage,
                apy: 0, // Managed client-side
                last_yield_update: 0,
            });
        }
    }

    Ok(())
}

/// Derive symbol from mint address (simplified implementation)
fn derive_symbol_from_mint(mint: &Pubkey) -> String {
    // In actual implementation, get from known mint address mapping or
    // on-chain metadata
    let mint_str = mint.to_string();
    
    // Common devnet token mint address mapping
    match mint_str.as_str() {
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" => "USDC".to_string(),
        "So11111111111111111111111111111111111111112" => "SOL".to_string(),
        _ => format!("TOKEN-{}", &mint_str[0..8])
    }
}

/// SOL portfolio rebalancing event
#[event]
pub struct SolPortfolioRebalanced {
    /// Portfolio owner
    pub owner: Pubkey,
    /// wSOL amount at rebalancing
    pub wsol_amount: u64,
    /// Number of allocated token types
    pub target_allocations_count: u8,
    /// Rebalancing execution time
    pub timestamp: i64,
    /// Slippage used
    pub slippage_bps: u16,
}