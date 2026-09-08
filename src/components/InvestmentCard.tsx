import React from 'react';
import { 
  Building2, 
  Clock, 
  Edit3, 
  Trash2, 
  Zap, 
  CheckCircle2, 
  FileText,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Calendar
} from 'lucide-react';
import { Investment } from '../types/investment';
import { computeInvestmentMetrics } from '../utils/calculations';
import { 
  CATEGORY_META, 
  COMPOUNDING_LABELS, 
  formatCurrency, 
  formatDate, 
  formatRelativeDays,
  formatSignedCurrency,
  formatSignedPct
} from '../utils/formatters';

interface InvestmentCardProps {
  investment: Investment;
  currency: string;
  onEdit: (inv: Investment) => void;
  onDelete: (id: string, title: string) => void;
}

export const InvestmentCard: React.FC<InvestmentCardProps> = ({
  investment,
  currency,
  onEdit,
  onDelete,
}) => {
  const metrics = computeInvestmentMetrics(investment);
  const catMeta = CATEGORY_META[investment.category] || CATEGORY_META.other;
  const isMf = investment.category === 'mutual_fund';

  // For Mutual Funds: Check if 1-day move is positive or negative
  const oneDayChange = metrics.oneDayChange || 0;
  const isOneDayPositive = oneDayChange >= 0;

  // Total gain / loss
  const totalGain = metrics.accruedEarning;
  const isTotalGainPositive = totalGain >= 0;

  return (
    <div className="group relative rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md hover:border-slate-700/80 hover:shadow-xl hover:shadow-black/40 transition-all duration-200 flex flex-col justify-between">
      
      {/* Top Bar: Category Pill, Status, Actions */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${catMeta.bg} ${catMeta.color} ${catMeta.border}`}>
              {catMeta.label}
            </span>
            {isMf ? (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Live AMFI
              </span>
            ) : metrics.isMatured ? (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Matured
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
              </span>
            )}
          </div>

          {/* Card Actions */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(investment)}
              title="Edit Investment"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(investment.id, investment.title)}
              title="Delete Investment"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title & Institution */}
        <div>
          <h3 className="text-base font-bold text-white tracking-tight group-hover:text-brand-300 transition-colors">
            {investment.title}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>{investment.institution}</span>
            {!isMf && (
              <>
                <span className="text-slate-600">•</span>
                <span>{COMPOUNDING_LABELS[investment.compounding]}</span>
              </>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MUTUAL FUND SPECIFIC DISPLAY: UNCLUTTERED & SLEEK         */}
        {/* ========================================================= */}
        {isMf ? (
          <>
            {/* Primary Valuation & Total Return Box */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Current Valuation
                </span>
                <span className="text-xl font-mono font-extrabold text-white">
                  {formatCurrency(metrics.currentValue || 0, currency)}
                </span>
              </div>

              <div className="text-right">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Total Gain / Loss
                </span>
                <div className={`text-sm font-mono font-bold flex items-center justify-end gap-1 ${
                  isTotalGainPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {isTotalGainPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{formatSignedCurrency(totalGain, currency)}</span>
                </div>
              </div>
            </div>

            {/* 1-Day Return Pill & Live NAV */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">1-Day Move:</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs flex items-center gap-1 ${
                  isOneDayPositive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {isOneDayPositive ? '↗' : '↘'}
                  <span>{formatSignedCurrency(oneDayChange, currency)}</span>
                  <span>({formatSignedPct(metrics.oneDayChangePct || 0)})</span>
                </span>
              </div>

              {investment.currentNav && (
                <div className="text-right font-mono text-[11px] text-slate-400">
                  NAV: <span className="text-slate-200 font-semibold">₹{investment.currentNav.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Key Metrics Grid for MF */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950/40 p-2 rounded-lg">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Invested</span>
                <span className="block text-xs font-mono font-bold text-slate-100 mt-0.5">
                  {formatCurrency(investment.principalAmount, currency, 0)}
                </span>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-lg">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Units</span>
                <span className="block text-xs font-mono font-bold text-cyan-300 mt-0.5">
                  {investment.units ? investment.units.toFixed(2) : '—'}
                </span>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-lg">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">CAGR / Return</span>
                <span className={`block text-xs font-mono font-bold mt-0.5 ${
                  (metrics.cagrPct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatSignedPct(metrics.cagrPct || 0)}
                </span>
              </div>
            </div>
          </>
        ) : (
          /* ========================================================= */
          /* FIXED DEPOSIT SPECIFIC DISPLAY: ACCRUAL & MATURITY        */
          /* ========================================================= */
          <>
            {/* Live Daily Earning & Accrued Yield Box */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <Zap className="w-3 h-3 text-brand-400" />
                  <span>Daily Earning</span>
                </div>
                <div className="mt-1 text-lg font-bold font-mono text-brand-400">
                  {metrics.isMatured ? (
                    <span className="text-slate-500 text-sm">Completed</span>
                  ) : (
                    <>
                      +{formatCurrency(metrics.dailyEarning, currency)}
                      <span className="text-[10px] text-slate-400 font-sans font-normal ml-0.5">/day</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span>Accrued Earned</span>
                </div>
                <div className="mt-1 text-lg font-bold font-mono text-emerald-400">
                  +{formatCurrency(metrics.accruedEarning, currency)}
                </div>
              </div>
            </div>

            {/* Tenure & Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatRelativeDays(metrics.remainingDays, metrics.isMatured)}</span>
                </div>
                <span className="font-mono text-slate-300 font-semibold">{metrics.progressPct}%</span>
              </div>
              <div className="w-full bg-slate-800/90 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    metrics.isMatured
                      ? 'bg-slate-600'
                      : 'bg-gradient-to-r from-brand-500 to-emerald-400'
                  }`}
                  style={{ width: `${metrics.progressPct}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Start: {formatDate(investment.startDate)}</span>
                <span>Matures: {formatDate(investment.maturityDate)}</span>
              </div>
            </div>

            {/* Key Metrics Grid for FD */}
            <div className="mt-4 pt-3.5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950/40 p-2 rounded-lg">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Principal</span>
                <span className="block text-xs font-mono font-bold text-slate-100 mt-0.5">
                  {formatCurrency(investment.principalAmount, currency, 0)}
                </span>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-lg">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Interest Rate</span>
                <span className="block text-xs font-mono font-bold text-brand-300 mt-0.5">
                  {investment.annualRatePct}%
                </span>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-lg">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Maturity Value</span>
                <span className="block text-xs font-mono font-bold text-purple-300 mt-0.5">
                  {formatCurrency(metrics.maturityValue, currency, 0)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Notes or Info */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        {investment.notes ? (
          <div className="flex items-center gap-1 truncate max-w-[200px]" title={investment.notes}>
            <FileText className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="truncate">{investment.notes}</span>
          </div>
        ) : isMf && investment.buyNav ? (
          <div className="flex items-center gap-1 text-slate-500">
            <Calendar className="w-3 h-3" />
            <span>Bought: {formatDate(investment.startDate)} @ ₹{investment.buyNav.toFixed(2)}</span>
          </div>
        ) : (
          <div />
        )}
        {investment.taxDeductionRatePct && investment.taxDeductionRatePct > 0 ? (
          <div className="flex items-center gap-1 text-amber-400/90 ml-auto shrink-0 font-medium">
            <ShieldCheck className="w-3 h-3" />
            <span>{investment.taxDeductionRatePct}% TDS</span>
          </div>
        ) : null}
      </div>

    </div>
  );
};
