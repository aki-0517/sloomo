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

describe("Full Initialize Flow Test", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SloomoPortfolio as Program<SloomoPortfolio>;
  
  const user = provider.wallet as anchor.Wallet;
  const initialSolAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL
  
  const initialAllocations = [
    {
      mint: NATIVE_MINT, // wSOL
      symbol: "GOOGLx",
      targetPercentage: 6000, // 60%
    },
    {
      mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), // devnet USDC
      symbol: "COINx",
      targetPercentage: 4000, // 40%
    },
  ];

  it("Should initialize portfolio and switch to rebalance mode", async () => {
    console.log("🚀 Starting full initialize flow test...");
    
    // Generate portfolio PDA
    const [portfolioPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("portfolio"), user.publicKey.toBuffer()],
      program.programId
    );

    // Get user's wSOL associated token account
    const userWsolAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      user.publicKey
    );

    // Generate portfolio wSOL vault PDA
    const [portfolioWsolVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), portfolioPda.toBuffer(), NATIVE_MINT.toBuffer()],
      program.programId
    );

    console.log("📍 Portfolio PDA:", portfolioPda.toString());
    console.log("🎯 User wSOL account:", userWsolAccount.toString());
    console.log("🏦 Portfolio wSOL vault:", portfolioWsolVault.toString());

    // Check if portfolio already exists
    try {
      const existingPortfolio = await program.account.portfolio.fetch(portfolioPda);
      console.log("⚠️ Portfolio already exists:", existingPortfolio);
      return;
    } catch (error) {
      console.log("✅ Portfolio doesn't exist, proceeding with initialization...");
    }

    // Create user's wSOL account if it doesn't exist
    try {
      await provider.connection.getAccountInfo(userWsolAccount);
      console.log("✅ wSOL account already exists");
    } catch (error) {
      console.log("🔧 Creating wSOL account...");
      await createAssociatedTokenAccount(
        provider.connection,
        user.payer,
        NATIVE_MINT,
        user.publicKey
      );
    }

    // Transfer SOL to wSOL account and sync
    console.log("💰 Transferring SOL to wSOL account...");
    const transferIx = SystemProgram.transfer({
      fromPubkey: user.publicKey,
      toPubkey: userWsolAccount,
      lamports: initialSolAmount,
    });

    const syncIx = createSyncNativeInstruction(userWsolAccount);

    const setupTx = new Transaction().add(transferIx, syncIx);
    await sendAndConfirmTransaction(provider.connection, setupTx, [user.payer]);
    console.log("✅ SOL transferred and synced");

    // Initialize portfolio with SOL deposit
    console.log("🏛️ Initializing portfolio with SOL deposit...");
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

    console.log("✅ Portfolio initialized! Transaction:", tx);
    console.log("🔗 Explorer: https://explorer.solana.com/tx/" + tx + "?cluster=devnet");

    // Wait for transaction to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify portfolio was created and has correct data
    console.log("🔍 Verifying portfolio creation...");
    const portfolio = await program.account.portfolio.fetch(portfolioPda);
    
    console.log("✅ Portfolio verification:");
    console.log("  Owner:", portfolio.owner.toString());
    console.log("  Total Value:", portfolio.totalValue.toString());
    console.log("  Allocations:", portfolio.allocations.length);
    console.log("  Created At:", new Date(portfolio.createdAt * 1000).toISOString());
    console.log("  Is Rebalancing:", portfolio.isRebalancing);
    
    // Check SOL allocation
    const solAllocation = portfolio.allocations.find(a => a.mint.toString() === NATIVE_MINT.toString());
    console.log("  SOL/GOOGLx allocation:", solAllocation);
    
    // Check USDC allocation
    const usdcAllocation = portfolio.allocations.find(a => a.mint.toString() === "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
    console.log("  USDC/COINx allocation:", usdcAllocation);

    // Test state transition - portfolio should now exist and frontend should show Rebalance button
    console.log("🔄 Testing state transition...");
    console.log("  Portfolio exists:", !!portfolio);
    console.log("  Should show Rebalance button:", !!portfolio ? "YES" : "NO");
    
    console.log("🎉 Initialize flow test completed successfully!");
  });
});