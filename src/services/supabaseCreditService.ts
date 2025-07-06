import { supabase, TABLES, Database } from '../config/supabase';
import { CreditScore, CreditLine, CreditEvaluation } from '../types/credit';

type CreditScoreRow = Database['public']['Tables']['credit_scores']['Row'];
type CreditScoreInsert = Database['public']['Tables']['credit_scores']['Insert'];
type CreditLineRow = Database['public']['Tables']['credit_lines']['Row'];
type CreditLineInsert = Database['public']['Tables']['credit_lines']['Insert'];

class SupabaseCreditService {
  async saveCreditScore(
    userId: string,
    creditScore: CreditScore,
    evaluationData?: CreditEvaluation
  ): Promise<CreditScoreRow | null> {
    try {
      const scoreData: CreditScoreInsert = {
        user_id: userId,
        score: creditScore.score,
        on_chain_score: creditScore.onChainScore,
        off_chain_score: creditScore.offChainScore,
        zk_proof_score: creditScore.zkProofScore,
        evaluation_data: evaluationData
      };

      const { data, error } = await supabase
        .from(TABLES.CREDIT_SCORES)
        .insert(scoreData)
        .select()
        .single();

      if (error) {
        console.error('Error saving credit score:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in saveCreditScore:', error);
      throw error;
    }
  }

  async getLatestCreditScore(userId: string): Promise<CreditScoreRow | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.CREDIT_SCORES)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting latest credit score:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getLatestCreditScore:', error);
      throw error;
    }
  }

  async getCreditScoreHistory(
    userId: string,
    limit: number = 10
  ): Promise<CreditScoreRow[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.CREDIT_SCORES)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting credit score history:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCreditScoreHistory:', error);
      throw error;
    }
  }

  async createCreditLine(
    userId: string,
    amount: number,
    apr: number,
    expiryDays: number = 30
  ): Promise<CreditLineRow | null> {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      const creditLineData: CreditLineInsert = {
        user_id: userId,
        amount,
        available_amount: amount,
        apr,
        expiry_date: expiryDate.toISOString(),
        status: 'active'
      };

      // First, check if user already has an active credit line
      const existingCreditLine = await this.getActiveCreditLine(userId);
      if (existingCreditLine) {
        // Update existing credit line instead of creating new one
        return this.updateCreditLine(existingCreditLine.id, {
          amount,
          available_amount: amount,
          apr,
          expiry_date: expiryDate.toISOString()
        });
      }

      const { data, error } = await supabase
        .from(TABLES.CREDIT_LINES)
        .insert(creditLineData)
        .select()
        .single();

      if (error) {
        console.error('Error creating credit line:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createCreditLine:', error);
      throw error;
    }
  }

  async getActiveCreditLine(userId: string): Promise<CreditLineRow | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.CREDIT_LINES)
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('expiry_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting active credit line:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getActiveCreditLine:', error);
      throw error;
    }
  }

  async updateCreditLine(
    creditLineId: string,
    updates: Partial<CreditLineRow>
  ): Promise<CreditLineRow | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.CREDIT_LINES)
        .update(updates)
        .eq('id', creditLineId)
        .select()
        .single();

      if (error) {
        console.error('Error updating credit line:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateCreditLine:', error);
      throw error;
    }
  }

  async useCreditLine(
    creditLineId: string,
    amount: number
  ): Promise<CreditLineRow | null> {
    try {
      // Get current credit line
      const { data: currentCreditLine, error: fetchError } = await supabase
        .from(TABLES.CREDIT_LINES)
        .select('*')
        .eq('id', creditLineId)
        .single();

      if (fetchError) {
        console.error('Error fetching credit line:', fetchError);
        throw fetchError;
      }

      if (!currentCreditLine) {
        throw new Error('Credit line not found');
      }

      if (currentCreditLine.available_amount < amount) {
        throw new Error('Insufficient credit available');
      }

      // Update available amount
      const newAvailableAmount = currentCreditLine.available_amount - amount;

      return this.updateCreditLine(creditLineId, {
        available_amount: newAvailableAmount
      });
    } catch (error) {
      console.error('Error in useCreditLine:', error);
      throw error;
    }
  }

  async repayCredit(
    creditLineId: string,
    amount: number
  ): Promise<CreditLineRow | null> {
    try {
      // Get current credit line
      const { data: currentCreditLine, error: fetchError } = await supabase
        .from(TABLES.CREDIT_LINES)
        .select('*')
        .eq('id', creditLineId)
        .single();

      if (fetchError) {
        console.error('Error fetching credit line:', fetchError);
        throw fetchError;
      }

      if (!currentCreditLine) {
        throw new Error('Credit line not found');
      }

      // Calculate new available amount (cannot exceed total amount)
      const newAvailableAmount = Math.min(
        currentCreditLine.available_amount + amount,
        currentCreditLine.amount
      );

      return this.updateCreditLine(creditLineId, {
        available_amount: newAvailableAmount
      });
    } catch (error) {
      console.error('Error in repayCredit:', error);
      throw error;
    }
  }

  async expireCreditLines(): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.CREDIT_LINES)
        .update({ status: 'expired' })
        .eq('status', 'active')
        .lt('expiry_date', new Date().toISOString());

      if (error) {
        console.error('Error expiring credit lines:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in expireCreditLines:', error);
      throw error;
    }
  }

  // Calculate estimated credit line based on latest credit score
  async estimateCreditLine(userId: string): Promise<{
    estimatedAmount: number;
    estimatedApr: number;
  } | null> {
    try {
      const latestScore = await this.getLatestCreditScore(userId);
      
      if (!latestScore) {
        return null;
      }

      // Call Supabase function to calculate credit terms
      const { data, error } = await supabase.rpc('calculate_available_credit', {
        credit_score: latestScore.score
      });

      if (error) {
        console.error('Error calculating available credit:', error);
        throw error;
      }

      const { data: aprData, error: aprError } = await supabase.rpc('calculate_apr', {
        credit_score: latestScore.score
      });

      if (aprError) {
        console.error('Error calculating APR:', aprError);
        throw aprError;
      }

      return {
        estimatedAmount: data,
        estimatedApr: aprData
      };
    } catch (error) {
      console.error('Error in estimateCreditLine:', error);
      throw error;
    }
  }

  // Real-time subscription for credit updates
  subscribeToUserCreditUpdates(
    userId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`credit-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.CREDIT_SCORES,
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.CREDIT_LINES,
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }
}

export const supabaseCreditService = new SupabaseCreditService();