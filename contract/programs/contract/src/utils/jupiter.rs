use anchor_lang::prelude::*;

/// Jupiter SOL swap helper functions
pub struct JupiterSolSwapHelper;

impl JupiterSolSwapHelper {
    /// Calculate swap operations required for rebalancing
    pub fn calculate_swap_operations(
        current_allocations: &[crate::state::AllocationData],
        target_allocations: &[crate::state::AllocationTarget],
        total_value: u64,
    ) -> Result<Vec<SwapOperation>> {
        let mut swap_operations = Vec::new();

        for target in target_allocations {
            if let Some(current) = current_allocations
                .iter()
                .find(|a| a.mint == target.mint) {
                
                let target_amount = (total_value as u128 * target.target_percentage as u128 / 10000u128) as u64;
                
                if current.current_amount > target_amount {
                    // Sale required
                    let sell_amount = current.current_amount - target_amount;
                    swap_operations.push(SwapOperation {
                        operation_type: SwapOperationType::Sell,
                        from_mint: target.mint,
                        to_mint: CommonMints::get_wsol_pubkey(),
                        amount: sell_amount,
                    });
                } else if current.current_amount < target_amount {
                    // Purchase required
                    let buy_amount = target_amount - current.current_amount;
                    swap_operations.push(SwapOperation {
                        operation_type: SwapOperationType::Buy,
                        from_mint: CommonMints::get_wsol_pubkey(),
                        to_mint: target.mint,
                        amount: buy_amount,
                    });
                }
            } else if target.target_percentage > 0 {
                // New investment required
                let target_amount = (total_value as u128 * target.target_percentage as u128 / 10000u128) as u64;
                swap_operations.push(SwapOperation {
                    operation_type: SwapOperationType::Buy,
                    from_mint: CommonMints::get_wsol_pubkey(),
                    to_mint: target.mint,
                    amount: target_amount,
                });
            }
        }

        Ok(swap_operations)
    }

    /// Log swap operations (actual swap executed externally)
    pub fn log_swap_operation(operation: &SwapOperation) -> Result<()> {
        match operation.operation_type {
            SwapOperationType::Sell => {
                msg!(
                    "Sell instruction: {} to {} for {} tokens",
                    operation.from_mint,
                    operation.to_mint,
                    operation.amount
                );
            }
            SwapOperationType::Buy => {
                msg!(
                    "Buy instruction: {} to {} for {} tokens",
                    operation.from_mint,
                    operation.to_mint,
                    operation.amount
                );
            }
        }
        Ok(())
    }
}

/// Swap operation type
#[derive(Debug, Clone, PartialEq)]
pub enum SwapOperationType {
    Buy,
    Sell,
}

/// Swap operation
#[derive(Debug, Clone)]
pub struct SwapOperation {
    pub operation_type: SwapOperationType,
    pub from_mint: Pubkey,
    pub to_mint: Pubkey,
    pub amount: u64,
}

/// Common token mints (for devnet)
pub struct CommonMints;

impl CommonMints {
    // devnet USDC
    pub const USDC: &'static str = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    
    /// Get USDC Pubkey
    pub fn get_usdc_pubkey() -> Pubkey {
        Self::USDC.parse().unwrap()
    }
    
    /// Get wSOL Pubkey (Native Mint)
    pub fn get_wsol_pubkey() -> Pubkey {
        "So11111111111111111111111111111111111111112".parse().unwrap()
    }
}