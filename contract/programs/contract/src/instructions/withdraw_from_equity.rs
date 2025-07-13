use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, TokenAccount, Token},
};
use crate::state::Portfolio;
use crate::error::SloomoError;
use crate::utils::{validate_reentrancy, validate_amount, transfer_from_vault_with_signer};

/// equity token引出のアカウント構造
#[derive(Accounts)]
pub struct WithdrawFromEquity<'info> {
    /// 引出元ポートフォリオ
    #[account(
        mut,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump = portfolio.bump,
        has_one = owner
    )]
    pub portfolio: Account<'info, Portfolio>,

    /// ユーザーのトークンアカウント（送金先）
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = owner
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// ポートフォリオのトークンボルト（送金元）
    #[account(
        mut,
        seeds = [b"vault", portfolio.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = portfolio
    )]
    pub portfolio_vault: Account<'info, TokenAccount>,

    /// 引出対象のトークンミント
    pub token_mint: Account<'info, Mint>,

    /// トランザクション実行者（ポートフォリオ所有者）
    #[account(mut)]
    pub owner: Signer<'info>,

    /// SPLトークンプログラム
    pub token_program: Program<'info, Token>,
}

/// equity tokenから引出する
///
/// # Arguments
/// * `ctx` - トランザクションコンテキスト
/// * `amount` - 引出金額
/// * `token_symbol` - トークンシンボル（例: AAPL, GOOGL）
///
/// # Returns
/// * `Result<()>` - 成功時はOk(())、失敗時はエラー
pub fn handler(
    ctx: Context<WithdrawFromEquity>,
    amount: u64,
    token_symbol: String,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let clock = Clock::get()?;

    // 共通バリデーション関数を使用
    validate_amount(amount)?;
    validate_reentrancy(portfolio)?;

    // バリデーション: ポートフォリオ内の投資残高
    let investment_amount = portfolio.get_investment_amount(&token_symbol);
    require!(
        investment_amount >= amount,
        SloomoError::InsufficientBalance
    );

    // バリデーション: ボルトの残高
    require!(
        ctx.accounts.portfolio_vault.amount >= amount,
        SloomoError::InsufficientBalance
    );

    // PDA署名のためのシード準備
    let authority_seeds = &[
        b"portfolio",
        portfolio.owner.as_ref(),
        &[portfolio.bump],
    ];
    let signer = &[&authority_seeds[..]];

    // SPL Token転送の実行（ユーティリティ関数使用）
    transfer_from_vault_with_signer(
        &ctx.accounts.portfolio_vault,
        &ctx.accounts.user_token_account,
        &portfolio.to_account_info(),
        &ctx.accounts.token_program,
        signer,
        amount
    )?;

    // ポートフォリオデータの更新
    portfolio.remove_investment(&token_symbol, amount, clock.unix_timestamp)?;

    // イベント発行
    emit!(WithdrawalMade {
        portfolio: portfolio.key(),
        token_mint: ctx.accounts.token_mint.key(),
        amount,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "引出完了: {} tokens の {} を引出しました",
        amount,
        ctx.accounts.token_mint.key()
    );

    Ok(())
}

/// 引出実行イベント
#[event]
pub struct WithdrawalMade {
    /// ポートフォリオアカウント
    pub portfolio: Pubkey,
    /// 引出対象トークンミント
    pub token_mint: Pubkey,
    /// 引出金額
    pub amount: u64,
    /// 引出実行時刻
    pub timestamp: i64,
}