export type InvestmentCategory =
  | 'fixed_deposit'
  | 'recurring_deposit'
  | 'bonds'
  | 'treasury_bills'
  | 'dividend_stocks'
  | 'p2p_lending'
  | 'other';

export type CompoundingFrequency =
  | 'simple'
  | 'daily'
  | 'monthly'
  | 'quarterly'
  | 'half_yearly'
  | 'annually';

export type InvestmentStatus = 'active' | 'matured' | 'premature_closed';

export interface Investment {
  id: string;
  userId?: string;
  title: string;
  institution: string; // e.g. HDFC Bank, SBI, Vanguard, Chase
  category: InvestmentCategory;
  principalAmount: number;
  annualRatePct: number; // e.g. 7.50 for 7.5%
  compounding: CompoundingFrequency;
  startDate: string; // YYYY-MM-DD
  maturityDate: string; // YYYY-MM-DD
  status: InvestmentStatus;
  currency: string; // 'INR' | 'USD' | 'EUR' | 'GBP' etc.
  taxDeductionRatePct?: number; // TDS / Withholding tax % if any
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvestmentComputedMetrics {
  totalDurationDays: number;
  elapsedDays: number;
  remainingDays: number;
  progressPct: number;
  dailyEarning: number;
  accruedEarning: number;
  totalProjectedEarning: number;
  maturityValue: number;
  isMatured: boolean;
  effectiveApyPct: number;
}

export interface PortfolioAggregateMetrics {
  totalPrincipal: number;
  totalAccruedEarnings: number;
  totalProjectedEarnings: number;
  portfolioDailyEarning: number;
  totalMaturityValue: number;
  weightedAverageRatePct: number;
  activeCount: number;
  maturedCount: number;
  totalInvestments: number;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export interface AuthUser {
  id: string;
  email?: string;
}
