-- ==============================================================================
-- YieldPulse Complete Database Schema & Migration for Supabase PostgreSQL
-- ==============================================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE investment_category AS ENUM (
        'fixed_deposit',
        'recurring_deposit',
        'bonds',
        'treasury_bills',
        'dividend_stocks',
        'p2p_lending',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

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
    title VARCHAR(120) NOT NULL,
    institution VARCHAR(100) NOT NULL,
    category investment_category NOT NULL DEFAULT 'fixed_deposit',
    principal_amount NUMERIC(15, 2) NOT NULL CHECK (principal_amount > 0),
    annual_rate_pct NUMERIC(6, 3) NOT NULL CHECK (annual_rate_pct >= 0 AND annual_rate_pct <= 100),
    compounding compounding_frequency NOT NULL DEFAULT 'quarterly',
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    status investment_status NOT NULL DEFAULT 'active',
    currency VARCHAR(5) NOT NULL DEFAULT 'INR',
    tax_deduction_rate_pct NUMERIC(5, 2) DEFAULT 0 CHECK (tax_deduction_rate_pct >= 0 AND tax_deduction_rate_pct <= 100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_maturity_after_start CHECK (maturity_date > start_date)
);

-- 3. Safely Add Any Missing Columns (if table previously existed)
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS status investment_status NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS currency VARCHAR(5) NOT NULL DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS tax_deduction_rate_pct NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Authenticated users can manage their own investments AND claim unassigned legacy records
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
