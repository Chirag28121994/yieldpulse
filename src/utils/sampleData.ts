import { Investment } from '../types/investment';

// Helper to get relative dates formatted as YYYY-MM-DD
function getDateString(offsetMonths: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toISOString().split('T')[0];
}

export const INITIAL_SAMPLE_INVESTMENTS: Investment[] = [
  {
    id: 'sample-1',
    title: 'HDFC Cumulative Fixed Deposit',
    institution: 'HDFC Bank',
    category: 'fixed_deposit',
    principalAmount: 500000,
    annualRatePct: 7.75,
    compounding: 'quarterly',
    startDate: getDateString(-6), // started 6 months ago
    maturityDate: getDateString(18), // matures in 18 months (total 2 years)
    status: 'active',
    currency: 'INR',
    taxDeductionRatePct: 10,
    notes: 'FD opened with senior citizen bonus rate benefit.'
  },
  {
    id: 'sample-2',
    title: 'SBI Special Amrit Kalash FD',
    institution: 'State Bank of India',
    category: 'fixed_deposit',
    principalAmount: 250000,
    annualRatePct: 7.60,
    compounding: 'quarterly',
    startDate: getDateString(-4),
    maturityDate: getDateString(8), // 400 days tenure
    status: 'active',
    currency: 'INR',
    taxDeductionRatePct: 0,
    notes: 'Tenure of 400 days high yield rate.'
  },
  {
    id: 'sample-3',
    title: 'ICICI Bank Tax-Saver FD',
    institution: 'ICICI Bank',
    category: 'fixed_deposit',
    principalAmount: 150000,
    annualRatePct: 7.10,
    compounding: 'quarterly',
    startDate: getDateString(-12),
    maturityDate: getDateString(48), // 5-year lock-in
    status: 'active',
    currency: 'INR',
    taxDeductionRatePct: 10,
    notes: '80C tax deduction claimed.'
  },
  {
    id: 'sample-4',
    title: 'RBI Floating Rate Savings Bond',
    institution: 'Reserve Bank of India',
    category: 'bonds',
    principalAmount: 200000,
    annualRatePct: 8.05,
    compounding: 'half_yearly',
    startDate: getDateString(-9),
    maturityDate: getDateString(75), // 7 years tenure
    status: 'active',
    currency: 'INR',
    taxDeductionRatePct: 0,
    notes: 'Sovereign guaranteed coupon paid semi-annually.'
  },
  {
    id: 'sample-5',
    title: 'Bajaj Finance Corporate FD',
    institution: 'Bajaj Finserv',
    category: 'fixed_deposit',
    principalAmount: 100000,
    annualRatePct: 8.40,
    compounding: 'quarterly',
    startDate: getDateString(-14),
    maturityDate: getDateString(-2), // matured 2 months ago
    status: 'matured',
    currency: 'INR',
    taxDeductionRatePct: 10,
    notes: 'AAA rated NBFC fixed deposit. Maturity proceeds reinvested.'
  }
];
