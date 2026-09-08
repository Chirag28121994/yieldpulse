import React, { useState } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  CloudUpload, 
  Terminal,
  ShieldCheck,
  PowerOff
} from 'lucide-react';
import { useInvestments } from '../context/InvestmentContext';
import { useToast } from './Toast';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPABASE_SCHEMA_SQL = `-- 1. Enums
DO $$ BEGIN
    CREATE TYPE investment_category AS ENUM (
        'fixed_deposit', 'recurring_deposit', 'bonds', 
        'treasury_bills', 'dividend_stocks', 'p2p_lending', 'other'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE compounding_frequency AS ENUM (
        'simple', 'monthly', 'quarterly', 'half_yearly', 'annually', 'daily'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE investment_status AS ENUM (
        'active', 'matured', 'premature_closed'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Investments Table
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
    tax_deduction_rate_pct NUMERIC(5, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_maturity_after_start CHECK (maturity_date > start_date)
);

-- 3. Safely Add Missing Columns (if table was created with older schema)
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS status investment_status NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS currency VARCHAR(5) NOT NULL DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS tax_deduction_rate_pct NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Trigger for updated_at
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

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_maturity_date ON public.investments(maturity_date);

-- 5. Row Level Security (RLS)
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their data
DROP POLICY IF EXISTS "Users can manage their own investments" ON public.investments;
CREATE POLICY "Users can manage their own investments"
ON public.investments FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow anonymous access using anon key for single-tenant / guest mode
DROP POLICY IF EXISTS "Allow anon read/write for guest mode" ON public.investments;
CREATE POLICY "Allow anon read/write for guest mode"
ON public.investments FOR ALL TO anon
USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
`;

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const { 
    supabaseConfig, 
    updateSupabaseConfig, 
    disconnectSupabase, 
    syncLocalToSupabase, 
    isSupabaseConnected 
  } = useInvestments();
  const { showToast } = useToast();

  const [url, setUrl] = useState(supabaseConfig.url || '');
  const [anonKey, setAnonKey] = useState(supabaseConfig.anonKey || '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sql'>('config');
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      showToast('Please enter both Supabase URL and Anon Key', 'warning');
      return;
    }

    setIsConnecting(true);
    const result = await updateSupabaseConfig({
      url: url.trim(),
      anonKey: anonKey.trim(),
      isConnected: false,
    });
    setIsConnecting(false);

    if (result.success) {
      showToast('Connected to Supabase successfully!', 'success');
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleDisconnect = () => {
    disconnectSupabase();
    setUrl('');
    setAnonKey('');
    showToast('Switched to local browser storage mode', 'info');
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await syncLocalToSupabase();
      setIsSyncing(false);
      if (res.success) {
        showToast(`Synced ${res.count} investments to Supabase!`, 'success');
      }
    } catch (err: any) {
      setIsSyncing(false);
      showToast(err?.message || 'Sync failed', 'error');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    showToast('SQL Schema copied to clipboard!', 'success');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Supabase Cloud Database Settings</h2>
              <p className="text-xs text-slate-400">Connect your PostgreSQL instance for cloud sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Connection & Credentials
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            SQL Schema Migration
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'config' ? (
            <div className="space-y-5">
              
              {/* Connection Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isSupabaseConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                {isSupabaseConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <span className="font-bold block">
                    {isSupabaseConnected
                      ? 'Connected & Synchronized with Supabase'
                      : 'Running in Local Browser Storage Mode'}
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {isSupabaseConnected
                      ? 'Your investments are automatically synced in real-time to your Supabase PostgreSQL database.'
                      : 'All changes are currently stored securely in your browser’s localStorage. Connect your Supabase credentials below to sync across devices.'}
                  </p>
                </div>
              </div>

              {/* Credentials Form */}
              <form onSubmit={handleConnect} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Supabase Project URL
                    </label>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <span>Find in Supabase Dashboard</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="url"
                    placeholder="https://your-project.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Supabase Public 'anon' Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  {isSupabaseConnected ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                      >
                        <CloudUpload className="w-3.5 h-3.5" />
                        <span>{isSyncing ? 'Syncing...' : 'Push Local Data to Cloud'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <PowerOff className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <ShieldCheck className="w-4 h-4 text-brand-400" />
                      <span>Anon key is safe for client-side apps</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="ml-auto flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-brand-500 to-emerald-500 text-slate-950 hover:from-brand-600 hover:to-emerald-600 transition-all disabled:opacity-50"
                  >
                    <Database className="w-4 h-4" />
                    <span>{isConnecting ? 'Verifying...' : isSupabaseConnected ? 'Update Connection' : 'Connect Supabase'}</span>
                  </button>
                </div>
              </form>

            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-300">
                  Run this SQL in your <strong className="text-brand-400">Supabase SQL Editor</strong> to create the schema with RLS:
                </p>
                <button
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-brand-300 border border-slate-700 transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>

              <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-4 max-h-72 overflow-y-auto font-mono text-[11px] text-slate-300 scrollbar-thin">
                <pre>{SUPABASE_SCHEMA_SQL}</pre>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
