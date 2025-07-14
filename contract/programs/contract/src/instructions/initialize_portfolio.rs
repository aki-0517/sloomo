use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint, Transfer, transfer};
use crate::state::{Portfolio, InitPortfolioParams, AllocationData, MAX_ALLOCATIONS, AllocationTarget};
use crate::error::SloomoError;
use crate::utils::{validate_allocation_percentage, jupiter::JupiterSolSwapHelper};

/// ポートフォリオ初期化のアカウント構造
#[derive(Accounts)]
#[instruction(params: InitPortfolioParams)]
pub struct InitializePortfolio<'info> {
    /// 初期化するポートフォリオアカウント
    #[account(
        init,
        payer = owner,
        space = Portfolio::SIZE,
        seeds = [b"portfolio", owner.key().as_ref()],
        bump
    )]
    pub portfolio: Account<'info, Portfolio>,

    /// ポートフォリオの所有者（料金支払い者）
    #[account(mut)]
    pub owner: Signer<'info>,

    /// ユーザーのwSOLトークンアカウント
    #[account(mut)]
    pub user_wsol_account: Account<'info, TokenAccount>,

    /// ポートフォリオのwSOLボルトアカウント
    #[account(
        init,
        payer = owner,
        seeds = [b"vault", portfolio.key().as_ref(), wsol_mint.key().as_ref()],
        bump,
        token::mint = wsol_mint,
        token::authority = portfolio,
    )]
    pub portfolio_wsol_vault: Account<'info, TokenAccount>,

    /// wSOLミント（Native Mint）
    pub wsol_mint: Account<'info, Mint>,

    /// システムプログラム
    pub system_program: Program<'info, System>,

    /// トークンプログラム
    pub token_program: Program<'info, Token>,
}

/// ポートフォリオを初期化する（SOL投資と Jupiter スワップ付き）
///
/// # Arguments
/// * `ctx` - トランザクションコンテキスト
/// * `params` - 初期化パラメータ
///
/// # Returns
/// * `Result<()>` - 成功時はOk(())、失敗時はエラー
pub fn handler(
    ctx: Context<InitializePortfolio>,
    params: InitPortfolioParams,
) -> Result<()> {
    let portfolio = &mut ctx.accounts.portfolio;
    let owner = &ctx.accounts.owner;
    let clock = Clock::get()?;

    // バリデーション: 配分数の上限チェック
    require!(
        params.initial_allocations.len() <= MAX_ALLOCATIONS,
        SloomoError::AllocationOverflow
    );

    // バリデーション: 配分比率の合計チェック
    let total_percentage: u16 = params.initial_allocations
        .iter()
        .map(|a| a.target_percentage)
        .sum();

    validate_allocation_percentage(total_percentage)?;

    // バリデーション: 初期SOL投資額チェック
    require!(
        params.initial_sol_amount > 0,
        SloomoError::InvalidAmount
    );

    // ポートフォリオ基本情報の設定
    portfolio.owner = owner.key();
    portfolio.bump = ctx.bumps.portfolio;
    portfolio.total_value = params.initial_sol_amount;
    portfolio.last_rebalance = clock.unix_timestamp;
    portfolio.created_at = clock.unix_timestamp;
    portfolio.updated_at = clock.unix_timestamp;
    portfolio.is_rebalancing = false;

    // SOL投資: ユーザーのwSOLアカウントからポートフォリオボルトへ転送
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_wsol_account.to_account_info(),
        to: ctx.accounts.portfolio_wsol_vault.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    transfer(cpi_ctx, params.initial_sol_amount)?;

    // 配分データの初期化（wSOLから始まる）
    portfolio.allocations = params.initial_allocations
        .into_iter()
        .map(|alloc_params| AllocationData {
            mint: alloc_params.mint,
            symbol: alloc_params.symbol,
            current_amount: if alloc_params.mint == ctx.accounts.wsol_mint.key() {
                params.initial_sol_amount
            } else {
                0
            },
            target_percentage: alloc_params.target_percentage,
            apy: 0,
            last_yield_update: clock.unix_timestamp,
        })
        .collect();

    // Jupiter自動スワップが有効な場合、スワップ操作を計算してログ出力
    if params.enable_jupiter_swap {
        msg!("Jupiter自動スワップを実行します...");
        
        // 目標配分を作成
        let target_allocations: Vec<AllocationTarget> = portfolio.allocations
            .iter()
            .map(|alloc| AllocationTarget {
                mint: alloc.mint,
                target_percentage: alloc.target_percentage,
            })
            .collect();

        // スワップ操作を計算
        let swap_operations = JupiterSolSwapHelper::calculate_swap_operations(
            &portfolio.allocations,
            &target_allocations,
            portfolio.total_value,
        )?;

        // スワップ操作をログ出力（実際のスワップは外部で実行）
        for operation in swap_operations {
            JupiterSolSwapHelper::log_swap_operation(&operation)?;
        }

        msg!("Jupiter スワップ指示を出力しました。外部でスワップを実行してください。");
    }

    // 空のパフォーマンス履歴で初期化
    portfolio.performance_history = Vec::new();

    // イベント発行
    emit!(PortfolioInitialized {
        owner: owner.key(),
        portfolio: portfolio.key(),
        allocations_count: portfolio.allocations.len() as u8,
        initial_sol_amount: params.initial_sol_amount,
        jupiter_swap_enabled: params.enable_jupiter_swap,
    });

    msg!("ポートフォリオが正常に初期化されました: {}", portfolio.key());
    msg!("初期SOL投資額: {} lamports", params.initial_sol_amount);
    Ok(())
}

/// ポートフォリオ初期化イベント
#[event]
pub struct PortfolioInitialized {
    /// ポートフォリオ所有者
    pub owner: Pubkey,
    /// ポートフォリオアカウント
    pub portfolio: Pubkey,
    /// 初期配分数
    pub allocations_count: u8,
    /// 初期SOL投資額
    pub initial_sol_amount: u64,
    /// Jupiter自動スワップが有効かどうか
    pub jupiter_swap_enabled: bool,
}