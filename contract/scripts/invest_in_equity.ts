/**
 * 投資実行スクリプト
 * Usage: yarn portfolio:invest [symbol] [amount]
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";

async function investInEquity(symbol?: string, amountSOL?: number) {
  try {
    console.log("=== 投資実行開始 ===");

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
    try {
      const portfolioData = await program.account.portfolio.fetch(portfolioPda);
      console.log("✅ ポートフォリオ確認完了");
      console.log("現在の総価値:", portfolioData.totalValue.toString(), "lamports");
    } catch (error) {
      console.log("❌ ポートフォリオが見つかりません");
      console.log("まず 'yarn portfolio:init' でポートフォリオを初期化してください");
      return;
    }

    // パラメータ設定（引数またはデフォルト値）
    const targetSymbol = symbol || "SOL";
    const investmentAmountSOL = amountSOL || 1.0; // デフォルト1 SOL
    const investmentAmountLamports = Math.floor(investmentAmountSOL * anchor.web3.LAMPORTS_PER_SOL);

    console.log("\n=== 投資パラメータ ===");
    console.log("投資対象:", targetSymbol);
    console.log("投資額:", investmentAmountSOL, "SOL");
    console.log("投資額 (lamports):", investmentAmountLamports.toLocaleString());

    // 投資前の状態確認
    const beforeData = await program.account.portfolio.fetch(portfolioPda);
    const beforeAllocation = beforeData.allocations.find(a => a.symbol === targetSymbol);
    
    if (!beforeAllocation) {
      console.log(`❌ シンボル '${targetSymbol}' が見つかりません`);
      console.log("利用可能なシンボル:");
      beforeData.allocations.forEach(a => console.log(`  - ${a.symbol}`));
      return;
    }

    console.log("\n=== 投資前の状態 ===");
    console.log(`${targetSymbol} の現在額:`, beforeAllocation.currentAmount.toString(), "lamports");
    console.log(`${targetSymbol} の現在額 (SOL):`, (beforeAllocation.currentAmount.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(6));
    console.log("ポートフォリオ総価値:", beforeData.totalValue.toString(), "lamports");

    // 投資実行
    console.log("\n投資トランザクション送信中...");
    const tx = await program.methods
      .investInEquity(
        new anchor.BN(investmentAmountLamports),
        targetSymbol
      )
      .accounts({
        portfolio: portfolioPda,
        owner: user.publicKey,
      } as any)
      .rpc();

    console.log("✅ 投資実行完了!");
    console.log("トランザクション:", tx);
    console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // 投資後の状態確認
    const afterData = await program.account.portfolio.fetch(portfolioPda);
    const afterAllocation = afterData.allocations.find(a => a.symbol === targetSymbol);

    console.log("\n=== 投資後の状態 ===");
    console.log(`${targetSymbol} の現在額:`, afterAllocation!.currentAmount.toString(), "lamports");
    console.log(`${targetSymbol} の現在額 (SOL):`, (afterAllocation!.currentAmount.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(6));
    console.log("ポートフォリオ総価値:", afterData.totalValue.toString(), "lamports");

    // 変化量計算
    const amountIncrease = afterAllocation!.currentAmount.toNumber() - beforeAllocation.currentAmount.toNumber();
    const totalValueIncrease = afterData.totalValue.toNumber() - beforeData.totalValue.toNumber();

    console.log("\n=== 投資結果 ===");
    console.log(`${targetSymbol} 増加額:`, amountIncrease.toLocaleString(), "lamports");
    console.log(`${targetSymbol} 増加額 (SOL):`, (amountIncrease / anchor.web3.LAMPORTS_PER_SOL).toFixed(6));
    console.log("総価値増加額:", totalValueIncrease.toLocaleString(), "lamports");
    console.log("総価値増加額 (SOL):", (totalValueIncrease / anchor.web3.LAMPORTS_PER_SOL).toFixed(6));

    // 配分比率の変化
    if (afterData.totalValue.toNumber() > 0) {
      const beforePercentage = beforeData.totalValue.toNumber() > 0 
        ? (beforeAllocation.currentAmount.toNumber() / beforeData.totalValue.toNumber()) * 100 
        : 0;
      const afterPercentage = (afterAllocation!.currentAmount.toNumber() / afterData.totalValue.toNumber()) * 100;
      const targetPercentage = afterAllocation!.targetPercentage / 100;

      console.log("\n=== 配分比率の変化 ===");
      console.log(`${targetSymbol} 投資前比率:`, beforePercentage.toFixed(2) + "%");
      console.log(`${targetSymbol} 投資後比率:`, afterPercentage.toFixed(2) + "%");
      console.log(`${targetSymbol} 目標比率:`, targetPercentage.toFixed(2) + "%");
      
      const diffFromTarget = Math.abs(afterPercentage - targetPercentage);
      if (diffFromTarget > 5) {
        console.log(`⚠️  目標比率との差異: ${diffFromTarget.toFixed(2)}%`);
        console.log("リバランスを検討してください: yarn portfolio:rebalance");
      } else {
        console.log("✅ 目標比率の範囲内です");
      }
    }

    console.log("\n=== 次のアクション候補 ===");
    console.log("📊 ポートフォリオ確認: yarn portfolio:check");
    console.log("🔄 リバランス実行: yarn portfolio:rebalance");
    console.log("💰 追加投資: yarn portfolio:invest [symbol] [amount]");

  } catch (error) {
    console.error("❌ 投資実行エラー:");
    console.error(error);
    
    if (error.message.includes("InvalidTokenMint")) {
      console.log("💡 ヒント: 指定されたシンボルは存在しません");
    } else if (error.message.includes("InvalidAmount")) {
      console.log("💡 ヒント: 投資額が無効です（ゼロまたは負の値）");
    } else if (error.message.includes("MathOverflow")) {
      console.log("💡 ヒント: 投資額が大きすぎます");
    }
  }
}

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  const symbol = args[0];
  const amount = args[1] ? parseFloat(args[1]) : undefined;
  
  if (amount && (isNaN(amount) || amount <= 0)) {
    console.log("❌ 無効な投資額です");
    console.log("使用例: yarn portfolio:invest SOL 1.5");
    process.exit(1);
  }
  
  return { symbol, amount };
}

// スクリプト実行
if (require.main === module) {
  const { symbol, amount } = parseArgs();
  investInEquity(symbol, amount).catch(console.error);
}

export { investInEquity };