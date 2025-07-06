// Central Supabase API integration
import { supabaseUserService } from '../services/supabaseUserService';
import { supabaseCreditService } from '../services/supabaseCreditService';
import { supabaseTransactionService } from '../services/supabaseTransactionService';
import { ApiResponse } from '../types/api';
import { CreditScore, CreditLine } from '../types/credit';
import { Transaction } from '../types/payment';

export class SupabaseApiService {
  // User management
  async createUser(walletAddress: string, email?: string) {
    try {
      const user = await supabaseUserService.createUser({
        wallet_address: walletAddress,
        email,
        is_onboarded: false
      });
      
      return {
        success: true,
        data: user
      } as ApiResponse<typeof user>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      } as ApiResponse<null>;
    }
  }

  async getUserByWallet(walletAddress: string) {
    try {
      const user = await supabaseUserService.getUserByWalletAddress(walletAddress);
      
      return {
        success: true,
        data: user
      } as ApiResponse<typeof user>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user'
      } as ApiResponse<null>;
    }
  }

  // Credit management
  async saveCreditScore(userId: string, creditScore: CreditScore) {
    try {
      const savedScore = await supabaseCreditService.saveCreditScore(userId, creditScore);
      
      return {
        success: true,
        data: savedScore
      } as ApiResponse<typeof savedScore>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save credit score'
      } as ApiResponse<null>;
    }
  }

  async getCreditScore(userId: string) {
    try {
      const creditScore = await supabaseCreditService.getLatestCreditScore(userId);
      
      return {
        success: true,
        data: creditScore
      } as ApiResponse<typeof creditScore>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get credit score'
      } as ApiResponse<null>;
    }
  }

  async createCreditLine(userId: string, amount: number, apr: number) {
    try {
      const creditLine = await supabaseCreditService.createCreditLine(userId, amount, apr);
      
      return {
        success: true,
        data: creditLine
      } as ApiResponse<typeof creditLine>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create credit line'
      } as ApiResponse<null>;
    }
  }

  async getActiveCreditLine(userId: string) {
    try {
      const creditLine = await supabaseCreditService.getActiveCreditLine(userId);
      
      return {
        success: true,
        data: creditLine
      } as ApiResponse<typeof creditLine>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get credit line'
      } as ApiResponse<null>;
    }
  }

  async useCreditLine(creditLineId: string, amount: number) {
    try {
      const updatedCreditLine = await supabaseCreditService.useCreditLine(creditLineId, amount);
      
      return {
        success: true,
        data: updatedCreditLine
      } as ApiResponse<typeof updatedCreditLine>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to use credit line'
      } as ApiResponse<null>;
    }
  }

  // Transaction management
  async createTransaction(userId: string, transaction: Omit<Transaction, 'id' | 'timestamp'>) {
    try {
      const savedTransaction = await supabaseTransactionService.createTransaction(userId, transaction);
      
      return {
        success: true,
        data: savedTransaction
      } as ApiResponse<typeof savedTransaction>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create transaction'
      } as ApiResponse<null>;
    }
  }

  async getUserTransactions(userId: string, limit?: number, offset?: number) {
    try {
      const transactions = await supabaseTransactionService.getUserTransactions(
        userId, 
        limit, 
        offset
      );
      
      return {
        success: true,
        data: transactions
      } as ApiResponse<typeof transactions>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transactions'
      } as ApiResponse<null>;
    }
  }

  async updateTransactionStatus(
    transactionId: string, 
    status: 'pending' | 'confirmed' | 'failed',
    signature?: string
  ) {
    try {
      const updatedTransaction = await supabaseTransactionService.updateTransactionStatus(
        transactionId, 
        status, 
        signature
      );
      
      return {
        success: true,
        data: updatedTransaction
      } as ApiResponse<typeof updatedTransaction>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update transaction'
      } as ApiResponse<null>;
    }
  }

  async getTransactionStats(userId: string) {
    try {
      const stats = await supabaseTransactionService.getTransactionStats(userId);
      
      return {
        success: true,
        data: stats
      } as ApiResponse<typeof stats>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transaction stats'
      } as ApiResponse<null>;
    }
  }

  // Utility methods
  async estimateCreditLine(userId: string) {
    try {
      const estimate = await supabaseCreditService.estimateCreditLine(userId);
      
      return {
        success: true,
        data: estimate
      } as ApiResponse<typeof estimate>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to estimate credit line'
      } as ApiResponse<null>;
    }
  }

  // Real-time subscriptions setup
  setupRealTimeSubscriptions(userId: string, callbacks: {
    onUserUpdate?: (user: any) => void;
    onCreditUpdate?: (credit: any) => void;
    onTransactionUpdate?: (transaction: any) => void;
  }) {
    const subscriptions = [];

    if (callbacks.onUserUpdate) {
      const userSub = supabaseUserService.subscribeToUserUpdates(userId, callbacks.onUserUpdate);
      subscriptions.push(userSub);
    }

    if (callbacks.onCreditUpdate) {
      const creditSub = supabaseCreditService.subscribeToUserCreditUpdates(userId, callbacks.onCreditUpdate);
      subscriptions.push(creditSub);
    }

    if (callbacks.onTransactionUpdate) {
      const transactionSub = supabaseTransactionService.subscribeToUserTransactions(userId, callbacks.onTransactionUpdate);
      subscriptions.push(transactionSub);
    }

    return subscriptions;
  }
}

export const supabaseApiService = new SupabaseApiService();