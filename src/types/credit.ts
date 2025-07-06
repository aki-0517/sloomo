export interface CreditScore {
  score: number;
  onChainScore: number;
  offChainScore: number;
  zkProofScore: number;
  lastUpdated: Date;
}

export interface CreditLine {
  id: string;
  userId: string;
  amount: number;
  availableAmount: number;
  apr: number;
  expiryDate: Date;
  status: 'active' | 'expired' | 'suspended';
}

export interface CreditEvaluation {
  transactionFrequency: number;
  assetHoldings: number;
  stakingHistory: number;
  bankAccountData?: PlaidData;
  vantageScore?: number;
  zkProofData?: ZKProofData;
}

export interface PlaidData {
  accountBalance: number;
  transactionHistory: PlaidTransaction[];
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
}

export interface PlaidTransaction {
  id: string;
  amount: number;
  date: Date;
  description: string;
  category: string;
}

export interface ZKProofData {
  proofHash: string;
  verificationStatus: 'verified' | 'pending' | 'failed';
  dataSource: string;
  timestamp: Date;
}