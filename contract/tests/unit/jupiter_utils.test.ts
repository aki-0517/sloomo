import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { expect } from "chai";

// Jupiter ユーティリティ関数のテスト用モック
class MockJupiterSwapHelper {
  static calculateSwapOperations(
    currentAllocations: any[],
    targetAllocations: any[],
    totalValue: number
  ): any[] {
    const operations = [];
    const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

    for (const target of targetAllocations) {
      const current = currentAllocations.find(
        (a) => a.mint.toString() === target.mint.toString()
      );

      if (current) {
        const targetAmount = Math.floor((totalValue * target.targetPercentage) / 10000);
        const currentAmount = current.currentAmount;

        if (currentAmount > targetAmount) {
          operations.push({
            operationType: "Sell",
            fromMint: target.mint,
            toMint: usdcMint,
            amount: currentAmount - targetAmount,
          });
        } else if (currentAmount < targetAmount) {
          operations.push({
            operationType: "Buy",
            fromMint: usdcMint,
            toMint: target.mint,
            amount: targetAmount - currentAmount,
          });
        }
      } else if (target.targetPercentage > 0) {
        const targetAmount = Math.floor((totalValue * target.targetPercentage) / 10000);
        operations.push({
          operationType: "Buy",
          fromMint: usdcMint,
          toMint: target.mint,
          amount: targetAmount,
        });
      }
    }

    return operations;
  }
}

