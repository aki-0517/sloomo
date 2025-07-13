use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use crate::state::{Portfolio, AllocationTarget};
use crate::error::SloomoError;
use crate::utils::{validate_reentrancy, validate_allocation_percentage, validate_rebalance_frequency};

/// ポートフォリオリバランスのアカウント構造
#[derive(Accounts)]
pub struct RebalancePortfolio<'info> {
    /// リバランス対象ポートフォリオ
    #[account(
        mut,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump = portfolio.bump,
        has_one = owner
    )]
    pub portfolio: Account<'info, Portfolio>,

    /// トランザクション実行者（ポートフォリオ所有者）
    #[account(mut)]
    pub owner: Signer<'info>,

    /// SPLトークンプログラム
    pub token_program: Program<'info, Token>,
}

/// ポートフォリオのリバランスを実行する
///
/// # Arguments
/// * `ctx` - トランザクションコンテキスト
/// * `target_allocations` - 目標配分設定
///
/// # Returns
/// * `Result<()>` - 成功時はOk(())、失敗時はエラー
pub fn handler(
    ctx: Context<RebalancePortfolio>,
    target_allocations: Vec<AllocationTarget>,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let clock = Clock::get()?;

    // 共通バリデーション関数を使用
    validate_rebalance_frequency(portfolio, &clock)?;
    validate_reentrancy(portfolio)?;
    
    // リバランス開始フラグを設定
    portfolio.is_rebalancing = true;

    // バリデーション: 目標配分の妥当性チェック
    let total_target: u16 = target_allocations.iter()
        .map(|t| t.target_percentage)
        .sum();
    validate_allocation_percentage(total_target)?;

    // 現在の総価値を計算
    let total_portfolio_value = portfolio.calculate_total_value()?;

    // バリデーション: リバランス必要性チェック
    require!(
        portfolio.needs_rebalancing(&target_allocations, total_portfolio_value)?,
        SloomoError::NoRebalanceNeeded
    );

    // リバランス実行
    portfolio.execute_rebalance(&target_allocations, total_portfolio_value)?;

    // 状態更新
    portfolio.last_rebalance = clock.unix_timestamp;
    portfolio.updated_at = clock.unix_timestamp;
    portfolio.is_rebalancing = false;

    // イベント発行
    emit!(PortfolioRebalanced {
        owner: portfolio.owner,
        total_value: total_portfolio_value,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "リバランス完了: 総価値 {} でリバランスを実行しました",
        total_portfolio_value
    );

    Ok(())
}

/// ポートフォリオリバランスイベント
#[event]
pub struct PortfolioRebalanced {
    /// ポートフォリオ所有者
    pub owner: Pubkey,
    /// リバランス時の総価値
    pub total_value: u64,
    /// リバランス実行時刻
    pub timestamp: i64,
}