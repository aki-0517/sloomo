/**
 * アロケーション追加・編集スクリプト
 * Usage: yarn portfolio:add-allocation [symbol] [percentage] [mint]
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";

async function addOrUpdateAllocation(symbol?: string, percentage?: number, mintAddress?: string) {
  try {
    console.log("=== アロケーション追加・編集開始 ===");

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

    // 引数の設定またはデフォルト値
    let allocationSymbol: string;
    let allocationPercentage: number;
    let allocationMint: PublicKey;

    if (symbol && percentage && mintAddress) {
      // コマンドライン引数から取得
      allocationSymbol = symbol;
      allocationPercentage = percentage;
      try {
        allocationMint = new PublicKey(mintAddress);
      } catch (error) {
        console.log("❌ 無効なミントアドレスです:", mintAddress);
        return;
      }
    } else {
      // デフォルト例：USDT-METの追加
      allocationSymbol = "USDT-MET";
      allocationPercentage = 20; // 20%
      allocationMint = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"); // devnet USDT
    }

    // 目標配分比率をbasis pointsに変換（1% = 100 bp）
    const targetPercentageBps = Math.floor(allocationPercentage * 100);

    if (targetPercentageBps <= 0 || targetPercentageBps > 10000) {
      console.log("❌ 無効な配分比率です（0-100%の範囲で入力してください）");
      return;
    }

    console.log("\n=== アロケーション情報 ===");
    console.log("シンボル:", allocationSymbol);
    console.log("ミント:", allocationMint.toString());
    console.log("目標配分比率:", allocationPercentage + "%");
    console.log("目標配分比率 (bp):", targetPercentageBps);

    // 現在の配分状況表示
    console.log("\n=== 現在の配分状況 ===");
    console.log("配分数:", portfolioData.allocations.length + "/10");
    
    let currentTotalPercentage = 0;
    const existingAllocation = portfolioData.allocations.find(
      (allocation: any) => allocation.mint.toString() === allocationMint.toString()
    );

    portfolioData.allocations.forEach((allocation: any, index: number) => {
      currentTotalPercentage += allocation.targetPercentage;
      console.log(`${index + 1}. ${allocation.symbol}: ${allocation.targetPercentage / 100}%`);
      console.log(`   ミント: ${allocation.mint.toString()}`);
    });

    console.log(`現在の総配分: ${currentTotalPercentage / 100}%`);

    // 新しい総配分の計算と確認
    let newTotalPercentage = currentTotalPercentage;
    if (existingAllocation) {
      // 既存のアロケーションを更新する場合
      newTotalPercentage = newTotalPercentage - existingAllocation.targetPercentage + targetPercentageBps;
      console.log(`\n既存のアロケーション '${allocationSymbol}' を更新します`);
      console.log(`現在: ${existingAllocation.targetPercentage / 100}% → 新規: ${allocationPercentage}%`);
    } else {
      // 新しいアロケーションを追加する場合
      newTotalPercentage += targetPercentageBps;
      console.log(`\n新しいアロケーション '${allocationSymbol}' を追加します`);
    }

    console.log(`新しい総配分: ${newTotalPercentage / 100}%`);

    if (newTotalPercentage > 10000) {
      console.log("❌ 総配分が100%を超えます");
      console.log("既存の配分を調整してから再実行してください");
      return;
    }

    // 確認メッセージ
    console.log("\n⚠️  この操作により配分が変更されます");
    if (newTotalPercentage < 10000) {
      console.log(`残り配分: ${(10000 - newTotalPercentage) / 100}%`);
    }

    console.log("\nアロケーション追加・編集トランザクション送信中...");

    // アロケーション追加・編集実行
    const tx = await program.methods
      .addOrUpdateAllocation(
        allocationMint,
        allocationSymbol,
        targetPercentageBps
      )
      .accounts({
        portfolio: portfolioPda,
        owner: user.publicKey,
      } as any)
      .rpc();

    console.log("✅ アロケーション操作完了!");
    console.log("トランザクション:", tx);
    console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // 更新後の状態確認
    const afterData = await program.account.portfolio.fetch(portfolioPda);

    console.log("\n=== 更新後の配分状況 ===");
    console.log("配分数:", afterData.allocations.length + "/10");
    console.log("最終更新:", new Date(afterData.updatedAt.toNumber() * 1000).toLocaleString());

    let updatedTotalPercentage = 0;
    afterData.allocations.forEach((allocation: any, index: number) => {
      updatedTotalPercentage += allocation.targetPercentage;
      console.log(`${index + 1}. ${allocation.symbol}: ${allocation.targetPercentage / 100}%`);
      console.log(`   ミント: ${allocation.mint.toString()}`);
      console.log(`   現在額: ${allocation.currentAmount.toString()} lamports`);
      console.log(`   APY: ${allocation.apy / 100}%`);
      console.log(`   最終利回り更新: ${allocation.lastYieldUpdate.toNumber() === 0 
        ? "未更新" 
        : new Date(allocation.lastYieldUpdate.toNumber() * 1000).toLocaleString()}`);
    });

    console.log(`\n総配分: ${updatedTotalPercentage / 100}%`);
    
    if (updatedTotalPercentage < 10000) {
      console.log(`残り配分: ${(10000 - updatedTotalPercentage) / 100}%`);
    }

    if (updatedTotalPercentage === 10000) {
      console.log("✅ 配分が100%に達しました");
    }

    console.log("\n=== 次のアクション候補 ===");
    console.log("📊 ポートフォリオ確認: yarn portfolio:check");
    console.log("💰 USDC投資: yarn portfolio:deposit [amount]");
    console.log("🔄 リバランス: yarn portfolio:rebalance");
    console.log("📈 配分追加: yarn portfolio:add-allocation [symbol] [percentage] [mint]");

  } catch (error) {
    console.error("❌ アロケーション操作エラー:");
    console.error(error);
    
    if (error.message.includes("InvalidAllocationPercentage")) {
      console.log("💡 ヒント: 配分比率が無効です（0-100%の範囲で入力）");
    } else if (error.message.includes("AllocationOverflow")) {
      console.log("💡 ヒント: 配分数が上限（10個）に達しているか、総配分が100%を超えています");
    } else if (error.message.includes("InvalidTokenSymbol")) {
      console.log("💡 ヒント: トークンシンボルが無効です");
    }
  }
}

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  const symbol = args[0];
  const percentage = args[1] ? parseFloat(args[1]) : undefined;
  const mintAddress = args[2];
  
  if (symbol && percentage && mintAddress) {
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      console.log("❌ 無効な配分比率です（0-100%の範囲で入力）");
      console.log("使用例: yarn portfolio:add-allocation USDT-MET 20 Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
      process.exit(1);
    }
  } else if (args.length > 0 && args.length < 3) {
    console.log("❌ 引数が不足しています");
    console.log("使用例: yarn portfolio:add-allocation [symbol] [percentage] [mint]");
    console.log("例: yarn portfolio:add-allocation USDT-MET 20 Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
    process.exit(1);
  }
  
  return { symbol, percentage, mintAddress };
}

// スクリプト実行
if (require.main === module) {
  const { symbol, percentage, mintAddress } = parseArgs();
  addOrUpdateAllocation(symbol, percentage, mintAddress).catch(console.error);
}

export { addOrUpdateAllocation };