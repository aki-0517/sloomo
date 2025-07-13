use anchor_lang::prelude::*;
use crate::error::SloomoError;
use crate::state::Portfolio;

/// リエントランシーチェック（全インストラクションで共通）
pub fn validate_reentrancy(portfolio: &Portfolio) -> Result<()> {
    require!(!portfolio.is_rebalancing, SloomoError::RebalanceInProgress);
    Ok(())
}

/// 金額のバリデーション（投資・引出で共通）
pub fn validate_amount(amount: u64) -> Result<()> {
    require!(amount > 0, SloomoError::InvalidAmount);
    Ok(())
}

/// トークンシンボルのバリデーション（投資・yield更新で共通）
pub fn validate_token_symbol(symbol: &str) -> Result<()> {
    require!(
        symbol.len() <= 32 && !symbol.is_empty(),
        SloomoError::InvalidTokenMint
    );
    Ok(())
}

/// 配分比率の合計チェック（初期化・リバランスで共通）
pub fn validate_allocation_percentage(total: u16) -> Result<()> {
    require!(total <= 10000, SloomoError::AllocationOverflow);
    Ok(())
}

/// APY値のバリデーション（yield更新で使用）
pub fn validate_apy(apy: u64) -> Result<()> {
    require!(apy <= 100000, SloomoError::InvalidAmount); // 最大1000%
    Ok(())
}

/// リバランス頻度制限のチェック
pub fn validate_rebalance_frequency(portfolio: &Portfolio, clock: &Clock) -> Result<()> {
    require!(
        clock.unix_timestamp - portfolio.last_rebalance >= 86400, // 1日1回
        SloomoError::RebalanceTooFrequent
    );
    Ok(())
}