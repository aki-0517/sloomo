import { PublicKey } from '@solana/web3.js';

export const SOLANA_NETWORKS = {
  MAINNET: 'https://api.mainnet-beta.solana.com',
  DEVNET: 'https://api.devnet.solana.com',
  TESTNET: 'https://api.testnet.solana.com',
} as const;

export const CURRENT_NETWORK = SOLANA_NETWORKS.DEVNET;

export const TOKEN_ADDRESSES = {
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  BONK: new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'),
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
} as const;

export const PROGRAM_IDS = {
  TOKEN_PROGRAM: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  ASSOCIATED_TOKEN_PROGRAM: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
  SYSTEM_PROGRAM: new PublicKey('11111111111111111111111111111111'),
  RENT_PROGRAM: new PublicKey('SysvarRent111111111111111111111111111111111'),
} as const;

export const CREDIT_PROGRAM_IDS = {
  DEPOSIT_MANAGER: new PublicKey('CREDDepositManager11111111111111111111111111'),
  CREDIT_LINE_MANAGER: new PublicKey('CREDCreditLineManager1111111111111111111111'),
  REPAYMENT_MANAGER: new PublicKey('CREDRepaymentManager111111111111111111111'),
} as const;

export const TRANSACTION_SETTINGS = {
  CONFIRMATION_COMMITMENT: 'confirmed' as const,
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
} as const;