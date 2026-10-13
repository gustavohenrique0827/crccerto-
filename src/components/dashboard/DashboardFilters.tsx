import React, { useState, useEffect } from 'react';
import { RefreshCw, CalendarRange } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { rangeBounds } from '@/src/lib/supabase';

interface DashboardFiltersProps {
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
}

const PRESETS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'semana_ant', label: 'Semana passada' },
  { id: 'mes', label: 'Este mês' },
  { id: 'mes_ant', label: 'Mês passado' },
  { id: 'ano', label: 'Este ano' },
];

const br = (ymd: string) => ymd.split('-').reverse().join('/');

export default function DashboardFilters({ 
  selectedRange: externalRange, 
  onRangeChange 
}: DashboardFiltersProps) {
  const { addToast } = useApp();
  const [internalRange, setInternalRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const activeRange = externalRange || internalRange;
  const isCustom = activeRange.startsWith('custom:');
  const [from, to] = rangeBounds(activeRange);
  const [customOpen, setCustomOpen] = useState(isCustom);

  // Rascunho das datas: só vale (e recarrega o dashboard) quando a data está completa e plausível;
  // digitar o ano aos poucos gera valores como 0001 que não podem disparar consultas.
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  useEffect(() => { setDraftFrom(from); setDraftTo(to); }, [from, to]);
  const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number(v.slice(0, 4)) >= 2000 && Number(v.slice(0, 4)) <= 2100;
  useEffect(() => {
    if (!isCustom || !validDate(draftFrom) || !validDate(draftTo)) return;
    if (draftFrom === from && draftTo === to) return;
    const t = setTimeout(() => select(`custom:${draftFrom}:${draftTo}`), 350);
    return () => clearTimeout(t);
  }, [draftFrom, draftTo]);

  const select = (id: string) => {
    setInternalRange(id);
    onRangeChange?.(id);
  };

  const setCustom = (nf: string, nt: string) => select(`custom:${nf}:${nt}`);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent('crm_leads_updated'));
    setTimeout(() => {
      setIsRefreshing(false);
      addToast('Dados atualizados.', 'success');
    }, 600);
  };

  const chip = (active: boolean) => cn(
    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
    active
      ? "bg-[var(--color-primary-blue)] text-white shadow-sm"
      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)]"
  );

  return (
    <div className="flex flex-col items-start lg:items-end gap-2 mb-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap items-center gap-0.5 p-1 bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border-default)] shadow-sm max-w-full">
          {PRESETS.map(range => (
            <button key={range.id} onClick={() => { setCustomOpen(false); select(range.id); }} className={chip(activeRange === range.id)}>
              {range.label}
            </button>
          ))}
          <button
            onClick={() => { setCustomOpen(true); if (!isCustom) setCustom(from, to); }}
            className={cn(chip(isCustom || customOpen), "flex items-center gap-1.5")}
          >
            <CalendarRange size={13} />
            Personalizado
          </button>
        </div>

        <button 
          onClick={handleRefresh}
          className={cn(
            "p-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-xl text-[var(--color-text-muted)] shadow-sm hover:bg-[var(--color-surface-sunken)] transition-all cursor-pointer",
            isRefreshing && "animate-spin text-[var(--color-primary-blue)]"
          )}
          title="Atualizar dados agora"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
        {(customOpen || isCustom) && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[var(--color-text-muted)] font-semibold">
              De
              <input
                type="date"
                value={draftFrom}
                max={draftTo}
                onChange={e => setDraftFrom(e.target.value)}
                className="px-2 py-1 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-lg text-xs text-[var(--color-text-primary)] outline-none"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[var(--color-text-muted)] font-semibold">
              Até
              <input
                type="date"
                value={draftTo}
                min={draftFrom}
                onChange={e => setDraftTo(e.target.value)}
                className="px-2 py-1 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-lg text-xs text-[var(--color-text-primary)] outline-none"
              />
            </label>
          </div>
        )}
        <span className="text-[11px] font-semibold text-[var(--color-text-faint)]">
          {from === to ? br(from) : `${br(from)} a ${br(to)}`}
        </span>
      </div>
    </div>
  );
}
