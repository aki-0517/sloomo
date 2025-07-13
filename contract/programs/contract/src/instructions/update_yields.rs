use anchor_lang::prelude::*;
use crate::state::{Portfolio, YieldUpdate};
use crate::error::SloomoError;
use crate::utils::{validate_reentrancy, validate_token_symbol, validate_apy};

/// yield rate更新のアカウント構造
#[derive(Accounts)]
pub struct UpdateYields<'info> {
    /// yield更新対象ポートフォリオ
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

/// ポートフォリオのyield rateを更新する
///
/// # Arguments
/// * `ctx` - トランザクションコンテキスト
/// * `yield_updates` - 各トークンのyield rate更新データ
///
/// # Returns
/// * `Result<()>` - 成功時はOk(())、失敗時はエラー
pub fn handler(
    ctx: Context<UpdateYields>,
    yield_updates: Vec<YieldUpdate>,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let clock = Clock::get()?;

    // 共通バリデーション関数を使用
    validate_reentrancy(portfolio)?;
    
    // バリデーション: yield更新データの妥当性
    require!(!yield_updates.is_empty(), SloomoError::InvalidAmount);
    require!(yield_updates.len() <= 20, SloomoError::AllocationOverflow);

    let mut updated_count = 0;

    // 各トークンのyield rateを更新
    for update in yield_updates {
        let symbol = update.symbol;
        let new_apy = update.new_apy;
        
        // 共通バリデーション関数を使用
        validate_token_symbol(&symbol)?;
        validate_apy(new_apy)?;

        // 対応する配分データを検索・更新
        if let Some(allocation) = portfolio.allocations.iter_mut()
            .find(|a| a.symbol == symbol) {
            
            allocation.apy = new_apy as u16;
            allocation.last_yield_update = clock.unix_timestamp;
            updated_count += 1;

            msg!(
                "yield rate更新: {} APY {} ({}%)",
                symbol,
                new_apy,
                new_apy as f64 / 100.0
            );
        }
    }

    // バリデーション: 少なくとも1つは更新されている必要がある
    require!(updated_count > 0, SloomoError::InvalidTokenMint);

    // ポートフォリオ全体の更新時刻を記録
    portfolio.updated_at = clock.unix_timestamp;

    // イベント発行
    emit!(YieldsUpdated {
        owner: portfolio.owner,
        updated_count,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "yield rate更新完了: {} 件のトークンのyield rateを更新しました",
        updated_count
    );

    Ok(())
}

/// yield rate更新イベント
#[event]
pub struct YieldsUpdated {
    /// ポートフォリオ所有者
    pub owner: Pubkey,
    /// 更新されたトークン数
    pub updated_count: u8,
    /// 更新実行時刻
    pub timestamp: i64,
}