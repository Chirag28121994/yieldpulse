import React from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Zap, 
  Target, 
  CalendarClock
} from 'lucide-react';
import { useInvestments } from '../context/InvestmentContext';
import { formatCurrency } from '../utils/formatters';

export const PortfolioSummary: React.FC = () => {
  const { portfolioMetrics, currency } = useInvestments();

  const totalGainPct = portfolioMetrics.totalPrincipal > 0
    ? ((portfolioMetrics.totalAccruedEarnings / portfolioMetrics.totalPrincipal) * 100).toFixed(2)
    : '0.00';

  const monthlyRunRate = portfolioMetrics.portfolioDailyEarning * 30.416;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      
      {/* 1. Total Principal Invested */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-md hover:border-slate-700/80 transition-all group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Invested
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            {formatCurrency(portfolioMetrics.totalPrincipal, currency, 0)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>{portfolioMetrics.activeCount} active, {portfolioMetrics.maturedCount} matured</span>
          </div>
        </div>
      </div>

      {/* 2. Total Accrued Earnings to Date */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-md hover:border-slate-700/80 transition-all group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Accrued To Date
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
            {formatCurrency(portfolioMetrics.totalAccruedEarnings, currency)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-emerald-400 font-semibold">+{totalGainPct}%</span>
            <span>earned so far</span>
          </div>
        </div>
      </div>

      {/* 3. Real-Time Daily Earning (The Star Metric!) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-950/70 via-slate-900/70 to-slate-900/80 border border-brand-500/30 p-5 backdrop-blur-md shadow-lg shadow-brand-950/50 group">
        <div className="absolute top-0 right-0 w-28 h-28 bg-brand-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-300">
              Daily Yield
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-brand-300 tracking-tight">
            {formatCurrency(portfolioMetrics.portfolioDailyEarning, currency)}
            <span className="text-xs font-sans font-medium text-slate-400 ml-1">/day</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span>≈ {formatCurrency(monthlyRunRate, currency, 0)}/month</span>
          </div>
        </div>
      </div>

      {/* 4. Projected Maturity Value & Weighted APY */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-md hover:border-slate-700/80 transition-all group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Projected Maturity
          </span>
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <Target className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-300 tracking-tight">
            {formatCurrency(portfolioMetrics.totalMaturityValue, currency, 0)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5 text-purple-400" />
              <span>Yield:</span>
              <span className="text-purple-400 font-semibold font-mono">
                {formatCurrency(portfolioMetrics.totalProjectedEarnings, currency, 0)}
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono font-medium text-[11px]">
              {portfolioMetrics.weightedAverageRatePct}% avg
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
