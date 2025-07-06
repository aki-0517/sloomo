import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database table names
export const TABLES = {
  USERS: 'users',
  CREDIT_SCORES: 'credit_scores',
  CREDIT_LINES: 'credit_lines',
  TRANSACTIONS: 'transactions',
  LOANS: 'loans',
  REPAYMENT_SCHEDULES: 'repayment_schedules',
  AUDIT_LOGS: 'audit_logs',
} as const;

// Database types based on our TypeScript interfaces
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          wallet_address: string;
          email?: string;
          created_at: string;
          updated_at: string;
          is_onboarded: boolean;
          kyc_status: 'not_started' | 'pending' | 'approved' | 'rejected';
          plaid_linked: boolean;
          preferences: {
            currency: 'USD' | 'SOL';
            notifications: boolean;
            biometric: boolean;
          };
        };
        Insert: {
          id?: string;
          wallet_address: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
          is_onboarded?: boolean;
          kyc_status?: 'not_started' | 'pending' | 'approved' | 'rejected';
          plaid_linked?: boolean;
          preferences?: {
            currency: 'USD' | 'SOL';
            notifications: boolean;
            biometric: boolean;
          };
        };
        Update: {
          id?: string;
          wallet_address?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
          is_onboarded?: boolean;
          kyc_status?: 'not_started' | 'pending' | 'approved' | 'rejected';
          plaid_linked?: boolean;
          preferences?: {
            currency: 'USD' | 'SOL';
            notifications: boolean;
            biometric: boolean;
          };
        };
      };
      credit_scores: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          on_chain_score: number;
          off_chain_score: number;
          zk_proof_score: number;
          created_at: string;
          updated_at: string;
          evaluation_data: any;
        };
        Insert: {
          id?: string;
          user_id: string;
          score: number;
          on_chain_score: number;
          off_chain_score: number;
          zk_proof_score: number;
          created_at?: string;
          updated_at?: string;
          evaluation_data?: any;
        };
        Update: {
          id?: string;
          user_id?: string;
          score?: number;
          on_chain_score?: number;
          off_chain_score?: number;
          zk_proof_score?: number;
          created_at?: string;
          updated_at?: string;
          evaluation_data?: any;
        };
      };
      credit_lines: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          available_amount: number;
          apr: number;
          expiry_date: string;
          status: 'active' | 'expired' | 'suspended';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          available_amount: number;
          apr: number;
          expiry_date: string;
          status?: 'active' | 'expired' | 'suspended';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          available_amount?: number;
          apr?: number;
          expiry_date?: string;
          status?: 'active' | 'expired' | 'suspended';
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'payment' | 'transfer' | 'deposit' | 'loan' | 'repayment';
          amount: number;
          currency: 'USDC' | 'SOL' | 'BONK';
          sender: string;
          recipient: string;
          status: 'pending' | 'confirmed' | 'failed';
          signature?: string;
          memo?: string;
          reference?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'payment' | 'transfer' | 'deposit' | 'loan' | 'repayment';
          amount: number;
          currency: 'USDC' | 'SOL' | 'BONK';
          sender: string;
          recipient: string;
          status?: 'pending' | 'confirmed' | 'failed';
          signature?: string;
          memo?: string;
          reference?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'payment' | 'transfer' | 'deposit' | 'loan' | 'repayment';
          amount?: number;
          currency?: 'USDC' | 'SOL' | 'BONK';
          sender?: string;
          recipient?: string;
          status?: 'pending' | 'confirmed' | 'failed';
          signature?: string;
          memo?: string;
          reference?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      loans: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          outstanding_amount: number;
          apr: number;
          origination_date: string;
          due_date: string;
          status: 'active' | 'paid' | 'overdue' | 'defaulted';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          outstanding_amount: number;
          apr: number;
          origination_date: string;
          due_date: string;
          status?: 'active' | 'paid' | 'overdue' | 'defaulted';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          outstanding_amount?: number;
          apr?: number;
          origination_date?: string;
          due_date?: string;
          status?: 'active' | 'paid' | 'overdue' | 'defaulted';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}