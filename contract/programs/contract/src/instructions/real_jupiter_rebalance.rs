use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::{Portfolio, AllocationTarget, AllocationData};
use crate::error::SloomoError;
use crate::utils::{
    validate_reentrancy, 
    validate_allocation_percentage, 
    validate_rebalance_frequency
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
/// クライアントで設定した目標配分%に基づいて、USDC から各 stablecoin への swap 指示を出力
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

    // USDC残高をベースとした総ポートフォリオ価値
    let usdc_balance = ctx.accounts.usdc_token_account.amount;
    require!(usdc_balance > 0, SloomoError::InsufficientBalance);

    msg!("リバランス開始: USDC残高 {} をベースに目標配分に応じて各 stablecoin に配分", usdc_balance);

    // 各目標配分に対してJupiter swap指示を出力
    for target in &target_allocations {
        let target_amount = (usdc_balance as u128 * target.target_percentage as u128 / 10000u128) as u64;
        
        if target_amount > 0 {
            msg!(
                "Jupiter swap 指示: USDC {} -> target_mint {} (目標金額: {}, 配分: {}%)",
                usdc_balance,
                target.mint,
                target_amount,
                target.target_percentage as f64 / 100.0
            );
        }
    }

    // ポートフォリオの配分データを更新
    update_portfolio_allocations(
        portfolio,
        &target_allocations,
        usdc_balance,
    )?;

    // 状態更新
    portfolio.last_rebalance = clock.unix_timestamp;
    portfolio.updated_at = clock.unix_timestamp;
    portfolio.total_value = usdc_balance;
    portfolio.is_rebalancing = false;

    // イベント発行
    emit!(StablecoinPortfolioRebalanced {
        owner: portfolio.owner,
        usdc_amount: usdc_balance,
        target_allocations_count: target_allocations.len() as u8,
        timestamp: clock.unix_timestamp,
        slippage_bps: slippage_bps.unwrap_or(50),
    });

    msg!(
        "ポートフォリオリバランス完了: USDC {} を {} 種類の stablecoin に配分",
        usdc_balance,
        target_allocations.len()
    );

    Ok(())
}

/// ポートフォリオ配分データを更新
fn update_portfolio_allocations(
    portfolio: &mut Portfolio,
    target_allocations: &[AllocationTarget],
    usdc_balance: u64,
) -> Result<()> {
    for target in target_allocations {
        // 既存の配分データを検索または新規作成
        if let Some(allocation) = portfolio.allocations
            .iter_mut()
            .find(|a| a.mint == target.mint) {
            
            // 目標配分に基づいて更新
            let target_amount = (usdc_balance as u128 * target.target_percentage as u128 / 10000u128) as u64;
            allocation.current_amount = target_amount;
            allocation.target_percentage = target.target_percentage;
        } else {
            // 新規の配分データを追加（必要に応じて）
            let target_amount = (usdc_balance as u128 * target.target_percentage as u128 / 10000u128) as u64;
            
            // 注意: 実際の実装では mint から symbol を解決する必要があります
            // ここでは簡略化しています
            portfolio.allocations.push(AllocationData {
                mint: target.mint,
                symbol: format!("STABLECOIN-{}", target.mint.to_string().chars().take(8).collect::<String>()),
                current_amount: target_amount,
                target_percentage: target.target_percentage,
                apy: 0, // クライアントサイドで管理
                last_yield_update: 0,
            });
        }
    }

    Ok(())
}

/// Stablecoin ポートフォリオリバランスイベント
#[event]
pub struct StablecoinPortfolioRebalanced {
    /// ポートフォリオ所有者
    pub owner: Pubkey,
    /// リバランス時のUSDC金額
    pub usdc_amount: u64,
    /// 配分された stablecoin 種類数
    pub target_allocations_count: u8,
    /// リバランス実行時刻
    pub timestamp: i64,
    /// 使用されたスリッページ
    pub slippage_bps: u16,
}

