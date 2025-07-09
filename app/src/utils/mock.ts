import { Stablecoin, Allocation, Transaction, PortfolioData } from '../types/stablecoin';

export const mockAssets: Stablecoin[] = [
  {
    symbol: 'USDC-SOLEND',
    name: 'Solend USDC',
    apy: 4.25,
    tvl: 120_000_000,
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  {
    symbol: 'USDT-MET',
    name: 'Meteora USDT',
    apy: 3.90,
    tvl: 80_000_000,
    logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  },
  {
    symbol: 'USDC-MANGO',
    name: 'Mango USDC',
    apy: 5.12,
    tvl: 45_000_000,
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  {
    symbol: 'USDT-DRIFT',
    name: 'Drift USDT',
    apy: 3.75,
    tvl: 32_000_000,
    logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  },
  {
    symbol: 'USDC-KAMINO',
    name: 'Kamino USDC',
    apy: 4.80,
    tvl: 65_000_000,
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  }
];

export const mockAllocations: Allocation[] = [
  { symbol: 'USDC-SOLEND', currentPct: 40, targetPct: 40 },
  { symbol: 'USDT-MET', currentPct: 25, targetPct: 25 },
  { symbol: 'USDC-MANGO', currentPct: 20, targetPct: 20 },
  { symbol: 'USDT-DRIFT', currentPct: 10, targetPct: 10 },
  { symbol: 'USDC-KAMINO', currentPct: 5, targetPct: 5 }
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: '2025-07-09 14:32',
    action: 'Rebalance',
    amount: '+120 USDC',
    status: 'Confirmed'
  },
  {
    id: '2',
    date: '2025-07-08 10:15',
    action: 'Deposit',
    amount: '+500 USDT',
    status: 'Confirmed'
  },
  {
    id: '3',
    date: '2025-07-07 16:45',
    action: 'Withdraw',
    amount: '-200 USDC',
    status: 'Confirmed'
  },
  {
    id: '4',
    date: '2025-07-06 09:20',
    action: 'Rebalance',
    amount: '+75 USDT',
    status: 'Pending'
  }
];

export const mockPortfolio: PortfolioData = {
  totalValue: 12345.67,
  allocations: mockAllocations,
  growth: 2.34
};

export const mockChartData = [
  { day: '7/1', value: 11800 },
  { day: '7/2', value: 12050 },
  { day: '7/3', value: 11950 },
  { day: '7/4', value: 12200 },
  { day: '7/5', value: 12100 },
  { day: '7/6', value: 12300 },
  { day: '7/7', value: 12280 },
  { day: '7/8', value: 12400 },
  { day: '7/9', value: 12345.67 }
];