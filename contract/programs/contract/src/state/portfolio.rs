use anchor_lang::prelude::*;
use crate::state::types::*;
use crate::error::SloomoError;

/// ポートフォリオアカウント
/// ユーザーの投資ポートフォリオを管理する
#[account]
pub struct Portfolio {
    /// ポートフォリオの所有者
    pub owner: Pubkey,
    /// PDAbump
    pub bump: u8,
    /// ポートフォリオの総価値
    pub total_value: u64,
    /// 最後にリバランスを実行した時刻
    pub last_rebalance: i64,
    /// 配分データ
    pub allocations: Vec<AllocationData>,
    /// パフォーマンス履歴
    pub performance_history: Vec<PerformanceSnapshot>,
    /// 作成日時
    pub created_at: i64,
    /// 更新日時
    pub updated_at: i64,
    /// リバランス実行中フラグ（リエントランシー防止）
    pub is_rebalancing: bool,
}

impl Portfolio {
    /// アカウントサイズ計算
    pub const SIZE: usize = 8 + // discriminator
        32 + // owner
        1 + // bump
        8 + // total_value
        8 + // last_rebalance
        4 + (MAX_ALLOCATIONS * AllocationData::SIZE) + // allocations
        4 + (MAX_PERFORMANCE_SNAPSHOTS * PerformanceSnapshot::SIZE) + // performance_history
        8 + // created_at
        8 + // updated_at
        1; // is_rebalancing

    /// 投資を追加
    pub fn add_investment(
        &mut self,
        symbol: String,
        amount: u64,
        timestamp: i64,
    ) -> Result<()> {
        // 既存の投資を検索
        if let Some(allocation) = self.allocations
            .iter_mut()
            .find(|a| a.symbol == symbol) {
            
            allocation.current_amount = allocation.current_amount
                .checked_add(amount)
                .ok_or(SloomoError::MathOverflow)?;
        } else {
            return Err(SloomoError::InvalidTokenMint.into());
        }

        self.total_value = self.total_value
            .checked_add(amount)
            .ok_or(SloomoError::MathOverflow)?;

        self.updated_at = timestamp;

        // パフォーマンススナップショットを追加
        self.add_performance_snapshot(timestamp)?;

        Ok(())
    }

    /// 投資を削除
    pub fn remove_investment(
        &mut self,
        symbol: &str,
        amount: u64,
        timestamp: i64,
    ) -> Result<()> {
        if let Some(allocation) = self.allocations
            .iter_mut()
            .find(|a| a.symbol == symbol) {
            
            allocation.current_amount = allocation.current_amount
                .checked_sub(amount)
                .ok_or(SloomoError::InsufficientBalance)?;
        } else {
            return Err(SloomoError::InvalidTokenMint.into());
        }

        self.total_value = self.total_value
            .checked_sub(amount)
            .ok_or(SloomoError::InsufficientBalance)?;

        self.updated_at = timestamp;

        // パフォーマンススナップショットを追加
        self.add_performance_snapshot(timestamp)?;

        Ok(())
    }

    /// 指定シンボルの投資額を取得
    pub fn get_investment_amount(&self, symbol: &str) -> u64 {
        self.allocations
            .iter()
            .find(|a| a.symbol == symbol)
            .map(|a| a.current_amount)
            .unwrap_or(0)
    }

    /// ポートフォリオの総価値を計算
    pub fn calculate_total_value(&self) -> Result<u64> {
        self.allocations
            .iter()
            .map(|a| a.current_amount)
            .fold(Some(0u64), |acc, val| acc?.checked_add(val))
            .ok_or(SloomoError::MathOverflow.into())
    }

    /// リバランスが必要かどうかを判定
    pub fn needs_rebalancing(
        &self,
        target_allocations: &[AllocationTarget],
        total_value: u64,
    ) -> Result<bool> {
        if total_value == 0 {
            return Ok(false);
        }

        const THRESHOLD: u16 = 500; // 5%の閾値 (basis points)

        for target in target_allocations {
            if let Some(current) = self.allocations
                .iter()
                .find(|a| a.mint == target.mint) {
                
                let current_percentage = (current.current_amount as u128 * 10000u128 / total_value as u128) as u16;
                let diff = if current_percentage > target.target_percentage {
                    current_percentage - target.target_percentage
                } else {
                    target.target_percentage - current_percentage
                };

                if diff > THRESHOLD {
                    return Ok(true);
                }
            } else if target.target_percentage > THRESHOLD {
                return Ok(true);
            }
        }

        Ok(false)
    }

    /// リバランスを実行
    pub fn execute_rebalance(
        &mut self,
        target_allocations: &[AllocationTarget],
        total_value: u64,
    ) -> Result<()> {
        // リバランス実行ロジック（簡略化版）
        for target in target_allocations {
            if let Some(allocation) = self.allocations
                .iter_mut()
                .find(|a| a.mint == target.mint) {
                
                let target_amount = (total_value as u128 * target.target_percentage as u128 / 10000u128) as u64;
                allocation.current_amount = target_amount;
                allocation.target_percentage = target.target_percentage;
            }
        }

        Ok(())
    }

    /// パフォーマンススナップショットを追加
    fn add_performance_snapshot(&mut self, timestamp: i64) -> Result<()> {
        let growth_rate = if self.performance_history.is_empty() {
            0
        } else {
            let last_snapshot = &self.performance_history[self.performance_history.len() - 1];
            if last_snapshot.total_value > 0 {
                let growth = ((self.total_value as i128 - last_snapshot.total_value as i128) * 10000i128 / last_snapshot.total_value as i128) as i16;
                growth.clamp(-10000, 10000) // -100% to +100%
            } else {
                0
            }
        };

        let snapshot = PerformanceSnapshot {
            timestamp,
            total_value: self.total_value,
            growth_rate,
        };

        // 最大履歴数を維持
        if self.performance_history.len() >= MAX_PERFORMANCE_SNAPSHOTS {
            self.performance_history.remove(0);
        }

        self.performance_history.push(snapshot);
        Ok(())
    }
}

// 定数定義
pub const MAX_ALLOCATIONS: usize = 10;
pub const MAX_PERFORMANCE_SNAPSHOTS: usize = 100;