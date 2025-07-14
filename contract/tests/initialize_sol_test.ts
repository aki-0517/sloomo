import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";
import { 
  PublicKey, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  NATIVE_MINT, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  createAssociatedTokenAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("Initialize Portfolio with SOL", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SloomoPortfolio as Program<SloomoPortfolio>;
  
  let portfolioPda: PublicKey;
  let userWsolAccount: PublicKey;
  let portfolioWsolVault: PublicKey;
  
  const user = provider.wallet as anchor.Wallet;
  const initialSolAmount = 1 * LAMPORTS_PER_SOL; // 1 SOL
  
  const initialAllocations = [
    {
      mint: NATIVE_MINT, // wSOL
      symbol: "SOL",
      targetPercentage: 6000, // 60%
    },
    {
      mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), // devnet USDC
      symbol: "USDC",
      targetPercentage: 4000, // 40%
    },
  ];

  beforeEach(async () => {
    // Generate portfolio PDA
    [portfolioPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("portfolio"), user.publicKey.toBuffer()],
      program.programId
    );

    // Get user's wSOL associated token account
    userWsolAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      user.publicKey
    );

    // Generate portfolio wSOL vault PDA
    [portfolioWsolVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), portfolioPda.toBuffer(), NATIVE_MINT.toBuffer()],
      program.programId
    );
  });

  it("Should initialize portfolio with SOL deposit", async () => {
    try {
      // Create user's wSOL account if it doesn't exist
      try {
        await provider.connection.getAccountInfo(userWsolAccount);
      } catch (error) {
        await createAssociatedTokenAccount(
          provider.connection,
          user.payer,
          NATIVE_MINT,
          user.publicKey
        );
      }

      // Transfer SOL to wSOL account and sync
      const transferIx = SystemProgram.transfer({
        fromPubkey: user.publicKey,
        toPubkey: userWsolAccount,
        lamports: initialSolAmount,
      });

      const syncIx = createSyncNativeInstruction(userWsolAccount);

      const setupTx = new Transaction().add(transferIx, syncIx);
      await sendAndConfirmTransaction(provider.connection, setupTx, [user.payer]);

      // Initialize portfolio with SOL deposit
      const tx = await program.methods
        .initializePortfolio({
          initialAllocations,
          initialSolAmount: new anchor.BN(initialSolAmount),
          enableJupiterSwap: true,
        })
        .accounts({
          portfolio: portfolioPda,
          owner: user.publicKey,
          userWsolAccount: userWsolAccount,
          portfolioWsolVault: portfolioWsolVault,
          wsolMint: NATIVE_MINT,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("Transaction signature:", tx);

      // Verify portfolio was created
      const portfolio = await program.account.portfolio.fetch(portfolioPda);
      
      expect(portfolio.owner.toString()).to.equal(user.publicKey.toString());
      expect(portfolio.totalValue.toString()).to.equal(initialSolAmount.toString());
      expect(portfolio.allocations.length).to.equal(2);
      
      // Check SOL allocation
      const solAllocation = portfolio.allocations.find(a => a.mint.toString() === NATIVE_MINT.toString());
      expect(solAllocation).to.exist;
      expect(solAllocation?.currentAmount.toString()).to.equal(initialSolAmount.toString());
      expect(solAllocation?.targetPercentage).to.equal(6000);
      
      // Check USDC allocation
      const usdcAllocation = portfolio.allocations.find(a => a.mint.toString() === "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
      expect(usdcAllocation).to.exist;
      expect(usdcAllocation?.currentAmount.toString()).to.equal("0");
      expect(usdcAllocation?.targetPercentage).to.equal(4000);

      console.log("Portfolio initialized successfully!");
      console.log("Portfolio total value:", portfolio.totalValue.toString());
      console.log("Allocations:", portfolio.allocations);
      
    } catch (error) {
      console.error("Test failed:", error);
      throw error;
    }
  });

  it("Should initialize portfolio without Jupiter swap", async () => {
    try {
      // Create new user for this test
      const newUser = Keypair.generate();
      
      // Airdrop SOL to new user
      await provider.connection.requestAirdrop(newUser.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate PDAs for new user
      const [newPortfolioPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), newUser.publicKey.toBuffer()],
        program.programId
      );

      const newUserWsolAccount = await getAssociatedTokenAddress(
        NATIVE_MINT,
        newUser.publicKey
      );

      const [newPortfolioWsolVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), newPortfolioPda.toBuffer(), NATIVE_MINT.toBuffer()],
        program.programId
      );

      // Create wSOL account and fund it
      await createAssociatedTokenAccount(
        provider.connection,
        newUser,
        NATIVE_MINT,
        newUser.publicKey
      );

      const transferIx = SystemProgram.transfer({
        fromPubkey: newUser.publicKey,
        toPubkey: newUserWsolAccount,
        lamports: initialSolAmount,
      });

      const syncIx = createSyncNativeInstruction(newUserWsolAccount);

      const setupTx = new Transaction().add(transferIx, syncIx);
      await sendAndConfirmTransaction(provider.connection, setupTx, [newUser]);

      // Initialize portfolio without Jupiter swap
      const tx = await program.methods
        .initializePortfolio({
          initialAllocations,
          initialSolAmount: new anchor.BN(initialSolAmount),
          enableJupiterSwap: false,
        })
        .accounts({
          portfolio: newPortfolioPda,
          owner: newUser.publicKey,
          userWsolAccount: newUserWsolAccount,
          portfolioWsolVault: newPortfolioWsolVault,
          wsolMint: NATIVE_MINT,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([newUser])
        .rpc();

      console.log("Transaction signature:", tx);

      // Verify portfolio was created
      const portfolio = await program.account.portfolio.fetch(newPortfolioPda);
      
      expect(portfolio.owner.toString()).to.equal(newUser.publicKey.toString());
      expect(portfolio.totalValue.toString()).to.equal(initialSolAmount.toString());
      expect(portfolio.allocations.length).to.equal(2);

      console.log("Portfolio initialized without Jupiter swap successfully!");
      
    } catch (error) {
      console.error("Test failed:", error);
      throw error;
    }
  });
});