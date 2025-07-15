/**
 * Portfolio initialization script
 * Usage: yarn portfolio:init
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";

async function initializePortfolio() {
  try {
    console.log("=== Portfolio initialization started ===");

    // Provider setup
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    
    const program = anchor.workspace.SloomoPortfolio as anchor.Program<SloomoPortfolio>;
    const user = provider.wallet;

    console.log("User:", user.publicKey.toString());
    console.log("Program ID:", program.programId.toString());

    // Generate Portfolio PDA
    const [portfolioPda, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("portfolio"), user.publicKey.toBuffer()],
      program.programId
    );

    console.log("Portfolio PDA:", portfolioPda.toString());
    console.log("Bump:", bump);

    // Initial allocation settings (e.g., 60:40 split between SOL and USDC)
    const initialAllocations = [
      {
        mint: new PublicKey("So11111111111111111111111111111111111111112"), // WSOL
        symbol: "SOL",
        targetPercentage: 6000, // 60%
      },
      {
        mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), // devnet USDC
        symbol: "USDC", 
        targetPercentage: 4000, // 40%
      },
    ];

    console.log("Initial allocation settings:");
    initialAllocations.forEach((allocation, index) => {
      console.log(`  ${index + 1}. ${allocation.symbol}: ${allocation.targetPercentage / 100}%`);
      console.log(`     Mint: ${allocation.mint.toString()}`);
    });

    // Check existing portfolio
    try {
      const existingPortfolio = await program.account.portfolio.fetch(portfolioPda);
      console.log("⚠️  Portfolio is already initialized");
      console.log("Existing portfolio information:");
      console.log("  Owner:", existingPortfolio.owner.toString());
      console.log("  Number of allocations:", existingPortfolio.allocations.length);
      console.log("  Total value:", existingPortfolio.totalValue.toString());
      return;
    } catch (error) {
      // Continue if portfolio doesn't exist
      console.log("Creating new portfolio...");
    }

    // Execute portfolio initialization
    console.log("Sending initialization transaction...");
    const tx = await program.methods
      .initializePortfolio({ initialAllocations })
      .accounts({
        portfolio: portfolioPda,
        owner: user.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("✅ Portfolio initialization completed!");
    console.log("Transaction:", tx);
    console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Check initialized portfolio
    const portfolioData = await program.account.portfolio.fetch(portfolioPda);
    
    console.log("\n=== Initialized Portfolio Information ===");
    console.log("Owner:", portfolioData.owner.toString());
    console.log("Total value:", portfolioData.totalValue.toString());
    console.log("Number of allocations:", portfolioData.allocations.length);
    console.log("Created at:", new Date(portfolioData.createdAt.toNumber() * 1000));
    
    portfolioData.allocations.forEach((allocation, index) => {
      console.log(`\nAllocation ${index + 1}:`);
      console.log(`  Symbol: ${allocation.symbol}`);
      console.log(`  Mint: ${allocation.mint.toString()}`);
      console.log(`  Target percentage: ${allocation.targetPercentage / 100}%`);
      console.log(`  Current amount: ${allocation.currentAmount.toString()}`);
      console.log(`  APY: ${allocation.apy / 100}%`);
    });

  } catch (error) {
    console.error("❌ Portfolio initialization error:");
    console.error(error);
    
    if (error.message.includes("already in use")) {
      console.log("💡 Hint: Portfolio is already initialized");
    } else if (error.message.includes("insufficient funds")) {
      console.log("💡 Hint: Insufficient SOL balance. Run 'solana airdrop 2'");
    } else if (error.message.includes("InvalidAllocationPercentage")) {
      console.log("💡 Hint: Allocation total does not equal 100%");
    }
  }
}

// Script execution
if (require.main === module) {
  initializePortfolio().catch(console.error);
}

export { initializePortfolio };