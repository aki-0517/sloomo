use anchor_lang::prelude::*;
use anchor_spl::token::{Transfer, TokenAccount, Token, transfer};

/// ユーザーからポートフォリオボルトへのトークン転送（投資時）
pub fn transfer_to_vault<'info>(
    user_account: &Account<'info, TokenAccount>,
    vault_account: &Account<'info, TokenAccount>, 
    authority: &Signer<'info>,
    token_program: &Program<'info, Token>,
    amount: u64,
) -> Result<()> {
    let cpi_accounts = Transfer {
        from: user_account.to_account_info(),
        to: vault_account.to_account_info(),
        authority: authority.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(token_program.to_account_info(), cpi_accounts);
    transfer(cpi_ctx, amount)
}

/// ポートフォリオボルトからユーザーへのトークン転送（引出時）
pub fn transfer_from_vault_with_signer<'info>(
    vault_account: &Account<'info, TokenAccount>,
    user_account: &Account<'info, TokenAccount>,
    portfolio_authority: &AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    authority_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    let cpi_accounts = Transfer {
        from: vault_account.to_account_info(),
        to: user_account.to_account_info(),
        authority: portfolio_authority.clone(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(), 
        cpi_accounts, 
        authority_seeds
    );
    transfer(cpi_ctx, amount)
}