import React from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Zap, 
  Target, 
  CalendarClock
} from 'lucide-react';
import { useInvestments } from '../context/InvestmentContext';
import { formatCurrency, formatSignedCurrency } from '../utils/formatters';

export const PortfolioSummary: React.FC = () => {
  const { portfolioMetrics, currency } = useInvestments();

  const totalGainPct = portfolioMetrics.totalPrincipal > 0
    ? ((portfolioMetrics.totalAccruedEarnings / portfolioMetrics.totalPrincipal) * 100).toFixed(2)
    : '0.00';

  const isTotalGainPositive = portfolioMetrics.totalAccruedEarnings >= 0;
  const isDailyEarningPositive = portfolioMetrics.portfolioDailyEarning >= 0;

  const hasMutualFunds = portfolioMetrics.mutualFundCount > 0;
  const monthlyRunRate = portfolioMetrics.portfolioGuaranteedDailyYield * 30.416;

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
            <span>
              {portfolioMetrics.fixedDepositCount > 0 && `${portfolioMetrics.fixedDepositCount} Fixed `}
              {portfolioMetrics.fixedDepositCount > 0 && portfolioMetrics.mutualFundCount > 0 && '• '}
              {portfolioMetrics.mutualFundCount > 0 && `${portfolioMetrics.mutualFundCount} MFs `}
              ({portfolioMetrics.activeCount} active)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Total Accrued Earnings to Date */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-md hover:border-slate-700/80 transition-all group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {hasMutualFunds ? 'Total Returns / Gain' : 'Accrued To Date'}
          </span>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
            isTotalGainPositive 
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}>
            {isTotalGainPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        </div>
        <div className="mt-3">
          <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
            isTotalGainPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {formatSignedCurrency(portfolioMetrics.totalAccruedEarnings, currency)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span className={`font-semibold ${isTotalGainPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isTotalGainPositive ? `+${totalGainPct}%` : `${totalGainPct}%`}
            </span>
            <span>overall portfolio return</span>
          </div>
        </div>
      </div>

      {/* 3. Real-Time Daily Earning / Today's Net Change */}
      <div className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-md shadow-lg group ${
        isDailyEarningPositive
          ? 'bg-gradient-to-br from-brand-950/70 via-slate-900/70 to-slate-900/80 border-brand-500/30 shadow-brand-950/50'
          : 'bg-gradient-to-br from-rose-950/40 via-slate-900/70 to-slate-900/80 border-rose-500/30 shadow-rose-950/40'
      }`}>
        <div className={`absolute top-0 right-0 w-28 h-28 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none ${
          isDailyEarningPositive ? 'bg-brand-500/10' : 'bg-rose-500/10'
        }`} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isDailyEarningPositive ? 'text-brand-300' : 'text-rose-300'
            }`}>
              {hasMutualFunds ? "Today's Net Return" : 'Daily Yield'}
            </span>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isDailyEarningPositive ? 'bg-brand-400' : 'bg-rose-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isDailyEarningPositive ? 'bg-brand-500' : 'bg-rose-500'
              }`}></span>
            </span>
          </div>
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center group-hover:scale-110 transition-transform ${
            isDailyEarningPositive 
              ? 'bg-brand-500/20 border-brand-500/40 text-brand-400' 
              : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
          }`}>
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
            isDailyEarningPositive ? 'text-brand-300' : 'text-rose-400'
          }`}>
            {formatSignedCurrency(portfolioMetrics.portfolioDailyEarning, currency)}
            <span className="text-xs font-sans font-medium text-slate-400 ml-1">/day</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
            {hasMutualFunds ? (
              <>
                <span className="text-emerald-400 font-mono">
                  FD: +{formatCurrency(portfolioMetrics.portfolioGuaranteedDailyYield, currency, 0)}/d
                </span>
                <span>•</span>
                <span className={`font-mono ${
                  portfolioMetrics.portfolioMarketDailyChange >= 0 ? 'text-cyan-400' : 'text-rose-400'
                }`}>
                  MF 1D: {formatSignedCurrency(portfolioMetrics.portfolioMarketDailyChange, currency, 0)}
                </span>
              </>
            ) : (
              <span>≈ {formatCurrency(monthlyRunRate, currency, 0)}/month</span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Projected Maturity Value & Weighted APY */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-md hover:border-slate-700/80 transition-all group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {hasMutualFunds ? 'Portfolio Valuation' : 'Projected Maturity'}
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
                {formatSignedCurrency(portfolioMetrics.totalProjectedEarnings, currency, 0)}
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
