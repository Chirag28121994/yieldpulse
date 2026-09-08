import { InvestmentCategory, CompoundingFrequency } from '../types/investment';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  AED: 'AED ',
  CAD: 'CA$',
  AUD: 'AU$',
};

export function formatCurrency(amount: number, currency: string = 'INR', maximumFractionDigits: number = 2): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' ';
  
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${symbol}0.00`;
  }

  // Use Indian number formatting if INR, else standard international formatting
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';

  const formattedNum = new Intl.NumberFormat(locale, {
    minimumFractionDigits: maximumFractionDigits > 0 ? 2 : 0,
    maximumFractionDigits: maximumFractionDigits,
  }).format(amount);

  return `${symbol}${formattedNum}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatRelativeDays(days: number, isMatured: boolean): string {
  if (isMatured || days <= 0) {
    return 'Matured';
  }
  if (days === 1) return 'Matures tomorrow';
  if (days < 30) return `Matures in ${days} days`;
  const months = Math.floor(days / 30.4);
  const remDays = Math.round(days % 30.4);
  if (remDays === 0) return `Matures in ${months} mo`;
  return `Matures in ${months} mo, ${remDays} d`;
}

export const CATEGORY_META: Record<InvestmentCategory, { label: string; color: string; bg: string; border: string }> = {
  fixed_deposit: {
    label: 'Fixed Deposit',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30'
  },
  recurring_deposit: {
    label: 'Recurring Deposit',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30'
  },
  bonds: {
    label: 'Bonds / Debentures',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30'
  },
  treasury_bills: {
    label: 'Treasury Bills',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30'
  },
  dividend_stocks: {
    label: 'Dividend Asset',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30'
  },
  p2p_lending: {
    label: 'P2P / Yield Note',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30'
  },
  other: {
    label: 'Other Investment',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30'
  }
};

export const COMPOUNDING_LABELS: Record<CompoundingFrequency, string> = {
  simple: 'Simple Interest (Payout)',
  monthly: 'Monthly Compounding',
  quarterly: 'Quarterly Compounding (Standard FD)',
  half_yearly: 'Semi-Annual Compounding',
  annually: 'Annual Compounding',
  daily: 'Daily Compounding'
};
