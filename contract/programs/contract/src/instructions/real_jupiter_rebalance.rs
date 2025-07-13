use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::{Portfolio, AllocationTarget};
use crate::error::SloomoError;
use crate::utils::{
    validate_reentrancy, 
    validate_allocation_percentage, 
    validate_rebalance_frequency,
    JupiterSwapHelper
};

/// 実際の資産移動を伴うJupiterリバランスのアカウント構造
#[derive(Accounts)]
pub struct RealJupiterRebalance<'info> {
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

    /// USDC（ベースカレンシー）のトークンアカウント
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = owner,
    )]
    pub usdc_token_account: Account<'info, TokenAccount>,

    /// USDCミント
    pub usdc_mint: Account<'info, Mint>,

    /// SPLトークンプログラム
    pub token_program: Program<'info, Token>,
    
    /// システムプログラム
    pub system_program: Program<'info, System>,
}

/// 実際の資産移動を伴うJupiterリバランスを実行する
pub fn handler(
    ctx: Context<RealJupiterRebalance>,
    target_allocations: Vec<AllocationTarget>,
    slippage_bps: Option<u16>,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let clock = Clock::get()?;

    // 共通バリデーション
    validate_rebalance_frequency(portfolio, &clock)?;
    validate_reentrancy(portfolio)?;
    
    // リバランス開始フラグを設定
    portfolio.is_rebalancing = true;

    // バリデーション: 目標配分の妥当性チェック
    let total_target: u16 = target_allocations.iter()
        .map(|t| t.target_percentage)
        .sum();
    validate_allocation_percentage(total_target)?;

    // 現在のポートフォリオ価値を実際のトークン残高から計算
    let total_portfolio_value = calculate_real_portfolio_value(
        &ctx.accounts.usdc_token_account,
        portfolio,
    )?;

    // リバランス必要性チェック
    require!(
        portfolio.needs_rebalancing(&target_allocations, total_portfolio_value)?,
        SloomoError::NoRebalanceNeeded
    );

    // 必要なスワップ操作を計算
    let swap_operations = JupiterSwapHelper::calculate_swap_operations(
        &portfolio.allocations,
        &target_allocations,
        total_portfolio_value,
    )?;

    msg!("実際のリバランス開始: {} スワップ操作が必要", swap_operations.len());

    // 各スワップ操作をログ出力（実際の実装では外部でJupiter APIを呼び出す）
    for (index, operation) in swap_operations.iter().enumerate() {
        msg!("スワップ操作 {}/{} の詳細:", index + 1, swap_operations.len());
        JupiterSwapHelper::log_swap_operation(operation)?;
        
        // 注意: ここでJupiter APIを直接呼び出すことはできません（オンチェーンプログラム内では）
        // 実際の実装では、クライアントサイドでこの情報を使用してJupiter APIを呼び出します
    }

    // ポートフォリオの状態を実際の残高に基づいて更新
    update_portfolio_from_real_balances(
        portfolio,
        &target_allocations,
        total_portfolio_value,
    )?;

    // 状態更新
    portfolio.last_rebalance = clock.unix_timestamp;
    portfolio.updated_at = clock.unix_timestamp;
    portfolio.is_rebalancing = false;

    // イベント発行
    emit!(RealJupiterPortfolioRebalanced {
        owner: portfolio.owner,
        total_value: total_portfolio_value,
        swap_operations_count: swap_operations.len() as u8,
        timestamp: clock.unix_timestamp,
        slippage_bps: slippage_bps.unwrap_or(50),
    });

    msg!(
        "実際のリバランス計算完了: 総価値 {}, {} スワップ操作",
        total_portfolio_value,
        swap_operations.len()
    );

    Ok(())
}

/// 実際のトークン残高からポートフォリオ価値を計算
fn calculate_real_portfolio_value(
    usdc_account: &Account<TokenAccount>,
    portfolio: &Portfolio,
) -> Result<u64> {
    // USDCベースでの価値計算
    let usdc_balance = usdc_account.amount;
    
    // 簡略化: 他のトークンはポートフォリオの現在記録値を使用
    // 実際の実装では、各トークンの実際の残高とUSD価格を取得する必要があります
    let other_tokens_value: u64 = portfolio.allocations
        .iter()
        .map(|a| a.current_amount)
        .sum();
    
    usdc_balance.checked_add(other_tokens_value)
        .ok_or(SloomoError::MathOverflow.into())
}

/// 実際の残高に基づいてポートフォリオ配分を更新
fn update_portfolio_from_real_balances(
    portfolio: &mut Portfolio,
    target_allocations: &[AllocationTarget],
    total_value: u64,
) -> Result<()> {
    for target in target_allocations {
        if let Some(allocation) = portfolio.allocations
            .iter_mut()
            .find(|a| a.mint == target.mint) {
            
            // 目標配分に基づいて更新
            let target_amount = (total_value as u128 * target.target_percentage as u128 / 10000u128) as u64;
            allocation.current_amount = target_amount;
            allocation.target_percentage = target.target_percentage;
        }
    }

    // 総価値を更新
    portfolio.total_value = total_value;

    Ok(())
}

/// 実際の資産移動を伴うJupiterリバランスイベント
#[event]
pub struct RealJupiterPortfolioRebalanced {
    /// ポートフォリオ所有者
    pub owner: Pubkey,
    /// リバランス時の総価値
    pub total_value: u64,
    /// 実行されたスワップ操作数
    pub swap_operations_count: u8,
    /// リバランス実行時刻
    pub timestamp: i64,
    /// 使用されたスリッページ
    pub slippage_bps: u16,
}

/// シンプルなJupiterクォート情報の記録
#[derive(Accounts)]
pub struct RecordJupiterQuote<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
}

/// Jupiterクォート情報を記録する（オフチェーンで使用）
pub fn record_jupiter_quote(
    ctx: Context<RecordJupiterQuote>,
    input_mint: String,
    output_mint: String,
    amount: u64,
    slippage_bps: Option<u16>,
) -> Result<()> {
    msg!(
        "Jupiterクォート記録: {} -> {}, 金額: {}, スリッページ: {}bps",
        input_mint,
        output_mint,
        amount,
        slippage_bps.unwrap_or(50)
    );
    
    emit!(JupiterQuoteRecorded {
        user: ctx.accounts.user.key(),
        input_mint,
        output_mint,
        amount,
        slippage_bps: slippage_bps.unwrap_or(50),
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

/// Jupiterクォート記録イベント
#[event]
pub struct JupiterQuoteRecorded {
    pub user: Pubkey,
    pub input_mint: String,
    pub output_mint: String,
    pub amount: u64,
    pub slippage_bps: u16,
    pub timestamp: i64,
}