import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Calculator, 
  Building2, 
  Percent, 
  AlertCircle,
  Search,
  TrendingUp,
  RefreshCw,
  Calendar,
  Layers
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
  formatCurrency,
  formatSignedCurrency,
  formatSignedPct
} from '../utils/formatters';
import { 
  searchMutualFunds, 
  getSchemeDetails, 
  findNavForDate, 
  MfSearchItem,
  MfSchemeDetails
} from '../services/mfApi';

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

  // Tab mode: 'fixed_deposit' vs 'mutual_fund'
  const [activeTab, setActiveTab] = useState<'fixed_deposit' | 'mutual_fund'>('fixed_deposit');

  // Common Form State
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

  // Mutual Fund Specific State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MfSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<MfSearchItem | null>(null);
  const [schemeDetails, setSchemeDetails] = useState<MfSchemeDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [mfUnits, setMfUnits] = useState<string>('');
  const [mfBuyNav, setMfBuyNav] = useState<string>('');
  const [mfCurrentNav, setMfCurrentNav] = useState<number>(0);
  const [mfPreviousNav, setMfPreviousNav] = useState<number>(0);
  const [mfNavDate, setMfNavDate] = useState<string>('');

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      const isMf = initialData.category === 'mutual_fund';
      setActiveTab(isMf ? 'mutual_fund' : 'fixed_deposit');
      setTitle(initialData.title);
      setInstitution(initialData.institution);
      setCategory(initialData.category);
      setPrincipalAmount(initialData.principalAmount.toString());
      setAnnualRatePct(initialData.annualRatePct.toString());
      setCompounding(initialData.compounding);
      setStartDate(initialData.startDate);
      setMaturityDate(initialData.maturityDate || '');
      setStatus(initialData.status);
      setTaxDeductionRatePct((initialData.taxDeductionRatePct || 0).toString());
      setNotes(initialData.notes || '');

      if (isMf) {
        setMfUnits(initialData.units ? initialData.units.toString() : '');
        setMfBuyNav(initialData.buyNav ? initialData.buyNav.toString() : '');
        setMfCurrentNav(initialData.currentNav || 0);
        setMfPreviousNav(initialData.previousNav || 0);
        setMfNavDate(initialData.navDate || '');
        if (initialData.schemeCode) {
          setSelectedScheme({
            schemeCode: Number(initialData.schemeCode),
            schemeName: initialData.title,
          });
          // Load full scheme details
          loadScheme(initialData.schemeCode, initialData.startDate);
        }
      }
    } else {
      const today = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(today.getFullYear() + 1);

      setActiveTab('fixed_deposit');
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

      // Reset MF fields
      setSelectedScheme(null);
      setSchemeDetails(null);
      setSearchQuery('');
      setSearchResults([]);
      setMfUnits('');
      setMfBuyNav('');
      setMfCurrentNav(0);
      setMfPreviousNav(0);
      setMfNavDate('');
    }
    setError(null);
  }, [isOpen, initialData]);

  // Handle switching tabs
  const handleTabSwitch = (tab: 'fixed_deposit' | 'mutual_fund') => {
    setActiveTab(tab);
    if (tab === 'mutual_fund') {
      setCategory('mutual_fund');
      if (!startDate) {
        setStartDate(new Date().toISOString().split('T')[0]);
      }
    } else {
      setCategory('fixed_deposit');
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for mutual funds
  useEffect(() => {
    if (activeTab !== 'mutual_fund' || !searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchMutualFunds(searchQuery);
        setSearchResults(results);
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, activeTab]);

  // Load scheme details and auto-detect purchase NAV
  const loadScheme = async (schemeCode: string | number, purchaseDateStr: string) => {
    setIsLoadingDetails(true);
    try {
      const details = await getSchemeDetails(schemeCode);
      if (details && details.data && details.data.length > 0) {
        setSchemeDetails(details);
        const curNav = parseFloat(details.data[0].nav) || 0;
        const prevNav = details.data.length > 1 ? parseFloat(details.data[1].nav) : curNav;
        setMfCurrentNav(curNav);
        setMfPreviousNav(prevNav);
        setMfNavDate(details.data[0].date);

        // Auto find NAV for purchase date
        const match = findNavForDate(details, purchaseDateStr || startDate);
        if (match && match.nav > 0) {
          setMfBuyNav(match.nav.toString());
          // If principal amount is set, compute units
          const p = parseFloat(principalAmount);
          if (p > 0) {
            setMfUnits((p / match.nav).toFixed(4));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load scheme details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // When user selects a scheme from dropdown
  const handleSelectScheme = (item: MfSearchItem) => {
    setSelectedScheme(item);
    setShowDropdown(false);
    setSearchQuery('');
    setTitle(item.schemeName);
    loadScheme(item.schemeCode, startDate);
  };

  // Re-lookup NAV when purchase date changes in MF tab
  const handleStartDateChange = (newDate: string) => {
    setStartDate(newDate);
    if (activeTab === 'mutual_fund' && schemeDetails) {
      const match = findNavForDate(schemeDetails, newDate);
      if (match && match.nav > 0) {
        setMfBuyNav(match.nav.toString());
        const p = parseFloat(principalAmount);
        if (p > 0) {
          setMfUnits((p / match.nav).toFixed(4));
        }
      }
    }
  };

  // Synchronize Amount and Units when Amount changes
  const handleAmountChange = (val: string) => {
    setPrincipalAmount(val);
    if (activeTab === 'mutual_fund') {
      const p = parseFloat(val);
      const bNav = parseFloat(mfBuyNav);
      if (!isNaN(p) && p > 0 && !isNaN(bNav) && bNav > 0) {
        setMfUnits((p / bNav).toFixed(4));
      }
    }
  };

  // Synchronize Amount when Units change
  const handleUnitsChange = (val: string) => {
    setMfUnits(val);
    if (activeTab === 'mutual_fund') {
      const u = parseFloat(val);
      const bNav = parseFloat(mfBuyNav);
      if (!isNaN(u) && u > 0 && !isNaN(bNav) && bNav > 0) {
        setPrincipalAmount((u * bNav).toFixed(2));
      }
    }
  };

  // Synchronize Units when Buy NAV changes
  const handleBuyNavChange = (val: string) => {
    setMfBuyNav(val);
    if (activeTab === 'mutual_fund') {
      const bNav = parseFloat(val);
      const p = parseFloat(principalAmount);
      if (!isNaN(p) && p > 0 && !isNaN(bNav) && bNav > 0) {
        setMfUnits((p / bNav).toFixed(4));
      }
    }
  };

  // Live calculation preview
  const previewMetrics = useMemo(() => {
    const P = parseFloat(principalAmount) || 0;
    if (P <= 0 || !startDate) return null;

    if (activeTab === 'mutual_fund') {
      const bNav = parseFloat(mfBuyNav) || 0;
      const u = parseFloat(mfUnits) || (bNav > 0 ? P / bNav : 0);
      const cNav = mfCurrentNav || bNav;
      const pNav = mfPreviousNav || cNav;

      const dummyInv: Investment = {
        id: 'preview',
        title: title || 'Mutual Fund',
        institution: schemeDetails?.meta.fund_house || institution || 'Mutual Fund AMC',
        category: 'mutual_fund',
        principalAmount: P,
        annualRatePct: 0,
        compounding: 'annually',
        startDate,
        maturityDate: '2076-12-31',
        status: 'active',
        currency,
        schemeCode: selectedScheme ? String(selectedScheme.schemeCode) : undefined,
        units: u,
        buyNav: bNav,
        currentNav: cNav,
        previousNav: pNav,
        navDate: mfNavDate,
      };
      return computeInvestmentMetrics(dummyInv);
    } else {
      const r = parseFloat(annualRatePct) || 0;
      if (!maturityDate) return null;

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
    }
  }, [
    activeTab,
    principalAmount,
    annualRatePct,
    startDate,
    maturityDate,
    compounding,
    category,
    status,
    taxDeductionRatePct,
    currency,
    title,
    institution,
    mfBuyNav,
    mfUnits,
    mfCurrentNav,
    mfPreviousNav,
    mfNavDate,
    selectedScheme,
    schemeDetails
  ]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const P = parseFloat(principalAmount);
    if (isNaN(P) || P <= 0) {
      setError('Investment amount must be a positive number');
      return;
    }

    if (!startDate) {
      setError('Please select a valid start / purchase date');
      return;
    }

    // Validation for Mutual Funds
    if (activeTab === 'mutual_fund') {
      if (!title.trim()) {
        setError('Please select a Mutual Fund scheme or enter a fund name');
        return;
      }
      const bNav = parseFloat(mfBuyNav);
      if (isNaN(bNav) || bNav <= 0) {
        setError('Please provide a valid Purchase NAV (NAV on purchase date)');
        return;
      }
      const u = parseFloat(mfUnits) || (P / bNav);
      if (isNaN(u) || u <= 0) {
        setError('Please provide the units allotted or a valid amount');
        return;
      }

      const instName = schemeDetails?.meta.fund_house || institution.trim() || 'Mutual Fund AMC';

      try {
        setIsSubmitting(true);
        await onSave({
          title: title.trim(),
          institution: instName,
          category: 'mutual_fund',
          principalAmount: P,
          annualRatePct: previewMetrics?.cagrPct || 0,
          compounding: 'annually',
          startDate,
          maturityDate: '2076-12-31', // Open-ended horizon
          status: 'active',
          currency,
          taxDeductionRatePct: 0,
          notes: notes.trim(),
          schemeCode: selectedScheme ? String(selectedScheme.schemeCode) : undefined,
          units: Number(u.toFixed(4)),
          buyNav: Number(bNav.toFixed(4)),
          currentNav: mfCurrentNav > 0 ? mfCurrentNav : bNav,
          previousNav: mfPreviousNav > 0 ? mfPreviousNav : (mfCurrentNav > 0 ? mfCurrentNav : bNav),
          navDate: mfNavDate,
        });

        if (!isEditing) {
          try {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
          } catch {}
        }

        setIsSubmitting(false);
        onClose();
      } catch (err: any) {
        setIsSubmitting(false);
        setError(err?.message || 'Failed to save Mutual Fund');
      }
      return;
    }

    // Validation for Fixed Deposits & others
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
    if (isNaN(r) || r < 0 || r > 100) {
      setError('Annual interest rate must be between 0% and 100%');
      return;
    }
    if (!maturityDate) {
      setError('Please select a maturity date');
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
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        } catch {}
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
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              activeTab === 'mutual_fund' 
                ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                : 'bg-brand-500/10 border border-brand-500/20 text-brand-400'
            }`}>
              {activeTab === 'mutual_fund' ? <TrendingUp className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditing 
                  ? `Edit ${activeTab === 'mutual_fund' ? 'Mutual Fund' : 'Fixed Income'}`
                  : 'Add New Investment'}
              </h2>
              <p className="text-xs text-slate-400">
                {activeTab === 'mutual_fund'
                  ? 'Real-time AMFI NAV, historical buy NAV, 1D return and CAGR'
                  : 'Accurate daily interest, compounding and maturity calculations'}
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

        {/* Uncluttered Category Tab Switcher (only for new investments or when editing) */}
        <div className="px-6 pt-4 pb-1 bg-slate-950/40 border-b border-slate-800/60">
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-md">
            <button
              type="button"
              onClick={() => handleTabSwitch('fixed_deposit')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'fixed_deposit'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Fixed Deposit / Bonds</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('mutual_fund')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'mutual_fund'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Mutual Fund (Live AMFI)</span>
            </button>
          </div>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* MUTUAL FUND MODE: CLEAN, INTUITIVE & LIVE SEARCH             */}
          {/* ============================================================ */}
          {activeTab === 'mutual_fund' ? (
            <div className="space-y-4">
              
              {/* Scheme Search Bar with Dropdown */}
              <div className="space-y-1.5 relative" ref={dropdownRef}>
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Search Mutual Fund Scheme <span className="text-rose-400">*</span></span>
                  {selectedScheme && (
                    <span className="text-[11px] text-cyan-400 font-mono">
                      Code: {selectedScheme.schemeCode}
                    </span>
                  )}
                </label>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search fund name or AMFI code, e.g. JioBlackRock Liquid, Parag Parikh, 153651..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowDropdown(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  {isSearching && (
                    <RefreshCw className="w-4 h-4 text-cyan-400 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" />
                  )}
                </div>

                {/* Autocomplete Search Dropdown */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1.5 max-h-60 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800">
                    {searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <button
                          key={item.schemeCode}
                          type="button"
                          onClick={() => handleSelectScheme(item)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-cyan-500/10 transition-colors flex items-start justify-between gap-3 group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 truncate">
                              {item.schemeName}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">AMFI #{item.schemeCode}</p>
                          </div>
                          {item.schemeName.toLowerCase().includes('direct') && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                              Direct
                            </span>
                          )}
                        </button>
                      ))
                    ) : searchQuery.trim().length >= 2 && !isSearching ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        <p className="font-semibold text-slate-300">No mutual fund matching "{searchQuery}"</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Tip: You can also paste an AMFI scheme code (e.g. <span className="text-cyan-400 font-mono">153651</span>) directly.
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Selected Scheme Info Card */}
              {selectedScheme && (
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                        {schemeDetails?.meta.fund_house || 'Mutual Fund'}
                      </span>
                      {mfNavDate && (
                        <span className="text-[10px] text-slate-400">
                          Latest NAV: {mfNavDate}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {selectedScheme.schemeName}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Current NAV</span>
                      <span className="text-sm font-mono font-bold text-cyan-400">
                        ₹{mfCurrentNav.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid: Purchase Date & Buy NAV */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Purchase / SIP Date <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Purchase NAV (₹) <span className="text-rose-400">*</span></span>
                    {isLoadingDetails && (
                      <span className="text-[10px] text-cyan-400 animate-pulse">Detecting...</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      step="any"
                      min="0.0001"
                      placeholder="e.g. 75.4321"
                      value={mfBuyNav}
                      onChange={(e) => handleBuyNavChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dual Linked Inputs: Invested Amount (₹) and Units */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Invested Amount ({currencySymbol}) <span className="text-rose-400">*</span>
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
                      placeholder="50000"
                      value={principalAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Allotted Units</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    placeholder="Calculated automatically"
                    value={mfUnits}
                    onChange={(e) => handleUnitsChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Optional Notes / Folio Number</label>
                <input
                  type="text"
                  placeholder="Folio #, Goal (e.g. Retirement, Emergency), Platform..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

            </div>
          ) : (
            /* ============================================================ */
            /* FIXED DEPOSIT MODE: EXISTING CLEAN FORM                       */
            /* ============================================================ */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Title */}
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

              {/* Institution */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Bank / Issuer / Institution <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank, SBI, ICICI"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Asset Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Asset Category <span className="text-rose-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as InvestmentCategory)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                >
                  {(Object.keys(CATEGORY_META) as InvestmentCategory[])
                    .filter((c) => c !== 'mutual_fund')
                    .map((cat) => (
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
                  Annual Interest Rate (%) <span className="text-rose-400">*</span>
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
                  Interest Compounding Method <span className="text-rose-400">*</span>
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
                  Deposit Start Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Maturity Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Maturity Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
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

              {/* TDS % */}
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
          )}

          {/* ============================================================ */}
          {/* LIVE PREVIEW BOX                                             */}
          {/* ============================================================ */}
          {previewMetrics && (
            <div className={`p-4 rounded-xl border space-y-2.5 ${
              activeTab === 'mutual_fund'
                ? 'bg-gradient-to-br from-cyan-950/40 to-slate-950 border-cyan-500/30'
                : 'bg-gradient-to-br from-brand-950/60 to-slate-950 border-brand-500/30'
            }`}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className={`flex items-center gap-1.5 ${
                  activeTab === 'mutual_fund' ? 'text-cyan-300' : 'text-brand-300'
                }`}>
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{activeTab === 'mutual_fund' ? 'Live Valuation & Return Metrics' : 'Real-Time Return Projection'}</span>
                </div>
                <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                  activeTab === 'mutual_fund'
                    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                    : 'bg-brand-500/10 text-brand-300 border-brand-500/20'
                }`}>
                  {activeTab === 'mutual_fund'
                    ? `${previewMetrics.cagrPct ?? 0}% CAGR / Return`
                    : `${previewMetrics.effectiveApyPct}% Effective APY`}
                </span>
              </div>

              {activeTab === 'mutual_fund' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-slate-900/80 p-2 rounded-lg text-center">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Current Value</span>
                    <span className="block text-sm font-mono font-bold text-white">
                      {formatCurrency(previewMetrics.currentValue || 0, currency)}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg text-center">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Total Gain / Loss</span>
                    <span className={`block text-sm font-mono font-bold ${
                      (previewMetrics.accruedEarning || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatSignedCurrency(previewMetrics.accruedEarning || 0, currency)}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg text-center">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Today's 1D Move</span>
                    <span className={`block text-sm font-mono font-bold ${
                      (previewMetrics.oneDayChange || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatSignedCurrency(previewMetrics.oneDayChange || 0, currency)}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg text-center">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">1D Change %</span>
                    <span className={`block text-sm font-mono font-bold ${
                      (previewMetrics.oneDayChangePct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatSignedPct(previewMetrics.oneDayChangePct || 0)}
                    </span>
                  </div>
                </div>
              ) : (
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
              )}
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
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50 text-slate-950 ${
                activeTab === 'mutual_fund'
                  ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-cyan-500/20 hover:from-cyan-500 hover:to-emerald-500'
                  : 'bg-gradient-to-r from-brand-500 to-emerald-500 shadow-brand-500/20 hover:from-brand-600 hover:to-emerald-600'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isSubmitting 
                  ? 'Saving...' 
                  : isEditing 
                    ? 'Update Investment' 
                    : activeTab === 'mutual_fund' ? 'Track Mutual Fund' : 'Add Investment'}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
