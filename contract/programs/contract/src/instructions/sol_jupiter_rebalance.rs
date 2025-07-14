use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::{Portfolio, AllocationTarget, AllocationData};
use crate::error::SloomoError;
use crate::utils::{
    validate_reentrancy, 
    validate_allocation_percentage, 
    validate_rebalance_frequency,
    JupiterSolSwapHelper
};

/// SOLベースのJupiterリバランスのアカウント構造
#[derive(Accounts)]
pub struct SolJupiterRebalance<'info> {
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

    /// wrapped SOL（wSOL）のトークンアカウント
    #[account(
        mut,
        associated_token::mint = wsol_mint,
        associated_token::authority = owner,
    )]
    pub wsol_token_account: Account<'info, TokenAccount>,

    /// wSOLミント（Native Mint）
    pub wsol_mint: Account<'info, Mint>,

    /// SPLトークンプログラム
    pub token_program: Program<'info, Token>,
    
    /// システムプログラム
    pub system_program: Program<'info, System>,
}

/// SOLベースのJupiterリバランスを実行する
/// wrapped SOL（wSOL）から各トークンへのJupiterスワップを計算し、リバランス指示を出力
pub fn handler(
    ctx: Context<SolJupiterRebalance>,
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

    // wSOL残高をベースとした総ポートフォリオ価値
    let wsol_balance = ctx.accounts.wsol_token_account.amount;
    require!(wsol_balance > 0, SloomoError::InsufficientBalance);

    msg!("SOLリバランス開始: wSOL残高 {} lamports をベースに目標配分に応じて各トークンに配分", wsol_balance);

    // 現在の配分と目標配分からスワップ操作を計算
    let swap_operations = JupiterSolSwapHelper::calculate_swap_operations(
        &portfolio.allocations,
        &target_allocations,
        wsol_balance,
    )?;

    // 各スワップ操作をログ出力（実際のスワップはクライアントサイドで実行）
    for operation in &swap_operations {
        JupiterSolSwapHelper::log_swap_operation(operation)?;
    }

    if swap_operations.is_empty() {
        msg!("スワップ操作は不要です - 既に目標配分に近い状態です");
    } else {
        msg!("計算されたスワップ操作数: {}", swap_operations.len());
    }

    // ポートフォリオの配分データを更新
    update_portfolio_allocations(
        portfolio,
        &target_allocations,
        wsol_balance,
    )?;

    // 状態更新
    portfolio.last_rebalance = clock.unix_timestamp;
    portfolio.updated_at = clock.unix_timestamp;
    portfolio.total_value = wsol_balance;
    portfolio.is_rebalancing = false;

    // イベント発行
    emit!(SolPortfolioRebalanced {
        owner: portfolio.owner,
        wsol_amount: wsol_balance,
        target_allocations_count: target_allocations.len() as u8,
        timestamp: clock.unix_timestamp,
        slippage_bps: slippage_bps.unwrap_or(50),
    });

    msg!(
        "SOLポートフォリオリバランス完了: wSOL {} lamports を {} 種類のトークンに配分",
        wsol_balance,
        target_allocations.len()
    );

    Ok(())
}

/// ポートフォリオ配分データを更新
fn update_portfolio_allocations(
    portfolio: &mut Portfolio,
    target_allocations: &[AllocationTarget],
    wsol_balance: u64,
) -> Result<()> {
    for target in target_allocations {
        // 既存の配分データを検索または新規作成
        if let Some(allocation) = portfolio.allocations
            .iter_mut()
            .find(|a| a.mint == target.mint) {
            
            // 目標配分に基づいて更新
            let target_amount = (wsol_balance as u128 * target.target_percentage as u128 / 10000u128) as u64;
            allocation.current_amount = target_amount;
            allocation.target_percentage = target.target_percentage;
        } else {
            // 新規の配分データを追加
            let target_amount = (wsol_balance as u128 * target.target_percentage as u128 / 10000u128) as u64;
            
            // mintから適切なシンボルを取得する（実装では外部サービスやマッピングを使用）
            let symbol = derive_symbol_from_mint(&target.mint);
            
            portfolio.allocations.push(AllocationData {
                mint: target.mint,
                symbol,
                current_amount: target_amount,
                target_percentage: target.target_percentage,
                apy: 0, // クライアントサイドで管理
                last_yield_update: 0,
            });
        }
    }

    Ok(())
}

/// mintアドレスからシンボルを導出する（簡易実装）
fn derive_symbol_from_mint(mint: &Pubkey) -> String {
    // 実際の実装では、既知のmintアドレスのマッピングや
    // オンチェーンメタデータから取得する
    let mint_str = mint.to_string();
    
    // 一般的なdevnetトークンのmintアドレスマッピング
    match mint_str.as_str() {
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" => "USDC".to_string(),
        "So11111111111111111111111111111111111111112" => "SOL".to_string(),
        _ => format!("TOKEN-{}", &mint_str[0..8])
    }
}

/// SOL ポートフォリオリバランスイベント
#[event]
pub struct SolPortfolioRebalanced {
    /// ポートフォリオ所有者
    pub owner: Pubkey,
    /// リバランス時のwSOL金額
    pub wsol_amount: u64,
    /// 配分されたトークン種類数
    pub target_allocations_count: u8,
    /// リバランス実行時刻
    pub timestamp: i64,
    /// 使用されたスリッページ
    pub slippage_bps: u16,
}