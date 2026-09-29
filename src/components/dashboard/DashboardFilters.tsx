import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';

interface DashboardFiltersProps {
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
}

const PRESETS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
];

export default function DashboardFilters({ 
  selectedRange: externalRange, 
  onRangeChange 
}: DashboardFiltersProps) {
  const { addToast } = useApp();
  const [internalRange, setInternalRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeRange = externalRange || internalRange;

  const handleRangeClick = (rangeId: string) => {
    setInternalRange(rangeId);
    onRangeChange?.(rangeId);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      addToast('Dados atualizados agora com sucesso!', 'success');
    }, 600);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      {/* Date Selection Buttons: [Hoje] [Ontem] [Últimos 7 dias] [Últimos 30 dias] */}
      <div className="flex items-center p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto max-w-full custom-scrollbar">
        {PRESETS.map((range) => {
          const isSelected = activeRange === range.id;
          
          return (
            <button
              key={range.id}
              onClick={() => handleRangeClick(range.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                isSelected
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              )}
            >
              {range.label}
            </button>
          );
        })}
      </div>

      {/* Refresh Icon Button & Status */}
      <div className="flex items-center gap-3">
        <span className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Dados atualizados agora
        </span>
        <button 
          onClick={handleRefresh}
          className={cn(
            "p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all",
            isRefreshing && "animate-spin text-blue-600"
          )}
          title="Atualizar dados na hora"
        >
          <RefreshCw size={15} />
        </button>
      </div>
    </div>
  );
}
