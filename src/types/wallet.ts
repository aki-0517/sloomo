export interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  balance: number;
  usdcBalance: number;
  isLoading: boolean;
  error: string | null;
}

export interface WalletConnection {
  publicKey: string;
  signTransaction: (transaction: any) => Promise<any>;
  signMessage: (message: string) => Promise<string>;
  disconnect: () => Promise<void>;
}

export interface TokenAccount {
  mint: string;
  owner: string;
  amount: number;
  decimals: number;
}