use anchor_lang::prelude::*;

/// Jupiter スワップのヘルパー関数
pub struct JupiterSwapHelper;

impl JupiterSwapHelper {
    /// リバランスに必要なスワップ操作を計算
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
                    // 売却が必要
                    let sell_amount = current.current_amount - target_amount;
                    swap_operations.push(SwapOperation {
                        operation_type: SwapOperationType::Sell,
                        from_mint: target.mint,
                        to_mint: CommonMints::get_usdc_pubkey(),
                        amount: sell_amount,
                    });
                } else if current.current_amount < target_amount {
                    // 購入が必要
                    let buy_amount = target_amount - current.current_amount;
                    swap_operations.push(SwapOperation {
                        operation_type: SwapOperationType::Buy,
                        from_mint: CommonMints::get_usdc_pubkey(),
                        to_mint: target.mint,
                        amount: buy_amount,
                    });
                }
            } else if target.target_percentage > 0 {
                // 新しい投資が必要
                let target_amount = (total_value as u128 * target.target_percentage as u128 / 10000u128) as u64;
                swap_operations.push(SwapOperation {
                    operation_type: SwapOperationType::Buy,
                    from_mint: CommonMints::get_usdc_pubkey(),
                    to_mint: target.mint,
                    amount: target_amount,
                });
            }
        }

        Ok(swap_operations)
    }

    /// スワップ操作をログ出力（実際のスワップは外部で実行される）
    pub fn log_swap_operation(operation: &SwapOperation) -> Result<()> {
        match operation.operation_type {
            SwapOperationType::Sell => {
                msg!(
                    "売却指示: {} から {} へ {} トークン",
                    operation.from_mint,
                    operation.to_mint,
                    operation.amount
                );
            }
            SwapOperationType::Buy => {
                msg!(
                    "購入指示: {} から {} へ {} トークン",
                    operation.from_mint,
                    operation.to_mint,
                    operation.amount
                );
            }
        }
        Ok(())
    }
}

/// スワップ操作の種類
#[derive(Debug, Clone, PartialEq)]
pub enum SwapOperationType {
    Buy,
    Sell,
}

/// スワップ操作
#[derive(Debug, Clone)]
pub struct SwapOperation {
    pub operation_type: SwapOperationType,
    pub from_mint: Pubkey,
    pub to_mint: Pubkey,
    pub amount: u64,
}

/// 共通トークンミント（devnet用）
pub struct CommonMints;

impl CommonMints {
    // devnet USDC
    pub const USDC: &'static str = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    
    /// USDCのPubkeyを取得
    pub fn get_usdc_pubkey() -> Pubkey {
        Self::USDC.parse().unwrap()
    }
}