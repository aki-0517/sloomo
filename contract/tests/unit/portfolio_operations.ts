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

describe("Portfolio Operations Unit Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SloomoPortfolio as Program<SloomoPortfolio>;
  const authority = provider.wallet as anchor.Wallet;

  let portfolioPDA: PublicKey;

  before(async () => {
    console.log("=== ユニットテスト セットアップ開始 ===");

    // Portfolio PDA計算
    [portfolioPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("portfolio"), authority.publicKey.toBuffer()],
      program.programId
    );
    console.log("Portfolio PDA:", portfolioPDA.toString());
    console.log("Program ID:", program.programId.toString());
    console.log("Authority:", authority.publicKey.toString());
  });

  describe("プログラム設定テスト", () => {
    it("プログラムIDが正しく設定されている", async () => {
      expect(program.programId.toString()).to.equal(
        "F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS"
      );
    });

    it("PDAが正しく計算される", async () => {
      const [calculatedPDA, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), authority.publicKey.toBuffer()],
        program.programId
      );

      expect(portfolioPDA.toString()).to.equal(calculatedPDA.toString());
      expect(bump).to.be.a("number");
      expect(bump).to.be.at.least(0);
      expect(bump).to.be.at.most(255);
    });
  });

  describe("ポートフォリオ初期化テスト", () => {
    it("正常な初期化（基本パラメータ）", async () => {
      console.log("ポートフォリオ初期化テスト開始");

      // 実際のトークンミントの代わりにダミーのPublicKeyを使用
      const dummyMintA = Keypair.generate().publicKey;
      const dummyMintB = Keypair.generate().publicKey;

      const initParams = {
        initialAllocations: [
          {
            mint: dummyMintA,
            symbol: "AAPL",
            targetPercentage: 6000, // 60%
          },
          {
            mint: dummyMintB,
            symbol: "GOOGL",
            targetPercentage: 4000, // 40%
          },
        ],
      };

      const tx = await program.methods
        .initializePortfolio(initParams)
        .accounts({
          portfolio: portfolioPDA,
          owner: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log("初期化トランザクション署名:", tx);

      // ポートフォリオデータ検証
      const portfolio = await program.account.portfolio.fetch(portfolioPDA);
      expect(portfolio.owner.toString()).to.equal(
        authority.publicKey.toString()
      );
      expect(portfolio.allocations).to.have.length(2);
      expect(portfolio.allocations[0].targetPercentage).to.equal(6000);
      expect(portfolio.allocations[1].targetPercentage).to.equal(4000);
      expect(portfolio.totalValue.toNumber()).to.equal(0);
      expect(portfolio.isRebalancing).to.be.false;

      console.log("初期化データ検証完了");
    });

    it("無効な配分比率で初期化を拒否", async () => {
      console.log("無効配分テスト開始");

      const invalidParams = {
        initialAllocations: [
          {
            mint: Keypair.generate().publicKey,
            symbol: "INVALID",
            targetPercentage: 7000, // 70%
          },
          {
            mint: Keypair.generate().publicKey,
            symbol: "INVALID2",
            targetPercentage: 5000, // 50% = 合計120%
          },
        ],
      };

      const newUser = Keypair.generate();
      try {
        await provider.connection.requestAirdrop(
          newUser.publicKey,
          LAMPORTS_PER_SOL
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.log("Airdrop failed, continuing with test");
      }

      const [newPortfolioPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), newUser.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .initializePortfolio(invalidParams)
          .accounts({
            portfolio: newPortfolioPDA,
            owner: newUser.publicKey,
            systemProgram: SystemProgram.programId,
          } as any)
          .signers([newUser])
          .rpc();
        expect.fail("エラーが発生するはずです");
      } catch (error) {
        console.log("期待されたエラー:", error.error?.errorCode?.code);
        expect(error.error?.errorCode?.code).to.equal("AllocationOverflow");
        console.log("無効配分テスト完了");
      }
    });

    it("空の配分で初期化", async () => {
      const emptyParams = {
        initialAllocations: [],
      };

      const newUser = Keypair.generate();
      try {
        await provider.connection.requestAirdrop(
          newUser.publicKey,
          LAMPORTS_PER_SOL
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.log("Airdrop failed, continuing with test");
      }

      const [newPortfolioPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), newUser.publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .initializePortfolio(emptyParams)
        .accounts({
          portfolio: newPortfolioPDA,
          owner: newUser.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([newUser])
        .rpc();

      const portfolio = await program.account.portfolio.fetch(newPortfolioPDA);
      expect(portfolio.allocations).to.have.length(0);
      expect(portfolio.totalValue.toNumber()).to.equal(0);
    });

    it("最大配分数での初期化", async () => {
      const maxAllocations = Array.from({ length: 10 }, (_, i) => ({
        mint: Keypair.generate().publicKey,
        symbol: `TOKEN${i}`,
        targetPercentage: 1000, // 10% each
      }));

      const maxParams = {
        initialAllocations: maxAllocations,
      };

      const newUser = Keypair.generate();
      try {
        await provider.connection.requestAirdrop(
          newUser.publicKey,
          LAMPORTS_PER_SOL
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.log("Airdrop failed, continuing with test");
      }

      const [newPortfolioPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), newUser.publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .initializePortfolio(maxParams)
        .accounts({
          portfolio: newPortfolioPDA,
          owner: newUser.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([newUser])
        .rpc();

      const portfolio = await program.account.portfolio.fetch(newPortfolioPDA);
      expect(portfolio.allocations).to.have.length(10);
    });
  });

  describe("yield更新テスト", () => {
    it("正常なyield更新", async () => {
      console.log("yield更新テスト開始");

      const yieldUpdates = [
        { symbol: "AAPL", newApy: new anchor.BN(750) }, // 7.5%
        { symbol: "GOOGL", newApy: new anchor.BN(850) }, // 8.5%
      ];

      const tx = await program.methods
        .updateYields(yieldUpdates)
        .accounts({
          portfolio: portfolioPDA,
          owner: authority.publicKey,
        } as any)
        .rpc();

      console.log("yield更新トランザクション署名:", tx);

      // 更新後の状態確認
      const portfolio = await program.account.portfolio.fetch(portfolioPDA);
      const aaplAllocation = portfolio.allocations.find(
        (a) => a.symbol === "AAPL"
      );
      const googlAllocation = portfolio.allocations.find(
        (a) => a.symbol === "GOOGL"
      );

      expect(aaplAllocation?.apy).to.equal(750);
      expect(googlAllocation?.apy).to.equal(850);

      console.log("yield更新テスト完了");
    });

    it("無効なAPY値で更新を拒否", async () => {
      console.log("無効APYテスト開始");

      const invalidYieldUpdates = [
        { symbol: "AAPL", newApy: new anchor.BN(150000) }, // 1500% (制限を超過)
      ];

      try {
        await program.methods
          .updateYields(invalidYieldUpdates)
          .accounts({
            portfolio: portfolioPDA,
            owner: authority.publicKey,
          } as any)
          .rpc();
        expect.fail("無効なAPYエラーが発生するはずです");
      } catch (error) {
        console.log("期待されたエラー:", error.error?.errorCode?.code);
        expect(error.error?.errorCode?.code).to.equal("InvalidAmount");
        console.log("無効APYテスト完了");
      }
    });

    it("存在しないトークンのyield更新を拒否", async () => {
      const nonExistentUpdates = [
        { symbol: "MSFT", newApy: new anchor.BN(500) }, // 存在しないトークン
      ];

      try {
        await program.methods
          .updateYields(nonExistentUpdates)
          .accounts({
            portfolio: portfolioPDA,
            owner: authority.publicKey,
          } as any)
          .rpc();
        expect.fail("存在しないトークンエラーが発生するはずです");
      } catch (error) {
        expect(error.error?.errorCode?.code).to.equal("InvalidTokenMint");
      }
    });

    it("空のyield更新を拒否", async () => {
      try {
        await program.methods
          .updateYields([])
          .accounts({
            portfolio: portfolioPDA,
            owner: authority.publicKey,
          } as any)
          .rpc();
        expect.fail("空の更新エラーが発生するはずです");
      } catch (error) {
        expect(error.error?.errorCode?.code).to.equal("InvalidAmount");
      }
    });
  });

  describe("ポートフォリオデータ構造テスト", () => {
    it("ポートフォリオデータの整合性確認", async () => {
      const portfolio = await program.account.portfolio.fetch(portfolioPDA);

      console.log("ポートフォリオデータ:", {
        owner: portfolio.owner.toString(),
        totalValue: portfolio.totalValue.toString(),
        allocationsCount: portfolio.allocations.length,
        performanceHistoryCount: portfolio.performanceHistory.length,
        createdAt: new Date(
          portfolio.createdAt.toNumber() * 1000
        ).toISOString(),
        updatedAt: new Date(
          portfolio.updatedAt.toNumber() * 1000
        ).toISOString(),
        isRebalancing: portfolio.isRebalancing,
      });

      expect(portfolio.owner.toString()).to.equal(
        authority.publicKey.toString()
      );
      expect(portfolio.allocations.length).to.be.at.least(0);
      expect(portfolio.performanceHistory.length).to.be.at.least(0);
      expect(portfolio.totalValue.toNumber()).to.be.at.least(0);
      expect(portfolio.createdAt.toNumber()).to.be.greaterThan(0);
      expect(portfolio.updatedAt.toNumber()).to.be.greaterThan(0);
      expect(portfolio.isRebalancing).to.be.a("boolean");
    });

    it("配分データの構造確認", async () => {
      const portfolio = await program.account.portfolio.fetch(portfolioPDA);

      for (const allocation of portfolio.allocations) {
        console.log("配分データ:", {
          mint: allocation.mint.toString(),
          symbol: allocation.symbol,
          currentAmount: allocation.currentAmount.toString(),
          targetPercentage: allocation.targetPercentage,
          apy: allocation.apy,
          lastYieldUpdate: new Date(
            allocation.lastYieldUpdate.toNumber() * 1000
          ).toISOString(),
        });

        expect(allocation.mint).to.be.instanceOf(PublicKey);
        expect(allocation.symbol).to.be.a("string");
        expect(allocation.symbol.length).to.be.at.most(32);
        expect(allocation.currentAmount.toNumber()).to.be.at.least(0);
        expect(allocation.targetPercentage).to.be.at.most(10000);
        expect(allocation.apy).to.be.at.most(100000); // 最大1000%
        expect(allocation.lastYieldUpdate.toNumber()).to.be.greaterThan(0);
      }
    });

    it("パフォーマンス履歴の構造確認", async () => {
      const portfolio = await program.account.portfolio.fetch(portfolioPDA);

      for (const snapshot of portfolio.performanceHistory) {
        console.log("パフォーマンススナップショット:", {
          timestamp: new Date(
            snapshot.timestamp.toNumber() * 1000
          ).toISOString(),
          totalValue: snapshot.totalValue.toString(),
          growthRate: snapshot.growthRate,
        });

        expect(snapshot.timestamp.toNumber()).to.be.greaterThan(0);
        expect(snapshot.totalValue.toNumber()).to.be.at.least(0);
        expect(snapshot.growthRate).to.be.at.least(-10000); // -100%
        expect(snapshot.growthRate).to.be.at.most(10000); // +100%
      }
    });
  });

  describe("権限テスト", () => {
    it("認証されていないユーザーによる操作を拒否", async () => {
      const unauthorizedUser = Keypair.generate();

      try {
        await provider.connection.requestAirdrop(
          unauthorizedUser.publicKey,
          LAMPORTS_PER_SOL
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.log("Airdrop failed, continuing with test");
      }

      try {
        await program.methods
          .updateYields([{ symbol: "AAPL", newApy: new anchor.BN(500) }])
          .accounts({
            portfolio: portfolioPDA, // 他のユーザーのポートフォリオ
            owner: unauthorizedUser.publicKey, // 認証されていないユーザー
          } as any)
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("認証エラーが発生するはずです");
      } catch (error) {
        // has_one制約により、自動的にエラーが発生します
        expect(error.toString()).to.include("failed");
      }
    });
  });

  after(async () => {
    console.log("=== ユニットテスト完了 ===");
  });
});
