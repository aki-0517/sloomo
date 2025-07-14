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
    
    // Get the latest blockhash and set it on the transaction
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.userWallet.publicKey;
    console.log("✅ Blockhash set:", blockhash);
    console.log("✅ Fee payer:", this.userWallet.publicKey.toString());
    
    // Get min context slot for the transaction
    const minContextSlot = await this.connection.getSlot('confirmed');
    console.log("✅ Min context slot:", minContextSlot);
    
    // Send transaction using Mobile Wallet Adapter
    console.log("🔐 Requesting wallet signature...");
    const signature = await this.userWallet.signAndSendTransaction(transaction, minContextSlot);
    console.log("✅ Transaction signed and sent:", signature);
    
    return signature;
  }

  async initializePortfolio(): Promise<string> {
    console.log("🚀 Starting portfolio initialization...");
    
    const program = await this.getProgram();
    if (!program) throw new Error("Program not initialized");
    console.log("✅ Program initialized:", program.programId.toString());

    const [portfolioPda] = await this.getPortfolioPda();
    console.log("✅ Portfolio PDA:", portfolioPda.toString());

    const initialAllocations = [
      {
        mint: NATIVE_MINT, // wSOL
        symbol: "SOL",
        targetPercentage: 6000, // 60%
      },
      {
        mint: DEVNET_USDC_MINT,
        symbol: "USDC", 
        targetPercentage: 4000, // 40%
      },
    ];
    console.log("✅ Initial allocations:", initialAllocations);

    console.log("🔧 Creating instruction...");
    const initIx = await program.methods
      .initializePortfolio({ initialAllocations })
      .accounts({
        portfolio: portfolioPda,
        owner: this.userWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    console.log("✅ Instruction created");

    const transaction = new Transaction().add(initIx);
    console.log("📤 Sending transaction...");
    const signature = await this.sendTransaction(transaction);
    console.log("✅ Transaction sent with signature:", signature);
    
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
    const program = await this.getProgram();
    if (!program) throw new Error("Program not initialized");

    const [portfolioPda] = await this.getPortfolioPda();
    const depositAmountLamports = Math.floor(amount * LAMPORTS_PER_SOL);
    
    const userWsolAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      this.userWallet.publicKey
    );

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
    const program = await this.getProgram();
    if (!program) throw new Error("Program not initialized");

    const [portfolioPda] = await this.getPortfolioPda();
    
    try {
      const portfolioData = await (program.account as any).portfolio.fetch(portfolioPda);
      return portfolioData;
    } catch (error) {
      // Portfolio doesn't exist
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

  async getUserBalances(): Promise<{ sol: number; usdc: number }> {
    // Get SOL balance
    const solBalance = await this.connection.getBalance(this.userWallet.publicKey);
    const solBalanceInSol = solBalance / LAMPORTS_PER_SOL;

    // Get USDC balance
    let usdcBalance = 0;
    try {
      const userUsdcAccount = await getAssociatedTokenAddress(
        DEVNET_USDC_MINT,
        this.userWallet.publicKey
      );
      const usdcAccountInfo = await this.connection.getTokenAccountBalance(userUsdcAccount);
      usdcBalance = usdcAccountInfo.value.uiAmount || 0;
    } catch (error) {
      // USDC account doesn't exist
      usdcBalance = 0;
    }

    return {
      sol: solBalanceInSol,
      usdc: usdcBalance
    };
  }
}