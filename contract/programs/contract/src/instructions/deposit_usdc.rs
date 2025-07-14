use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, TokenAccount, Token, Transfer, transfer},
    associated_token::AssociatedToken,
};
use crate::state::Portfolio;
use crate::error::SloomoError;
use crate::utils::{validate_reentrancy, validate_amount};

/// USDC deposit のアカウント構造
#[derive(Accounts)]
pub struct DepositUsdc<'info> {
    /// deposit先ポートフォリオ
    #[account(
        mut,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump = portfolio.bump,
        has_one = owner
    )]
    pub portfolio: Account<'info, Portfolio>,

    /// ユーザーのUSDCアカウント（送金元）
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = owner
    )]
    pub user_usdc_account: Account<'info, TokenAccount>,

    /// ポートフォリオのUSDCボルト（送金先）
    #[account(
        init_if_needed,
        payer = owner,
        seeds = [b"vault", portfolio.key().as_ref(), usdc_mint.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = portfolio
    )]
    pub portfolio_usdc_vault: Account<'info, TokenAccount>,

    /// USDCミント
    pub usdc_mint: Account<'info, Mint>,

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

/// USDCをデポジットする
///
/// # Arguments
/// * `ctx` - トランザクションコンテキスト
/// * `amount` - デポジット金額（USDC基準）
///
/// # Returns
/// * `Result<()>` - 成功時はOk(())、失敗時はエラー
pub fn handler(
    ctx: Context<DepositUsdc>,
    amount: u64,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let clock = Clock::get()?;

    // 共通バリデーション関数を使用
    validate_amount(amount)?;
    validate_reentrancy(portfolio)?;
    
    // バリデーション: ユーザーのUSDC残高
    require!(
        ctx.accounts.user_usdc_account.amount >= amount,
        SloomoError::InsufficientBalance
    );

    // SPL Token転送の実行
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

    // ポートフォリオ総価値を更新
    portfolio.total_value = portfolio.total_value
        .checked_add(amount)
        .ok_or(SloomoError::MathOverflow)?;

    portfolio.updated_at = clock.unix_timestamp;

    // パフォーマンススナップショットを追加
    portfolio.add_performance_snapshot(clock.unix_timestamp)?;

    // イベント発行
    emit!(UsdcDeposited {
        portfolio: portfolio.key(),
        owner: portfolio.owner,
        amount,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "USDC deposit完了: {} USDC をデポジットしました",
        amount as f64 / 1_000_000.0 // USDC has 6 decimals
    );

    Ok(())
}

/// USDC deposit実行イベント
#[event]
pub struct UsdcDeposited {
    /// ポートフォリオアカウント
    pub portfolio: Pubkey,
    /// ポートフォリオ所有者
    pub owner: Pubkey,
    /// デポジット金額
    pub amount: u64,
    /// デポジット実行時刻
    pub timestamp: i64,
}