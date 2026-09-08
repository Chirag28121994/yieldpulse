import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  AlertCircle,
  Inbox
} from 'lucide-react';
import { Investment, InvestmentCategory } from '../types/investment';
import { InvestmentCard } from './InvestmentCard';
import { CATEGORY_META } from '../utils/formatters';
import { computeInvestmentMetrics } from '../utils/calculations';

interface InvestmentListProps {
  investments: Investment[];
  currency: string;
  onAddClick: () => void;
  onEdit: (inv: Investment) => void;
  onDelete: (id: string, title: string) => void;
}

type SortField = 'maturity_asc' | 'daily_desc' | 'principal_desc' | 'rate_desc' | 'recent';

export const InvestmentList: React.FC<InvestmentListProps> = ({
  investments,
  currency,
  onAddClick,
  onEdit,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'matured'>('all');
  const [sortBy, setSortBy] = useState<SortField>('maturity_asc');

  // Filter & Sort Pipeline
  const filteredInvestments = useMemo(() => {
    return investments
      .filter((item) => {
        // Search Filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(term);
          const matchInst = item.institution.toLowerCase().includes(term);
          const matchNotes = item.notes?.toLowerCase().includes(term);
          if (!matchTitle && !matchInst && !matchNotes) return false;
        }

        // Category Filter
        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false;
        }

        // Status Filter
        if (selectedStatus === 'active') {
          const metrics = computeInvestmentMetrics(item);
          if (metrics.isMatured || item.status === 'matured') return false;
        } else if (selectedStatus === 'matured') {
          const metrics = computeInvestmentMetrics(item);
          if (!metrics.isMatured && item.status !== 'matured') return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'maturity_asc':
            return new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime();
          case 'daily_desc': {
            const da = computeInvestmentMetrics(a).dailyEarning;
            const db = computeInvestmentMetrics(b).dailyEarning;
            return db - da;
          }
          case 'principal_desc':
            return Number(b.principalAmount) - Number(a.principalAmount);
          case 'rate_desc':
            return Number(b.annualRatePct) - Number(a.annualRatePct);
          case 'recent':
          default:
            return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
      });
  }, [investments, searchTerm, selectedCategory, selectedStatus, sortBy]);

  const categories = Object.keys(CATEGORY_META) as InvestmentCategory[];

  return (
    <div className="space-y-5">
      
      {/* Search, Filter & Sort Controls */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 backdrop-blur-md space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bank, FD name, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs & Sort Selector */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* Status Pills */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedStatus === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({investments.length})
              </button>
              <button
                onClick={() => setSelectedStatus('active')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedStatus === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setSelectedStatus('matured')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedStatus === 'matured'
                    ? 'bg-slate-800 text-slate-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Matured
              </button>
            </div>

            {/* Sort Selector */}
            <div className="relative">
              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-medium text-slate-300">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortField)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-3"
                >
                  <option value="maturity_asc" className="bg-slate-900">Matures Earliest</option>
                  <option value="daily_desc" className="bg-slate-900">Daily Earning (High to Low)</option>
                  <option value="principal_desc" className="bg-slate-900">Principal (High to Low)</option>
                  <option value="rate_desc" className="bg-slate-900">Interest Rate (High to Low)</option>
                  <option value="recent" className="bg-slate-900">Recently Added</option>
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          <span className="flex items-center gap-1 text-slate-500 text-[11px] uppercase font-semibold mr-1 shrink-0">
            <Filter className="w-3 h-3" /> Category:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
              selectedCategory === 'all'
                ? 'bg-brand-500 text-slate-950 font-bold'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                selectedCategory === cat
                  ? 'bg-brand-500 text-slate-950 font-bold'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {CATEGORY_META[cat]?.label || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {filteredInvestments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredInvestments.map((inv) => (
            <InvestmentCard
              key={inv.id}
              investment={inv}
              currency={currency}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4">
            {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' ? (
              <AlertCircle className="w-7 h-7 text-amber-400" />
            ) : (
              <Inbox className="w-7 h-7 text-brand-400" />
            )}
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'No matching investments found'
              : 'Your portfolio is currently empty'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6">
            {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'Try resetting the search keyword or filter options to display your investments.'
              : 'Add your first Fixed Deposit, Recurring Deposit, or Sovereign Bond to start tracking daily and compound earnings.'}
          </p>
          {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Clear All Filters
            </button>
          ) : (
            <button
              onClick={onAddClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-brand-500 to-emerald-500 text-slate-950 shadow-lg shadow-brand-500/20 hover:from-brand-600 hover:to-emerald-600 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Your First Investment</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
};
