/**
 * USDC残高・ボルト確認スクリプト
 * Usage: yarn portfolio:check-usdc
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";

async function checkUsdc() {
  try {
    console.log("=== USDC残高・ボルト状態確認開始 ===");

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

    // USDC設定
    const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // devnet USDC
    console.log("USDC Mint:", usdcMint.toString());

    // ユーザーのUSDCトークンアカウント取得
    const userUsdcAccount = await getAssociatedTokenAddress(
      usdcMint,
      user.publicKey
    );

    console.log("User USDC Account:", userUsdcAccount.toString());

    // ポートフォリオのUSDCボルト PDA取得
    const [portfolioUsdcVault] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), portfolioPda.toBuffer(), usdcMint.toBuffer()],
      program.programId
    );

    console.log("Portfolio USDC Vault:", portfolioUsdcVault.toString());

    console.log("\n=== ユーザーUSDC残高 ===");
    try {
      const userUsdcAccountInfo = await program.provider.connection.getTokenAccountBalance(userUsdcAccount);
      console.log("残高:", userUsdcAccountInfo.value.uiAmount || 0, "USDC");
      console.log("残高 (lamports):", userUsdcAccountInfo.value.amount);
      console.log("小数点桁数:", userUsdcAccountInfo.value.decimals);
      
      if ((userUsdcAccountInfo.value.uiAmount || 0) === 0) {
        console.log("⚠️  USDC残高がありません");
        console.log("devnetでUSDCを取得してください: https://spl-token-faucet.com/");
      }
    } catch (error) {
      console.log("❌ ユーザーのUSDCトークンアカウントが見つかりません");
      console.log("Associated Token Accountを作成してください");
      console.log("または、devnetでUSDCを取得してください: https://spl-token-faucet.com/");
    }

    console.log("\n=== ポートフォリオUSDCボルト ===");
    try {
      const vaultAccountInfo = await program.provider.connection.getTokenAccountBalance(portfolioUsdcVault);
      console.log("ボルト残高:", vaultAccountInfo.value.uiAmount || 0, "USDC");
      console.log("ボルト残高 (lamports):", vaultAccountInfo.value.amount);
      console.log("ボルト所有者:", (await program.provider.connection.getAccountInfo(portfolioUsdcVault))?.owner.toString());
    } catch (error) {
      console.log("❌ ポートフォリオUSDCボルトが見つかりません");
      console.log("まず投資を実行してボルトを作成してください: yarn portfolio:deposit [amount]");
    }

    // ポートフォリオ状態確認
    console.log("\n=== ポートフォリオ状態 ===");
    try {
      const portfolioData = await program.account.portfolio.fetch(portfolioPda);
      console.log("ポートフォリオ所有者:", portfolioData.owner.toString());
      console.log("総価値:", portfolioData.totalValue.toString(), "lamports");
      console.log("総価値 (USDC):", (portfolioData.totalValue.toNumber() / 1_000_000).toFixed(6), "USDC");
      console.log("配分数:", portfolioData.allocations.length);
      console.log("最終更新:", new Date(portfolioData.updatedAt.toNumber() * 1000).toLocaleString());

      // USDC関連の配分情報
      console.log("\n=== USDC関連配分 ===");
      const usdcAllocations = portfolioData.allocations.filter((allocation: any) => 
        allocation.symbol.toUpperCase().includes("USDC") || 
        allocation.mint.toString() === usdcMint.toString()
      );

      if (usdcAllocations.length > 0) {
        usdcAllocations.forEach((allocation: any, index: number) => {
          console.log(`${index + 1}. ${allocation.symbol}`);
          console.log(`   ミント: ${allocation.mint.toString()}`);
          console.log(`   現在額: ${allocation.currentAmount.toString()} lamports`);
          console.log(`   現在額 (USDC): ${(allocation.currentAmount.toNumber() / 1_000_000).toFixed(6)} USDC`);
          console.log(`   目標比率: ${allocation.targetPercentage / 100}%`);
          console.log(`   APY: ${allocation.apy / 100}%`);
          
          // 実際の配分比率計算
          if (portfolioData.totalValue.toNumber() > 0) {
            const actualPercentage = (allocation.currentAmount.toNumber() / portfolioData.totalValue.toNumber()) * 100;
            console.log(`   実際の比率: ${actualPercentage.toFixed(2)}%`);
          }
        });
      } else {
        console.log("USDC関連の配分が見つかりません");
      }

    } catch (error) {
      console.log("❌ ポートフォリオが見つかりません");
      console.log("まず 'yarn portfolio:init' でポートフォリオを初期化してください");
    }

    // アカウント情報の詳細表示
    console.log("\n=== アカウント詳細情報 ===");
    
    // ユーザーのSOL残高
    try {
      const solBalance = await program.provider.connection.getBalance(user.publicKey);
      console.log("ユーザーSOL残高:", (solBalance / anchor.web3.LAMPORTS_PER_SOL).toFixed(6), "SOL");
    } catch (error) {
      console.log("SOL残高取得エラー:", error.message);
    }

    // アカウント存在確認
    console.log("\n=== アカウント存在確認 ===");
    
    const userUsdcExists = await program.provider.connection.getAccountInfo(userUsdcAccount);
    console.log("ユーザーUSDCアカウント:", userUsdcExists ? "存在" : "未作成");
    
    const vaultExists = await program.provider.connection.getAccountInfo(portfolioUsdcVault);
    console.log("ポートフォリオUSDCボルト:", vaultExists ? "存在" : "未作成");
    
    const portfolioExists = await program.provider.connection.getAccountInfo(portfolioPda);
    console.log("ポートフォリオアカウント:", portfolioExists ? "存在" : "未作成");

    // 推奨アクション
    console.log("\n=== 推奨アクション ===");
    
    if (!portfolioExists) {
      console.log("1. ポートフォリオを初期化: yarn portfolio:init");
    }
    
    if (!userUsdcExists) {
      console.log("1. devnetでUSDCを取得: https://spl-token-faucet.com/");
      console.log("2. または、USDCミントを使用してトークンアカウントを作成");
    }
    
    if (portfolioExists && userUsdcExists && !vaultExists) {
      console.log("1. 初回投資を実行: yarn portfolio:deposit [amount]");
    }
    
    if (portfolioExists && userUsdcExists && vaultExists) {
      console.log("✅ すべてのアカウントが正常に設定されています");
      console.log("利用可能なアクション:");
      console.log("  - 投資実行: yarn portfolio:deposit [amount]");
      console.log("  - ポートフォリオ確認: yarn portfolio:check");
      console.log("  - リバランス: yarn portfolio:rebalance");
    }

    console.log("\n=== Explorer リンク ===");
    console.log("ユーザーアカウント:", `https://explorer.solana.com/account/${user.publicKey.toString()}?cluster=devnet`);
    console.log("ユーザーUSDCアカウント:", `https://explorer.solana.com/account/${userUsdcAccount.toString()}?cluster=devnet`);
    console.log("ポートフォリオアカウント:", `https://explorer.solana.com/account/${portfolioPda.toString()}?cluster=devnet`);
    console.log("ポートフォリオUSDCボルト:", `https://explorer.solana.com/account/${portfolioUsdcVault.toString()}?cluster=devnet`);

  } catch (error) {
    console.error("❌ USDC状態確認エラー:");
    console.error(error);
    
    if (error.message.includes("Invalid public key")) {
      console.log("💡 ヒント: 無効なアドレスが指定されています");
    } else if (error.message.includes("Network request failed")) {
      console.log("💡 ヒント: ネットワーク接続を確認してください");
    }
  }
}

// スクリプト実行
if (require.main === module) {
  checkUsdc().catch(console.error);
}

export { checkUsdc };