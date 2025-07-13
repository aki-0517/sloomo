use anchor_lang::prelude::*;

#[error_code]
pub enum SloomoError {
    #[msg("無効な配分比率")]
    InvalidAllocationPercentage,
    #[msg("リバランスに必要な残高が不足")]
    InsufficientBalance,
    #[msg("ポートフォリオが見つかりません")]
    PortfolioNotFound,
    #[msg("認証されていないアクセス")]
    Unauthorized,
    #[msg("無効なトークンミント")]
    InvalidTokenMint,
    #[msg("リバランス実行が頻繁すぎます")]
    RebalanceTooFrequent,
    #[msg("総配分が100%を超えています")]
    AllocationOverflow,
    #[msg("利回り更新が頻繁すぎます")]
    YieldUpdateTooFrequent,
    #[msg("数値オーバーフロー")]
    MathOverflow,
    #[msg("無効なAPY値")]
    InvalidApy,
    #[msg("無効な金額")]
    InvalidAmount,
    #[msg("リバランス不要")]
    NoRebalanceNeeded,
    #[msg("リバランス実行中")]
    RebalanceInProgress,
    #[msg("Jupiter API エラー")]
    JupiterApiError,
    #[msg("スワップ実行失敗")]
    SwapExecutionFailed,
    #[msg("クォート取得失敗")]
    QuoteRetrievalFailed,
}