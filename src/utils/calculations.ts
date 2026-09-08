import { Investment, InvestmentComputedMetrics, PortfolioAggregateMetrics, CompoundingFrequency } from '../types/investment';

/**
 * Returns number of compounding cycles per standard 365-day year
 */
export function getCompoundingFrequencyCycles(freq: CompoundingFrequency): number {
  switch (freq) {
    case 'daily':
      return 365;
    case 'monthly':
      return 12;
    case 'quarterly':
      return 4;
    case 'half_yearly':
      return 2;
    case 'annually':
      return 1;
    case 'simple':
    default:
      return 0; // Simple interest indicator
  }
}

/**
 * High-precision calculation of individual investment metrics
 * Handles both Fixed Income (FDs/RDs/Bonds) and Market-linked Mutual Funds
 */
export function computeInvestmentMetrics(
  inv: Investment,
  referenceDate: Date = new Date()
): InvestmentComputedMetrics {
  const start = new Date(inv.startDate);
  const today = new Date(referenceDate);

  // Normalize all dates to midnight UTC to prevent timezone drift
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const rawElapsedDays = Math.round((utcToday - utcStart) / MS_PER_DAY);
  const elapsedDays = Math.max(0, rawElapsedDays);

  const P = Number(inv.principalAmount) || 0;

  // ==========================================
  // MUTUAL FUND COMPUTATION BRANCH
  // ==========================================
  if (inv.category === 'mutual_fund') {
    const buyNav = inv.buyNav && inv.buyNav > 0
      ? Number(inv.buyNav)
      : (inv.units && inv.units > 0 ? P / inv.units : 0);

    const units = inv.units && inv.units > 0
      ? Number(inv.units)
      : (buyNav > 0 ? P / buyNav : 0);

    const currentNav = inv.currentNav && inv.currentNav > 0
      ? Number(inv.currentNav)
      : buyNav;

    const previousNav = inv.previousNav && inv.previousNav > 0
      ? Number(inv.previousNav)
      : currentNav;

    const currentValue = units * currentNav;
    const totalReturn = currentValue - P; // Can be negative!
    const totalReturnPct = P > 0 ? (totalReturn / P) * 100 : 0;

    // 1-Day Change (Today's P&L) = units * (currentNav - previousNav)
    // CAN BE NEGATIVE if NAV declined!
    const oneDayChange = units * (currentNav - previousNav);
    const oneDayChangePct = previousNav > 0 ? ((currentNav - previousNav) / previousNav) * 100 : 0;

    // CAGR (Compound Annual Growth Rate) for >= 1 year, or Absolute Return % for < 1 year
    let cagrPct = totalReturnPct;
    if (elapsedDays >= 365 && P > 0 && currentValue > 0) {
      const years = elapsedDays / 365.0;
      cagrPct = (Math.pow(currentValue / P, 1 / years) - 1) * 100;
    }

    return {
      totalDurationDays: elapsedDays,
      elapsedDays,
      remainingDays: 0,
      progressPct: 100,
      dailyEarning: oneDayChange, // Can be negative!
      accruedEarning: totalReturn, // Total gain/loss (can be negative)
      totalProjectedEarning: totalReturn,
      maturityValue: currentValue, // Current market valuation
      isMatured: false,
      effectiveApyPct: Number(cagrPct.toFixed(2)),
      isMutualFund: true,
      oneDayChange,
      oneDayChangePct: Number(oneDayChangePct.toFixed(2)),
      currentValue,
      cagrPct: Number(cagrPct.toFixed(2)),
    };
  }

  // ==========================================
  // FIXED INCOME / FD COMPUTATION BRANCH
  // ==========================================
  const maturity = new Date(inv.maturityDate || inv.startDate);
  const utcMaturity = Date.UTC(maturity.getFullYear(), maturity.getMonth(), maturity.getDate());
  const rawTotalDays = Math.round((utcMaturity - utcStart) / MS_PER_DAY);
  const totalDurationDays = Math.max(1, rawTotalDays);

  const cappedElapsedDays = Math.min(elapsedDays, totalDurationDays);
  const remainingDays = Math.max(0, totalDurationDays - cappedElapsedDays);
  const isMatured = utcToday >= utcMaturity || inv.status === 'matured';
  const progressPct = Math.min(100, Math.max(0, (cappedElapsedDays / totalDurationDays) * 100));

  const r = (Number(inv.annualRatePct) || 0) / 100;
  const n = getCompoundingFrequencyCycles(inv.compounding);

  let totalProjectedEarning = 0;
  let accruedEarning = 0;
  let dailyEarning = 0;
  let effectiveApyPct = inv.annualRatePct;

  const totalYears = totalDurationDays / 365.0;
  const elapsedYears = cappedElapsedDays / 365.0;

  if (n === 0 || inv.compounding === 'simple') {
    // Simple Interest Formula: I = P * r * t
    totalProjectedEarning = P * r * totalYears;
    accruedEarning = P * r * elapsedYears;
    dailyEarning = (P * r) / 365.0;
    effectiveApyPct = inv.annualRatePct;
  } else {
    // Compound Interest: A = P * (1 + r/n)^(n*t)
    const periodicRate = r / n;
    
    // Effective Annual Percentage Yield (APY): (1 + r/n)^n - 1
    effectiveApyPct = (Math.pow(1 + periodicRate, n) - 1) * 100;

    // Maturity Amount
    const maturityAmount = P * Math.pow(1 + periodicRate, n * totalYears);
    totalProjectedEarning = Math.max(0, maturityAmount - P);

    // Accrued Amount to Date
    const currentAmount = P * Math.pow(1 + periodicRate, n * elapsedYears);
    accruedEarning = Math.max(0, currentAmount - P);

    // Today's Daily Increment
    const tomorrowYears = elapsedYears + (1 / 365.0);
    const tomorrowAmount = P * Math.pow(1 + periodicRate, n * tomorrowYears);
    dailyEarning = Math.max(0, tomorrowAmount - currentAmount);
  }

  // If already matured or cancelled, daily earning is 0
  if (isMatured || inv.status === 'premature_closed') {
    dailyEarning = 0;
    if (isMatured) {
      accruedEarning = totalProjectedEarning;
    }
  }

  // Deduct tax if specified
  const taxRate = (inv.taxDeductionRatePct || 0) / 100;
  if (taxRate > 0) {
    const taxMultiplier = 1 - taxRate;
    totalProjectedEarning *= taxMultiplier;
    accruedEarning *= taxMultiplier;
    dailyEarning *= taxMultiplier;
  }

  const maturityValue = P + totalProjectedEarning;

  return {
    totalDurationDays,
    elapsedDays: cappedElapsedDays,
    remainingDays,
    progressPct: Number(progressPct.toFixed(1)),
    dailyEarning: Math.max(0, dailyEarning),
    accruedEarning: Math.max(0, accruedEarning),
    totalProjectedEarning: Math.max(0, totalProjectedEarning),
    maturityValue,
    isMatured,
    effectiveApyPct: Number(effectiveApyPct.toFixed(2)),
    isMutualFund: false,
  };
}

