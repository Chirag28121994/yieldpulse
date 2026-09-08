-- ==============================================================================
-- YieldPulse Database Schema & Migration for Supabase PostgreSQL
-- Supports Fixed Deposits, Bonds, and Live Indian Mutual Funds
-- ==============================================================================

-- 1. Create / Update Enums
DO $$ BEGIN
    CREATE TYPE investment_category AS ENUM (
        'fixed_deposit',
        'recurring_deposit',
        'mutual_fund',
        'bonds',
        'treasury_bills',
        'dividend_stocks',
        'p2p_lending',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- If enum already existed without 'mutual_fund', safely add it:
ALTER TYPE investment_category ADD VALUE IF NOT EXISTS 'mutual_fund';

DO $$ BEGIN
    CREATE TYPE compounding_frequency AS ENUM (
        'simple',
        'monthly',
        'quarterly',
        'half_yearly',
        'annually',
        'daily'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE investment_status AS ENUM (
        'active',
        'matured',
        'premature_closed'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Create Investments Table (if not exists)
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    institution VARCHAR(100) NOT NULL,
    category investment_category NOT NULL DEFAULT 'fixed_deposit',
    principal_amount NUMERIC(15, 2) NOT NULL CHECK (principal_amount > 0),
    annual_rate_pct NUMERIC(8, 3) NOT NULL DEFAULT 0,
    compounding compounding_frequency NOT NULL DEFAULT 'quarterly',
    start_date DATE NOT NULL,
    maturity_date DATE,
    status investment_status NOT NULL DEFAULT 'active',
    currency VARCHAR(5) NOT NULL DEFAULT 'INR',
    tax_deduction_rate_pct NUMERIC(5, 2) DEFAULT 0 CHECK (tax_deduction_rate_pct >= 0 AND tax_deduction_rate_pct <= 100),
    notes TEXT,
    -- Mutual Fund Specific Columns
    scheme_code VARCHAR(20),
    units NUMERIC(15, 4),
    buy_nav NUMERIC(15, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Safely Add Any Missing Columns (Idempotent for existing deployments)
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS status investment_status NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS currency VARCHAR(5) NOT NULL DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS tax_deduction_rate_pct NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS scheme_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS units NUMERIC(15, 4),
ADD COLUMN IF NOT EXISTS buy_nav NUMERIC(15, 4),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Ensure maturity_date is nullable for open-ended mutual funds
ALTER TABLE public.investments ALTER COLUMN maturity_date DROP NOT NULL;

-- Update maturity date check constraint to support open-ended mutual funds
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS check_maturity_after_start;
ALTER TABLE public.investments 
ADD CONSTRAINT check_maturity_after_start 
CHECK (maturity_date IS NULL OR maturity_date > start_date);

-- 4. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.investments;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.investments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_maturity_date ON public.investments(maturity_date);
CREATE INDEX IF NOT EXISTS idx_investments_category ON public.investments(category);
CREATE INDEX IF NOT EXISTS idx_investments_scheme_code ON public.investments(scheme_code);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS "Users can manage their own investments" ON public.investments;
CREATE POLICY "Users can manage their own investments"
ON public.investments FOR ALL TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow anon read/write for guest mode" ON public.investments;
CREATE POLICY "Allow anon read/write for guest mode"
ON public.investments FOR ALL TO anon
USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- 8. Refresh PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
