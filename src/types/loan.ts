export interface Loan {
  id: string;
  userId: string;
  amount: number;
  outstandingAmount: number;
  apr: number;
  originationDate: Date;
  dueDate: Date;
  status: 'active' | 'paid' | 'overdue' | 'defaulted';
  repaymentSchedule: RepaymentSchedule[];
}

export interface RepaymentSchedule {
  id: string;
  loanId: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: Date;
  paidAmount?: number;
}

export interface LoanApplication {
  amount: number;
  purpose: string;
  creditScore: number;
  requestedApr?: number;
}

export interface LoanOffer {
  amount: number;
  apr: number;
  term: number; // days
  monthlyPayment: number;
  totalInterest: number;
  expiryDate: Date;
}