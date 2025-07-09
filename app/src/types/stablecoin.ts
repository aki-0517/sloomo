export interface Stablecoin {
  symbol: string;         // "USDC-SOLEND"
  name: string;           // "Solend Deposited USDC"
  apy: number;            // 4.25
  tvl: number;            // USD
  logo: string;           // CDN URL
}

export interface Allocation {
  symbol: string;
  currentPct: number;
  targetPct: number;
}

export interface Transaction {
  id: string;
  date: string;
  action: string;
  amount: string;
  status: 'Pending' | 'Confirmed' | 'Failed';
}

export interface PortfolioData {
  totalValue: number;
  allocations: Allocation[];
  growth: number; // percentage
}