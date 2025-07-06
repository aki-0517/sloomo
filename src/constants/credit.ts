export const CREDIT_SCORING = {
  WEIGHTS: {
    ON_CHAIN: 0.4,
    OFF_CHAIN: 0.4,
    ZK_PROOF: 0.2,
  },
  MINIMUM_SCORE: 300,
  MAXIMUM_SCORE: 850,
  CREDIT_LINE_THRESHOLD: 600,
} as const;

export const CREDIT_LINE_LIMITS = {
  MINIMUM_AMOUNT: 50,
  MAXIMUM_AMOUNT: 10000,
  DEFAULT_APR: 18.0,
  MINIMUM_APR: 8.0,
  MAXIMUM_APR: 35.0,
} as const;

export const LOAN_TERMS = {
  DEFAULT_TERM_DAYS: 30,
  MINIMUM_TERM_DAYS: 7,
  MAXIMUM_TERM_DAYS: 365,
  GRACE_PERIOD_DAYS: 3,
  LATE_FEE_PERCENTAGE: 5.0,
} as const;

export const REPAYMENT_FREQUENCY = {
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
} as const;

export const CREDIT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
  DEFAULTED: 'defaulted',
} as const;