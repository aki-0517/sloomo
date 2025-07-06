export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.creditpay.app';

export const API_ENDPOINTS = {
  DEPOSIT: '/api/v1/deposit',
  BALANCE: '/api/v1/balance',
  SCORE: '/api/v1/score',
  LOAN: '/api/v1/loan',
  REPAY: '/api/v1/repay',
  TRANSACTIONS: '/api/v1/transactions',
  USER: '/api/v1/user',
} as const;

export const API_TIMEOUTS = {
  DEFAULT: 10000,
  CREDIT_SCORING: 30000,
  BLOCKCHAIN_OPERATIONS: 60000,
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const PLAID_CONFIG = {
  CLIENT_NAME: 'Solana Mobile CreditPay',
  COUNTRY_CODES: ['US', 'CA'],
  LANGUAGE: 'en',
  PRODUCTS: ['transactions', 'accounts', 'identity'],
} as const;