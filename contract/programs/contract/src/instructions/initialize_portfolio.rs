use anchor_lang::prelude::*;
use crate::state::{Portfolio, InitPortfolioParams, AllocationData, MAX_ALLOCATIONS};
use crate::error::SloomoError;
use crate::utils::validate_allocation_percentage;

/// ポートフォリオ初期化のアカウント構造
#[derive(Accounts)]
#[instruction(params: InitPortfolioParams)]
pub struct InitializePortfolio<'info> {
    /// 初期化するポートフォリオアカウント
    #[account(
        init,
        payer = owner,
        space = Portfolio::SIZE,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump
    )]
    pub portfolio: Account<'info, Portfolio>,

    /// ポートフォリオの所有者（料金支払い者）
    #[account(mut)]
    pub owner: Signer<'info>,

    /// システムプログラム
    pub system_program: Program<'info, System>,
}

/// ポートフォリオを初期化する
///
/// # Arguments
/// * `ctx` - トランザクションコンテキスト
/// * `params` - 初期化パラメータ
///
/// # Returns
/// * `Result<()>` - 成功時はOk(())、失敗時はエラー
pub fn handler(
    ctx: Context<InitializePortfolio>,
    params: InitPortfolioParams,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let owner = &ctx.accounts.owner;
    let clock = Clock::get()?;

    // バリデーション: 配分数の上限チェック
    require!(
        params.initial_allocations.len() <= MAX_ALLOCATIONS,
        SloomoError::AllocationOverflow
    );

    // バリデーション: 配分比率の合計チェック
    let total_percentage: u16 = params.initial_allocations
        .iter()
        .map(|a| a.target_percentage)
        .sum();

    validate_allocation_percentage(total_percentage)?;

    // ポートフォリオ基本情報の設定
    portfolio.owner = owner.key();
    portfolio.bump = ctx.bumps.portfolio;
    portfolio.total_value = 0;
    portfolio.last_rebalance = clock.unix_timestamp;
    portfolio.created_at = clock.unix_timestamp;
    portfolio.updated_at = clock.unix_timestamp;
    portfolio.is_rebalancing = false;

    // 配分データの初期化
    portfolio.allocations = params.initial_allocations
        .into_iter()
        .map(|params| AllocationData {
            mint: params.mint,
            symbol: params.symbol,
            current_amount: 0,
            target_percentage: params.target_percentage,
            apy: 0,
            last_yield_update: clock.unix_timestamp,
        })
        .collect();

    // 空のパフォーマンス履歴で初期化
    portfolio.performance_history = Vec::new();

    // イベント発行
    emit!(PortfolioInitialized {
        owner: owner.key(),
        portfolio: portfolio.key(),
        allocations_count: portfolio.allocations.len() as u8,
    });

    msg!("ポートフォリオが正常に初期化されました: {}", portfolio.key());
    Ok(())
}

/// ポートフォリオ初期化イベント
#[event]
pub struct PortfolioInitialized {
    /// ポートフォリオ所有者
    pub owner: Pubkey,
    /// ポートフォリオアカウント
    pub portfolio: Pubkey,
    /// 初期配分数
    pub allocations_count: u8,
}