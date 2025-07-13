use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, TokenAccount, Token},
    associated_token::AssociatedToken,
};
use crate::state::Portfolio;
use crate::error::SloomoError;
use crate::utils::{validate_reentrancy, validate_amount, validate_token_symbol, transfer_to_vault};

/// equity token投資のアカウント構造
#[derive(Accounts)]
pub struct InvestInEquity<'info> {
    /// 投資先ポートフォリオ
    #[account(
        mut,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump = portfolio.bump,
        has_one = owner
    )]
    pub portfolio: Account<'info, Portfolio>,

    /// ユーザーのトークンアカウント（送金元）
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = owner
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// ポートフォリオのトークンボルト（送金先）
    #[account(
        init_if_needed,
        payer = owner,
        seeds = [b"vault", portfolio.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = portfolio
    )]
    pub portfolio_vault: Account<'info, TokenAccount>,

    /// 投資対象のトークンミント
    pub token_mint: Account<'info, Mint>,

    /// トランザクション実行者（ポートフォリオ所有者）
    #[account(mut)]
    pub owner: Signer<'info>,

    /// SPLトークンプログラム
    pub token_program: Program<'info, Token>,
    /// 関連付けトークンプログラム
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// システムプログラム
    pub system_program: Program<'info, System>,
}

/// equity tokenに投資する
///
/// # Arguments
/// * `ctx` - トランザクションコンテキスト
/// * `amount` - 投資金額
/// * `token_symbol` - トークンシンボル（例: AAPL, GOOGL）
///
/// # Returns
/// * `Result<()>` - 成功時はOk(())、失敗時はエラー
pub fn handler(
    ctx: Context<InvestInEquity>,
    amount: u64,
    token_symbol: String,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let clock = Clock::get()?;

    // 共通バリデーション関数を使用
    validate_amount(amount)?;
    validate_token_symbol(&token_symbol)?;
    validate_reentrancy(portfolio)?;
    
    // バリデーション: ユーザーの残高
    require!(
        ctx.accounts.user_token_account.amount >= amount,
        SloomoError::InsufficientBalance
    );

    // SPL Token転送の実行（ユーティリティ関数使用）
    transfer_to_vault(
        &ctx.accounts.user_token_account,
        &ctx.accounts.portfolio_vault,
        &ctx.accounts.owner,
        &ctx.accounts.token_program,
        amount
    )?;

    // ポートフォリオデータの更新
    portfolio.add_investment(token_symbol, amount, clock.unix_timestamp)?;

    // イベント発行
    emit!(InvestmentMade {
        portfolio: portfolio.key(),
        token_mint: ctx.accounts.token_mint.key(),
        amount,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "投資完了: {} tokens の {} を投資しました",
        amount,
        ctx.accounts.token_mint.key()
    );

    Ok(())
}

/// 投資実行イベント
#[event]
pub struct InvestmentMade {
    /// ポートフォリオアカウント
    pub portfolio: Pubkey,
    /// 投資対象トークンミント
    pub token_mint: Pubkey,
    /// 投資金額
    pub amount: u64,
    /// 投資実行時刻
    pub timestamp: i64,
}