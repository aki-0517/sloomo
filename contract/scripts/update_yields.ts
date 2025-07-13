/**
 * 利回り更新スクリプト
 * Usage: yarn portfolio:update-yields
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";

async function updateYields() {
  try {
    console.log("=== 利回り更新開始 ===");

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

    if (portfolioData.allocations.length === 0) {
      console.log("❌ 配分が設定されていません");
      return;
    }

    // 現在の利回り情報表示
    console.log("\n=== 現在の利回り情報 ===");
    portfolioData.allocations.forEach((allocation, index) => {
      console.log(`${index + 1}. ${allocation.symbol}`);
      console.log(`   現在のAPY: ${allocation.apy / 100}%`);
      console.log(`   最終更新: ${allocation.lastYieldUpdate.toNumber() === 0 
        ? "未更新" 
        : new Date(allocation.lastYieldUpdate.toNumber() * 1000).toLocaleString()}`);
    });

    // 新しい利回りデータ（例：市場データに基づく更新）
    const yieldUpdates = [
      {
        symbol: "SOL",
        newApy: new anchor.BN(750), // 7.5% APY
      },
      {
        symbol: "USDC",
        newApy: new anchor.BN(450), // 4.5% APY
      },
    ];

    // 利用可能なシンボルと照合
    const availableSymbols = portfolioData.allocations.map(a => a.symbol);
    const validUpdates = yieldUpdates.filter(update => 
      availableSymbols.includes(update.symbol)
    );

    if (validUpdates.length === 0) {
      console.log("❌ 更新可能なシンボルがありません");
      console.log("利用可能なシンボル:", availableSymbols.join(", "));
      return;
    }

    console.log("\n=== 更新予定の利回り ===");
    validUpdates.forEach((update, index) => {
      const currentAllocation = portfolioData.allocations.find(a => a.symbol === update.symbol);
      const currentApy = currentAllocation ? currentAllocation.apy / 100 : 0;
      const newApy = update.newApy.toNumber() / 100;
      
      console.log(`${index + 1}. ${update.symbol}`);
      console.log(`   現在のAPY: ${currentApy}%`);
      console.log(`   新しいAPY: ${newApy}%`);
      console.log(`   変化: ${(newApy - currentApy).toFixed(2)}%`);
    });

    // 利回り更新実行
    console.log("\n利回り更新トランザクション送信中...");
    const tx = await program.methods
      .updateYields(validUpdates)
      .accounts({
        portfolio: portfolioPda,
        owner: user.publicKey,
      } as any)
      .rpc();

    console.log("✅ 利回り更新完了!");
    console.log("トランザクション:", tx);
    console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // 更新後の状態確認
    const afterData = await program.account.portfolio.fetch(portfolioPda);

    console.log("\n=== 更新後の利回り情報 ===");
    afterData.allocations.forEach((allocation, index) => {
      const beforeAllocation = portfolioData.allocations.find(a => a.symbol === allocation.symbol);
      const beforeApy = beforeAllocation ? beforeAllocation.apy / 100 : 0;
      const afterApy = allocation.apy / 100;
      
      console.log(`${index + 1}. ${allocation.symbol}`);
      console.log(`   更新前APY: ${beforeApy}%`);
      console.log(`   更新後APY: ${afterApy}%`);
      console.log(`   変化: ${(afterApy - beforeApy).toFixed(2)}%`);
      console.log(`   最終更新: ${new Date(allocation.lastYieldUpdate.toNumber() * 1000).toLocaleString()}`);
    });

    // 期待リターン計算
    console.log("\n=== 期待年間リターン分析 ===");
    let totalExpectedReturn = 0;
    const totalValue = afterData.totalValue.toNumber();

    if (totalValue > 0) {
      afterData.allocations.forEach((allocation) => {
        const weight = allocation.currentAmount.toNumber() / totalValue;
        const apy = allocation.apy / 10000; // basis points to decimal
        const expectedReturn = weight * apy;
        totalExpectedReturn += expectedReturn;

        console.log(`${allocation.symbol}:`);
        console.log(`  重み: ${(weight * 100).toFixed(2)}%`);
        console.log(`  APY: ${(apy * 100).toFixed(2)}%`);
        console.log(`  期待リターン寄与: ${(expectedReturn * 100).toFixed(2)}%`);
      });

      console.log(`\nポートフォリオ全体の期待年間リターン: ${(totalExpectedReturn * 100).toFixed(2)}%`);
      
      if (totalValue > 0) {
        const expectedAnnualValue = totalValue * (1 + totalExpectedReturn);
        const expectedAnnualGain = expectedAnnualValue - totalValue;
        
        console.log(`現在価値: ${totalValue.toLocaleString()} lamports`);
        console.log(`期待年間価値: ${expectedAnnualValue.toLocaleString()} lamports`);
        console.log(`期待年間利益: ${expectedAnnualGain.toLocaleString()} lamports`);
        console.log(`期待年間利益 (SOL): ${(expectedAnnualGain / anchor.web3.LAMPORTS_PER_SOL).toFixed(6)} SOL`);
      }
    }

    // リスクとリターンの分析
    console.log("\n=== リスクとリターンの分析 ===");
    const apyValues = afterData.allocations.map(a => a.apy / 100);
    const weights = afterData.allocations.map(a => 
      totalValue > 0 ? a.currentAmount.toNumber() / totalValue : 0
    );

    if (apyValues.length > 0) {
      const maxApy = Math.max(...apyValues);
      const minApy = Math.min(...apyValues);
      const apySpread = maxApy - minApy;

      console.log(`最高APY: ${maxApy.toFixed(2)}%`);
      console.log(`最低APY: ${minApy.toFixed(2)}%`);
      console.log(`APYスプレッド: ${apySpread.toFixed(2)}%`);
      
      if (apySpread > 5) {
        console.log("⚠️  大きなAPYスプレッドが検出されました");
        console.log("リバランスを検討してください: yarn portfolio:rebalance");
      }
    }

    console.log("\n=== 次のアクション候補 ===");
    console.log("📊 ポートフォリオ確認: yarn portfolio:check");
    console.log("🔄 リバランス実行: yarn portfolio:rebalance");
    console.log("💰 追加投資: yarn portfolio:invest [symbol] [amount]");

  } catch (error) {
    console.error("❌ 利回り更新エラー:");
    console.error(error);
    
    if (error.message.includes("InvalidTokenMint")) {
      console.log("💡 ヒント: 指定されたシンボルは存在しません");
    } else if (error.message.includes("InvalidAmount")) {
      console.log("💡 ヒント: 更新データが空です");
    } else if (error.message.includes("YieldUpdateTooFrequent")) {
      console.log("💡 ヒント: 利回り更新間隔が短すぎます");
    }
  }
}

// 高度な利回り更新（カスタムデータ付き）
async function updateYieldsCustom(customYields: { symbol: string; apy: number }[]) {
  try {
    console.log("=== カスタム利回り更新開始 ===");

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    
    const program = anchor.workspace.SloomoPortfolio as anchor.Program<SloomoPortfolio>;
    const user = provider.wallet;

    const [portfolioPda] = await PublicKey.findProgramAddress(
      [Buffer.from("portfolio"), user.publicKey.toBuffer()],
      program.programId
    );

    const yieldUpdates = customYields.map(yield_ => ({
      symbol: yield_.symbol,
      newApy: new anchor.BN(Math.floor(yield_.apy * 100)), // Convert to basis points
    }));

    console.log("カスタム利回りデータ:");
    yieldUpdates.forEach(update => {
      console.log(`  ${update.symbol}: ${update.newApy.toNumber() / 100}%`);
    });

    const tx = await program.methods
      .updateYields(yieldUpdates)
      .accounts({
        portfolio: portfolioPda,
        owner: user.publicKey,
      } as any)
      .rpc();

    console.log("✅ カスタム利回り更新完了:", tx);

  } catch (error) {
    console.error("❌ カスタム利回り更新エラー:", error);
  }
}

// スクリプト実行
if (require.main === module) {
  updateYields().catch(console.error);
}

export { updateYields, updateYieldsCustom };