export type InvestmentCategory =
  | 'fixed_deposit'
  | 'recurring_deposit'
  | 'mutual_fund'
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
  institution: string; // e.g. HDFC Bank, SBI, PPFAS Mutual Fund
  category: InvestmentCategory;
  principalAmount: number; // For MFs: Total invested amount
  annualRatePct: number; // For FDs: interest rate. For MFs: CAGR or return %
  compounding: CompoundingFrequency;
  startDate: string; // Purchase date YYYY-MM-DD
  maturityDate: string; // Maturity date YYYY-MM-DD (or optional for open-ended MFs)
  status: InvestmentStatus;
  currency: string;
  taxDeductionRatePct?: number;
  notes?: string;
  // Mutual Fund specific fields
  schemeCode?: string;
  units?: number;
  buyNav?: number;
  currentNav?: number;
  previousNav?: number;
  navDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvestmentComputedMetrics {
  totalDurationDays: number;
  elapsedDays: number;
  remainingDays: number;
  progressPct: number;
  dailyEarning: number; // Guaranteed daily yield (for FDs) or 1D return (for MFs)
  accruedEarning: number; // Total unrealized gain/loss
  totalProjectedEarning: number;
  maturityValue: number; // For MFs: Current Market Value
  isMatured: boolean;
  effectiveApyPct: number;
  // Mutual Fund Specific Computed Metrics
  isMutualFund?: boolean;
  oneDayChange?: number; // Today's P&L in currency (can be negative!)
  oneDayChangePct?: number; // Today's change %
  currentValue?: number;
  cagrPct?: number;
}

export interface PortfolioAggregateMetrics {
  totalPrincipal: number;
  totalAccruedEarnings: number;
  totalProjectedEarnings: number;
  portfolioDailyEarning: number; // Net combined daily return (can be positive or negative)
  portfolioGuaranteedDailyYield: number; // Only from FDs & Bonds (always >= 0)
  portfolioMarketDailyChange: number; // 1-day delta from Mutual Funds (can be negative)
  totalMaturityValue: number; // Total portfolio current/maturity valuation
  weightedAverageRatePct: number;
  activeCount: number;
  maturedCount: number;
  totalInvestments: number;
  mutualFundCount: number;
  fixedDepositCount: number;
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
