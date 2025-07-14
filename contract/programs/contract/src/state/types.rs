use anchor_lang::prelude::*;

/// 配分データ構造
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AllocationData {
    /// トークンミントアドレス
    pub mint: Pubkey,
    /// トークンシンボル (例: AAPL, GOOGL)
    pub symbol: String,
    /// 現在の投資額
    pub current_amount: u64,
    /// 目標配分比率 (basis points: 10000 = 100%)
    pub target_percentage: u16,
    /// 年間利回り (basis points: 100 = 1%)
    pub apy: u16,
    /// 最後の利回り更新時刻
    pub last_yield_update: i64,
}

impl AllocationData {
    pub const SIZE: usize = 32 + // mint
        4 + 32 + // symbol (max 32 chars)
        8 + // current_amount
        2 + // target_percentage
        2 + // apy
        8; // last_yield_update
}

/// パフォーマンススナップショット
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PerformanceSnapshot {
    /// 記録時刻
    pub timestamp: i64,
    /// その時点での総価値
    pub total_value: u64,
    /// 成長率 (basis points: 100 = 1%)
    pub growth_rate: i16,
}

impl PerformanceSnapshot {
    pub const SIZE: usize = 8 + // timestamp
        8 + // total_value
        2; // growth_rate
}

/// ポートフォリオ初期化パラメータ
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitPortfolioParams {
    /// 初期配分設定
    pub initial_allocations: Vec<AllocationParams>,
}

/// 配分パラメータ
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AllocationParams {
    /// トークンミントアドレス
    pub mint: Pubkey,
    /// トークンシンボル
    pub symbol: String,
    /// 目標配分比率 (basis points)
    pub target_percentage: u16,
}

/// リバランス目標配分
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AllocationTarget {
    /// トークンミントアドレス
    pub mint: Pubkey,
    /// 目標配分比率 (basis points)
    pub target_percentage: u16,
}

