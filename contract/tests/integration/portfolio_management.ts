import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SloomoPortfolio } from "../../target/types/sloomo_portfolio";
import { expect } from "chai";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
  createAssociatedTokenAccount,
} from "@solana/spl-token";

describe("Portfolio Management Integration Tests", () => {
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
    console.log("=== 統合テスト セットアップ開始 ===");

    // Portfolio PDA計算
    [portfolioPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("portfolio"), authority.publicKey.toBuffer()],
      program.programId
    );
    console.log("Portfolio PDA:", portfolioPDA.toString());

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
    console.log("Test Token A Mint:", testTokenMintA.toString());

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
    console.log("Test Token B Mint:", testTokenMintB.toString());

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

    console.log("=== 統合テスト セットアップ完了 ===");
  });

  describe("完全なポートフォリオ管理フロー", () => {
    it("完全な投資フロー - 初期化から投資、引出まで", async () => {
      console.log("=== 完全フロー統合テスト開始 ===");

      // ステップ1: ポートフォリオ初期化
      const initParams = {
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
      };

      await program.methods
        .initializePortfolio(initParams)
        .accounts({
          portfolio: portfolioPDA,
          owner: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log("ポートフォリオ初期化完了");

      // ステップ2: AAPL投資
      const aaplInvestment = 100_000 * 10 ** 6; // 100K tokens
      await program.methods
        .investInEquity(new anchor.BN(aaplInvestment), "AAPL")
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

      console.log("AAPL投資完了");

      // ステップ3: GOOGL投資
      const googlInvestment = 50 * 10 ** 9; // 50 tokens
      await program.methods
        .investInEquity(new anchor.BN(googlInvestment), "GOOGL")
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

      console.log("GOOGL投資完了");

      // ステップ4: yield更新
      await program.methods
        .updateYields([
          { symbol: "AAPL", newApy: new anchor.BN(750) }, // 7.5%
          { symbol: "GOOGL", newApy: new anchor.BN(850) }, // 8.5%
        ])
        .accounts({
          portfolio: portfolioPDA,
          owner: authority.publicKey,
        } as any)
        .rpc();

      console.log("yield更新完了");

      // ステップ5: 一部引出
      const withdrawAmount = 10_000 * 10 ** 6; // 10K tokens
      await program.methods
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

      console.log("引出実行完了");

      // 最終状態検証
      const finalPortfolio = await program.account.portfolio.fetch(
        portfolioPDA
      );
      expect(finalPortfolio.allocations.length).to.equal(2);

      const aaplAllocation = finalPortfolio.allocations.find(
        (a: any) => a.symbol === "AAPL"
      );
      const googlAllocation = finalPortfolio.allocations.find(
        (a: any) => a.symbol === "GOOGL"
      );

      expect(aaplAllocation?.currentAmount.toNumber()).to.equal(
        aaplInvestment - withdrawAmount
      );
      expect(googlAllocation?.currentAmount.toNumber()).to.equal(
        googlInvestment
      );
      expect(aaplAllocation?.apy).to.equal(750);
      expect(googlAllocation?.apy).to.equal(850);

      const expectedTotalValue =
        aaplInvestment - withdrawAmount + googlInvestment;
      expect(finalPortfolio.totalValue.toNumber()).to.equal(expectedTotalValue);

      console.log("=== 完全フロー統合テスト完了 ===");
    });

    it("複数ユーザーでの並行ポートフォリオ管理", async () => {
      console.log("=== 複数ユーザー並行テスト開始 ===");

      // 新しいユーザー作成
      const user1 = Keypair.generate();
      const user2 = Keypair.generate();

      // SOLを送金
      await provider.connection.requestAirdrop(
        user1.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.requestAirdrop(
        user2.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 各ユーザーのPDA計算
      const [portfolio1PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), user1.publicKey.toBuffer()],
        program.programId
      );
      const [portfolio2PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), user2.publicKey.toBuffer()],
        program.programId
      );

      // 各ユーザーのトークンアカウント作成
      const user1TokenAccountA = await createAssociatedTokenAccount(
        provider.connection,
        user1,
        testTokenMintA,
        user1.publicKey,
        {},
        TOKEN_PROGRAM_ID
      );

      const user2TokenAccountA = await createAssociatedTokenAccount(
        provider.connection,
        user2,
        testTokenMintA,
        user2.publicKey,
        {},
        TOKEN_PROGRAM_ID
      );

      // トークンをミント
      await mintTo(
        provider.connection,
        authority.payer,
        testTokenMintA,
        user1TokenAccountA,
        authority.publicKey,
        500_000 * 10 ** 6,
        [],
        undefined,
        TOKEN_PROGRAM_ID
      );

      await mintTo(
        provider.connection,
        authority.payer,
        testTokenMintA,
        user2TokenAccountA,
        authority.publicKey,
        300_000 * 10 ** 6,
        [],
        undefined,
        TOKEN_PROGRAM_ID
      );

      // 並行してポートフォリオ初期化
      await Promise.all([
        program.methods
          .initializePortfolio({
            initialAllocations: [
              { mint: testTokenMintA, symbol: "AAPL", targetPercentage: 10000 },
            ],
          })
          .accounts({
            portfolio: portfolio1PDA,
            owner: user1.publicKey,
            systemProgram: SystemProgram.programId,
          } as any)
          .signers([user1])
          .rpc(),

        program.methods
          .initializePortfolio({
            initialAllocations: [
              { mint: testTokenMintA, symbol: "AAPL", targetPercentage: 10000 },
            ],
          })
          .accounts({
            portfolio: portfolio2PDA,
            owner: user2.publicKey,
            systemProgram: SystemProgram.programId,
          } as any)
          .signers([user2])
          .rpc(),
      ]);

      console.log("並行ポートフォリオ初期化完了");

      // 状態確認
      const portfolio1 = await program.account.portfolio.fetch(portfolio1PDA);
      const portfolio2 = await program.account.portfolio.fetch(portfolio2PDA);

      expect(portfolio1.owner.toString()).to.equal(user1.publicKey.toString());
      expect(portfolio2.owner.toString()).to.equal(user2.publicKey.toString());
      expect(portfolio1.allocations.length).to.equal(1);
      expect(portfolio2.allocations.length).to.equal(1);

      console.log("=== 複数ユーザー並行テスト完了 ===");
    });
  });

  describe("エラー回復テスト", () => {
    it("失敗したトランザクション後の状態整合性", async () => {
      console.log("=== エラー回復テスト開始 ===");

      // 事前状態を記録
      const portfolioBefore = await program.account.portfolio.fetch(
        portfolioPDA
      );
      const totalValueBefore = portfolioBefore.totalValue.toNumber();

      // 失敗する操作を実行（過大な引出）
      try {
        await program.methods
          .withdrawFromEquity(new anchor.BN(999_999_999 * 10 ** 6), "AAPL")
          .accounts({
            portfolio: portfolioPDA,
            userTokenAccount: userTokenAccountA,
            portfolioVault: portfolioVaultA,
            tokenMint: testTokenMintA,
            owner: authority.publicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .rpc();
        expect.fail("エラーが発生するはずです");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("InsufficientBalance");
      }

      // 失敗後の状態確認
      const portfolioAfter = await program.account.portfolio.fetch(
        portfolioPDA
      );
      expect(portfolioAfter.totalValue.toNumber()).to.equal(totalValueBefore);
      expect(portfolioAfter.isRebalancing).to.be.false;

      // 正常な操作が引き続き実行可能
      await program.methods
        .updateYields([{ symbol: "AAPL", newApy: new anchor.BN(500) }])
        .accounts({
          portfolio: portfolioPDA,
          owner: authority.publicKey,
        } as any)
        .rpc();

      const portfolioFinal = await program.account.portfolio.fetch(
        portfolioPDA
      );
      const aaplAllocation = portfolioFinal.allocations.find(
        (a: any) => a.symbol === "AAPL"
      );
      expect(aaplAllocation?.apy).to.equal(500);

      console.log("=== エラー回復テスト完了 ===");
    });
  });

  after(async () => {
    console.log("=== 統合テスト完了 ===");
  });
});