/**
 * Calculates aggregate portfolio metrics across all investments
 */
export function computePortfolioMetrics(
  investments: Investment[],
  referenceDate: Date = new Date()
): PortfolioAggregateMetrics {
  let totalPrincipal = 0;
  let totalAccruedEarnings = 0;
  let totalProjectedEarnings = 0;
  let portfolioGuaranteedDailyYield = 0;
  let portfolioMarketDailyChange = 0;
  let totalMaturityValue = 0;
  let weightedRateSum = 0;
  let activeCount = 0;
  let maturedCount = 0;
  let mutualFundCount = 0;
  let fixedDepositCount = 0;

  for (const inv of investments) {
    const metrics = computeInvestmentMetrics(inv, referenceDate);
    const principal = Number(inv.principalAmount) || 0;

    totalPrincipal += principal;
    totalAccruedEarnings += metrics.accruedEarning;
    totalProjectedEarnings += metrics.totalProjectedEarning;
    totalMaturityValue += metrics.maturityValue;

    if (inv.category === 'mutual_fund') {
      mutualFundCount++;
      activeCount++;
      portfolioMarketDailyChange += (metrics.oneDayChange || 0);
      weightedRateSum += principal * (metrics.cagrPct || 0);
    } else {
      fixedDepositCount++;
      weightedRateSum += principal * (Number(inv.annualRatePct) || 0);

      if (metrics.isMatured || inv.status === 'matured') {
        maturedCount++;
      } else {
        activeCount++;
        portfolioGuaranteedDailyYield += metrics.dailyEarning;
      }
    }
  }

  const weightedAverageRatePct = totalPrincipal > 0 ? weightedRateSum / totalPrincipal : 0;
  // Net daily earning is the combination of guaranteed FD yield + market 1-day change
  const portfolioDailyEarning = portfolioGuaranteedDailyYield + portfolioMarketDailyChange;

  return {
    totalPrincipal,
    totalAccruedEarnings,
    totalProjectedEarnings,
    portfolioDailyEarning,
    portfolioGuaranteedDailyYield,
    portfolioMarketDailyChange,
    totalMaturityValue,
    weightedAverageRatePct: Number(weightedAverageRatePct.toFixed(2)),
    activeCount,
    maturedCount,
    totalInvestments: investments.length,
    mutualFundCount,
    fixedDepositCount,
  };
}
