// Ensure structuredClone is available
if (typeof global.structuredClone === 'undefined') {
  try {
    global.structuredClone = require('@ungap/structured-clone');
  } catch {
    global.structuredClone = require('core-js/actual/structured-clone');
  }
}

import * as anchor from "@coral-xyz/anchor";
import { 
  PublicKey, 
  SystemProgram, 
  LAMPORTS_PER_SOL, 
  Transaction,
  Connection,
  Keypair
} from "@solana/web3.js";
import { 
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT
} from "@solana/spl-token";
import idl from "./sloomo_portfolio.json";

const DEVNET_USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const PROGRAM_ID = new PublicKey("EAkD1pREBvpRtoAY88hmwKYr2qhdbU1rLYQ9sxTAzxhC"); // devnet program ID

export interface ContractInteractionConfig {
  connection: Connection;
  userWallet: {
    publicKey: PublicKey;
    signTransaction: (transaction: Transaction) => Promise<Transaction>;
    signAndSendTransaction: (transaction: Transaction, minContextSlot: number) => Promise<string>;
  };
}

export class ContractInteractions {
  private connection: Connection;
  private userWallet: any;
  private program: anchor.Program<any> | null = null;

  constructor(config: ContractInteractionConfig) {
    this.connection = config.connection;
    this.userWallet = config.userWallet;
  }

  private async getProgram() {
    if (this.program) return this.program;
    
    const provider = new anchor.AnchorProvider(
      this.connection,
      this.userWallet as any,
      anchor.AnchorProvider.defaultOptions()
    );
    
    this.program = new anchor.Program(idl as any, provider);
    
    return this.program;
  }

