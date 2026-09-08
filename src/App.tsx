import React, { useState } from 'react';
import { InvestmentProvider, useInvestments } from './context/InvestmentContext';
import { ToastProvider, useToast } from './components/Toast';
import { Header } from './components/Header';
import { PortfolioSummary } from './components/PortfolioSummary';
import { VisualCharts } from './components/VisualCharts';
import { InvestmentList } from './components/InvestmentList';
import { AddEditModal } from './components/AddEditModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { SupabaseModal } from './components/SupabaseModal';
import { Investment } from './types/investment';
import { ShieldCheck } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { 
    investments, 
    loading, 
    currency, 
    addInvestment, 
    updateInvestment, 
    deleteInvestment 
  } = useInvestments();
  const { showToast } = useToast();

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  const handleOpenAdd = () => {
    setEditingInvestment(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (inv: Investment) => {
    setEditingInvestment(inv);
    setIsAddEditOpen(true);
  };

  const handleSaveInvestment = async (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingInvestment) {
      await updateInvestment(editingInvestment.id, data);
      showToast('Investment updated successfully!', 'success');
    } else {
      await addInvestment(data);
      showToast('New investment added successfully!', 'success');
    }
  };

  const handleOpenDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInvestment(deleteTarget.id);
      showToast(`"${deleteTarget.title}" deleted from portfolio`, 'info');
      setDeleteTarget(null);
    } catch {
      showToast('Failed to delete investment', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-mono">Initializing portfolio ledger...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      
      {/* Top Navbar */}
      <Header
        onOpenAddModal={handleOpenAdd}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        
        {/* Portfolio Summary KPI Cards */}
        <section aria-label="Portfolio Summary">
          <PortfolioSummary />
        </section>

        {/* Visual Analytics (Charts & Radar) */}
        <section aria-label="Visual Analytics">
          <VisualCharts />
        </section>

        {/* Investments Directory & List */}
        <section aria-label="Investments Directory">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Investments & Deposits Ledger</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {investments.length} Total
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Live daily return accrual, compounding frequency, and tenure trackers
              </p>
            </div>
          </div>

          <InvestmentList
            investments={investments}
            currency={currency}
            onAddClick={handleOpenAdd}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
          />
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">YieldPulse</span>
            <span>•</span>
            <span>Client-side mathematical compounding & daily accrual engine</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              GitHub Pages Ready
            </span>
            <span>•</span>
            <span>Supabase PostgreSQL Compatible</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddEditModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        onSave={handleSaveInvestment}
        initialData={editingInvestment}
        currency={currency}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.title || ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

    </div>
  );
};

export function App() {
  return (
    <ToastProvider>
      <InvestmentProvider>
        <DashboardContent />
      </InvestmentProvider>
    </ToastProvider>
  );
}

export default App;
