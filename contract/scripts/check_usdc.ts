/**
 * USDC balance and vault check script
 * Usage: yarn portfolio:check-usdc
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { SloomoPortfolio } from "../target/types/sloomo_portfolio";

async function checkUsdc() {
  try {
    console.log("=== Starting USDC balance and vault status check ===");

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

    // USDC settings
    const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // devnet USDC
    console.log("USDC Mint:", usdcMint.toString());

    // Get user's USDC token account
    const userUsdcAccount = await getAssociatedTokenAddress(
      usdcMint,
      user.publicKey
    );

    console.log("User USDC Account:", userUsdcAccount.toString());

    // Get portfolio's USDC vault PDA
    const [portfolioUsdcVault] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), portfolioPda.toBuffer(), usdcMint.toBuffer()],
      program.programId
    );

    console.log("Portfolio USDC Vault:", portfolioUsdcVault.toString());

    console.log("\n=== User USDC Balance ===");
    try {
      const userUsdcAccountInfo = await program.provider.connection.getTokenAccountBalance(userUsdcAccount);
      console.log("Balance:", userUsdcAccountInfo.value.uiAmount || 0, "USDC");
      console.log("Balance (lamports):", userUsdcAccountInfo.value.amount);
      console.log("Decimals:", userUsdcAccountInfo.value.decimals);
      
      if ((userUsdcAccountInfo.value.uiAmount || 0) === 0) {
        console.log("⚠️  No USDC balance available");
        console.log("Get USDC on devnet: https://spl-token-faucet.com/");
      }
    } catch (error) {
      console.log("❌ User's USDC token account not found");
      console.log("Please create Associated Token Account");
      console.log("Or get USDC on devnet: https://spl-token-faucet.com/");
    }

    console.log("\n=== Portfolio USDC Vault ===");
    try {
      const vaultAccountInfo = await program.provider.connection.getTokenAccountBalance(portfolioUsdcVault);
      console.log("Vault balance:", vaultAccountInfo.value.uiAmount || 0, "USDC");
      console.log("Vault balance (lamports):", vaultAccountInfo.value.amount);
      console.log("Vault owner:", (await program.provider.connection.getAccountInfo(portfolioUsdcVault))?.owner.toString());
    } catch (error) {
      console.log("❌ Portfolio USDC vault not found");
      console.log("Execute investment first to create vault: yarn portfolio:deposit [amount]");
    }

    // Check portfolio status
    console.log("\n=== Portfolio Status ===");
    try {
      const portfolioData = await program.account.portfolio.fetch(portfolioPda);
      console.log("Portfolio owner:", portfolioData.owner.toString());
      console.log("Total value:", portfolioData.totalValue.toString(), "lamports");
      console.log("Total value (USDC):", (portfolioData.totalValue.toNumber() / 1_000_000).toFixed(6), "USDC");
      console.log("Allocations:", portfolioData.allocations.length);
      console.log("Last updated:", new Date(portfolioData.updatedAt.toNumber() * 1000).toLocaleString());

      // USDC-related allocation information
      console.log("\n=== USDC-related Allocations ===");
      const usdcAllocations = portfolioData.allocations.filter((allocation: any) => 
        allocation.symbol.toUpperCase().includes("USDC") || 
        allocation.mint.toString() === usdcMint.toString()
      );

      if (usdcAllocations.length > 0) {
        usdcAllocations.forEach((allocation: any, index: number) => {
          console.log(`${index + 1}. ${allocation.symbol}`);
          console.log(`   Mint: ${allocation.mint.toString()}`);
          console.log(`   Current amount: ${allocation.currentAmount.toString()} lamports`);
          console.log(`   Current amount (USDC): ${(allocation.currentAmount.toNumber() / 1_000_000).toFixed(6)} USDC`);
          console.log(`   Target percentage: ${allocation.targetPercentage / 100}%`);
          console.log(`   APY: ${allocation.apy / 100}%`);
          
          // Calculate actual allocation percentage
          if (portfolioData.totalValue.toNumber() > 0) {
            const actualPercentage = (allocation.currentAmount.toNumber() / portfolioData.totalValue.toNumber()) * 100;
            console.log(`   Actual percentage: ${actualPercentage.toFixed(2)}%`);
          }
        });
      } else {
        console.log("No USDC-related allocations found");
      }

    } catch (error) {
      console.log("❌ Portfolio not found");
      console.log("Please initialize portfolio first with 'yarn portfolio:init'");
    }

    // Account details display
    console.log("\n=== Account Details ===");
    
    // User's SOL balance
    try {
      const solBalance = await program.provider.connection.getBalance(user.publicKey);
      console.log("User SOL balance:", (solBalance / anchor.web3.LAMPORTS_PER_SOL).toFixed(6), "SOL");
    } catch (error) {
      console.log("SOL balance fetch error:", error.message);
    }

    // Account existence check
    console.log("\n=== Account Existence Check ===");
    
    const userUsdcExists = await program.provider.connection.getAccountInfo(userUsdcAccount);
    console.log("User USDC account:", userUsdcExists ? "Exists" : "Not created");
    
    const vaultExists = await program.provider.connection.getAccountInfo(portfolioUsdcVault);
    console.log("Portfolio USDC vault:", vaultExists ? "Exists" : "Not created");
    
    const portfolioExists = await program.provider.connection.getAccountInfo(portfolioPda);
    console.log("Portfolio account:", portfolioExists ? "Exists" : "Not created");

    // Recommended actions
    console.log("\n=== Recommended Actions ===");
    
    if (!portfolioExists) {
      console.log("1. Initialize portfolio: yarn portfolio:init");
    }
    
    if (!userUsdcExists) {
      console.log("1. Get USDC on devnet: https://spl-token-faucet.com/");
      console.log("2. Or create token account using USDC mint");
    }
    
    if (portfolioExists && userUsdcExists && !vaultExists) {
      console.log("1. Execute first investment: yarn portfolio:deposit [amount]");
    }
    
    if (portfolioExists && userUsdcExists && vaultExists) {
      console.log("✅ All accounts are properly configured");
      console.log("Available actions:");
      console.log("  - Execute investment: yarn portfolio:deposit [amount]");
      console.log("  - Check portfolio: yarn portfolio:check");
      console.log("  - Rebalance: yarn portfolio:rebalance");
    }

    console.log("\n=== Explorer Links ===");
    console.log("User account:", `https://explorer.solana.com/account/${user.publicKey.toString()}?cluster=devnet`);
    console.log("User USDC account:", `https://explorer.solana.com/account/${userUsdcAccount.toString()}?cluster=devnet`);
    console.log("Portfolio account:", `https://explorer.solana.com/account/${portfolioPda.toString()}?cluster=devnet`);
    console.log("Portfolio USDC vault:", `https://explorer.solana.com/account/${portfolioUsdcVault.toString()}?cluster=devnet`);

  } catch (error) {
    console.error("❌ USDC status check error:");
    console.error(error);
    
    if (error.message.includes("Invalid public key")) {
      console.log("💡 Hint: Invalid address specified");
    } else if (error.message.includes("Network request failed")) {
      console.log("💡 Hint: Please check network connection");
    }
  }
}

// Script execution
if (require.main === module) {
  checkUsdc().catch(console.error);
}

export { checkUsdc };