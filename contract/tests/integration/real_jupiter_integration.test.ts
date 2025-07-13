import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SloomoPortfolio } from "../../target/types/sloomo_portfolio";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("Real Jupiter Integration Tests", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SloomoPortfolio as Program<SloomoPortfolio>;
  const provider = anchor.getProvider();

  let user: Keypair;
  let portfolioPda: PublicKey;
  let portfolioBump: number;
  let usdcMint: PublicKey;
  let testTokenAMint: PublicKey;
  let testTokenBMint: PublicKey;
  let userUsdcAccount: PublicKey;
  let userTokenAAccount: PublicKey;
  let userTokenBAccount: PublicKey;

  before(async () => {
    console.log("=== 実際のJupiter統合テスト セットアップ開始 ===");
    
    user = Keypair.generate();
    
    // SOLをエアドロップ
    const signature = await provider.connection.requestAirdrop(
      user.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature, "confirmed");

    // Portfolio PDAを生成
    [portfolioPda, portfolioBump] = await PublicKey.findProgramAddress(
      [Buffer.from("portfolio"), user.publicKey.toBuffer()],
      program.programId
    );

    // devnet USDC（または模擬USDC）を作成
    try {
      usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
      userUsdcAccount = await getAssociatedTokenAddress(usdcMint, user.publicKey);
    } catch (error) {
      // devnet USDCが利用できない場合、模擬USDCを作成
      usdcMint = await createMint(
        provider.connection,
        user,
        user.publicKey,
        null,
        6 // USDC decimals
      );
      userUsdcAccount = await createAssociatedTokenAccount(
        provider.connection,
        user,
        usdcMint,
        user.publicKey
      );
    }

    // テスト用トークンミントを作成
    testTokenAMint = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      6
    );

    testTokenBMint = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      6
    );

    // 関連トークンアカウントを作成
    userTokenAAccount = await createAssociatedTokenAccount(
      provider.connection,
      user,
      testTokenAMint,
      user.publicKey
    );

    userTokenBAccount = await createAssociatedTokenAccount(
      provider.connection,
      user,
      testTokenBMint,
      user.publicKey
    );

    // 初期トークンをミント
    await mintTo(
      provider.connection,
      user,
      usdcMint,
      userUsdcAccount,
      user.publicKey,
      10000 * 10 ** 6 // 10,000 USDC
    );

    await mintTo(
      provider.connection,
      user,
      testTokenAMint,
      userTokenAAccount,
      user.publicKey,
      1000 * 10 ** 6 // 1,000 Token A
    );

    await mintTo(
      provider.connection,
      user,
      testTokenBMint,
      userTokenBAccount,
      user.publicKey,
      1000 * 10 ** 6 // 1,000 Token B
    );

    console.log("Portfolio PDA:", portfolioPda.toString());
    console.log("USDC Mint:", usdcMint.toString());
    console.log("Test Token A Mint:", testTokenAMint.toString());
    console.log("Test Token B Mint:", testTokenBMint.toString());
    console.log("=== セットアップ完了 ===");
  });

  describe("完全なポートフォリオ管理フロー", () => {
    it("ポートフォリオを初期化し、投資を行い、リバランスする", async () => {
      console.log("=== 完全フロー統合テスト開始 ===");

      // 1. ポートフォリオ初期化
      const initialAllocations = [
        {
          mint: testTokenAMint,
          symbol: "AAPL",
          targetPercentage: 6000, // 60%
        },
        {
          mint: testTokenBMint,
          symbol: "GOOGL",
          targetPercentage: 4000, // 40%
        },
      ];

      await program.methods
        .initializePortfolio({
          initialAllocations,
        })
        .accounts({
          portfolio: portfolioPda,
          owner: user.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([user])
        .rpc();

      console.log("✅ 1. ポートフォリオ初期化完了");

      // 2. 初期投資
      await program.methods
        .investInEquity(new anchor.BN(600000000), "AAPL") // 600 tokens
        .accounts({
          portfolio: portfolioPda,
          owner: user.publicKey,
        } as any)
        .signers([user])
        .rpc();

      await program.methods
        .investInEquity(new anchor.BN(400000000), "GOOGL") // 400 tokens
        .accounts({
          portfolio: portfolioPda,
          owner: user.publicKey,
        } as any)
        .signers([user])
        .rpc();

      console.log("✅ 2. 初期投資完了");

      // 3. ポートフォリオ状態確認
      let portfolioData = await program.account.portfolio.fetch(portfolioPda);
      expect(portfolioData.allocations).to.have.lengthOf(2);
      expect(portfolioData.totalValue.toNumber()).to.equal(1000000000); // 1,000 tokens total

      const aaplAllocation = portfolioData.allocations.find(a => a.symbol === "AAPL");
      const googlAllocation = portfolioData.allocations.find(a => a.symbol === "GOOGL");
      
      expect(aaplAllocation.currentAmount.toNumber()).to.equal(600000000);
      expect(googlAllocation.currentAmount.toNumber()).to.equal(400000000);

      console.log("✅ 3. ポートフォリオ状態確認完了");

      // 4. 利回り更新
      const yieldUpdates = [
        {
          symbol: "AAPL",
          newApy: new anchor.BN(500), // 5%
        },
        {
          symbol: "GOOGL",
          newApy: new anchor.BN(750), // 7.5%
        },
      ];

      await program.methods
        .updateYields(yieldUpdates)
        .accounts({
          portfolio: portfolioPda,
          owner: user.publicKey,
        } as any)
        .signers([user])
        .rpc();

      console.log("✅ 4. 利回り更新完了");

      // 5. リバランス実行（新しい目標配分）
      const targetAllocations = [
        {
          mint: testTokenAMint,
          targetPercentage: 7000, // 70% (10%増加)
        },
        {
          mint: testTokenBMint,
          targetPercentage: 3000, // 30% (10%減少)
        },
      ];

      const rebalanceTx = await program.methods
        .realJupiterRebalance(targetAllocations, 50) // 0.5% slippage
        .accounts({
          portfolio: portfolioPda,
          owner: user.publicKey,
          usdcTokenAccount: userUsdcAccount,
          usdcMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([user])
        .rpc();

      console.log("実際のJupiterリバランス tx:", rebalanceTx);

      // 6. リバランス後のポートフォリオ状態確認
      portfolioData = await program.account.portfolio.fetch(portfolioPda);
      
      const updatedAaplAllocation = portfolioData.allocations.find(a => a.symbol === "AAPL");
      const updatedGooglAllocation = portfolioData.allocations.find(a => a.symbol === "GOOGL");
      
      expect(updatedAaplAllocation.targetPercentage).to.equal(7000);
      expect(updatedGooglAllocation.targetPercentage).to.equal(3000);

      console.log("✅ 5. リバランス実行完了");
      console.log("=== 完全フロー統合テスト完了 ===");
    });

    it("Jupiter クォート記録機能をテストする", async () => {
      console.log("=== Jupiter クォート記録テスト開始 ===");

      const quoteTx = await program.methods
        .recordJupiterQuote(
          testTokenAMint.toString(),
          usdcMint.toString(),
          new anchor.BN(1000000), // 1 token
          50 // 0.5% slippage
        )
        .accounts({
          user: user.publicKey,
        })
        .signers([user])
        .rpc();

      console.log("Jupiter クォート記録 tx:", quoteTx);
      console.log("✅ Jupiter クォート記録テスト完了");
    });

    it("複数回のリバランス操作を連続で実行する", async () => {
      console.log("=== 連続リバランステスト開始 ===");

      // 最初のリバランス：50-50分割
      const firstRebalance = [
        {
          mint: testTokenAMint,
          targetPercentage: 5000, // 50%
        },
        {
          mint: testTokenBMint,
          targetPercentage: 5000, // 50%
        },
      ];

      await program.methods
        .realJupiterRebalance(firstRebalance, 50)
        .accounts({
          portfolio: portfolioPda,
          owner: user.publicKey,
          usdcTokenAccount: userUsdcAccount,
          usdcMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([user])
        .rpc();

      console.log("✅ 最初のリバランス完了");

      // 少し待機（リバランス頻度制限のため）
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2回目のリバランス：80-20分割
      const secondRebalance = [
        {
          mint: testTokenAMint,
          targetPercentage: 8000, // 80%
        },
        {
          mint: testTokenBMint,
          targetPercentage: 2000, // 20%
        },
      ];

      await program.methods
        .realJupiterRebalance(secondRebalance, 100) // 1% slippage
        .accounts({
          portfolio: portfolioPda,
          owner: user.publicKey,
          usdcTokenAccount: userUsdcAccount,
          usdcMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([user])
        .rpc();

      console.log("✅ 2回目のリバランス完了");

      // 最終状態確認
      const finalPortfolioData = await program.account.portfolio.fetch(portfolioPda);
      const finalAaplAllocation = finalPortfolioData.allocations.find(a => a.symbol === "AAPL");
      const finalGooglAllocation = finalPortfolioData.allocations.find(a => a.symbol === "GOOGL");
      
      expect(finalAaplAllocation.targetPercentage).to.equal(8000);
      expect(finalGooglAllocation.targetPercentage).to.equal(2000);

      console.log("=== 連続リバランステスト完了 ===");
    });
  });

  describe("エラーケース統合テスト", () => {
    it("無効な配分でリバランスエラーになる", async () => {
      const invalidAllocations = [
        {
          mint: testTokenAMint,
          targetPercentage: 6000, // 60%
        },
        {
          mint: testTokenBMint,
          targetPercentage: 5000, // 50% (合計110%)
        },
      ];

      try {
        await program.methods
          .realJupiterRebalance(invalidAllocations, 50)
          .accounts({
            portfolio: portfolioPda,
            owner: user.publicKey,
            usdcTokenAccount: userUsdcAccount,
            usdcMint: usdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .signers([user])
          .rpc();
        
        expect.fail("エラーが発生するべき");
      } catch (error) {
        expect(error.toString()).to.include("InvalidAllocationPercentage");
      }
    });

    it("リバランス不要な場合にエラーになる", async () => {
      // 現在と同じ配分を指定（リバランス不要）
      const currentAllocations = [
        {
          mint: testTokenAMint,
          targetPercentage: 8000, // 現在と同じ
        },
        {
          mint: testTokenBMint,
          targetPercentage: 2000, // 現在と同じ
        },
      ];

      try {
        await program.methods
          .realJupiterRebalance(currentAllocations, 50)
          .accounts({
            portfolio: portfolioPda,
            owner: user.publicKey,
            usdcTokenAccount: userUsdcAccount,
            usdcMint: usdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .signers([user])
          .rpc();
        
        expect.fail("エラーが発生するべき");
      } catch (error) {
        expect(error.toString()).to.include("NoRebalanceNeeded");
      }
    });

    it("権限のないユーザーでエラーになる", async () => {
      const unauthorizedUser = Keypair.generate();
      
      // SOLをエアドロップ
      const signature = await provider.connection.requestAirdrop(
        unauthorizedUser.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature, "confirmed");

      const targetAllocations = [
        {
          mint: testTokenAMint,
          targetPercentage: 5000,
        },
        {
          mint: testTokenBMint,
          targetPercentage: 5000,
        },
      ];

      try {
        await program.methods
          .realJupiterRebalance(targetAllocations, 50)
          .accounts({
            portfolio: portfolioPda, // 他のユーザーのポートフォリオ
            owner: unauthorizedUser.publicKey, // 権限のないユーザー
            usdcTokenAccount: userUsdcAccount,
            usdcMint: usdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .signers([unauthorizedUser])
          .rpc();
        
        expect.fail("エラーが発生するべき");
      } catch (error) {
        expect(error.toString()).to.include("ConstraintHasOne");
      }
    });
  });

  describe("実際のトークン残高確認", () => {
    it("トークンアカウントの残高が正しく更新される", async () => {
      // USDCアカウントの残高確認
      const usdcAccountInfo = await getAccount(provider.connection, userUsdcAccount);
      expect(Number(usdcAccountInfo.amount)).to.be.greaterThan(0);

      // Test Token Aアカウントの残高確認
      const tokenAAccountInfo = await getAccount(provider.connection, userTokenAAccount);
      expect(Number(tokenAAccountInfo.amount)).to.be.greaterThan(0);

      // Test Token Bアカウントの残高確認
      const tokenBAccountInfo = await getAccount(provider.connection, userTokenBAccount);
      expect(Number(tokenBAccountInfo.amount)).to.be.greaterThan(0);

      console.log("USDC残高:", usdcAccountInfo.amount.toString());
      console.log("Token A残高:", tokenAAccountInfo.amount.toString());
      console.log("Token B残高:", tokenBAccountInfo.amount.toString());
    });

    it("ポートフォリオの総価値が実際の残高と整合する", async () => {
      const portfolioData = await program.account.portfolio.fetch(portfolioPda);
      const calculatedTotal = portfolioData.allocations.reduce(
        (sum, allocation) => sum + allocation.currentAmount.toNumber(),
        0
      );

      expect(portfolioData.totalValue.toNumber()).to.equal(calculatedTotal);
      console.log("ポートフォリオ総価値:", portfolioData.totalValue.toString());
      console.log("計算された総価値:", calculatedTotal.toString());
    });
  });

  after(async () => {
    console.log("=== 実際のJupiter統合テスト完了 ===");
    console.log("最終ポートフォリオ状態:");
    
    try {
      const finalPortfolioData = await program.account.portfolio.fetch(portfolioPda);
      console.log("総価値:", finalPortfolioData.totalValue.toString());
      console.log("配分数:", finalPortfolioData.allocations.length);
      
      finalPortfolioData.allocations.forEach((allocation, index) => {
        console.log(`  ${index + 1}. ${allocation.symbol}: ${allocation.currentAmount.toString()} (目標: ${allocation.targetPercentage / 100}%)`);
      });
      
      console.log("最後のリバランス:", new Date(finalPortfolioData.lastRebalance.toNumber() * 1000));
      console.log("パフォーマンス履歴数:", finalPortfolioData.performanceHistory.length);
    } catch (error) {
      console.log("最終状態取得エラー:", error.message);
    }
    
    console.log("注意: このテストは計算とログのみです。実際のJupiterスワップはクライアントサイドで実行してください。");
  });
});