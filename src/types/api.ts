export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DepositRequest {
  userId: string;
  amount: number;
  transactionSignature: string;
}

export interface DepositResponse {
  transactionId: string;
  amount: number;
  newBalance: number;
  timestamp: Date;
}

export interface BalanceResponse {
  usdcBalance: number;
  solBalance: number;
  bonkBalance: number;
  creditLine?: {
    totalAmount: number;
    availableAmount: number;
    usedAmount: number;
  };
}

export interface ScoreRequest {
  userId: string;
  walletAddress: string;
  plaidData?: any;
  zkProofData?: any;
}

export interface ScoreResponse {
  score: number;
  breakdown: {
    onChain: number;
    offChain: number;
    zkProof: number;
  };
  creditLineEligible: boolean;
  maxCreditAmount: number;
  recommendedApr: number;
}

export interface LoanRequest {
  userId: string;
  amount: number;
  creditScore: number;
  purpose: string;
}

export interface LoanResponse {
  loanId: string;
  approvedAmount: number;
  apr: number;
  term: number;
  monthlyPayment: number;
  repaymentSchedule: RepaymentSchedule[];
}

export interface RepaymentRequest {
  loanId: string;
  amount: number;
  transactionSignature: string;
}

export interface RepaymentResponse {
  repaymentId: string;
  amount: number;
  remainingBalance: number;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
}