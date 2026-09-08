import React, { useRef } from 'react';
import { 
  Database, 
  Plus, 
  Download, 
  Upload, 
  RefreshCw, 
  Layers,
  Sparkles,
  LogIn,
  LogOut
} from 'lucide-react';
import { useInvestments } from '../context/InvestmentContext';
import { useToast } from './Toast';

interface HeaderProps {
  onOpenAddModal: () => void;
  onOpenSupabaseModal: () => void;
  onOpenAuthModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAddModal, onOpenSupabaseModal, onOpenAuthModal }) => {
  const { 
    currency, 
    setCurrency, 
    isSupabaseConnected, 
    isSyncing, 
    currentUser,
    signOut,
    resetToSampleData, 
    exportDataJson, 
    importDataJson 
  } = useInvestments();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDataJson(content);
        if (success) {
          showToast('Investments imported successfully!', 'success');
        } else {
          showToast('Invalid JSON file format', 'error');
        }
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleResetSample = () => {
    if (window.confirm('Reset portfolio to realistic sample Fixed Deposits & bonds?')) {
      resetToSampleData();
      showToast('Portfolio reset to sample data', 'info');
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('Sign out of your private account?')) {
      await signOut();
      showToast('Signed out of your private portfolio', 'info');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 p-0.5 shadow-lg shadow-brand-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-brand-400" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                YieldPulse
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> High-Yield
              </span>
            </div>
            <p className="hidden md:block text-xs text-slate-400 font-medium">
              Fixed Deposit & Portfolio Yield Intelligence
            </p>
          </div>
        </div>

        {/* Action Controls & Badges */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Supabase Status Pill */}
          <button
            onClick={onOpenSupabaseModal}
            title={isSupabaseConnected ? 'Connected to Supabase' : 'Click to configure Supabase cloud DB'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
              isSupabaseConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:border-brand-500/40 hover:bg-slate-800/80'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline">
              {isSyncing ? 'Syncing...' : isSupabaseConnected ? 'Supabase Connected' : 'Supabase (Offline/Local)'}
            </span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isSupabaseConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400'
              }`}
            />
          </button>

          {/* Currency Switcher */}
          <div className="relative">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:border-brand-500 cursor-pointer hover:bg-slate-850 transition-colors"
              title="Change Display Currency"
            >
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
              <option value="CAD">CA$ CAD</option>
              <option value="AUD">AU$ AUD</option>
              <option value="SGD">S$ SGD</option>
              <option value="AED">AED</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          {/* Backup / Restore Menu (Desktop) */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800">
            <button
              onClick={exportDataJson}
              title="Export Portfolio to JSON"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import Portfolio from JSON"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetSample}
              title="Restore Sample Data"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* User Account / Auth Button */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
              <div className="w-5 h-5 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-[10px] font-bold text-brand-300">
                {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
              </div>
              <span className="hidden sm:inline text-slate-300 font-medium max-w-[110px] truncate" title={currentUser.email}>
                {currentUser.email}
              </span>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700/80 text-slate-200 hover:border-brand-500/40 hover:text-white transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-brand-400" />
              <span>Sign In</span>
            </button>
          )}

          {/* Add Investment CTA */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 bg-gradient-to-r from-brand-500 to-emerald-500 hover:from-brand-600 hover:to-emerald-600 text-slate-950 font-semibold text-xs sm:text-sm px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-lg shadow-brand-500/25 active:scale-95 transition-all duration-150"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Investment</span>
          </button>

        </div>
      </div>
    </header>
  );
};
