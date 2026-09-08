import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useInvestments } from '../context/InvestmentContext';
import { computeInvestmentMetrics } from '../utils/calculations';
import { CATEGORY_META, formatCurrency } from '../utils/formatters';
import { PieChart, BarChart3, Calendar } from 'lucide-react';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

export const VisualCharts: React.FC = () => {
  const { investments, currency } = useInvestments();

  // 1. Asset Allocation Data
  const allocationData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};

    for (const inv of investments) {
      const cat = inv.category;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(inv.principalAmount);
    }

    const labels = Object.keys(categoryTotals).map(k => CATEGORY_META[k as keyof typeof CATEGORY_META]?.label || k);
    const data = Object.values(categoryTotals);

    const colors = [
      '#10b981', // emerald
      '#06b6d4', // cyan
      '#6366f1', // indigo
      '#f59e0b', // amber
      '#a855f7', // purple
      '#f43f5e', // rose
      '#64748b', // slate
    ];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: '#0f172a',
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
  }, [investments]);

  // 2. Institution / Daily Earnings distribution Bar Chart
  const institutionDailyData = useMemo(() => {
    const instTotals: Record<string, number> = {};

    for (const inv of investments) {
      if (inv.status !== 'matured') {
        const metrics = computeInvestmentMetrics(inv);
        instTotals[inv.institution] = (instTotals[inv.institution] || 0) + metrics.dailyEarning;
      }
    }

    const labels = Object.keys(instTotals);
    const data = Object.values(instTotals);

    return {
      labels,
      datasets: [
        {
          label: 'Daily Earning',
          data,
          backgroundColor: '#10b981',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  }, [investments]);

  // 3. Upcoming Maturities (Next 3)
  const upcomingMaturities = useMemo(() => {
    return investments
      .filter(i => i.status === 'active')
      .map(inv => ({
        inv,
        metrics: computeInvestmentMetrics(inv)
      }))
      .filter(item => !item.metrics.isMatured)
      .sort((a, b) => new Date(a.inv.maturityDate).getTime() - new Date(b.inv.maturityDate).getTime())
      .slice(0, 3);
  }, [investments]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 11, family: 'Inter' },
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          padding: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const val = context.raw || 0;
            return ` ${formatCurrency(val, currency, 0)}`;
          },
        },
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        bodyColor: '#10b981',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
      },
    },
    cutout: '70%',
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return ` ${formatCurrency(context.raw, currency)} / day`;
          },
        },
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        bodyColor: '#34d399',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 10, family: 'Inter' } },
      },
      y: {
        grid: { color: '#1e293b' },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, family: 'Inter' },
          callback: (val: any) => formatCurrency(val, currency, 0),
        },
      },
    },
  };

  if (investments.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      
      {/* Chart 1: Asset Allocation */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-semibold text-slate-200">Asset Allocation</h3>
          </div>
          <span className="text-xs text-slate-400">By Category</span>
        </div>
        <div className="h-52 relative flex items-center justify-center">
          <Doughnut data={allocationData} options={doughnutOptions} />
        </div>
      </div>

      {/* Chart 2: Daily Yield by Institution */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">Daily Inflow by Bank</h3>
          </div>
          <span className="text-xs text-emerald-400 font-medium">Daily yield</span>
        </div>
        <div className="h-52">
          {institutionDailyData.labels.length > 0 ? (
            <Bar data={institutionDailyData} options={barOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No active deposits generating yield
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Upcoming Maturities Radar */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-slate-200">Upcoming Maturities</h3>
            </div>
            <span className="text-xs text-slate-400">Nearest payout</span>
          </div>

          <div className="space-y-3">
            {upcomingMaturities.length === 0 ? (
              <div className="text-xs text-slate-500 py-8 text-center">
                No upcoming maturities scheduled
              </div>
            ) : (
              upcomingMaturities.map(({ inv, metrics }) => (
                <div 
                  key={inv.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[150px]">
                      {inv.title}
                    </span>
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-purple-500/10 text-purple-300">
                      {metrics.remainingDays} days left
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>{inv.institution}</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {formatCurrency(metrics.maturityValue, currency, 0)}
                    </span>
                  </div>
                  <div className="mt-1.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${metrics.progressPct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-400">
            Maturity proceeds include principal + compounded returns
          </span>
        </div>
      </div>

    </div>
  );
};
