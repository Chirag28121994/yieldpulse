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
 */
export function computeInvestmentMetrics(
  inv: Investment,
  referenceDate: Date = new Date()
): InvestmentComputedMetrics {
  const start = new Date(inv.startDate);
  const maturity = new Date(inv.maturityDate);
  const today = new Date(referenceDate);

  // Normalize all dates to midnight UTC to prevent daylight saving / timezone drift
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcMaturity = Date.UTC(maturity.getFullYear(), maturity.getMonth(), maturity.getDate());
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const rawTotalDays = Math.round((utcMaturity - utcStart) / MS_PER_DAY);
  const totalDurationDays = Math.max(1, rawTotalDays);

  const rawElapsedDays = Math.round((utcToday - utcStart) / MS_PER_DAY);
  const elapsedDays = Math.min(Math.max(0, rawElapsedDays), totalDurationDays);
  const remainingDays = Math.max(0, totalDurationDays - elapsedDays);
  const isMatured = utcToday >= utcMaturity || inv.status === 'matured';
  const progressPct = Math.min(100, Math.max(0, (elapsedDays / totalDurationDays) * 100));

  const P = Number(inv.principalAmount) || 0;
  const r = (Number(inv.annualRatePct) || 0) / 100;
  const n = getCompoundingFrequencyCycles(inv.compounding);

  let totalProjectedEarning = 0;
  let accruedEarning = 0;
  let dailyEarning = 0;
  let effectiveApyPct = inv.annualRatePct;

  const totalYears = totalDurationDays / 365.0;
  const elapsedYears = elapsedDays / 365.0;

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

    // Today's Daily Increment:
    // Difference between tomorrow's value and today's value
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
    elapsedDays,
    remainingDays,
    progressPct: Number(progressPct.toFixed(1)),
    dailyEarning: Math.max(0, dailyEarning),
    accruedEarning: Math.max(0, accruedEarning),
    totalProjectedEarning: Math.max(0, totalProjectedEarning),
    maturityValue,
    isMatured,
    effectiveApyPct: Number(effectiveApyPct.toFixed(2)),
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
  let portfolioDailyEarning = 0;
  let totalMaturityValue = 0;
  let weightedRateSum = 0;
  let activeCount = 0;
  let maturedCount = 0;

  for (const inv of investments) {
    const metrics = computeInvestmentMetrics(inv, referenceDate);
    const principal = Number(inv.principalAmount) || 0;

    totalPrincipal += principal;
    totalAccruedEarnings += metrics.accruedEarning;
    totalProjectedEarnings += metrics.totalProjectedEarning;
    totalMaturityValue += metrics.maturityValue;
    weightedRateSum += principal * (Number(inv.annualRatePct) || 0);

    if (metrics.isMatured || inv.status === 'matured') {
      maturedCount++;
    } else {
      activeCount++;
      portfolioDailyEarning += metrics.dailyEarning;
    }
  }

  const weightedAverageRatePct = totalPrincipal > 0 ? weightedRateSum / totalPrincipal : 0;

  return {
    totalPrincipal,
    totalAccruedEarnings,
    totalProjectedEarnings,
    portfolioDailyEarning,
    totalMaturityValue,
    weightedAverageRatePct: Number(weightedAverageRatePct.toFixed(2)),
    activeCount,
    maturedCount,
    totalInvestments: investments.length,
  };
}
