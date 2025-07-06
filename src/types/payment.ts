export interface PaymentRequest {
  recipient: string;
  amount: number;
  currency: 'USDC' | 'SOL' | 'BONK';
  memo?: string;
  reference?: string;
}

export interface QRCodeData {
  type: 'payment' | 'transfer';
  recipient: string;
  amount?: number;
  currency?: 'USDC' | 'SOL' | 'BONK';
  memo?: string;
  reference?: string;
}

export interface Transaction {
  id: string;
  type: 'payment' | 'transfer' | 'deposit' | 'loan' | 'repayment';
  amount: number;
  currency: 'USDC' | 'SOL' | 'BONK';
  sender: string;
  recipient: string;
  status: 'pending' | 'confirmed' | 'failed';
  signature?: string;
  timestamp: Date;
  memo?: string;
  reference?: string;
}

export interface TransferRequest {
  recipient: string;
  amount: number;
  currency: 'USDC' | 'SOL' | 'BONK';
  memo?: string;
  useCredit?: boolean;
}