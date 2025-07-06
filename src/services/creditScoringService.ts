import { Connection, PublicKey } from '@solana/web3.js';
import { CURRENT_NETWORK, CREDIT_SCORING } from '../constants/solana';
import { CreditScore, CreditEvaluation, PlaidData, ZKProofData } from '../types/credit';

class CreditScoringService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(CURRENT_NETWORK, 'confirmed');
  }

  async calculateCreditScore(
    walletAddress: string,
    plaidData?: PlaidData,
    zkProofData?: ZKProofData
  ): Promise<CreditScore> {
    try {
      const onChainScore = await this.calculateOnChainScore(walletAddress);
      const offChainScore = plaidData ? await this.calculateOffChainScore(plaidData) : 0;
      const zkProofScore = zkProofData ? await this.calculateZKProofScore(zkProofData) : 0;

      const weightedScore = 
        (onChainScore * CREDIT_SCORING.WEIGHTS.ON_CHAIN) +
        (offChainScore * CREDIT_SCORING.WEIGHTS.OFF_CHAIN) +
        (zkProofScore * CREDIT_SCORING.WEIGHTS.ZK_PROOF);

      const normalizedScore = Math.min(
        Math.max(weightedScore, CREDIT_SCORING.MINIMUM_SCORE),
        CREDIT_SCORING.MAXIMUM_SCORE
      );

      return {
        score: Math.round(normalizedScore),
        onChainScore: Math.round(onChainScore),
        offChainScore: Math.round(offChainScore),
        zkProofScore: Math.round(zkProofScore),
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Error calculating credit score:', error);
      throw error;
    }
  }

  private async calculateOnChainScore(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      
      const transactionHistory = await this.getTransactionHistory(publicKey);
      const transactionScore = this.scoreTransactionHistory(transactionHistory);
      
      const accountAge = await this.getAccountAge(publicKey);
      const ageScore = this.scoreAccountAge(accountAge);
      
      const balance = await this.connection.getBalance(publicKey);
      const balanceScore = this.scoreBalance(balance);
      
      const tokenHoldings = await this.getTokenHoldings(publicKey);
      const holdingsScore = this.scoreTokenHoldings(tokenHoldings);

      return (transactionScore * 0.3) + (ageScore * 0.2) + (balanceScore * 0.3) + (holdingsScore * 0.2);
    } catch (error) {
      console.error('Error calculating on-chain score:', error);
      return 0;
    }
  }

  private async calculateOffChainScore(plaidData: PlaidData): Promise<number> {
    try {
      const incomeScore = this.scoreIncome(plaidData.averageMonthlyIncome);
      const expenseScore = this.scoreExpenses(plaidData.averageMonthlyExpenses);
      const balanceScore = this.scoreBankBalance(plaidData.accountBalance);
      const stabilityScore = this.scoreTransactionStability(plaidData.transactionHistory);

      return (incomeScore * 0.4) + (expenseScore * 0.2) + (balanceScore * 0.2) + (stabilityScore * 0.2);
    } catch (error) {
      console.error('Error calculating off-chain score:', error);
      return 0;
    }
  }

  private async calculateZKProofScore(zkProofData: ZKProofData): Promise<number> {
    try {
      if (zkProofData.verificationStatus !== 'verified') {
        return 0;
      }

      const dataSourceScore = this.scoreDataSource(zkProofData.dataSource);
      const freshnessScore = this.scoreDataFreshness(zkProofData.timestamp);

      return (dataSourceScore * 0.7) + (freshnessScore * 0.3);
    } catch (error) {
      console.error('Error calculating ZK proof score:', error);
      return 0;
    }
  }

  private async getTransactionHistory(publicKey: PublicKey) {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit: 100 }
      );

      const transactions = await Promise.all(
        signatures.map(sig => this.connection.getTransaction(sig.signature))
      );

      return transactions.filter(tx => tx !== null);
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  private scoreTransactionHistory(transactions: any[]): number {
    if (transactions.length === 0) return 300;

    const frequency = transactions.length;
    const recentActivity = transactions.filter(tx => {
      const txDate = new Date(tx.blockTime! * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return txDate > thirtyDaysAgo;
    }).length;

    const frequencyScore = Math.min(frequency * 5, 400);
    const activityScore = Math.min(recentActivity * 10, 400);

    return (frequencyScore + activityScore) / 2;
  }

  private async getAccountAge(publicKey: PublicKey): Promise<number> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit: 1000 }
      );

      if (signatures.length === 0) return 0;

      const oldestSignature = signatures[signatures.length - 1];
      const oldestTransaction = await this.connection.getTransaction(oldestSignature.signature);
      
      if (!oldestTransaction?.blockTime) return 0;

      const accountCreationDate = new Date(oldestTransaction.blockTime * 1000);
      const now = new Date();
      const ageInDays = Math.floor((now.getTime() - accountCreationDate.getTime()) / (1000 * 60 * 60 * 24));

      return ageInDays;
    } catch (error) {
      console.error('Error getting account age:', error);
      return 0;
    }
  }

  private scoreAccountAge(ageInDays: number): number {
    if (ageInDays === 0) return 300;
    if (ageInDays < 30) return 400;
    if (ageInDays < 90) return 500;
    if (ageInDays < 180) return 600;
    if (ageInDays < 365) return 700;
    return 800;
  }

  private scoreBalance(balance: number): number {
    const solBalance = balance / 1000000000; // Convert lamports to SOL
    
    if (solBalance < 0.1) return 300;
    if (solBalance < 1) return 400;
    if (solBalance < 5) return 500;
    if (solBalance < 10) return 600;
    if (solBalance < 50) return 700;
    return 800;
  }

  private async getTokenHoldings(publicKey: PublicKey) {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      return tokenAccounts.value.map(account => ({
        mint: account.account.data.parsed.info.mint,
        amount: account.account.data.parsed.info.tokenAmount.uiAmount,
      }));
    } catch (error) {
      console.error('Error getting token holdings:', error);
      return [];
    }
  }

  private scoreTokenHoldings(holdings: any[]): number {
    if (holdings.length === 0) return 300;

    const diversityScore = Math.min(holdings.length * 50, 400);
    const valueScore = holdings.reduce((sum, holding) => sum + (holding.amount || 0), 0);
    const normalizedValueScore = Math.min(valueScore / 10, 400);

    return (diversityScore + normalizedValueScore) / 2;
  }

  private scoreIncome(monthlyIncome: number): number {
    if (monthlyIncome < 1000) return 300;
    if (monthlyIncome < 2000) return 400;
    if (monthlyIncome < 3000) return 500;
    if (monthlyIncome < 5000) return 600;
    if (monthlyIncome < 8000) return 700;
    return 800;
  }

  private scoreExpenses(monthlyExpenses: number): number {
    return Math.max(400 - (monthlyExpenses / 100), 300);
  }

  private scoreBankBalance(balance: number): number {
    if (balance < 500) return 300;
    if (balance < 1000) return 400;
    if (balance < 2500) return 500;
    if (balance < 5000) return 600;
    if (balance < 10000) return 700;
    return 800;
  }

  private scoreTransactionStability(transactions: any[]): number {
    if (transactions.length < 10) return 300;
    
    const monthlyTransactions = transactions.reduce((acc, tx) => {
      const month = new Date(tx.date).getMonth();
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const consistency = Object.values(monthlyTransactions).reduce((sum: number, count: any) => sum + count, 0) / 12;
    return Math.min(consistency * 50 + 300, 800);
  }

  private scoreDataSource(source: string): number {
    const sourceScores: { [key: string]: number } = {
      'plaid': 800,
      'bank_statement': 700,
      'credit_bureau': 850,
      'employment_verification': 750,
      'income_verification': 700,
    };

    return sourceScores[source] || 400;
  }

  private scoreDataFreshness(timestamp: Date): number {
    const now = new Date();
    const ageInDays = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24));

    if (ageInDays <= 7) return 800;
    if (ageInDays <= 30) return 700;
    if (ageInDays <= 90) return 600;
    if (ageInDays <= 180) return 500;
    return 400;
  }
}

export const creditScoringService = new CreditScoringService();