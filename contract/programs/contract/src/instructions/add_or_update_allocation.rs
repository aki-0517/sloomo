use anchor_lang::prelude::*;
use crate::state::{Portfolio, AllocationData};
use crate::error::SloomoError;
use crate::utils::{validate_reentrancy, validate_token_symbol, validate_allocation_percentage};

/// アロケーション追加/編集のアカウント構造
#[derive(Accounts)]
pub struct AddOrUpdateAllocation<'info> {
    /// 編集対象ポートフォリオ
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
}

/// アロケーションを追加または編集する
///
/// # Arguments
/// * `ctx` - トランザクションコンテキスト
/// * `mint` - トークンミントアドレス
/// * `symbol` - トークンシンボル（例: USDC-SOLEND, USDT-MET）
/// * `target_percentage` - 目標配分比率（basis points）
///
/// # Returns
/// * `Result<()>` - 成功時はOk(())、失敗時はエラー
pub fn handler(
    ctx: Context<AddOrUpdateAllocation>,
    mint: Pubkey,
    symbol: String,
    target_percentage: u16,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let clock = Clock::get()?;

    // 共通バリデーション関数を使用
    validate_reentrancy(portfolio)?;
    validate_token_symbol(&symbol)?;
    
    // バリデーション: 目標配分比率（0-100%）
    require!(target_percentage <= 10000, SloomoError::InvalidAllocationPercentage);

    // 既存のアロケーションを検索
    if let Some(existing_allocation) = portfolio.allocations
        .iter_mut()
        .find(|a| a.mint == mint) {
        
        // 既存のアロケーションを更新
        existing_allocation.symbol = symbol.clone();
        existing_allocation.target_percentage = target_percentage;
        existing_allocation.last_yield_update = clock.unix_timestamp;

        msg!(
            "アロケーション更新: {} -> {}%",
            symbol,
            target_percentage as f64 / 100.0
        );

        emit!(AllocationUpdated {
            portfolio: portfolio.key(),
            mint,
            symbol,
            target_percentage,
            timestamp: clock.unix_timestamp,
        });

    } else {
        // 新しいアロケーションを追加
        require!(
            portfolio.allocations.len() < 10, // MAX_ALLOCATIONS
            SloomoError::AllocationOverflow
        );

        let new_allocation = AllocationData {
            mint,
            symbol: symbol.clone(),
            current_amount: 0,
            target_percentage,
            apy: 0, // クライアントサイドで管理
            last_yield_update: clock.unix_timestamp,
        };

        portfolio.allocations.push(new_allocation);

        msg!(
            "アロケーション追加: {} ({}%) を追加しました",
            symbol,
            target_percentage as f64 / 100.0
        );

        emit!(AllocationAdded {
            portfolio: portfolio.key(),
            mint,
            symbol,
            target_percentage,
            timestamp: clock.unix_timestamp,
        });
    }

    // 総配分の妥当性チェック
    let total_target: u16 = portfolio.allocations.iter()
        .map(|a| a.target_percentage)
        .sum();
    
    require!(total_target <= 10000, SloomoError::AllocationOverflow);
    
    if total_target > 10000 {
        msg!("警告: 総配分が100%を超えています ({}%)", total_target as f64 / 100.0);
    }

    portfolio.updated_at = clock.unix_timestamp;

    Ok(())
}

/// アロケーション追加イベント
#[event]
pub struct AllocationAdded {
    /// ポートフォリオアカウント
    pub portfolio: Pubkey,
    /// トークンミント
    pub mint: Pubkey,
    /// トークンシンボル
    pub symbol: String,
    /// 目標配分比率
    pub target_percentage: u16,
    /// 追加実行時刻
    pub timestamp: i64,
}

/// アロケーション更新イベント
#[event]
pub struct AllocationUpdated {
    /// ポートフォリオアカウント
    pub portfolio: Pubkey,
    /// トークンミント
    pub mint: Pubkey,
    /// トークンシンボル
    pub symbol: String,
    /// 新しい目標配分比率
    pub target_percentage: u16,
    /// 更新実行時刻
    pub timestamp: i64,
}