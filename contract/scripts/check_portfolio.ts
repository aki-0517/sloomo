/**
 * ポートフォリオ状態確認スクリプト
 * Usage: yarn portfolio:check
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";

async function checkPortfolio() {
  try {
    console.log("=== ポートフォリオ状態確認開始 ===");

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

    // ポートフォリオデータ取得
    const portfolioData = await program.account.portfolio.fetch(portfolioPda);

    console.log("\n=== 基本情報 ===");
    console.log("所有者:", portfolioData.owner.toString());
    console.log("総価値:", portfolioData.totalValue.toString(), "lamports");
    console.log("総価値 (SOL):", (portfolioData.totalValue.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(6), "SOL");
    console.log("最後のリバランス:", portfolioData.lastRebalance.toNumber() === 0 
      ? "未実行" 
      : new Date(portfolioData.lastRebalance.toNumber() * 1000).toLocaleString());
    console.log("リバランス実行中:", portfolioData.isRebalancing ? "はい" : "いいえ");
    console.log("作成日時:", new Date(portfolioData.createdAt.toNumber() * 1000).toLocaleString());
    console.log("最終更新:", new Date(portfolioData.updatedAt.toNumber() * 1000).toLocaleString());
    
    console.log("\n=== 配分情報 ===");
    console.log("配分数:", portfolioData.allocations.length);
    
    if (portfolioData.allocations.length > 0) {
      let totalCurrentValue = 0;
      
      portfolioData.allocations.forEach((allocation, index) => {
        const currentValue = allocation.currentAmount.toNumber();
        totalCurrentValue += currentValue;
        
        console.log(`\n${index + 1}. ${allocation.symbol}`);
        console.log(`   ミント: ${allocation.mint.toString()}`);
        console.log(`   現在額: ${currentValue.toLocaleString()} lamports`);
        console.log(`   現在額 (SOL): ${(currentValue / anchor.web3.LAMPORTS_PER_SOL).toFixed(6)} SOL`);
        console.log(`   目標比率: ${allocation.targetPercentage / 100}%`);
        console.log(`   APY: ${allocation.apy / 100}%`);
        console.log(`   最終利回り更新: ${allocation.lastYieldUpdate.toNumber() === 0 
          ? "未更新" 
          : new Date(allocation.lastYieldUpdate.toNumber() * 1000).toLocaleString()}`);
        
        // 実際の配分比率計算
        if (portfolioData.totalValue.toNumber() > 0) {
          const actualPercentage = (currentValue / portfolioData.totalValue.toNumber()) * 100;
          console.log(`   実際の比率: ${actualPercentage.toFixed(2)}%`);
          
          const targetPercentage = allocation.targetPercentage / 100;
          const diff = Math.abs(actualPercentage - targetPercentage);
          if (diff > 5) {
            console.log(`   ⚠️  目標比率との差異: ${diff.toFixed(2)}% (リバランス推奨)`);
          }
        }
      });
      
      console.log(`\n配分合計: ${totalCurrentValue.toLocaleString()} lamports`);
      
      // 目標配分の合計チェック
      const totalTargetPercentage = portfolioData.allocations.reduce(
        (sum, allocation) => sum + allocation.targetPercentage, 0
      );
      console.log(`目標配分合計: ${totalTargetPercentage / 100}%`);
      
      if (totalTargetPercentage !== 10000) {
        console.log("⚠️  目標配分の合計が100%になっていません");
      }
    }

    console.log("\n=== パフォーマンス履歴 ===");
    console.log("記録数:", portfolioData.performanceHistory.length);
    
    if (portfolioData.performanceHistory.length > 0) {
      console.log("\n最新の記録:");
      const latest = portfolioData.performanceHistory[portfolioData.performanceHistory.length - 1];
      console.log(`  時刻: ${new Date(latest.timestamp.toNumber() * 1000).toLocaleString()}`);
      console.log(`  価値: ${latest.totalValue.toString()} lamports`);
      console.log(`  成長率: ${latest.growthRate / 100}%`);
      
      if (portfolioData.performanceHistory.length > 1) {
        console.log("\n過去の記録:");
        portfolioData.performanceHistory.slice(-5).forEach((record, index) => {
          console.log(`  ${index + 1}. ${new Date(record.timestamp.toNumber() * 1000).toLocaleString()}`);
          console.log(`     価値: ${record.totalValue.toString()}, 成長率: ${record.growthRate / 100}%`);
        });
      }
    }

    // リバランス推奨度チェック
    console.log("\n=== リバランス分析 ===");
    
    if (portfolioData.allocations.length > 0 && portfolioData.totalValue.toNumber() > 0) {
      let needsRebalancing = false;
      const threshold = 5; // 5% threshold
      
      portfolioData.allocations.forEach((allocation) => {
        const currentPercentage = (allocation.currentAmount.toNumber() / portfolioData.totalValue.toNumber()) * 100;
        const targetPercentage = allocation.targetPercentage / 100;
        const diff = Math.abs(currentPercentage - targetPercentage);
        
        if (diff > threshold) {
          needsRebalancing = true;
          console.log(`${allocation.symbol}: ${diff.toFixed(2)}% の差異（閾値: ${threshold}%）`);
        }
      });
      
      if (needsRebalancing) {
        console.log("🔄 リバランスが推奨されます");
        console.log("実行コマンド: yarn portfolio:rebalance");
      } else {
        console.log("✅ 現在の配分は目標範囲内です");
      }
    }

    console.log("\n=== 次のアクション候補 ===");
    console.log("💰 投資を追加: yarn portfolio:invest");
    console.log("📈 利回り更新: yarn portfolio:update-yields");
    console.log("🔄 リバランス実行: yarn portfolio:rebalance");
    console.log("📊 Explorer で確認: https://explorer.solana.com/account/" + portfolioPda.toString() + "?cluster=devnet");

  } catch (error) {
    console.error("❌ ポートフォリオ状態確認エラー:");
    
    if (error.message.includes("Account does not exist")) {
      console.log("💡 ポートフォリオが見つかりません");
      console.log("   まず 'yarn portfolio:init' でポートフォリオを初期化してください");
    } else {
      console.error(error);
    }
  }
}

// スクリプト実行
if (require.main === module) {
  checkPortfolio().catch(console.error);
}

export { checkPortfolio };