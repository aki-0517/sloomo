use anchor_lang::prelude::*;
use crate::state::types::*;
use crate::error::SloomoError;

/// Portfolio account
/// Manages user's investment portfolio
#[account]
pub struct Portfolio {
    /// Portfolio owner
    pub owner: Pubkey,
    /// PDA bump
    pub bump: u8,
    /// Total portfolio value
    pub total_value: u64,
    /// Last rebalancing execution time
    pub last_rebalance: i64,
    /// Allocation data
    pub allocations: Vec<AllocationData>,
    /// Performance history
    pub performance_history: Vec<PerformanceSnapshot>,
    /// Creation date
    pub created_at: i64,
    /// Update date
    pub updated_at: i64,
    /// Rebalancing in progress flag (reentrancy prevention)
    pub is_rebalancing: bool,
}

impl Portfolio {
    /// Account size calculation
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


    /// Calculate total portfolio value
    pub fn calculate_total_value(&self) -> Result<u64> {
        self.allocations
            .iter()
            .map(|a| a.current_amount)
            .fold(Some(0u64), |acc, val| acc?.checked_add(val))
            .ok_or(SloomoError::MathOverflow.into())
    }

    /// Determine if rebalancing is needed
    pub fn needs_rebalancing(
        &self,
        target_allocations: &[AllocationTarget],
        total_value: u64,
    ) -> Result<bool> {
        if total_value == 0 {
            return Ok(false);
        }

        const THRESHOLD: u16 = 500; // 5% threshold (basis points)

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

    /// Update portfolio based on actual balances (not apparent rebalancing)
    pub fn update_from_real_balances(
        &mut self,
        actual_balances: &[(Pubkey, u64)], // (mint, actual_amount) pairs
        timestamp: i64,
    ) -> Result<()> {
        // Update allocations based on actual balances
        for (mint, actual_amount) in actual_balances {
            if let Some(allocation) = self.allocations
                .iter_mut()
                .find(|a| a.mint == *mint) {
                allocation.current_amount = *actual_amount;
            }
        }

        // Recalculate total value
        self.total_value = self.calculate_total_value()?;
        self.updated_at = timestamp;

        // Add performance snapshot
        self.add_performance_snapshot(timestamp)?;

        Ok(())
    }

    /// Add performance snapshot
    pub fn add_performance_snapshot(&mut self, timestamp: i64) -> Result<()> {
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

        // Maintain maximum history count
        if self.performance_history.len() >= MAX_PERFORMANCE_SNAPSHOTS {
            self.performance_history.remove(0);
        }

        self.performance_history.push(snapshot);
        Ok(())
    }
}

// Constant definitions
pub const MAX_ALLOCATIONS: usize = 10;
pub const MAX_PERFORMANCE_SNAPSHOTS: usize = 100;