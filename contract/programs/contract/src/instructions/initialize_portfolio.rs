use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint, Transfer, transfer};
use crate::state::{Portfolio, InitPortfolioParams, AllocationData, MAX_ALLOCATIONS, AllocationTarget};
use crate::error::SloomoError;
use crate::utils::{validate_allocation_percentage, jupiter::JupiterSolSwapHelper};

/// Account structure for portfolio initialization
#[derive(Accounts)]
#[instruction(params: InitPortfolioParams)]
pub struct InitializePortfolio<'info> {
    /// Portfolio account to be initialized
    #[account(
        init,
        payer = owner,
        space = Portfolio::SIZE,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump
    )]
    pub portfolio: Account<'info, Portfolio>,

    /// Portfolio owner (fee payer)
    #[account(mut)]
    pub owner: Signer<'info>,

    /// User's wSOL token account
    #[account(mut)]
    pub user_wsol_account: Account<'info, TokenAccount>,

    /// Portfolio's wSOL vault account
    #[account(
        init,
        payer = owner,
        seeds = [b"vault", portfolio.key().as_ref(), wsol_mint.key().as_ref()],
        bump,
        token::mint = wsol_mint,
        token::authority = portfolio,
    )]
    pub portfolio_wsol_vault: Account<'info, TokenAccount>,

    /// wSOL mint (Native Mint)
    pub wsol_mint: Account<'info, Mint>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

/// Initialize portfolio (with SOL investment and Jupiter swap)
///
/// # Arguments
/// * `ctx` - Transaction context
/// * `params` - Initialization parameters
///
/// # Returns
/// * `Result<()>` - Ok(()) on success, error on failure
pub fn handler(
    ctx: Context<InitializePortfolio>,
    params: InitPortfolioParams,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let owner = &ctx.accounts.owner;
    let clock = Clock::get()?;

    // Validation: Check allocation count limit
    require!(
        params.initial_allocations.len() <= MAX_ALLOCATIONS,
        SloomoError::AllocationOverflow
    );

    // Validation: Check total allocation percentage
    let total_percentage: u16 = params.initial_allocations
        .iter()
        .map(|a| a.target_percentage)
        .sum();

    validate_allocation_percentage(total_percentage)?;

    // Validation: Check initial SOL investment amount
    require!(
        params.initial_sol_amount > 0,
        SloomoError::InvalidAmount
    );

    // Set portfolio basic information
    portfolio.owner = owner.key();
    portfolio.bump = ctx.bumps.portfolio;
    portfolio.total_value = params.initial_sol_amount;
    portfolio.last_rebalance = clock.unix_timestamp;
    portfolio.created_at = clock.unix_timestamp;
    portfolio.updated_at = clock.unix_timestamp;
    portfolio.is_rebalancing = false;

    // SOL investment: Transfer from user's wSOL account to portfolio vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_wsol_account.to_account_info(),
        to: ctx.accounts.portfolio_wsol_vault.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    transfer(cpi_ctx, params.initial_sol_amount)?;

    // Initialize allocation data (starting with wSOL)
    portfolio.allocations = params.initial_allocations
        .into_iter()
        .map(|alloc_params| AllocationData {
            mint: alloc_params.mint,
            symbol: alloc_params.symbol,
            current_amount: if alloc_params.mint == ctx.accounts.wsol_mint.key() {
                params.initial_sol_amount
            } else {
                0
            },
            target_percentage: alloc_params.target_percentage,
            apy: 0,
            last_yield_update: clock.unix_timestamp,
        })
        .collect();

    // If Jupiter auto-swap is enabled, calculate swap operations and log output
    if params.enable_jupiter_swap {
        msg!("Executing Jupiter auto-swap...");
        
        // Create target allocations
        let target_allocations: Vec<AllocationTarget> = portfolio.allocations
            .iter()
            .map(|alloc| AllocationTarget {
                mint: alloc.mint,
                target_percentage: alloc.target_percentage,
            })
            .collect();

        // Calculate swap operations
        let swap_operations = JupiterSolSwapHelper::calculate_swap_operations(
            &portfolio.allocations,
            &target_allocations,
            portfolio.total_value,
        )?;

        // Log swap operations (actual swap executed externally)
        for operation in swap_operations {
            JupiterSolSwapHelper::log_swap_operation(&operation)?;
        }

        msg!("Jupiter swap instructions output. Please execute swap externally.");
    }

    // Initialize with empty performance history
    portfolio.performance_history = Vec::new();

    // Emit event
    emit!(PortfolioInitialized {
        owner: owner.key(),
        portfolio: portfolio.key(),
        allocations_count: portfolio.allocations.len() as u8,
        initial_sol_amount: params.initial_sol_amount,
        jupiter_swap_enabled: params.enable_jupiter_swap,
    });

    msg!("Portfolio successfully initialized: {}", portfolio.key());
    msg!("Initial SOL investment amount: {} lamports", params.initial_sol_amount);
    Ok(())
}

/// Portfolio initialization event
#[event]
pub struct PortfolioInitialized {
    /// Portfolio owner
    pub owner: Pubkey,
    /// Portfolio account
    pub portfolio: Pubkey,
    /// Initial allocation count
    pub allocations_count: u8,
    /// Initial SOL investment amount
    pub initial_sol_amount: u64,
    /// Whether Jupiter auto-swap is enabled
    pub jupiter_swap_enabled: bool,
}