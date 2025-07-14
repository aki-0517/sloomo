/**
 * USDC/SOL投資スクリプト
 * Usage: yarn portfolio:deposit [amount] [token]
 * Examples:
 *   yarn portfolio:deposit 100 USDC
 *   yarn portfolio:deposit 1 SOL
 *   yarn portfolio:deposit 100  # defaults to USDC
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { 
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT
} from "@solana/spl-token";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";

async function depositToken(amount?: number, tokenType: 'USDC' | 'SOL' = 'USDC') {
  try {
    console.log(`=== ${tokenType}投資実行開始 ===`);

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

    if (tokenType === 'SOL') {
      // SOL投資の処理
      await depositSol(program, user, portfolioPda, amount);
    } else {
      // USDC投資の処理
      await depositUsdc(program, user, portfolioPda, amount);
    }

  } catch (error) {
    console.error(`❌ ${tokenType}投資エラー:`);
    console.error(error);
    
    if (error.message.includes("InsufficientBalance")) {
      console.log("💡 ヒント: 残高が不足しています");
    } else if (error.message.includes("MathOverflow")) {
      console.log("💡 ヒント: 投資金額が大きすぎます");
    } else if (error.message.includes("Account does not exist")) {
      console.log("💡 ヒント: トークンアカウントが存在しません");
    }
  }
}

async function depositUsdc(program: any, user: any, portfolioPda: PublicKey, amount?: number) {
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
    const portfolioData = await program.account.portfolio.fetch(portfolioPda);
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
    console.log("💰 追加投資: yarn portfolio:deposit [amount] [USDC|SOL]");
    console.log("🔄 リバランス: yarn portfolio:rebalance");
    console.log("📈 配分追加: yarn portfolio:add-allocation [symbol] [percentage] [mint]");

  } catch (tokenError) {
    console.log("❌ USDCトークンアカウントが見つかりません");
    console.log("Associated Token Accountを作成してください");
    console.log("または、devnetでUSDCを取得してください: https://spl-token-faucet.com/");
    console.error("詳細:", tokenError.message);
  }
}

async function depositSol(program: any, user: any, portfolioPda: PublicKey, amount?: number) {
  try {
    const portfolioData = await program.account.portfolio.fetch(portfolioPda);
    
    // wrapped SOL (wSOL) mint address
    const wsolMint = NATIVE_MINT; // So11111111111111111111111111111111111111112
    
    // ユーザーのSOL残高確認
    const userBalance = await program.provider.connection.getBalance(user.publicKey);
    const userBalanceSol = userBalance / LAMPORTS_PER_SOL;
    console.log("ユーザーSOL残高:", userBalanceSol, "SOL");

    if (userBalanceSol < 0.01) { // 最低0.01 SOL必要（手数料込み）
      console.log("❌ SOL残高が不足しています");
      console.log("devnetでSOLを取得してください: https://faucet.solana.com/");
      return;
    }

    // 投資金額の設定
    let depositAmount: number;
    if (amount) {
      depositAmount = amount;
    } else {
      // デフォルトは残高の半分（手数料を除く）
      depositAmount = Math.floor((userBalanceSol - 0.01) * 0.5 * 100) / 100; // 小数点第2位で切り捨て
    }

    if (depositAmount <= 0) {
      console.log("❌ 無効な投資金額です");
      return;
    }

    if (depositAmount + 0.01 > userBalanceSol) { // 手数料分を考慮
      console.log("❌ 投資金額がSOL残高を超えています（手数料分を含む）");
      console.log(`残高: ${userBalanceSol} SOL, 投資金額: ${depositAmount} SOL`);
      return;
    }

    // SOLをlamportsに変換
    const depositAmountLamports = Math.floor(depositAmount * LAMPORTS_PER_SOL);

    // ユーザーのwSOLトークンアカウント取得
    const userWsolAccount = await getAssociatedTokenAddress(
      wsolMint,
      user.publicKey
    );

    // ポートフォリオのwSOLボルト PDA取得
    const [portfolioWsolVault, vaultBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), portfolioPda.toBuffer(), wsolMint.toBuffer()],
      program.programId
    );

    console.log("wSOL Mint:", wsolMint.toString());
    console.log("User wSOL Account:", userWsolAccount.toString());
    console.log("Portfolio wSOL Vault:", portfolioWsolVault.toString());

    // wSOLトークンアカウントの存在確認
    const wsolAccountInfo = await program.provider.connection.getAccountInfo(userWsolAccount);
    const needsWsolAccount = !wsolAccountInfo;

    console.log("\n=== 投資情報 ===");
    console.log("投資金額:", depositAmount, "SOL");
    console.log("投資金額 (lamports):", depositAmountLamports);
    console.log("投資前ポートフォリオ総価値:", portfolioData.totalValue.toString(), "lamports");
    console.log("wSOLアカウント作成必要:", needsWsolAccount);

    console.log("\n投資トランザクション送信中...");

    if (needsWsolAccount) {
      console.log("📝 wSOLトークンアカウントを作成中...");
      
      // wSOLアカウント作成
      const createWsolAccountIx = createAssociatedTokenAccountInstruction(
        user.publicKey,
        userWsolAccount,
        user.publicKey,
        wsolMint
      );

      // SOLをwSOLアカウントに送金
      const transferIx = SystemProgram.transfer({
        fromPubkey: user.publicKey,
        toPubkey: userWsolAccount,
        lamports: depositAmountLamports,
      });

      // wSOLアカウントをSync（ラップ）
      const syncNativeIx = createSyncNativeInstruction(userWsolAccount);

      // SOL投資実行（wSOLとして既存のdeposit_usdcメソッドを使用）
      const depositIx = await program.methods
        .depositUsdc(new anchor.BN(depositAmountLamports))
        .accounts({
          portfolio: portfolioPda,
          userUsdcAccount: userWsolAccount,
          portfolioUsdcVault: portfolioWsolVault,
          usdcMint: wsolMint,
          owner: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();

      // 複数の命令を1つのトランザクションにまとめる
      const transaction = new Transaction()
        .add(createWsolAccountIx)
        .add(transferIx)
        .add(syncNativeIx)
        .add(depositIx);

      const tx = await program.provider.sendAndConfirm(transaction);

      console.log("✅ SOL投資完了（wSOLアカウント作成＋SOLラップ含む）!");
      console.log("トランザクション:", tx);
      console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    } else {
      console.log(" 既存のwSOLアカウントを使用...");
      
      // 既存のwSOLアカウントがある場合は、SOL→wSOL変換のみ
      const syncNativeIx = createSyncNativeInstruction(userWsolAccount);

      // SOL投資実行
      const depositIx = await program.methods
        .depositUsdc(new anchor.BN(depositAmountLamports))
        .accounts({
          portfolio: portfolioPda,
          userUsdcAccount: userWsolAccount,
          portfolioUsdcVault: portfolioWsolVault,
          usdcMint: wsolMint,
          owner: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();

      // 複数の命令を1つのトランザクションにまとめる
      const transaction = new Transaction()
        .add(syncNativeIx)
        .add(depositIx);

      const tx = await program.provider.sendAndConfirm(transaction);

      console.log("✅ SOL投資完了!");
      console.log("トランザクション:", tx);
      console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    }

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
    console.log("💰 追加投資: yarn portfolio:deposit [amount] [USDC|SOL]");
    console.log("🔄 リバランス: yarn portfolio:rebalance");
    console.log("📈 配分追加: yarn portfolio:add-allocation [symbol] [percentage] [mint]");

  } catch (solError) {
    console.log("❌ SOL投資エラー");
    console.log("💡 ヒント: wSOLトークンアカウントの作成が必要な場合があります");
    console.error("詳細:", solError.message);
    throw solError;
  }
}

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  const amount = args[0] ? parseFloat(args[0]) : undefined;
  const tokenType = args[1]?.toUpperCase() as 'USDC' | 'SOL' | undefined;
  
  if (amount && (isNaN(amount) || amount <= 0)) {
    console.log("❌ 無効な投資金額です");
    console.log("使用例:");
    console.log("  yarn portfolio:deposit 100 USDC  # 100 USDC投資");
    console.log("  yarn portfolio:deposit 1 SOL     # 1 SOL投資");
    console.log("  yarn portfolio:deposit 100       # 100 USDC投資（デフォルト）");
    process.exit(1);
  }

  if (tokenType && !['USDC', 'SOL'].includes(tokenType)) {
    console.log("❌ 無効なトークンタイプです");
    console.log("サポートされているトークン: USDC, SOL");
    console.log("使用例:");
    console.log("  yarn portfolio:deposit 100 USDC  # 100 USDC投資");
    console.log("  yarn portfolio:deposit 1 SOL     # 1 SOL投資");
    process.exit(1);
  }
  
  return { amount, tokenType: tokenType || 'USDC' };
}

// スクリプト実行
if (require.main === module) {
  const { amount, tokenType } = parseArgs();
  depositToken(amount, tokenType).catch(console.error);
}

export { depositToken, depositUsdc, depositSol };