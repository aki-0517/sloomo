-- Solana Mobile CreditPay Database Schema
-- This SQL file should be executed in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_onboarded BOOLEAN DEFAULT FALSE,
    kyc_status TEXT DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'pending', 'approved', 'rejected')),
    plaid_linked BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{
        "currency": "USD",
        "notifications": true,
        "biometric": false
    }'::jsonb
);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Credit scores table
CREATE TABLE IF NOT EXISTS public.credit_scores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 300 AND score <= 850),
    on_chain_score INTEGER NOT NULL,
    off_chain_score INTEGER NOT NULL,
    zk_proof_score INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    evaluation_data JSONB
);

CREATE TRIGGER update_credit_scores_updated_at BEFORE UPDATE ON public.credit_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Credit lines table
CREATE TABLE IF NOT EXISTS public.credit_lines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    available_amount DECIMAL(15, 2) NOT NULL CHECK (available_amount >= 0),
    apr DECIMAL(5, 2) NOT NULL CHECK (apr >= 0),
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_credit_lines_updated_at BEFORE UPDATE ON public.credit_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('payment', 'transfer', 'deposit', 'loan', 'repayment')),
    amount DECIMAL(15, 6) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL CHECK (currency IN ('USDC', 'SOL', 'BONK')),
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    signature TEXT,
    memo TEXT,
    reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Loans table
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    outstanding_amount DECIMAL(15, 2) NOT NULL CHECK (outstanding_amount >= 0),
    apr DECIMAL(5, 2) NOT NULL CHECK (apr >= 0),
    origination_date TIMESTAMP WITH TIME ZONE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue', 'defaulted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Repayment schedules table
CREATE TABLE IF NOT EXISTS public.repayment_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    paid_date TIMESTAMP WITH TIME ZONE,
    paid_amount DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_repayment_schedules_updated_at BEFORE UPDATE ON public.repayment_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON public.users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_credit_scores_user_id ON public.credit_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_created_at ON public.credit_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_lines_user_id ON public.credit_lines(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_lines_status ON public.credit_lines(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_signature ON public.transactions(signature);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_repayment_schedules_loan_id ON public.repayment_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_repayment_schedules_due_date ON public.repayment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- RLS Policies for credit_scores table
CREATE POLICY "Users can view their own credit scores" ON public.credit_scores
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage credit scores" ON public.credit_scores
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for credit_lines table
CREATE POLICY "Users can view their own credit lines" ON public.credit_lines
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage credit lines" ON public.credit_lines
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for transactions table
CREATE POLICY "Users can view their own transactions" ON public.transactions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage transactions" ON public.transactions
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for loans table
CREATE POLICY "Users can view their own loans" ON public.loans
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage loans" ON public.loans
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for repayment_schedules table
CREATE POLICY "Users can view their own repayment schedules" ON public.repayment_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.loans 
            WHERE loans.id = repayment_schedules.loan_id 
            AND loans.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Service role can manage repayment schedules" ON public.repayment_schedules
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for audit_logs table
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage audit logs" ON public.audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Functions for business logic

-- Function to calculate available credit based on score
CREATE OR REPLACE FUNCTION calculate_available_credit(credit_score INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    IF credit_score < 600 THEN
        RETURN 0;
    ELSIF credit_score < 650 THEN
        RETURN 500;
    ELSIF credit_score < 700 THEN
        RETURN 1000;
    ELSIF credit_score < 750 THEN
        RETURN 2500;
    ELSIF credit_score < 800 THEN
        RETURN 5000;
    ELSE
        RETURN 10000;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate APR based on credit score
CREATE OR REPLACE FUNCTION calculate_apr(credit_score INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    IF credit_score < 600 THEN
        RETURN 35.0;
    ELSIF credit_score < 650 THEN
        RETURN 28.0;
    ELSIF credit_score < 700 THEN
        RETURN 22.0;
    ELSIF credit_score < 750 THEN
        RETURN 18.0;
    ELSIF credit_score < 800 THEN
        RETURN 15.0;
    ELSE
        RETURN 12.0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for sensitive tables
CREATE TRIGGER audit_credit_scores_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.credit_scores
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_credit_lines_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.credit_lines
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_loans_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.loans
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();