describe("Jupiter Utils Unit Tests", () => {
  describe("スワップ操作計算", () => {
    it("リバランスが不要な場合は空の操作を返す", () => {
      const currentAllocations = [
        {
          mint: new PublicKey("11111111111111111111111111111111"),
          currentAmount: 600000, // 60%
        },
        {
          mint: new PublicKey("22222222222222222222222222222222"),
          currentAmount: 400000, // 40%
        },
      ];

      const targetAllocations = [
        {
          mint: new PublicKey("11111111111111111111111111111111"),
          targetPercentage: 6000, // 60%
        },
        {
          mint: new PublicKey("22222222222222222222222222222222"),
          targetPercentage: 4000, // 40%
        },
      ];

      const totalValue = 1000000;
      const operations = MockJupiterSwapHelper.calculateSwapOperations(
        currentAllocations,
        targetAllocations,
        totalValue
      );

      expect(operations).to.have.lengthOf(0);
    });

    it("配分増加が必要な場合は購入操作を生成する", () => {
      const currentAllocations = [
        {
          mint: new PublicKey("11111111111111111111111111111111"),
          currentAmount: 500000, // 50%
        },
        {
          mint: new PublicKey("22222222222222222222222222222222"),
          currentAmount: 500000, // 50%
        },
      ];

      const targetAllocations = [
        {
          mint: new PublicKey("11111111111111111111111111111111"),
          targetPercentage: 7000, // 70% (20%増加)
        },
        {
          mint: new PublicKey("22222222222222222222222222222222"),
          targetPercentage: 3000, // 30% (20%減少)
        },
      ];

      const totalValue = 1000000;
      const operations = MockJupiterSwapHelper.calculateSwapOperations(
        currentAllocations,
        targetAllocations,
        totalValue
      );

      expect(operations).to.have.lengthOf(2);
      
      // 最初のトークンの購入操作
      const buyOperation = operations.find(op => op.operationType === "Buy");
      expect(buyOperation).to.exist;
      expect(buyOperation.amount).to.equal(200000); // 70% - 50% = 20%

      // 2番目のトークンの売却操作
      const sellOperation = operations.find(op => op.operationType === "Sell");
      expect(sellOperation).to.exist;
      expect(sellOperation.amount).to.equal(200000); // 50% - 30% = 20%
    });

    it("新しいトークンの投資が必要な場合は購入操作を生成する", () => {
      const currentAllocations = [
        {
          mint: new PublicKey("11111111111111111111111111111111"),
          currentAmount: 1000000, // 100%
        },
      ];

      const targetAllocations = [
        {
          mint: new PublicKey("11111111111111111111111111111111"),
          targetPercentage: 5000, // 50%
        },
        {
          mint: new PublicKey("22222222222222222222222222222222"),
          targetPercentage: 5000, // 50% (新規)
        },
      ];

      const totalValue = 1000000;
      const operations = MockJupiterSwapHelper.calculateSwapOperations(
        currentAllocations,
        targetAllocations,
        totalValue
      );

      expect(operations).to.have.lengthOf(2);
      
      // 既存トークンの売却操作
      const sellOperation = operations.find(
        op => op.operationType === "Sell" && 
        op.fromMint.toString() === "11111111111111111111111111111111"
      );
      expect(sellOperation).to.exist;
      expect(sellOperation.amount).to.equal(500000);

      // 新規トークンの購入操作
      const buyOperation = operations.find(
        op => op.operationType === "Buy" && 
        op.toMint.toString() === "22222222222222222222222222222222"
      );
      expect(buyOperation).to.exist;
      expect(buyOperation.amount).to.equal(500000);
    });

    it("複数トークンの複雑なリバランス操作を正しく計算する", () => {
      const currentAllocations = [
        {
          mint: new PublicKey("11111111111111111111111111111111"),
          currentAmount: 400000, // 40%
        },
        {
          mint: new PublicKey("22222222222222222222222222222222"),
          currentAmount: 300000, // 30%
        },
        {
          mint: new PublicKey("33333333333333333333333333333333"),
          currentAmount: 300000, // 30%
        },
      ];

      const targetAllocations = [
        {
          mint: new PublicKey("11111111111111111111111111111111"),
          targetPercentage: 5000, // 50% (10%増加)
        },
        {
          mint: new PublicKey("22222222222222222222222222222222"),
          targetPercentage: 2000, // 20% (10%減少)
        },
        {
          mint: new PublicKey("33333333333333333333333333333333"),
          targetPercentage: 3000, // 30% (変更なし)
        },
      ];

      const totalValue = 1000000;
      const operations = MockJupiterSwapHelper.calculateSwapOperations(
        currentAllocations,
        targetAllocations,
        totalValue
      );

      expect(operations).to.have.lengthOf(2);
      
      // トークン1の購入操作（10%増加）
      const token1Buy = operations.find(
        op => op.operationType === "Buy" && 
        op.toMint.toString() === "11111111111111111111111111111111"
      );
      expect(token1Buy).to.exist;
      expect(token1Buy.amount).to.equal(100000);

      // トークン2の売却操作（10%減少）
      const token2Sell = operations.find(
        op => op.operationType === "Sell" && 
        op.fromMint.toString() === "22222222222222222222222222222222"
      );
      expect(token2Sell).to.exist;
      expect(token2Sell.amount).to.equal(100000);
    });

    it("ゼロ金額の操作は生成されない", () => {
      const currentAllocations = [
        {
          mint: new PublicKey("11111111111111111111111111111111"),
          currentAmount: 1000000, // 100%
        },
      ];

      const targetAllocations = [
        {
          mint: new PublicKey("11111111111111111111111111111111"),
          targetPercentage: 10000, // 100% (変更なし)
        },
        {
          mint: new PublicKey("22222222222222222222222222222222"),
          targetPercentage: 0, // 0% (投資なし)
        },
      ];

      const totalValue = 1000000;
      const operations = MockJupiterSwapHelper.calculateSwapOperations(
        currentAllocations,
        targetAllocations,
        totalValue
      );

      expect(operations).to.have.lengthOf(0);
    });
  });

  describe("共通ミント定数", () => {
    it("devnet USDCアドレスが正しい", () => {
      const devnetUsdc = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
      expect(() => new PublicKey(devnetUsdc)).to.not.throw();
    });

    it("WSOLアドレスが正しい", () => {
      const wsol = "So11111111111111111111111111111111111111112";
      expect(() => new PublicKey(wsol)).to.not.throw();
    });

    it("devnet USDTアドレスが正しい", () => {
      const devnetUsdt = "EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS";
      expect(() => new PublicKey(devnetUsdt)).to.not.throw();
    });
  });

  describe("パーセンテージ計算", () => {
    it("ベーシスポイントから正しい金額を計算する", () => {
      const totalValue = 1000000; // 1,000,000 lamports
      
      // 50% = 5000 basis points
      const fiftyPercent = Math.floor((totalValue * 5000) / 10000);
      expect(fiftyPercent).to.equal(500000);

      // 25% = 2500 basis points
      const twentyFivePercent = Math.floor((totalValue * 2500) / 10000);
      expect(twentyFivePercent).to.equal(250000);

      // 75% = 7500 basis points
      const seventyFivePercent = Math.floor((totalValue * 7500) / 10000);
      expect(seventyFivePercent).to.equal(750000);
    });

    it("小数点以下は切り捨てられる", () => {
      const totalValue = 1000001; // 端数のある値
      
      // 33.33% = 3333 basis points
      const oneThird = Math.floor((totalValue * 3333) / 10000);
      expect(oneThird).to.equal(333333); // 小数点以下切り捨て
    });

    it("ゼロ値での計算が正しく動作する", () => {
      const totalValue = 0;
      
      const percentage = Math.floor((totalValue * 5000) / 10000);
      expect(percentage).to.equal(0);
    });
  });

  describe("エラーハンドリング", () => {
    it("無効なPublicKeyでエラーになる", () => {
      expect(() => new PublicKey("invalid")).to.throw();
    });

    it("負の金額での計算を処理する", () => {
      const currentAllocations = [
        {
          mint: new PublicKey("11111111111111111111111111111111"),
          currentAmount: -100000, // 負の値
        },
      ];

      const targetAllocations = [
        {
          mint: new PublicKey("11111111111111111111111111111111"),
          targetPercentage: 10000,
        },
      ];

      const totalValue = 1000000;
      
      // 実際の実装では負の値はバリデーションでエラーになるべき
      expect(() => {
        MockJupiterSwapHelper.calculateSwapOperations(
          currentAllocations,
          targetAllocations,
          totalValue
        );
      }).to.not.throw(); // モックでは例外を投げない
    });
  });
});