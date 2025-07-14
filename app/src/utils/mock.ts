import { Stablecoin, Allocation, Transaction, PortfolioData } from '../types/stablecoin';

export const mockAssets: Stablecoin[] = [
  {
    symbol: 'GOOGLx',
    name: 'Alphabet xStock',
    apy: 4.25,
    tvl: 120_000_000,
    logo: 'https://wsrv.nl/?w=32&h=32&url=https%3A%2F%2Fxstocks-metadata.backed.fi%2Flogos%2Ftokens%2FGOOGLx.png&dpr=2&quality=80'
  },
  {
    symbol: 'COINx',
    name: 'Coinbase xStock',
    apy: 3.90,
    tvl: 80_000_000,
    logo: 'https://wsrv.nl/?w=32&h=32&url=https%3A%2F%2Fxstocks-metadata.backed.fi%2Flogos%2Ftokens%2FCOINx.png&dpr=2&quality=80'
  },
  {
    symbol: 'AAPLx',
    name: 'Apple xStock',
    apy: 5.12,
    tvl: 45_000_000,
    logo: 'https://wsrv.nl/?w=32&h=32&url=https%3A%2F%2Fxstocks-metadata.backed.fi%2Flogos%2Ftokens%2FAAPLx.png&dpr=2&quality=80'
  },
  {
    symbol: 'AMZNx',
    name: 'Amazon xStock',
    apy: 3.75,
    tvl: 32_000_000,
    logo: 'https://wsrv.nl/?w=32&h=32&url=https%3A%2F%2Fxstocks-metadata.backed.fi%2Flogos%2Ftokens%2FAMZNx.png&dpr=2&quality=80'
  }
];

export const mockAllocations: Allocation[] = [
  { symbol: 'GOOGLx', currentPct: 60, targetPct: 60 },
  { symbol: 'COINx', currentPct: 40, targetPct: 40 }
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