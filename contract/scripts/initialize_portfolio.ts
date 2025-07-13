/**
 * ポートフォリオ初期化スクリプト
 * Usage: yarn portfolio:init
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";

async function initializePortfolio() {
  try {
    console.log("=== ポートフォリオ初期化開始 ===");

    // プロバイダー設定
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    
    const program = anchor.workspace.SloomoPortfolio as anchor.Program<SloomoPortfolio>;
    const user = provider.wallet;

    console.log("ユーザー:", user.publicKey.toString());
    console.log("プログラムID:", program.programId.toString());

    // Portfolio PDA生成
    const [portfolioPda, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("portfolio"), user.publicKey.toBuffer()],
      program.programId
    );

    console.log("Portfolio PDA:", portfolioPda.toString());
    console.log("Bump:", bump);

    // 初期配分設定（例：SOLとUSDCの60:40分割）
    const initialAllocations = [
      {
        mint: new PublicKey("So11111111111111111111111111111111111111112"), // WSOL
        symbol: "SOL",
        targetPercentage: 6000, // 60%
      },
      {
        mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), // devnet USDC
        symbol: "USDC", 
        targetPercentage: 4000, // 40%
      },
    ];

    console.log("初期配分設定:");
    initialAllocations.forEach((allocation, index) => {
      console.log(`  ${index + 1}. ${allocation.symbol}: ${allocation.targetPercentage / 100}%`);
      console.log(`     ミント: ${allocation.mint.toString()}`);
    });

    // 既存ポートフォリオの確認
    try {
      const existingPortfolio = await program.account.portfolio.fetch(portfolioPda);
      console.log("⚠️  ポートフォリオは既に初期化されています");
      console.log("既存ポートフォリオ情報:");
      console.log("  所有者:", existingPortfolio.owner.toString());
      console.log("  配分数:", existingPortfolio.allocations.length);
      console.log("  総価値:", existingPortfolio.totalValue.toString());
      return;
    } catch (error) {
      // ポートフォリオが存在しない場合は続行
      console.log("新しいポートフォリオを作成します...");
    }

    // ポートフォリオ初期化実行
    console.log("初期化トランザクション送信中...");
    const tx = await program.methods
      .initializePortfolio({ initialAllocations })
      .accounts({
        portfolio: portfolioPda,
        owner: user.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("✅ ポートフォリオ初期化完了!");
    console.log("トランザクション:", tx);
    console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // 初期化されたポートフォリオの確認
    const portfolioData = await program.account.portfolio.fetch(portfolioPda);
    
    console.log("\n=== 初期化されたポートフォリオ情報 ===");
    console.log("所有者:", portfolioData.owner.toString());
    console.log("総価値:", portfolioData.totalValue.toString());
    console.log("配分数:", portfolioData.allocations.length);
    console.log("作成日時:", new Date(portfolioData.createdAt.toNumber() * 1000));
    
    portfolioData.allocations.forEach((allocation, index) => {
      console.log(`\n配分 ${index + 1}:`);
      console.log(`  シンボル: ${allocation.symbol}`);
      console.log(`  ミント: ${allocation.mint.toString()}`);
      console.log(`  目標比率: ${allocation.targetPercentage / 100}%`);
      console.log(`  現在額: ${allocation.currentAmount.toString()}`);
      console.log(`  APY: ${allocation.apy / 100}%`);
    });

  } catch (error) {
    console.error("❌ ポートフォリオ初期化エラー:");
    console.error(error);
    
    if (error.message.includes("already in use")) {
      console.log("💡 ヒント: ポートフォリオは既に初期化されています");
    } else if (error.message.includes("insufficient funds")) {
      console.log("💡 ヒント: SOL残高が不足しています。'solana airdrop 2' を実行してください");
    } else if (error.message.includes("InvalidAllocationPercentage")) {
      console.log("💡 ヒント: 配分の合計が100%になっていません");
    }
  }
}

// スクリプト実行
if (require.main === module) {
  initializePortfolio().catch(console.error);
}

export { initializePortfolio };