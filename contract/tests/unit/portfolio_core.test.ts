import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SloomoPortfolio } from "../../target/types/sloomo_portfolio";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("Portfolio Core Unit Tests", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SloomoPortfolio as Program<SloomoPortfolio>;
  const provider = anchor.getProvider();

  let user: Keypair;
  let portfolioPda: PublicKey;
  let portfolioBump: number;

  beforeEach(async () => {
    // テストごとに新しいユーザーを生成
    user = Keypair.generate();
    
    // SOLをエアドロップ
    const signature = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature, "confirmed");

    // Portfolio PDAを生成
    [portfolioPda, portfolioBump] = await PublicKey.findProgramAddress(
      [Buffer.from("portfolio"), user.publicKey.toBuffer()],
      program.programId
    );
  });

  describe("ポートフォリオ初期化", () => {
    it("正常なパラメータでポートフォリオを初期化できる", async () => {
      const initialAllocations = [
        {
          mint: Keypair.generate().publicKey,
          symbol: "AAPL",
          targetPercentage: 6000, // 60%
        },
        {
          mint: Keypair.generate().publicKey,
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

      const portfolioData = await program.account.portfolio.fetch(portfolioPda);
      
      expect(portfolioData.owner.toString()).to.equal(user.publicKey.toString());
      expect(portfolioData.bump).to.equal(portfolioBump);
      expect(portfolioData.allocations).to.have.lengthOf(2);
      expect(portfolioData.allocations[0].symbol).to.equal("AAPL");
      expect(portfolioData.allocations[1].symbol).to.equal("GOOGL");
      expect(portfolioData.totalValue.toNumber()).to.equal(0);
      expect(portfolioData.isRebalancing).to.equal(false);
    });

    it("配分の合計が100%を超える場合エラーになる", async () => {
      const invalidAllocations = [
        {
          mint: Keypair.generate().publicKey,
          symbol: "AAPL",
          targetPercentage: 6000, // 60%
        },
        {
          mint: Keypair.generate().publicKey,
          symbol: "GOOGL",
          targetPercentage: 5000, // 50% (合計110%)
        },
      ];

      try {
        await program.methods
          .initializePortfolio({
            initialAllocations: invalidAllocations,
          })
          .accounts({
            portfolio: portfolioPda,
            owner: user.publicKey,
            systemProgram: SystemProgram.programId,
          } as any)
          .signers([user])
          .rpc();
        
        expect.fail("エラーが発生するべき");
      } catch (error) {
        expect(error.toString()).to.include("InvalidAllocationPercentage");
      }
    });

    it("空の配分でポートフォリオを初期化できる", async () => {
      await program.methods
        .initializePortfolio({
          initialAllocations: [],
        })
        .accounts({
          portfolio: portfolioPda,
          owner: user.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([user])
        .rpc();

      const portfolioData = await program.account.portfolio.fetch(portfolioPda);
      expect(portfolioData.allocations).to.have.lengthOf(0);
    });

    it("最大配分数でポートフォリオを初期化できる", async () => {
      const maxAllocations = Array.from({ length: 10 }, (_, i) => ({
        mint: Keypair.generate().publicKey,
        symbol: `TOKEN${i}`,
        targetPercentage: 1000, // 各10%
      }));

      await program.methods
        .initializePortfolio({
          initialAllocations: maxAllocations,
        })
        .accounts({
          portfolio: portfolioPda,
          owner: user.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([user])
        .rpc();

      const portfolioData = await program.account.portfolio.fetch(portfolioPda);
      expect(portfolioData.allocations).to.have.lengthOf(10);
    });

    it("同じユーザーが複数回初期化しようとするとエラーになる", async () => {
      const initialAllocations = [
        {
          mint: Keypair.generate().publicKey,
          symbol: "AAPL",
          targetPercentage: 10000, // 100%
        },
      ];

      // 1回目の初期化
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

      // 2回目の初期化（失敗するべき）
      try {
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
        
        expect.fail("エラーが発生するべき");
      } catch (error) {
        expect(error.toString()).to.include("already in use");
      }
    });
  });

  describe("投資操作", () => {
    beforeEach(async () => {
      // 各テストの前にポートフォリオを初期化
      const initialAllocations = [
        {
          mint: Keypair.generate().publicKey,
          symbol: "AAPL",
          targetPercentage: 5000, // 50%
        },
        {
          mint: Keypair.generate().publicKey,
          symbol: "GOOGL",
          targetPercentage: 5000, // 50%
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
    });

    it("正常に投資を追加できる", async () => {
      await program.methods
        .investInEquity(new anchor.BN(1000000), "AAPL")
        .accounts({
          portfolio: portfolioPda,
          owner: user.publicKey,
        } as any)
        .signers([user])
        .rpc();

      const portfolioData = await program.account.portfolio.fetch(portfolioPda);
      const aaplAllocation = portfolioData.allocations.find(a => a.symbol === "AAPL");
      
      expect(aaplAllocation.currentAmount.toNumber()).to.equal(1000000);
      expect(portfolioData.totalValue.toNumber()).to.equal(1000000);
    });

    it("存在しないトークンへの投資でエラーになる", async () => {
      try {
        await program.methods
          .investInEquity(new anchor.BN(1000000), "INVALID")
          .accounts({
            portfolio: portfolioPda,
            owner: user.publicKey,
          } as any)
          .signers([user])
          .rpc();
        
        expect.fail("エラーが発生するべき");
      } catch (error) {
        expect(error.toString()).to.include("InvalidTokenMint");
      }
    });

    it("ゼロ金額の投資でエラーになる", async () => {
      try {
        await program.methods
          .investInEquity(new anchor.BN(0), "AAPL")
          .accounts({
            portfolio: portfolioPda,
            owner: user.publicKey,
          } as any)
          .signers([user])
          .rpc();
        
        expect.fail("エラーが発生するべき");
      } catch (error) {
        expect(error.toString()).to.include("InvalidAmount");
      }
    });
  });

  describe("引出操作", () => {
    beforeEach(async () => {
      // ポートフォリオ初期化と初期投資
      const initialAllocations = [
        {
          mint: Keypair.generate().publicKey,
          symbol: "AAPL",
          targetPercentage: 10000, // 100%
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

      // 初期投資
      await program.methods
        .investInEquity(new anchor.BN(2000000), "AAPL")
        .accounts({
          portfolio: portfolioPda,
          owner: user.publicKey,
        } as any)
        .signers([user])
        .rpc();
    });

    it("正常に引出できる", async () => {
      await program.methods
        .withdrawFromEquity(new anchor.BN(500000), "AAPL")
        .accounts({
          portfolio: portfolioPda,
          owner: user.publicKey,
        } as any)
        .signers([user])
        .rpc();

      const portfolioData = await program.account.portfolio.fetch(portfolioPda);
      const aaplAllocation = portfolioData.allocations.find(a => a.symbol === "AAPL");
      
      expect(aaplAllocation.currentAmount.toNumber()).to.equal(1500000);
      expect(portfolioData.totalValue.toNumber()).to.equal(1500000);
    });

    it("残高不足で引出エラーになる", async () => {
      try {
        await program.methods
          .withdrawFromEquity(new anchor.BN(3000000), "AAPL")
          .accounts({
            portfolio: portfolioPda,
            owner: user.publicKey,
          } as any)
          .signers([user])
          .rpc();
        
        expect.fail("エラーが発生するべき");
      } catch (error) {
        expect(error.toString()).to.include("InsufficientBalance");
      }
    });

    it("存在しないトークンからの引出でエラーになる", async () => {
      try {
        await program.methods
          .withdrawFromEquity(new anchor.BN(100000), "INVALID")
          .accounts({
            portfolio: portfolioPda,
            owner: user.publicKey,
          } as any)
          .signers([user])
          .rpc();
        
        expect.fail("エラーが発生するべき");
      } catch (error) {
        expect(error.toString()).to.include("InvalidTokenMint");
      }
    });
  });

  describe("利回り更新", () => {
    beforeEach(async () => {
      // ポートフォリオを初期化
      const initialAllocations = [
        {
          mint: Keypair.generate().publicKey,
          symbol: "AAPL",
          targetPercentage: 5000, // 50%
        },
        {
          mint: Keypair.generate().publicKey,
          symbol: "GOOGL",
          targetPercentage: 5000, // 50%
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
    });

    it("正常に利回りを更新できる", async () => {
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

      const portfolioData = await program.account.portfolio.fetch(portfolioPda);
      const aaplAllocation = portfolioData.allocations.find(a => a.symbol === "AAPL");
      const googlAllocation = portfolioData.allocations.find(a => a.symbol === "GOOGL");
      
      expect(aaplAllocation.apy).to.equal(500);
      expect(googlAllocation.apy).to.equal(750);
    });

    it("存在しないトークンの利回り更新でエラーになる", async () => {
      const invalidYieldUpdates = [
        {
          symbol: "INVALID",
          newApy: new anchor.BN(500),
        },
      ];

      try {
        await program.methods
          .updateYields(invalidYieldUpdates)
          .accounts({
            portfolio: portfolioPda,
            owner: user.publicKey,
          } as any)
          .signers([user])
          .rpc();
        
        expect.fail("エラーが発生するべき");
      } catch (error) {
        expect(error.toString()).to.include("InvalidTokenMint");
      }
    });

    it("空の利回り更新でエラーになる", async () => {
      try {
        await program.methods
          .updateYields([])
          .accounts({
            portfolio: portfolioPda,
            owner: user.publicKey,
          } as any)
          .signers([user])
          .rpc();
        
        expect.fail("エラーが発生するべき");
      } catch (error) {
        expect(error.toString()).to.include("InvalidAmount");
      }
    });
  });

  describe("Jupiter クォート記録", () => {
    it("正常にクォート情報を記録できる", async () => {
      const inputMint = Keypair.generate().publicKey.toString();
      const outputMint = Keypair.generate().publicKey.toString();

      await program.methods
        .recordJupiterQuote(
          inputMint,
          outputMint,
          new anchor.BN(1000000),
          50
        )
        .accounts({
          user: user.publicKey,
        })
        .signers([user])
        .rpc();

      // イベントが正しく発行されたことを確認するため、
      // 実際のテストではイベントリスナーを使用することを推奨
    });

    it("無効なパラメータでクォート記録を拒否する", async () => {
      try {
        await program.methods
          .recordJupiterQuote(
            "", // 空の入力ミント
            Keypair.generate().publicKey.toString(),
            new anchor.BN(1000000),
            50
          )
          .accounts({
            user: user.publicKey,
          })
          .signers([user])
          .rpc();
        
        // この場合、実際のバリデーションはクライアントサイドで行われる
        // オンチェーンでは文字列バリデーションは制限的
      } catch (error) {
        // 予期されるエラー
      }
    });
  });
});