  private async getPortfolioPda(): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("portfolio"), this.userWallet.publicKey.toBuffer()],
      PROGRAM_ID
    );
  }

  private async sendTransaction(transaction: Transaction): Promise<string> {
    console.log("📤 Preparing transaction for Mobile Wallet Adapter...");
    
    // Check balance one more time before sending
    const preBalance = await this.connection.getBalance(this.userWallet.publicKey);
    console.log("💰 Pre-transaction SOL balance:", preBalance / LAMPORTS_PER_SOL, "SOL");
    
    // Get the latest blockhash and set it on the transaction
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.userWallet.publicKey;
    console.log("✅ Blockhash set:", blockhash);
    console.log("✅ Fee payer:", this.userWallet.publicKey.toString());
    console.log("📝 Transaction instructions count:", transaction.instructions.length);
    
    // Estimate transaction fee
    try {
      const fee = await this.connection.getFeeForMessage(transaction.compileMessage());
      console.log("💸 Estimated transaction fee:", fee?.value ? fee.value / LAMPORTS_PER_SOL : 'unknown', "SOL");
    } catch (error) {
      console.log("⚠️ Could not estimate transaction fee:", error);
    }
    
    // Get min context slot for the transaction
    const minContextSlot = await this.connection.getSlot('confirmed');
    console.log("✅ Min context slot:", minContextSlot);
    
    // Send transaction using Mobile Wallet Adapter
    console.log("🔐 Requesting wallet signature...");
    try {
      const signature = await this.userWallet.signAndSendTransaction(transaction, minContextSlot);
      console.log("✅ Transaction signed and sent:", signature);
      console.log("🔗 Explorer link: https://explorer.solana.com/tx/" + signature + "?cluster=devnet");
      return signature;
    } catch (error) {
      console.error("❌ Transaction failed:", error);
      
      // Check balance after failed transaction
      const postBalance = await this.connection.getBalance(this.userWallet.publicKey);
      console.log("💰 Post-failure SOL balance:", postBalance / LAMPORTS_PER_SOL, "SOL");
      
      throw error;
    }
  }

  async initializePortfolio(solAmount: number = 0.1): Promise<string> {
    console.log("🚀 Starting portfolio initialization with SOL deposit...");
    console.log("💰 SOL amount for initialization:", solAmount, "SOL");
    
    // Check current balance first
    const currentBalance = await this.getUserBalances();
    console.log("📊 Current balances before initialization:", currentBalance);
    
    // Need SOL for deposit + account creation and fees
    const totalNeeded = solAmount + 0.05;
    if (currentBalance.sol < totalNeeded) {
      console.log("❌ Insufficient SOL balance for initialization!");
      console.log("   Current:", currentBalance.sol, "SOL");
      console.log("   Needed:", totalNeeded, "SOL (", solAmount, "for deposit + 0.05 for fees)");
      console.log("💡 Portfolio initialization requires SOL deposit plus fees");
      throw new Error(`Insufficient SOL balance for initialization. Have ${currentBalance.sol} SOL, need ${totalNeeded} SOL`);
    }
    
    const program = await this.getProgram();
    if (!program) throw new Error("Program not initialized");
    console.log("✅ Program initialized:", program.programId.toString());

    const [portfolioPda] = await this.getPortfolioPda();
    console.log("✅ Portfolio PDA:", portfolioPda.toString());

    const initialAllocations = [
      {
        mint: NATIVE_MINT, // wSOL (GOOGLx representation)
        symbol: "GOOGLx",
        targetPercentage: 6000, // 60%
      },
      {
        mint: DEVNET_USDC_MINT, // USDC (COINx representation)
        symbol: "COINx", 
        targetPercentage: 4000, // 40%
      },
    ];
    console.log("✅ Initial allocations:", initialAllocations);

    // Get user's wSOL account
    const userWsolAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      this.userWallet.publicKey
    );
    
    // Get portfolio wSOL vault
    const [portfolioWsolVault] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), portfolioPda.toBuffer(), NATIVE_MINT.toBuffer()],
      PROGRAM_ID
    );

    const initialSolAmountLamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
    console.log("📋 Initial SOL amount (lamports):", initialSolAmountLamports);

    // Check if wSOL account exists
    const wsolAccountInfo = await this.connection.getAccountInfo(userWsolAccount);
    const needsWsolAccount = !wsolAccountInfo;

    const instructions = [];

    if (needsWsolAccount) {
      // Create wSOL account
      instructions.push(
        createAssociatedTokenAccountInstruction(
          this.userWallet.publicKey,
          userWsolAccount,
          this.userWallet.publicKey,
          NATIVE_MINT
        )
      );
    }

    // Transfer SOL to wSOL account
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: this.userWallet.publicKey,
        toPubkey: userWsolAccount,
        lamports: initialSolAmountLamports,
      })
    );

    // Sync wSOL account
    instructions.push(createSyncNativeInstruction(userWsolAccount));

    console.log("🔧 Creating initialization instruction...");
    const initIx = await program.methods
      .initializePortfolio({ 
        initialAllocations,
        initialSolAmount: new anchor.BN(initialSolAmountLamports),
        enableJupiterSwap: true
      })
      .accounts({
        portfolio: portfolioPda,
        owner: this.userWallet.publicKey,
        userWsolAccount: userWsolAccount,
        portfolioWsolVault: portfolioWsolVault,
        wsolMint: NATIVE_MINT,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .instruction();
    console.log("✅ Instruction created");

    instructions.push(initIx);

    const transaction = new Transaction().add(...instructions);
    console.log("📤 Sending transaction...");
    const signature = await this.sendTransaction(transaction);
    console.log("✅ Transaction sent with signature:", signature);
    
    // Wait for transaction confirmation with better error handling
    console.log("⏳ Waiting for transaction confirmation...");
    console.log("🔗 Transaction signature:", signature);
    console.log("🔗 Explorer link: https://explorer.solana.com/tx/" + signature + "?cluster=devnet");
    
    try {
      // Use a more robust confirmation strategy
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');
      console.log("✅ Transaction confirmed!");
    } catch (confirmError) {
      console.log("⚠️ Transaction confirmation timeout, but checking if portfolio was created...");
      console.log("⚠️ Confirmation error:", confirmError);
      
      // Try to get transaction status manually
      try {
        const txStatus = await this.connection.getTransaction(signature, { commitment: 'confirmed' });
        if (txStatus) {
          console.log("✅ Transaction found in blockchain:", txStatus);
        } else {
          console.log("❌ Transaction not found in blockchain");
        }
      } catch (statusError) {
        console.log("❌ Could not check transaction status:", statusError);
      }
    }
    
    // Double-check that the portfolio was created with retries
    console.log("🔍 Verifying portfolio creation...");
    let portfolioData = null;
    for (let i = 0; i < 5; i++) {
      try {
        const program = await this.getProgram();
        const [portfolioPda] = await this.getPortfolioPda();
        portfolioData = await (program.account as any).portfolio.fetch(portfolioPda);
        console.log("✅ Portfolio verified successfully:", portfolioData);
        break;
      } catch (error) {
        console.log(`❌ Portfolio verification failed (attempt ${i + 1}):`, error);
        if (i < 4) {
          console.log(`⏳ Waiting ${(i + 1) * 2} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
        }
      }
    }
    
    if (!portfolioData) {
      console.log("❌ Portfolio verification failed after 5 attempts");
      console.log("💡 The transaction might have succeeded but is taking longer to process");
      console.log("💡 Check the transaction on Solana Explorer: https://explorer.solana.com/tx/" + signature + "?cluster=devnet");
      
      // Don't throw an error - let the user know they should check manually
      console.log("⚠️ Portfolio creation status unknown - returning signature for manual verification");
    }
    
    return signature;
  }

  async depositUsdc(amount: number): Promise<string> {
    const program = await this.getProgram();
    if (!program) throw new Error("Program not initialized");

    const [portfolioPda] = await this.getPortfolioPda();
    
    const userUsdcAccount = await getAssociatedTokenAddress(
      DEVNET_USDC_MINT,
      this.userWallet.publicKey
    );

    const [portfolioUsdcVault] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), portfolioPda.toBuffer(), DEVNET_USDC_MINT.toBuffer()],
      PROGRAM_ID
    );

    const depositAmountLamports = Math.floor(amount * 1_000_000); // USDC has 6 decimals

    const depositIx = await program.methods
      .depositUsdc(new anchor.BN(depositAmountLamports))
      .accounts({
        portfolio: portfolioPda,
        userUsdcAccount: userUsdcAccount,
        portfolioUsdcVault: portfolioUsdcVault,
        usdcMint: DEVNET_USDC_MINT,
        owner: this.userWallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const transaction = new Transaction().add(depositIx);
    return await this.sendTransaction(transaction);
  }

  async depositSol(amount: number): Promise<string> {
    console.log("🚀 Starting SOL deposit...");
    console.log("💰 Deposit amount:", amount, "SOL");
    
    const program = await this.getProgram();
    if (!program) throw new Error("Program not initialized");

    // Check current balance first
    const currentBalance = await this.getUserBalances();
    console.log("📊 Current balances before deposit:", currentBalance);
    
    // Research shows 0.05 SOL buffer recommended for Solana devnet operations
    // ATA creation: ~0.002 SOL + transaction fees: ~0.000005 SOL + safety buffer
    if (currentBalance.sol < amount + 0.05) { 
      const needed = amount + 0.05;
      console.log("❌ Insufficient SOL balance!");
      console.log("   Current:", currentBalance.sol, "SOL");
      console.log("   Needed:", needed, "SOL (including 0.05 SOL safety buffer)");
      console.log("   Missing:", needed - currentBalance.sol, "SOL");
      console.log("💡 Solana requires rent-exempt balance for account creation");
      throw new Error(`Insufficient SOL balance. Have ${currentBalance.sol} SOL, need ${needed} SOL (including safety buffer for account creation)`);
    }

    const [portfolioPda] = await this.getPortfolioPda();
    const depositAmountLamports = Math.floor(amount * LAMPORTS_PER_SOL);
    console.log("📋 Deposit amount (lamports):", depositAmountLamports);
    console.log("🏛️ Portfolio PDA:", portfolioPda.toString());
    
    const userWsolAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      this.userWallet.publicKey
    );
    console.log("🎯 wSOL account:", userWsolAccount.toString());

    const [portfolioWsolVault] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), portfolioPda.toBuffer(), NATIVE_MINT.toBuffer()],
      PROGRAM_ID
    );

    // Check if wSOL account exists
    const wsolAccountInfo = await this.connection.getAccountInfo(userWsolAccount);
    const needsWsolAccount = !wsolAccountInfo;

    const instructions = [];

    if (needsWsolAccount) {
      // Create wSOL account
      instructions.push(
        createAssociatedTokenAccountInstruction(
          this.userWallet.publicKey,
          userWsolAccount,
          this.userWallet.publicKey,
          NATIVE_MINT
        )
      );
    }

    // Transfer SOL to wSOL account
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: this.userWallet.publicKey,
        toPubkey: userWsolAccount,
        lamports: depositAmountLamports,
      })
    );

    // Sync wSOL account
    instructions.push(createSyncNativeInstruction(userWsolAccount));

    // Deposit instruction
    const depositIx = await program.methods
      .depositUsdc(new anchor.BN(depositAmountLamports))
      .accounts({
        portfolio: portfolioPda,
        userUsdcAccount: userWsolAccount,
        portfolioUsdcVault: portfolioWsolVault,
        usdcMint: NATIVE_MINT,
        owner: this.userWallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    instructions.push(depositIx);

    const transaction = new Transaction().add(...instructions);
    return await this.sendTransaction(transaction);
  }

  async rebalancePortfolio(slippageBps: number = 50): Promise<string> {
    const program = await this.getProgram();
    if (!program) throw new Error("Program not initialized");

    const [portfolioPda] = await this.getPortfolioPda();
    
    const portfolioData = await (program.account as any).portfolio.fetch(portfolioPda);
    
    if (portfolioData.isRebalancing) {
      throw new Error("Rebalancing is already in progress");
    }

    const wsolTokenAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      this.userWallet.publicKey
    );

    const targetAllocations = portfolioData.allocations.map((allocation: any) => ({
      mint: allocation.mint,
      targetPercentage: allocation.targetPercentage,
    }));

    const rebalanceIx = await program.methods
      .solJupiterRebalance(targetAllocations, slippageBps)
      .accounts({
        portfolio: portfolioPda,
        owner: this.userWallet.publicKey,
        wsolTokenAccount: wsolTokenAccount,
        wsolMint: NATIVE_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const transaction = new Transaction().add(rebalanceIx);
    return await this.sendTransaction(transaction);
  }

  async getPortfolioData(): Promise<any> {
    console.log('🔍 Getting portfolio data...');
    const program = await this.getProgram();
    if (!program) throw new Error("Program not initialized");

    const [portfolioPda] = await this.getPortfolioPda();
    console.log('📍 Portfolio PDA:', portfolioPda.toString());
    
    try {
      console.log('📡 Fetching portfolio account data...');
      const portfolioData = await (program.account as any).portfolio.fetch(portfolioPda);
      console.log('✅ Portfolio data found:', JSON.stringify(portfolioData, null, 2));
      console.log('✅ Portfolio owner:', portfolioData.owner.toString());
      console.log('✅ Portfolio total value:', portfolioData.totalValue?.toString());
      console.log('✅ Portfolio allocations count:', portfolioData.allocations?.length);
      console.log('✅ Portfolio is valid:', !!portfolioData);
      return portfolioData;
    } catch (error) {
      console.log('❌ Portfolio doesn\'t exist or error fetching:', error);
      console.log('❌ Error type:', error.constructor.name);
      console.log('❌ Error message:', error.message);
      
      // Check if it's an account not found error
      if (error.message?.includes('Account does not exist')) {
        console.log('❌ Portfolio account does not exist');
      } else if (error.message?.includes('Invalid account discriminator')) {
        console.log('❌ Portfolio account has invalid discriminator');
      }
      
      return null;
    }
  }

  async updateAllocation(symbol: string, mint: PublicKey, targetPercentage: number): Promise<string> {
    console.log("🔧 Updating allocation:", symbol, "to", targetPercentage / 100, "%");
    
    const program = await this.getProgram();
    if (!program) throw new Error("Program not initialized");

    const [portfolioPda] = await this.getPortfolioPda();

    console.log("✅ Portfolio PDA:", portfolioPda.toString());

    const updateIx = await program.methods
      .addOrUpdateAllocation({
        mint,
        symbol,
        targetPercentage,
      })
      .accounts({
        portfolio: portfolioPda,
        owner: this.userWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const transaction = new Transaction().add(updateIx);
    console.log("📤 Sending allocation update transaction...");
    const signature = await this.sendTransaction(transaction);
    console.log("✅ Allocation updated with signature:", signature);
    
    return signature;
  }

  async checkTransactionStatus(signature: string): Promise<boolean> {
    console.log("🔍 Checking transaction status for:", signature);
    
    try {
      const txStatus = await this.connection.getTransaction(signature, { commitment: 'confirmed' });
      if (txStatus) {
        console.log("✅ Transaction found:", txStatus);
        console.log("✅ Transaction err:", txStatus.meta?.err);
        return txStatus.meta?.err === null;
      } else {
        console.log("❌ Transaction not found");
        return false;
      }
    } catch (error) {
      console.log("❌ Error checking transaction status:", error);
      return false;
    }
  }

  async getUserBalances(): Promise<{ sol: number; usdc: number }> {
    console.log("🔍 Checking user balances...");
    console.log("📍 Wallet address:", this.userWallet.publicKey.toString());
    console.log("🌐 RPC endpoint:", this.connection.rpcEndpoint);
    
    // Get SOL balance
    const solBalance = await this.connection.getBalance(this.userWallet.publicKey);
    const solBalanceInSol = solBalance / LAMPORTS_PER_SOL;
    console.log("💰 SOL balance (lamports):", solBalance);
    console.log("💰 SOL balance (SOL):", solBalanceInSol);

    // Get USDC balance
    let usdcBalance = 0;
    try {
      const userUsdcAccount = await getAssociatedTokenAddress(
        DEVNET_USDC_MINT,
        this.userWallet.publicKey
      );
      console.log("🏦 USDC account address:", userUsdcAccount.toString());
      
      const usdcAccountInfo = await this.connection.getTokenAccountBalance(userUsdcAccount);
      usdcBalance = usdcAccountInfo.value.uiAmount || 0;
      console.log("💵 USDC balance:", usdcBalance);
    } catch (error) {
      console.log("⚠️ USDC account doesn't exist or error:", error);
      usdcBalance = 0;
    }

    const result = {
      sol: solBalanceInSol,
      usdc: usdcBalance
    };
    console.log("✅ Final balances:", result);
    return result;
  }
}