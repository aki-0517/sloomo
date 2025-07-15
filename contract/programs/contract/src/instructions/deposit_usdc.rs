use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, TokenAccount, Token, Transfer, transfer},
    associated_token::AssociatedToken,
};
use crate::state::Portfolio;
use crate::error::SloomoError;
use crate::utils::{validate_reentrancy, validate_amount};

/// Account structure for USDC deposit
#[derive(Accounts)]
pub struct DepositUsdc<'info> {
    /// Destination portfolio for deposit
    #[account(
        mut,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump = portfolio.bump,
        has_one = owner
    )]
    pub portfolio: Account<'info, Portfolio>,

    /// User's USDC account (source)
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = owner
    )]
    pub user_usdc_account: Account<'info, TokenAccount>,

    /// Portfolio's USDC vault (destination)
    #[account(
        init_if_needed,
        payer = owner,
        seeds = [b"vault", portfolio.key().as_ref(), usdc_mint.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = portfolio
    )]
    pub portfolio_usdc_vault: Account<'info, TokenAccount>,

    /// USDC mint
    pub usdc_mint: Account<'info, Mint>,

    /// Transaction executor (portfolio owner)
    #[account(mut)]
    pub owner: Signer<'info>,

    /// SPL token program
    pub token_program: Program<'info, Token>,
    /// Associated token program
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// System program
    pub system_program: Program<'info, System>,
}

/// Deposit USDC
///
/// # Arguments
/// * `ctx` - Transaction context
/// * `amount` - Deposit amount (USDC basis)
///
/// # Returns
/// * `Result<()>` - Ok(()) on success, error on failure
pub fn handler(
    ctx: Context<DepositUsdc>,
    amount: u64,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let clock = Clock::get()?;

    // Use common validation functions
    validate_amount(amount)?;
    validate_reentrancy(portfolio)?;
    
    // Validation: User's USDC balance
    require!(
        ctx.accounts.user_usdc_account.amount >= amount,
        SloomoError::InsufficientBalance
    );

    // Execute SPL Token transfer
    let transfer_instruction = Transfer {
        from: ctx.accounts.user_usdc_account.to_account_info(),
        to: ctx.accounts.portfolio_usdc_vault.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_instruction,
    );

    transfer(cpi_ctx, amount)?;

    // Update portfolio total value
    portfolio.total_value = portfolio.total_value
        .checked_add(amount)
        .ok_or(SloomoError::MathOverflow)?;

    portfolio.updated_at = clock.unix_timestamp;

    // Add performance snapshot
    portfolio.add_performance_snapshot(clock.unix_timestamp)?;

    // Emit event
    emit!(UsdcDeposited {
        portfolio: portfolio.key(),
        owner: portfolio.owner,
        amount,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "USDC deposit completed: {} USDC deposited",
        amount as f64 / 1_000_000.0 // USDC has 6 decimals
    );

    Ok(())
}

/// USDC deposit execution event
#[event]
pub struct UsdcDeposited {
    /// Portfolio account
    pub portfolio: Pubkey,
    /// Portfolio owner
    pub owner: Pubkey,
    /// Deposit amount
    pub amount: u64,
    /// Deposit execution time
    pub timestamp: i64,
}