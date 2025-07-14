/**
 * Jupiterリバランス実行スクリプト
 * Usage: yarn portfolio:rebalance [slippage_bps]
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, NATIVE_MINT } from "@solana/spl-token";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";

async function jupiterRebalance(slippageBps?: number) {
  try {
    console.log("=== Jupiterリバランス実行開始 ===");

    // プロバイダー設定
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    
    const program = anchor.workspace.SloomoPortfolio as anchor.Program<SloomoPortfolio>;
    const user = provider.wallet;

    console.log("ユーザー:", user.publicKey.toString());

    // Portfolio PDA取得
    const [portfolioPda] = await PublicKey.findProgramAddress(
      [Buffer.from("portfolio"), user.publicKey.toBuffer()],
      program.programId
    );

    console.log("Portfolio PDA:", portfolioPda.toString());

    // ポートフォリオ存在確認
    let portfolioData;
    try {
      portfolioData = await program.account.portfolio.fetch(portfolioPda);
      console.log("✅ ポートフォリオ確認完了");
    } catch (error) {
      console.log("❌ ポートフォリオが見つかりません");
      console.log("まず 'yarn portfolio:init' でポートフォリオを初期化してください");
      return;
    }

    // リバランス実行中チェック
    if (portfolioData.isRebalancing) {
      console.log("⚠️  既にリバランスが実行中です");
      console.log("しばらく待ってから再度実行してください");
      return;
    }

    // wSOL設定
    const wsolMint = NATIVE_MINT; // So11111111111111111111111111111111111111112
    let wsolTokenAccount;
    
    try {
      wsolTokenAccount = await getAssociatedTokenAddress(
        wsolMint,
        user.publicKey
      );
      console.log("wSOL Token Account:", wsolTokenAccount.toString());
    } catch (error) {
      console.log("❌ wSOL トークンアカウントの取得に失敗しました");
      console.log("まず SOL をデポジットしてください: yarn portfolio:deposit [amount] SOL");
      return;
    }

    // スリッページ設定
    const slippage = slippageBps || 50; // デフォルト0.5%
    console.log("スリッページ設定:", slippage, "bps (", slippage / 100, "%)");

    // 現在の配分情報表示
    console.log("\n=== リバランス前の配分 ===");
    console.log("総価値:", portfolioData.totalValue.toString(), "lamports");
    console.log("配分数:", portfolioData.allocations.length);

    if (portfolioData.allocations.length === 0) {
      console.log("❌ 配分が設定されていません");
      return;
    }

    portfolioData.allocations.forEach((allocation, index) => {
      const currentPercentage = portfolioData.totalValue.toNumber() > 0
        ? (allocation.currentAmount.toNumber() / portfolioData.totalValue.toNumber()) * 100
        : 0;
      
      console.log(`${index + 1}. ${allocation.symbol}`);
      console.log(`   現在額: ${allocation.currentAmount.toString()} lamports`);
      console.log(`   現在比率: ${currentPercentage.toFixed(2)}%`);
      console.log(`   目標比率: ${allocation.targetPercentage / 100}%`);
      console.log(`   差異: ${Math.abs(currentPercentage - allocation.targetPercentage / 100).toFixed(2)}%`);
    });

    // 目標配分設定（現在の設定を使用）
    const targetAllocations = portfolioData.allocations.map(allocation => ({
      mint: allocation.mint,
      targetPercentage: allocation.targetPercentage,
    }));

    console.log("\n=== 目標配分設定 ===");
    targetAllocations.forEach((target, index) => {
      const allocation = portfolioData.allocations[index];
      console.log(`${index + 1}. ${allocation.symbol}: ${target.targetPercentage / 100}%`);
    });

    // リバランス必要性の事前チェック
    let needsRebalancing = false;
    const threshold = 5; // 5%の閾値
    
    portfolioData.allocations.forEach((allocation) => {
      if (portfolioData.totalValue.toNumber() > 0) {
        const currentPercentage = (allocation.currentAmount.toNumber() / portfolioData.totalValue.toNumber()) * 100;
        const targetPercentage = allocation.targetPercentage / 100;
        const diff = Math.abs(currentPercentage - targetPercentage);
        
        if (diff > threshold) {
          needsRebalancing = true;
        }
      }
    });

    if (!needsRebalancing) {
      console.log("✅ 現在の配分は目標範囲内です（閾値: " + threshold + "%）");
      console.log("リバランスは不要です");
      return;
    }

    console.log("🔄 リバランスが必要です（閾値: " + threshold + "%を超過）");

    // ユーザー確認（本番環境では重要）
    console.log("\n⚠️  重要: これは実際の資産移動を伴う操作です");
    console.log("devnet環境での実行のため、実際のスワップはクライアントサイドで別途実行が必要です");

    // SOLリバランス実行
    console.log("\nSOLリバランストランザクション送信中...");
    const tx = await program.methods
      .solJupiterRebalance(targetAllocations, slippage)
      .accounts({
        portfolio: portfolioPda,
        owner: user.publicKey,
        wsolTokenAccount: wsolTokenAccount,
        wsolMint: wsolMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("✅ SOLベースJupiterリバランス完了!");
    console.log("トランザクション:", tx);
    console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // リバランス後の状態確認
    const afterData = await program.account.portfolio.fetch(portfolioPda);

    console.log("\n=== リバランス後の配分 ===");
    console.log("総価値:", afterData.totalValue.toString(), "lamports");
    console.log("最後のリバランス:", new Date(afterData.lastRebalance.toNumber() * 1000).toLocaleString());

    afterData.allocations.forEach((allocation, index) => {
      const currentPercentage = afterData.totalValue.toNumber() > 0
        ? (allocation.currentAmount.toNumber() / afterData.totalValue.toNumber()) * 100
        : 0;
      
      console.log(`${index + 1}. ${allocation.symbol}`);
      console.log(`   新しい額: ${allocation.currentAmount.toString()} lamports`);
      console.log(`   新しい比率: ${currentPercentage.toFixed(2)}%`);
      console.log(`   目標比率: ${allocation.targetPercentage / 100}%`);
      console.log(`   差異: ${Math.abs(currentPercentage - allocation.targetPercentage / 100).toFixed(2)}%`);
    });

    // パフォーマンス情報
    if (afterData.performanceHistory.length > 0) {
      const latest = afterData.performanceHistory[afterData.performanceHistory.length - 1];
      console.log("\n=== パフォーマンス更新 ===");
      console.log("記録時刻:", new Date(latest.timestamp.toNumber() * 1000).toLocaleString());
      console.log("成長率:", latest.growthRate / 100, "%");
    }

    console.log("\n⚠️  重要な注意事項:");
    console.log("このSOLリバランスはオンチェーンでの計算とログ出力のみです");
    console.log("実際のJupiterスワップを実行するには、コントラクト内での");
    console.log("Jupiter Rust API統合が必要です");

    console.log("\n=== 次のアクション候補 ===");
    console.log("📊 ポートフォリオ確認: yarn portfolio:check");
    console.log("💰 追加投資: yarn portfolio:invest [symbol] [amount]");
    console.log("📈 利回り更新: yarn portfolio:update-yields");

  } catch (error) {
    console.error("❌ SOLベースJupiterリバランスエラー:");
    console.error(error);
    
    if (error.message.includes("NoRebalanceNeeded")) {
      console.log("💡 ヒント: リバランスは不要です（配分が目標範囲内）");
    } else if (error.message.includes("InvalidAllocationPercentage")) {
      console.log("💡 ヒント: 配分の合計が100%になっていません");
    } else if (error.message.includes("RebalanceInProgress")) {
      console.log("💡 ヒント: 既にリバランスが実行中です");
    } else if (error.message.includes("RebalanceTooFrequent")) {
      console.log("💡 ヒント: リバランス実行間隔が短すぎます");
    }
  }
}

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  const slippageBps = args[0] ? parseInt(args[0]) : undefined;
  
  if (slippageBps && (isNaN(slippageBps) || slippageBps < 1 || slippageBps > 10000)) {
    console.log("❌ 無効なスリッページです（1-10000 bps）");
    console.log("使用例: yarn portfolio:rebalance 100  # 1%スリッページ");
    process.exit(1);
  }
  
  return { slippageBps };
}

// スクリプト実行
if (require.main === module) {
  const { slippageBps } = parseArgs();
  jupiterRebalance(slippageBps).catch(console.error);
}

export { jupiterRebalance };