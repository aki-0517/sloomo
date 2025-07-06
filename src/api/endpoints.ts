import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';

export const buildApiUrl = (endpoint: string, params?: Record<string, string>): string => {
  const url = new URL(endpoint, API_BASE_URL);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  return url.toString();
};

export const apiEndpoints = {
  deposit: () => buildApiUrl(API_ENDPOINTS.DEPOSIT),
  balance: (userId: string) => buildApiUrl(API_ENDPOINTS.BALANCE, { userId }),
  score: () => buildApiUrl(API_ENDPOINTS.SCORE),
  loan: () => buildApiUrl(API_ENDPOINTS.LOAN),
  repay: () => buildApiUrl(API_ENDPOINTS.REPAY),
  transactions: (userId: string, limit?: string) => 
    buildApiUrl(API_ENDPOINTS.TRANSACTIONS, { userId, ...(limit && { limit }) }),
  user: (userId: string) => buildApiUrl(API_ENDPOINTS.USER, { userId }),
} as const;