/**
 * Allocation add/edit script
 * Usage: yarn portfolio:add-allocation [symbol] [percentage] [mint]
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";

async function addOrUpdateAllocation(symbol?: string, percentage?: number, mintAddress?: string) {
  try {
    console.log("=== Starting allocation add/edit ===");

    // Provider setup
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    
    const program = anchor.workspace.SloomoPortfolio as anchor.Program<SloomoPortfolio>;
    const user = provider.wallet;

    console.log("User:", user.publicKey.toString());

    // Get Portfolio PDA
    const [portfolioPda] = await PublicKey.findProgramAddress(
      [Buffer.from("portfolio"), user.publicKey.toBuffer()],
      program.programId
    );

    console.log("Portfolio PDA:", portfolioPda.toString());

    // Check portfolio existence
    let portfolioData;
    try {
      portfolioData = await program.account.portfolio.fetch(portfolioPda);
      console.log("✅ Portfolio verification completed");
    } catch (error) {
      console.log("❌ Portfolio not found");
      console.log("Please initialize portfolio first with 'yarn portfolio:init'");
      return;
    }

    // Argument setup or default values
    let allocationSymbol: string;
    let allocationPercentage: number;
    let allocationMint: PublicKey;

    if (symbol && percentage && mintAddress) {
      // Get from command line arguments
      allocationSymbol = symbol;
      allocationPercentage = percentage;
      try {
        allocationMint = new PublicKey(mintAddress);
      } catch (error) {
        console.log("❌ Invalid mint address:", mintAddress);
        return;
      }
    } else {
      // Default example: Add USDT-MET
      allocationSymbol = "USDT-MET";
      allocationPercentage = 20; // 20%
      allocationMint = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"); // devnet USDT
    }

    // Convert target allocation percentage to basis points (1% = 100 bp)
    const targetPercentageBps = Math.floor(allocationPercentage * 100);

    if (targetPercentageBps <= 0 || targetPercentageBps > 10000) {
      console.log("❌ Invalid allocation percentage (please enter in 0-100% range)");
      return;
    }

    console.log("\n=== Allocation Information ===");
    console.log("Symbol:", allocationSymbol);
    console.log("Mint:", allocationMint.toString());
    console.log("Target allocation percentage:", allocationPercentage + "%");
    console.log("Target allocation percentage (bp):", targetPercentageBps);

    // Display current allocation status
    console.log("\n=== Current Allocation Status ===");
    console.log("Allocations:", portfolioData.allocations.length + "/10");
    
    let currentTotalPercentage = 0;
    const existingAllocation = portfolioData.allocations.find(
      (allocation: any) => allocation.mint.toString() === allocationMint.toString()
    );

    portfolioData.allocations.forEach((allocation: any, index: number) => {
      currentTotalPercentage += allocation.targetPercentage;
      console.log(`${index + 1}. ${allocation.symbol}: ${allocation.targetPercentage / 100}%`);
      console.log(`   Mint: ${allocation.mint.toString()}`);
    });

    console.log(`Current total allocation: ${currentTotalPercentage / 100}%`);

    // Calculate and verify new total allocation
    let newTotalPercentage = currentTotalPercentage;
    if (existingAllocation) {
      // Case: Updating existing allocation
      newTotalPercentage = newTotalPercentage - existingAllocation.targetPercentage + targetPercentageBps;
      console.log(`\nUpdating existing allocation '${allocationSymbol}'`);
      console.log(`Current: ${existingAllocation.targetPercentage / 100}% → New: ${allocationPercentage}%`);
    } else {
      // Case: Adding new allocation
      newTotalPercentage += targetPercentageBps;
      console.log(`\nAdding new allocation '${allocationSymbol}'`);
    }

    console.log(`New total allocation: ${newTotalPercentage / 100}%`);

    if (newTotalPercentage > 10000) {
      console.log("❌ Total allocation exceeds 100%");
      console.log("Please adjust existing allocations before retrying");
      return;
    }

    // Confirmation message
    console.log("\n⚠️  This operation will change allocations");
    if (newTotalPercentage < 10000) {
      console.log(`Remaining allocation: ${(10000 - newTotalPercentage) / 100}%`);
    }

    console.log("\nSending allocation add/edit transaction...");

    // Execute allocation add/edit
    const tx = await program.methods
      .addOrUpdateAllocation(
        allocationMint,
        allocationSymbol,
        targetPercentageBps
      )
      .accounts({
        portfolio: portfolioPda,
        owner: user.publicKey,
      } as any)
      .rpc();

    console.log("✅ Allocation operation completed!");
    console.log("Transaction:", tx);
    console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Check status after update
    const afterData = await program.account.portfolio.fetch(portfolioPda);

    console.log("\n=== Allocation Status After Update ===");
    console.log("Allocations:", afterData.allocations.length + "/10");
    console.log("Last updated:", new Date(afterData.updatedAt.toNumber() * 1000).toLocaleString());

    let updatedTotalPercentage = 0;
    afterData.allocations.forEach((allocation: any, index: number) => {
      updatedTotalPercentage += allocation.targetPercentage;
      console.log(`${index + 1}. ${allocation.symbol}: ${allocation.targetPercentage / 100}%`);
      console.log(`   Mint: ${allocation.mint.toString()}`);
      console.log(`   Current amount: ${allocation.currentAmount.toString()} lamports`);
      console.log(`   APY: ${allocation.apy / 100}%`);
      console.log(`   Last yield update: ${allocation.lastYieldUpdate.toNumber() === 0 
        ? "Not updated" 
        : new Date(allocation.lastYieldUpdate.toNumber() * 1000).toLocaleString()}`);
    });

    console.log(`\nTotal allocation: ${updatedTotalPercentage / 100}%`);
    
    if (updatedTotalPercentage < 10000) {
      console.log(`Remaining allocation: ${(10000 - updatedTotalPercentage) / 100}%`);
    }

    if (updatedTotalPercentage === 10000) {
      console.log("✅ Allocation reached 100%");
    }

    console.log("\n=== Next Action Options ===");
    console.log("📊 Check portfolio: yarn portfolio:check");
    console.log("💰 USDC investment: yarn portfolio:deposit [amount]");
    console.log("🔄 Rebalance: yarn portfolio:rebalance");
    console.log("📈 Add allocation: yarn portfolio:add-allocation [symbol] [percentage] [mint]");

  } catch (error) {
    console.error("❌ Allocation operation error:");
    console.error(error);
    
    if (error.message.includes("InvalidAllocationPercentage")) {
      console.log("💡 Hint: Invalid allocation percentage (enter in 0-100% range)");
    } else if (error.message.includes("AllocationOverflow")) {
      console.log("💡 Hint: Allocation count reached limit (10) or total allocation exceeds 100%");
    } else if (error.message.includes("InvalidTokenSymbol")) {
      console.log("💡 Hint: Invalid token symbol");
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const symbol = args[0];
  const percentage = args[1] ? parseFloat(args[1]) : undefined;
  const mintAddress = args[2];
  
  if (symbol && percentage && mintAddress) {
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      console.log("❌ Invalid allocation percentage (enter in 0-100% range)");
      console.log("Usage: yarn portfolio:add-allocation USDT-MET 20 Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
      process.exit(1);
    }
  } else if (args.length > 0 && args.length < 3) {
    console.log("❌ Insufficient arguments");
    console.log("Usage: yarn portfolio:add-allocation [symbol] [percentage] [mint]");
    console.log("Example: yarn portfolio:add-allocation USDT-MET 20 Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
    process.exit(1);
  }
  
  return { symbol, percentage, mintAddress };
}

// Script execution
if (require.main === module) {
  const { symbol, percentage, mintAddress } = parseArgs();
  addOrUpdateAllocation(symbol, percentage, mintAddress).catch(console.error);
}

export { addOrUpdateAllocation };