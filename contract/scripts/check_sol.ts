/**
 * SOL残高・wSOLボルト確認スクリプト
 * Usage: yarn portfolio:check-sol
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, NATIVE_MINT } from "@solana/spl-token";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";

async function checkSol() {
  try {
    console.log("=== SOL残高・wSOLボルト状態確認開始 ===");

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

    // wSOL設定（Native SOL Mint）
    const wsolMint = NATIVE_MINT; // So11111111111111111111111111111111111111112
    console.log("wSOL Mint:", wsolMint.toString());

    // ユーザーのwSOLトークンアカウント取得
    const userWsolAccount = await getAssociatedTokenAddress(
      wsolMint,
      user.publicKey
    );

    console.log("User wSOL Account:", userWsolAccount.toString());

    // ポートフォリオのwSOLボルト PDA取得
    const [portfolioWsolVault] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), portfolioPda.toBuffer(), wsolMint.toBuffer()],
      program.programId
    );

    console.log("Portfolio wSOL Vault:", portfolioWsolVault.toString());

    // ユーザーのネイティブSOL残高
    console.log("\n=== ユーザーSOL残高 ===");
    try {
      const solBalance = await program.provider.connection.getBalance(user.publicKey);
      const solBalanceFormatted = solBalance / LAMPORTS_PER_SOL;
      console.log("SOL残高:", solBalanceFormatted.toFixed(6), "SOL");
      console.log("SOL残高 (lamports):", solBalance.toLocaleString());
      
      if (solBalanceFormatted < 0.01) {
        console.log("⚠️  SOL残高が低いです（手数料用に最低0.01 SOL推奨）");
        console.log("devnetでSOLを取得してください: https://faucet.solana.com/");
      } else if (solBalanceFormatted >= 1) {
        console.log("✅ SOL投資に十分な残高があります");
      }
    } catch (error) {
      console.log("❌ SOL残高取得エラー:", error.message);
    }

    // ユーザーのwSOL残高
    console.log("\n=== ユーザーwSOL残高 ===");
    try {
      const userWsolAccountInfo = await program.provider.connection.getTokenAccountBalance(userWsolAccount);
      const wsolBalance = userWsolAccountInfo.value.uiAmount || 0;
      console.log("wSOL残高:", wsolBalance, "wSOL");
      console.log("wSOL残高 (lamports):", userWsolAccountInfo.value.amount);
      console.log("小数点桁数:", userWsolAccountInfo.value.decimals);
      
      if (wsolBalance === 0) {
        console.log("ℹ️  wSOL残高がありません（SOL投資時に自動でwSOLに変換されます）");
      }
    } catch (error) {
      console.log("ℹ️  ユーザーのwSOLトークンアカウントが見つかりません");
      console.log("SOL投資時に自動でwSOLアカウントが作成されます");
    }

    console.log("\n=== ポートフォリオwSOLボルト ===");
    try {
      const vaultAccountInfo = await program.provider.connection.getTokenAccountBalance(portfolioWsolVault);
      const vaultBalance = vaultAccountInfo.value.uiAmount || 0;
      console.log("ボルト残高:", vaultBalance, "wSOL");
      console.log("ボルト残高 (lamports):", vaultAccountInfo.value.amount);
      console.log("ボルト所有者:", (await program.provider.connection.getAccountInfo(portfolioWsolVault))?.owner.toString());
    } catch (error) {
      console.log("ℹ️  ポートフォリオwSOLボルトが見つかりません");
      console.log("初回SOL投資時にボルトが作成されます: yarn portfolio:deposit [amount] SOL");
    }

    // ポートフォリオ状態確認
    console.log("\n=== ポートフォリオ状態 ===");
    try {
      const portfolioData = await program.account.portfolio.fetch(portfolioPda);
      console.log("ポートフォリオ所有者:", portfolioData.owner.toString());
      console.log("総価値:", portfolioData.totalValue.toString(), "lamports");
      console.log("総価値 (SOL):", (portfolioData.totalValue.toNumber() / LAMPORTS_PER_SOL).toFixed(6), "SOL");
      console.log("配分数:", portfolioData.allocations.length);
      console.log("最終更新:", new Date(portfolioData.updatedAt.toNumber() * 1000).toLocaleString());

      // SOL関連の配分情報
      console.log("\n=== SOL関連配分 ===");
      const solAllocations = portfolioData.allocations.filter((allocation: any) => 
        allocation.symbol.toUpperCase().includes("SOL") || 
        allocation.mint.toString() === wsolMint.toString()
      );

      if (solAllocations.length > 0) {
        solAllocations.forEach((allocation: any, index: number) => {
          console.log(`${index + 1}. ${allocation.symbol}`);
          console.log(`   ミント: ${allocation.mint.toString()}`);
          console.log(`   現在額: ${allocation.currentAmount.toString()} lamports`);
          console.log(`   現在額 (SOL): ${(allocation.currentAmount.toNumber() / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
          console.log(`   目標比率: ${allocation.targetPercentage / 100}%`);
          console.log(`   APY: ${allocation.apy / 100}%`);
          
          // 実際の配分比率計算
          if (portfolioData.totalValue.toNumber() > 0) {
            const actualPercentage = (allocation.currentAmount.toNumber() / portfolioData.totalValue.toNumber()) * 100;
            console.log(`   実際の比率: ${actualPercentage.toFixed(2)}%`);
          }
        });
      } else {
        console.log("SOL関連の配分が見つかりません");
      }

    } catch (error) {
      console.log("❌ ポートフォリオが見つかりません");
      console.log("まず 'yarn portfolio:init' でポートフォリオを初期化してください");
    }

    // アカウント存在確認
    console.log("\n=== アカウント存在確認 ===");
    
    const userWsolExists = await program.provider.connection.getAccountInfo(userWsolAccount);
    console.log("ユーザーwSOLアカウント:", userWsolExists ? "存在" : "未作成");
    
    const vaultExists = await program.provider.connection.getAccountInfo(portfolioWsolVault);
    console.log("ポートフォリオwSOLボルト:", vaultExists ? "存在" : "未作成");
    
    const portfolioExists = await program.provider.connection.getAccountInfo(portfolioPda);
    console.log("ポートフォリオアカウント:", portfolioExists ? "存在" : "未作成");

    // 推奨アクション
    console.log("\n=== 推奨アクション ===");
    
    if (!portfolioExists) {
      console.log("1. ポートフォリオを初期化: yarn portfolio:init");
    }
    
    const solBalance = await program.provider.connection.getBalance(user.publicKey);
    const solBalanceFormatted = solBalance / LAMPORTS_PER_SOL;
    
    if (solBalanceFormatted < 0.01) {
      console.log("1. devnetでSOLを取得: https://faucet.solana.com/");
      console.log("2. または、solana airdrop 5 を実行");
    }
    
    if (portfolioExists && solBalanceFormatted >= 0.01 && !vaultExists) {
      console.log("1. 初回SOL投資を実行: yarn portfolio:deposit [amount] SOL");
      console.log("   例: yarn portfolio:deposit 1 SOL");
    }
    
    if (portfolioExists && solBalanceFormatted >= 0.01 && vaultExists) {
      console.log("✅ SOL投資環境が正常に設定されています");
      console.log("利用可能なアクション:");
      console.log("  - SOL投資実行: yarn portfolio:deposit [amount] SOL");
      console.log("  - ポートフォリオ確認: yarn portfolio:check");
      console.log("  - リバランス: yarn portfolio:rebalance");
    }

    // wSOL操作のヒント
    console.log("\n=== wSOL操作のヒント ===");
    console.log("💡 SOL投資は以下の流れで処理されます:");
    console.log("  1. wSOLトークンアカウント作成（初回のみ）");
    console.log("  2. SOL → wSOL変換");
    console.log("  3. wSOLをポートフォリオボルトに送金");
    console.log("");
    console.log("💡 手動でwSOL操作する場合:");
    console.log("  - wSOLアカウント作成: spl-token create-account So11111111111111111111111111111111111111112");
    console.log("  - SOL→wSOL変換: spl-token wrap [amount]");
    console.log("  - wSOL→SOL変換: spl-token unwrap [account]");

    console.log("\n=== Explorer リンク ===");
    console.log("ユーザーアカウント:", `https://explorer.solana.com/account/${user.publicKey.toString()}?cluster=devnet`);
    console.log("ユーザーwSOLアカウント:", `https://explorer.solana.com/account/${userWsolAccount.toString()}?cluster=devnet`);
    console.log("ポートフォリオアカウント:", `https://explorer.solana.com/account/${portfolioPda.toString()}?cluster=devnet`);
    console.log("ポートフォリオwSOLボルト:", `https://explorer.solana.com/account/${portfolioWsolVault.toString()}?cluster=devnet`);

  } catch (error) {
    console.error("❌ SOL状態確認エラー:");
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
  checkSol().catch(console.error);
}

export { checkSol };