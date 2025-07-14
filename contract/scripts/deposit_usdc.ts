/**
 * USDC投資スクリプト
 * Usage: yarn portfolio:deposit [amount]
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";

async function depositUsdc(amount?: number) {
  try {
    console.log("=== USDC投資実行開始 ===");

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

    // USDC設定
    const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // devnet USDC
    
    // ユーザーのUSDCトークンアカウント取得
    const userUsdcAccount = await getAssociatedTokenAddress(
      usdcMint,
      user.publicKey
    );

    console.log("USDC Mint:", usdcMint.toString());
    console.log("User USDC Account:", userUsdcAccount.toString());

    // ポートフォリオのUSDCボルト PDA取得
    const [portfolioUsdcVault, vaultBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), portfolioPda.toBuffer(), usdcMint.toBuffer()],
      program.programId
    );

    console.log("Portfolio USDC Vault:", portfolioUsdcVault.toString());
    console.log("Vault Bump:", vaultBump);

    // ユーザーのUSDC残高確認
    try {
      const userUsdcAccountInfo = await program.provider.connection.getTokenAccountBalance(userUsdcAccount);
      const userBalance = userUsdcAccountInfo.value.uiAmount || 0;
      console.log("ユーザーUSDC残高:", userBalance, "USDC");

      if (userBalance === 0) {
        console.log("❌ USDC残高が不足しています");
        console.log("devnetでUSDCを取得してください: https://spl-token-faucet.com/");
        return;
      }

      // 投資金額の設定
      let depositAmount: number;
      if (amount) {
        depositAmount = amount;
      } else {
        // デフォルトは残高の半分
        depositAmount = Math.floor(userBalance * 0.5);
      }

      if (depositAmount <= 0) {
        console.log("❌ 無効な投資金額です");
        return;
      }

      if (depositAmount > userBalance) {
        console.log("❌ 投資金額がUSDC残高を超えています");
        console.log(`残高: ${userBalance} USDC, 投資金額: ${depositAmount} USDC`);
        return;
      }

      // USDCは6小数点なので、lamportsに変換
      const depositAmountLamports = Math.floor(depositAmount * 1_000_000);

      console.log("\n=== 投資情報 ===");
      console.log("投資金額:", depositAmount, "USDC");
      console.log("投資金額 (lamports):", depositAmountLamports);
      console.log("投資前ポートフォリオ総価値:", portfolioData.totalValue.toString(), "lamports");

      console.log("\n投資トランザクション送信中...");

      // USDC投資実行
      const tx = await program.methods
        .depositUsdc(new anchor.BN(depositAmountLamports))
        .accounts({
          portfolio: portfolioPda,
          userUsdcAccount: userUsdcAccount,
          portfolioUsdcVault: portfolioUsdcVault,
          usdcMint: usdcMint,
          owner: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log("✅ USDC投資完了!");
      console.log("トランザクション:", tx);
      console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

      // 投資後の状態確認
      const afterData = await program.account.portfolio.fetch(portfolioPda);

      console.log("\n=== 投資後の状態 ===");
      console.log("新しい総価値:", afterData.totalValue.toString(), "lamports");
      console.log("価値増加:", 
        (afterData.totalValue.toNumber() - portfolioData.totalValue.toNumber()).toLocaleString(), 
        "lamports");
      console.log("最終更新:", new Date(afterData.updatedAt.toNumber() * 1000).toLocaleString());

      // パフォーマンス情報
      if (afterData.performanceHistory.length > 0) {
        const latest = afterData.performanceHistory[afterData.performanceHistory.length - 1];
        console.log("\n=== パフォーマンス更新 ===");
        console.log("記録時刻:", new Date(latest.timestamp.toNumber() * 1000).toLocaleString());
        console.log("成長率:", latest.growthRate / 100, "%");
      }

      console.log("\n=== 次のアクション候補 ===");
      console.log("📊 ポートフォリオ確認: yarn portfolio:check");
      console.log("💰 追加投資: yarn portfolio:deposit [amount]");
      console.log("🔄 リバランス: yarn portfolio:rebalance");
      console.log("📈 配分追加: yarn portfolio:add-allocation [symbol] [percentage] [mint]");

    } catch (tokenError) {
      console.log("❌ USDCトークンアカウントが見つかりません");
      console.log("Associated Token Accountを作成してください");
      console.log("または、devnetでUSDCを取得してください: https://spl-token-faucet.com/");
      console.error("詳細:", tokenError.message);
    }

  } catch (error) {
    console.error("❌ USDC投資エラー:");
    console.error(error);
    
    if (error.message.includes("InsufficientBalance")) {
      console.log("💡 ヒント: USDC残高が不足しています");
    } else if (error.message.includes("MathOverflow")) {
      console.log("💡 ヒント: 投資金額が大きすぎます");
    } else if (error.message.includes("Account does not exist")) {
      console.log("💡 ヒント: USDCトークンアカウントが存在しません");
    }
  }
}

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  const amount = args[0] ? parseFloat(args[0]) : undefined;
  
  if (amount && (isNaN(amount) || amount <= 0)) {
    console.log("❌ 無効な投資金額です");
    console.log("使用例: yarn portfolio:deposit 100  # 100 USDC投資");
    process.exit(1);
  }
  
  return { amount };
}

// スクリプト実行
if (require.main === module) {
  const { amount } = parseArgs();
  depositUsdc(amount).catch(console.error);
}

export { depositUsdc };