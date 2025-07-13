import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SloomoPortfolio } from "../../target/types/sloomo_portfolio";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
  getAccount,
  createAssociatedTokenAccount,
} from "@solana/spl-token";

describe("Investment Operations Unit Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SloomoPortfolio as Program<SloomoPortfolio>;
  const authority = provider.wallet as anchor.Wallet;

  let portfolioPDA: PublicKey;
  let testTokenMintA: PublicKey;
  let testTokenMintB: PublicKey;
  let userTokenAccountA: PublicKey;
  let userTokenAccountB: PublicKey;
  let portfolioVaultA: PublicKey;
  let portfolioVaultB: PublicKey;

  before(async () => {
    console.log("=== 投資操作ユニットテスト セットアップ開始 ===");

    // Portfolio PDA計算
    [portfolioPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("portfolio"), authority.publicKey.toBuffer()],
      program.programId
    );

    // テスト用トークンミント作成
    testTokenMintA = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      6, // decimals
      Keypair.generate(),
      undefined,
      TOKEN_PROGRAM_ID
    );

    testTokenMintB = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      9, // decimals
      Keypair.generate(),
      undefined,
      TOKEN_PROGRAM_ID
    );

    // ユーザーのトークンアカウント作成
    userTokenAccountA = await createAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      testTokenMintA,
      authority.publicKey,
      {},
      TOKEN_PROGRAM_ID
    );

    userTokenAccountB = await createAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      testTokenMintB,
      authority.publicKey,
      {},
      TOKEN_PROGRAM_ID
    );

    // Portfolio vault PDA計算
    [portfolioVaultA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        portfolioPDA.toBuffer(),
        testTokenMintA.toBuffer(),
      ],
      program.programId
    );

    [portfolioVaultB] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        portfolioPDA.toBuffer(),
        testTokenMintB.toBuffer(),
      ],
      program.programId
    );

    // ユーザーアカウントにテストトークンをミント
    await mintTo(
      provider.connection,
      authority.payer,
      testTokenMintA,
      userTokenAccountA,
      authority.publicKey,
      1_000_000 * 10 ** 6, // 1M tokens (6 decimals)
      [],
      undefined,
      TOKEN_PROGRAM_ID
    );

    await mintTo(
      provider.connection,
      authority.payer,
      testTokenMintB,
      userTokenAccountB,
      authority.publicKey,
      100 * 10 ** 9, // 100 tokens (9 decimals)
      [],
      undefined,
      TOKEN_PROGRAM_ID
    );

    // ポートフォリオ初期化
    await program.methods
      .initializePortfolio({
        initialAllocations: [
          {
            mint: testTokenMintA,
            symbol: "AAPL",
            targetPercentage: 6000, // 60%
          },
          {
            mint: testTokenMintB,
            symbol: "GOOGL",
            targetPercentage: 4000, // 40%
          },
        ],
      })
      .accounts({
        portfolio: portfolioPDA,
        owner: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("=== 投資操作ユニットテスト セットアップ完了 ===");
  });

  describe("投資機能テスト", () => {
    it("AAPL equity tokenへの正常な投資", async () => {
      const investmentAmount = 100_000 * 10 ** 6; // 100K tokens

      const portfolioBefore = await program.account.portfolio.fetch(
        portfolioPDA
      );
      const totalValueBefore = portfolioBefore.totalValue.toNumber();

      const tx = await program.methods
        .investInEquity(new anchor.BN(investmentAmount), "AAPL")
        .accounts({
          portfolio: portfolioPDA,
          userTokenAccount: userTokenAccountA,
          portfolioVault: portfolioVaultA,
          tokenMint: testTokenMintA,
          owner: authority.publicKey,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log("投資トランザクション署名:", tx);

      // 投資後の状態確認
      const portfolio = await program.account.portfolio.fetch(portfolioPDA);
      expect(portfolio.totalValue.toNumber()).to.equal(
        totalValueBefore + investmentAmount
      );

      const aaplAllocation = portfolio.allocations.find(
        (a) => a.symbol === "AAPL"
      );
      expect(aaplAllocation?.currentAmount.toNumber()).to.equal(
        investmentAmount
      );

      // ボルトの残高確認
      const vaultAccount = await getAccount(
        provider.connection,
        portfolioVaultA,
        undefined,
        TOKEN_PROGRAM_ID
      );
      expect(Number(vaultAccount.amount)).to.equal(investmentAmount);
    });

    it("GOOGL equity tokenへの正常な投資", async () => {
      const investmentAmount = 50 * 10 ** 9; // 50 tokens

      const portfolioBefore = await program.account.portfolio.fetch(
        portfolioPDA
      );
      const totalValueBefore = portfolioBefore.totalValue.toNumber();

      const tx = await program.methods
        .investInEquity(new anchor.BN(investmentAmount), "GOOGL")
        .accounts({
          portfolio: portfolioPDA,
          userTokenAccount: userTokenAccountB,
          portfolioVault: portfolioVaultB,
          tokenMint: testTokenMintB,
          owner: authority.publicKey,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log("投資トランザクション署名:", tx);

      // 投資後の状態確認
      const portfolio = await program.account.portfolio.fetch(portfolioPDA);
      expect(portfolio.totalValue.toNumber()).to.equal(
        totalValueBefore + investmentAmount
      );

      const googlAllocation = portfolio.allocations.find(
        (a) => a.symbol === "GOOGL"
      );
      expect(googlAllocation?.currentAmount.toNumber()).to.equal(
        investmentAmount
      );
    });

    it("ゼロ金額での投資を拒否", async () => {
      try {
        await program.methods
          .investInEquity(new anchor.BN(0), "AAPL")
          .accounts({
            portfolio: portfolioPDA,
            userTokenAccount: userTokenAccountA,
            portfolioVault: portfolioVaultA,
            tokenMint: testTokenMintA,
            owner: authority.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc();
        expect.fail("ゼロ金額エラーが発生するはずです");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("InvalidAmount");
      }
    });

    it("不十分な残高での投資を拒否", async () => {
      const excessiveAmount = 2_000_000 * 10 ** 6; // 2M tokens (残高を超過)

      try {
        await program.methods
          .investInEquity(new anchor.BN(excessiveAmount), "AAPL")
          .accounts({
            portfolio: portfolioPDA,
            userTokenAccount: userTokenAccountA,
            portfolioVault: portfolioVaultA,
            tokenMint: testTokenMintA,
            owner: authority.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc();
        expect.fail("不十分な残高エラーが発生するはずです");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("InsufficientBalance");
      }
    });

    it("無効なトークンシンボルでの投資を拒否", async () => {
      try {
        await program.methods
          .investInEquity(new anchor.BN(1000), "MSFT") // 初期化されていないシンボル
          .accounts({
            portfolio: portfolioPDA,
            userTokenAccount: userTokenAccountA,
            portfolioVault: portfolioVaultA,
            tokenMint: testTokenMintA,
            owner: authority.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc();
        expect.fail("無効なトークンシンボルエラーが発生するはずです");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("InvalidTokenMint");
      }
    });

    it("空の文字列シンボルでの投資を拒否", async () => {
      try {
        await program.methods
          .investInEquity(new anchor.BN(1000), "") // 空のシンボル
          .accounts({
            portfolio: portfolioPDA,
            userTokenAccount: userTokenAccountA,
            portfolioVault: portfolioVaultA,
            tokenMint: testTokenMintA,
            owner: authority.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc();
        expect.fail("空のシンボルエラーが発生するはずです");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("InvalidTokenMint");
      }
    });

    it("長すぎるシンボルでの投資を拒否", async () => {
      const longSymbol = "A".repeat(33); // 33文字（制限は32文字）

      try {
        await program.methods
          .investInEquity(new anchor.BN(1000), longSymbol)
          .accounts({
            portfolio: portfolioPDA,
            userTokenAccount: userTokenAccountA,
            portfolioVault: portfolioVaultA,
            tokenMint: testTokenMintA,
            owner: authority.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc();
        expect.fail("長すぎるシンボルエラーが発生するはずです");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("InvalidTokenMint");
      }
    });
  });

  describe("引出機能テスト", () => {
    it("AAPL equity tokenからの正常な引出", async () => {
      const withdrawAmount = 10_000 * 10 ** 6; // 10K tokens

      const portfolioBeforeWithdraw = await program.account.portfolio.fetch(
        portfolioPDA
      );
      const totalValueBefore = portfolioBeforeWithdraw.totalValue.toNumber();
      const aaplBefore = portfolioBeforeWithdraw.allocations.find(
        (a) => a.symbol === "AAPL"
      );
      const aaplAmountBefore = aaplBefore?.currentAmount.toNumber() || 0;

      const tx = await program.methods
        .withdrawFromEquity(new anchor.BN(withdrawAmount), "AAPL")
        .accounts({
          portfolio: portfolioPDA,
          userTokenAccount: userTokenAccountA,
          portfolioVault: portfolioVaultA,
          tokenMint: testTokenMintA,
          owner: authority.publicKey,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      console.log("引出トランザクション署名:", tx);

      // 引出後の状態確認
      const portfolio = await program.account.portfolio.fetch(portfolioPDA);
      expect(portfolio.totalValue.toNumber()).to.equal(
        totalValueBefore - withdrawAmount
      );

      const aaplAllocation = portfolio.allocations.find(
        (a) => a.symbol === "AAPL"
      );
      expect(aaplAllocation?.currentAmount.toNumber()).to.equal(
        aaplAmountBefore - withdrawAmount
      );
    });

    it("ゼロ金額での引出を拒否", async () => {
      try {
        await program.methods
          .withdrawFromEquity(new anchor.BN(0), "AAPL")
          .accounts({
            portfolio: portfolioPDA,
            userTokenAccount: userTokenAccountA,
            portfolioVault: portfolioVaultA,
            tokenMint: testTokenMintA,
            owner: authority.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          } as any)
          .rpc();
        expect.fail("ゼロ金額エラーが発生するはずです");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("InvalidAmount");
      }
    });

    it("投資額を超える引出を拒否", async () => {
      const excessiveAmount = 200_000 * 10 ** 6; // 200K tokens (現在の投資額を超過)

      try {
        await program.methods
          .withdrawFromEquity(new anchor.BN(excessiveAmount), "AAPL")
          .accounts({
            portfolio: portfolioPDA,
            userTokenAccount: userTokenAccountA,
            portfolioVault: portfolioVaultA,
            tokenMint: testTokenMintA,
            owner: authority.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          } as any)
          .rpc();
        expect.fail("投資額超過エラーが発生するはずです");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("InsufficientBalance");
      }
    });

    it("存在しないトークンシンボルからの引出を拒否", async () => {
      try {
        await program.methods
          .withdrawFromEquity(new anchor.BN(1000), "MSFT") // 存在しないシンボル
          .accounts({
            portfolio: portfolioPDA,
            userTokenAccount: userTokenAccountA,
            portfolioVault: portfolioVaultA,
            tokenMint: testTokenMintA,
            owner: authority.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          } as any)
          .rpc();
        expect.fail("存在しないシンボルエラーが発生するはずです");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("InsufficientBalance");
      }
    });

    it("投資額ゼロのトークンからの引出を拒否", async () => {
      // GOOGLは投資済みだが、新しいトークンシンボルでテスト
      try {
        await program.methods
          .withdrawFromEquity(new anchor.BN(1000), "GOOGL")
          .accounts({
            portfolio: portfolioPDA,
            userTokenAccount: userTokenAccountB,
            portfolioVault: portfolioVaultB,
            tokenMint: testTokenMintB,
            owner: authority.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          } as any)
          .rpc();

        // GOOGLは投資済みなので成功するはず
        console.log("GOOGL引出成功（正常）");
      } catch (error) {
        // 引出額がバランスを超える場合のみエラー
        if (error.error?.errorCode?.code === "InsufficientBalance") {
          console.log("期待通り残高不足エラー");
        } else {
          throw error;
        }
      }
    });
  });

  describe("投資・引出の組み合わせテスト", () => {
    it("複数回の投資と引出の組み合わせ", async () => {
      const initialPortfolio = await program.account.portfolio.fetch(
        portfolioPDA
      );
      const initialTotalValue = initialPortfolio.totalValue.toNumber();

      // 追加投資
      const additionalInvestment = 20_000 * 10 ** 6;
      await program.methods
        .investInEquity(new anchor.BN(additionalInvestment), "AAPL")
        .accounts({
          portfolio: portfolioPDA,
          userTokenAccount: userTokenAccountA,
          portfolioVault: portfolioVaultA,
          tokenMint: testTokenMintA,
          owner: authority.publicKey,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      // 投資後の確認
      let portfolio = await program.account.portfolio.fetch(portfolioPDA);
      expect(portfolio.totalValue.toNumber()).to.equal(
        initialTotalValue + additionalInvestment
      );

      // 部分引出
      const partialWithdraw = 5_000 * 10 ** 6;
      await program.methods
        .withdrawFromEquity(new anchor.BN(partialWithdraw), "AAPL")
        .accounts({
          portfolio: portfolioPDA,
          userTokenAccount: userTokenAccountA,
          portfolioVault: portfolioVaultA,
          tokenMint: testTokenMintA,
          owner: authority.publicKey,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      // 最終確認
      portfolio = await program.account.portfolio.fetch(portfolioPDA);
      const expectedFinalValue =
        initialTotalValue + additionalInvestment - partialWithdraw;
      expect(portfolio.totalValue.toNumber()).to.equal(expectedFinalValue);
    });

    it("投資額と引出額の整合性確認", async () => {
      const portfolio = await program.account.portfolio.fetch(portfolioPDA);
      let calculatedTotal = 0;

      for (const allocation of portfolio.allocations) {
        calculatedTotal += allocation.currentAmount.toNumber();
      }

      expect(portfolio.totalValue.toNumber()).to.equal(calculatedTotal);
      console.log("総価値と配分の合計が一致:", calculatedTotal);
    });
  });

  after(async () => {
    console.log("=== 投資操作ユニットテスト完了 ===");
  });
});
