import { supabase, TABLES, Database } from '../config/supabase';
import { Transaction } from '../types/payment';

type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];

class SupabaseTransactionService {
  async createTransaction(
    userId: string,
    transaction: Omit<Transaction, 'id' | 'timestamp'>
  ): Promise<TransactionRow | null> {
    try {
      const transactionData: TransactionInsert = {
        user_id: userId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        sender: transaction.sender,
        recipient: transaction.recipient,
        status: transaction.status,
        signature: transaction.signature,
        memo: transaction.memo,
        reference: transaction.reference
      };

      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .insert(transactionData)
        .select()
        .single();

      if (error) {
        console.error('Error creating transaction:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createTransaction:', error);
      throw error;
    }
  }

  async updateTransactionStatus(
    transactionId: string,
    status: 'pending' | 'confirmed' | 'failed',
    signature?: string
  ): Promise<TransactionRow | null> {
    try {
      const updates: Partial<TransactionRow> = { status };
      if (signature) {
        updates.signature = signature;
      }

      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .update(updates)
        .eq('id', transactionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating transaction status:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateTransactionStatus:', error);
      throw error;
    }
  }

  async getTransactionById(transactionId: string): Promise<TransactionRow | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting transaction by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTransactionById:', error);
      throw error;
    }
  }

  async getTransactionBySignature(signature: string): Promise<TransactionRow | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('signature', signature)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting transaction by signature:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTransactionBySignature:', error);
      throw error;
    }
  }

  async getUserTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    type?: TransactionRow['type']
  ): Promise<TransactionRow[]> {
    try {
      let query = supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting user transactions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserTransactions:', error);
      throw error;
    }
  }

  async getUserTransactionsByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
    type?: TransactionRow['type']
  ): Promise<TransactionRow[]> {
    try {
      let query = supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting transactions by date range:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserTransactionsByDateRange:', error);
      throw error;
    }
  }

  async getPendingTransactions(userId: string): Promise<TransactionRow[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting pending transactions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPendingTransactions:', error);
      throw error;
    }
  }

  async getTransactionStats(userId: string): Promise<{
    totalTransactions: number;
    totalVolume: number;
    totalDeposits: number;
    totalPayments: number;
    totalLoans: number;
    totalRepayments: number;
  }> {
    try {
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('type, amount, currency')
        .eq('user_id', userId)
        .eq('status', 'confirmed');

      if (error) {
        console.error('Error getting transaction stats:', error);
        throw error;
      }

      const stats = {
        totalTransactions: data?.length || 0,
        totalVolume: 0,
        totalDeposits: 0,
        totalPayments: 0,
        totalLoans: 0,
        totalRepayments: 0
      };

      data?.forEach(transaction => {
        // Convert all amounts to USDC equivalent for stats
        let usdcAmount = transaction.amount;
        if (transaction.currency === 'SOL') {
          usdcAmount = transaction.amount * 100; // Simplified SOL to USDC conversion
        } else if (transaction.currency === 'BONK') {
          usdcAmount = transaction.amount * 0.00001; // Simplified BONK to USDC conversion
        }

        stats.totalVolume += usdcAmount;

        switch (transaction.type) {
          case 'deposit':
            stats.totalDeposits += usdcAmount;
            break;
          case 'payment':
          case 'transfer':
            stats.totalPayments += usdcAmount;
            break;
          case 'loan':
            stats.totalLoans += usdcAmount;
            break;
          case 'repayment':
            stats.totalRepayments += usdcAmount;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error in getTransactionStats:', error);
      throw error;
    }
  }

  async markTransactionAsConfirmed(
    transactionId: string,
    signature: string
  ): Promise<TransactionRow | null> {
    return this.updateTransactionStatus(transactionId, 'confirmed', signature);
  }

  async markTransactionAsFailed(transactionId: string): Promise<TransactionRow | null> {
    return this.updateTransactionStatus(transactionId, 'failed');
  }

  // Real-time subscription for transaction updates
  subscribeToUserTransactions(
    userId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`transactions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.TRANSACTIONS,
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }

  // Subscribe to specific transaction updates
  subscribeToTransaction(
    transactionId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`transaction-${transactionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: TABLES.TRANSACTIONS,
          filter: `id=eq.${transactionId}`
        },
        callback
      )
      .subscribe();
  }

  async deleteTransaction(transactionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .delete()
        .eq('id', transactionId);

      if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteTransaction:', error);
      throw error;
    }
  }
}

export const supabaseTransactionService = new SupabaseTransactionService();