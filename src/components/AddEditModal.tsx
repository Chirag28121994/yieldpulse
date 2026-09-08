import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Calculator, 
  Building2, 
  Percent, 
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Investment, 
  InvestmentCategory, 
  CompoundingFrequency, 
  InvestmentStatus 
} from '../types/investment';
import { computeInvestmentMetrics } from '../utils/calculations';
import { 
  CATEGORY_META, 
  COMPOUNDING_LABELS, 
  CURRENCY_SYMBOLS, 
  formatCurrency 
} from '../utils/formatters';

interface AddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialData?: Investment | null;
  currency: string;
}

export const AddEditModal: React.FC<AddEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  currency,
}) => {
  const isEditing = Boolean(initialData);

  // Form State
  const [title, setTitle] = useState('');
  const [institution, setInstitution] = useState('');
  const [category, setCategory] = useState<InvestmentCategory>('fixed_deposit');
  const [principalAmount, setPrincipalAmount] = useState<string>('100000');
  const [annualRatePct, setAnnualRatePct] = useState<string>('7.50');
  const [compounding, setCompounding] = useState<CompoundingFrequency>('quarterly');
  const [startDate, setStartDate] = useState<string>('');
  const [maturityDate, setMaturityDate] = useState<string>('');
  const [status, setStatus] = useState<InvestmentStatus>('active');
  const [taxDeductionRatePct, setTaxDeductionRatePct] = useState<string>('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setTitle(initialData.title);
      setInstitution(initialData.institution);
      setCategory(initialData.category);
      setPrincipalAmount(initialData.principalAmount.toString());
      setAnnualRatePct(initialData.annualRatePct.toString());
      setCompounding(initialData.compounding);
      setStartDate(initialData.startDate);
      setMaturityDate(initialData.maturityDate);
      setStatus(initialData.status);
      setTaxDeductionRatePct((initialData.taxDeductionRatePct || 0).toString());
      setNotes(initialData.notes || '');
    } else {
      const today = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(today.getFullYear() + 1);

      setTitle('');
      setInstitution('');
      setCategory('fixed_deposit');
      setPrincipalAmount('100000');
      setAnnualRatePct('7.50');
      setCompounding('quarterly');
      setStartDate(today.toISOString().split('T')[0]);
      setMaturityDate(nextYear.toISOString().split('T')[0]);
      setStatus('active');
      setTaxDeductionRatePct('0');
      setNotes('');
    }
    setError(null);
  }, [isOpen, initialData]);

  // Live calculation preview
  const previewMetrics = useMemo(() => {
    const P = parseFloat(principalAmount) || 0;
    const r = parseFloat(annualRatePct) || 0;
    if (!startDate || !maturityDate || P <= 0) return null;

    const dummyInv: Investment = {
      id: 'preview',
      title: title || 'Preview',
      institution: institution || 'Institution',
      category,
      principalAmount: P,
      annualRatePct: r,
      compounding,
      startDate,
      maturityDate,
      status,
      currency,
      taxDeductionRatePct: parseFloat(taxDeductionRatePct) || 0,
    };

    return computeInvestmentMetrics(dummyInv);
  }, [principalAmount, annualRatePct, startDate, maturityDate, compounding, category, status, taxDeductionRatePct, currency, title, institution]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const P = parseFloat(principalAmount);
    const r = parseFloat(annualRatePct);
    const tax = parseFloat(taxDeductionRatePct) || 0;

    if (!title.trim()) {
      setError('Please provide an investment title or name');
      return;
    }
    if (!institution.trim()) {
      setError('Please specify the financial institution or bank');
      return;
    }
    if (isNaN(P) || P <= 0) {
      setError('Principal amount must be a positive number');
      return;
    }
    if (isNaN(r) || r < 0 || r > 100) {
      setError('Annual interest rate must be between 0% and 100%');
      return;
    }
    if (!startDate || !maturityDate) {
      setError('Please select both start date and maturity date');
      return;
    }
    if (new Date(maturityDate) <= new Date(startDate)) {
      setError('Maturity date must be strictly after the start date');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        title: title.trim(),
        institution: institution.trim(),
        category,
        principalAmount: P,
        annualRatePct: r,
        compounding,
        startDate,
        maturityDate,
        status,
        currency,
        taxDeductionRatePct: tax,
        notes: notes.trim(),
      });

      if (!isEditing) {
        // Trigger celebratory confetti for new deposit addition!
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
          });
        } catch {
          // ignore if canvas not supported
        }
      }

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'Failed to save investment');
    }
  };

  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditing ? 'Edit Investment Details' : 'Add New Fixed Deposit / Investment'}
              </h2>
              <p className="text-xs text-slate-400">
                Accurate daily interest, compounding and maturity calculations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Title / Description */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300">
                Investment Title / Nickname <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. HDFC 2-Year Cumulative FD, Sovereign Gold Bond"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Institution / Bank */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Bank / Issuer / Institution <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank, SBI, Vanguard"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Asset Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InvestmentCategory)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                {(Object.keys(CATEGORY_META) as InvestmentCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_META[cat]?.label || cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Principal Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Principal Amount ({currencySymbol}) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="text-xs font-mono font-bold text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="100000"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm font-mono text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Annual Return Rate % */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Annual Return Rate (%) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Percent className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="7.50"
                  value={annualRatePct}
                  onChange={(e) => setAnnualRatePct(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 pr-8 text-xs sm:text-sm font-mono text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Compounding Frequency */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300">
                Interest Compounding / Payout Method <span className="text-rose-400">*</span>
              </label>
              <select
                value={compounding}
                onChange={(e) => setCompounding(e.target.value as CompoundingFrequency)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                {(Object.keys(COMPOUNDING_LABELS) as CompoundingFrequency[]).map((freq) => (
                  <option key={freq} value={freq}>
                    {COMPOUNDING_LABELS[freq]}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Start / Deposit Date <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Maturity Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Maturity Date <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InvestmentStatus)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="active">Active (Earning Interest)</option>
                <option value="matured">Matured (Completed)</option>
                <option value="premature_closed">Prematurely Liquidated</option>
              </select>
            </div>

            {/* TDS / Tax Rate % */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Tax Deduction / TDS (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                step="1"
                placeholder="0"
                value={taxDeductionRatePct}
                onChange={(e) => setTaxDeductionRatePct(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300">Optional Notes / Account Number</label>
              <textarea
                rows={2}
                placeholder="FD Account #, Nominee, Auto-renewal instructions, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

          </div>

          {/* Real-Time Live Calculation Preview Box */}
          {previewMetrics && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-brand-950/60 to-slate-950 border border-brand-500/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-brand-300">
                <div className="flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-brand-400" />
                  <span>Real-Time Return Projection</span>
                </div>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  {previewMetrics.effectiveApyPct}% Effective APY
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="bg-slate-900/80 p-2 rounded-lg text-center">
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">Daily Earning</span>
                  <span className="block text-sm font-mono font-bold text-brand-400">
                    +{formatCurrency(previewMetrics.dailyEarning, currency)}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg text-center">
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">Accrued Earned</span>
                  <span className="block text-sm font-mono font-bold text-emerald-400">
                    +{formatCurrency(previewMetrics.accruedEarning, currency)}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg text-center">
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">Total Yield</span>
                  <span className="block text-sm font-mono font-bold text-purple-300">
                    +{formatCurrency(previewMetrics.totalProjectedEarning, currency, 0)}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg text-center">
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">Maturity Payout</span>
                  <span className="block text-sm font-mono font-bold text-white">
                    {formatCurrency(previewMetrics.maturityValue, currency, 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Form Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-brand-500 to-emerald-500 text-slate-950 shadow-lg shadow-brand-500/20 hover:from-brand-600 hover:to-emerald-600 active:scale-95 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Investment' : 'Add Investment'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
