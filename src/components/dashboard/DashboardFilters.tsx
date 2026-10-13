import React, { useState, useEffect } from 'react';
import { RefreshCw, CalendarRange, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { rangeBounds } from '@/src/lib/supabase';
import { Button } from '../ui/Button';

interface DashboardFiltersProps {
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
}

const GROUPS: { title: string; items: { id: string; label: string }[] }[] = [
  { title: 'Dias', items: [{ id: 'hoje', label: 'Hoje' }, { id: 'ontem', label: 'Ontem' }] },
  { title: 'Últimos', items: [{ id: '7d', label: '7 dias' }, { id: '30d', label: '30 dias' }, { id: '90d', label: '90 dias' }] },
  { title: 'Calendário', items: [
    { id: 'semana', label: 'Esta semana' }, { id: 'semana_ant', label: 'Semana passada' },
    { id: 'mes', label: 'Este mês' }, { id: 'mes_ant', label: 'Mês passado' }, { id: 'ano', label: 'Este ano' }
  ] },
];

const br = (ymd: string) => ymd.split('-').reverse().join('/');
const short = (ymd: string) => ymd.split('-').reverse().slice(0, 2).join('/');
const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number(v.slice(0, 4)) >= 2000 && Number(v.slice(0, 4)) <= 2100;

export default function DashboardFilters({ selectedRange: externalRange, onRangeChange }: DashboardFiltersProps) {
  const { addToast } = useApp();
  const [internalRange, setInternalRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const activeRange = externalRange || internalRange;
  const isCustom = activeRange.startsWith('custom:');
  const [from, to] = rangeBounds(activeRange);

  // Datas personalizadas ficam em rascunho até "Aplicar" (digitar o ano aos poucos gera datas inválidas)
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  useEffect(() => { if (open) { setDraftFrom(from); setDraftTo(to); } }, [open]);
  const draftOk = validDate(draftFrom) && validDate(draftTo);

  const select = (id: string) => { setInternalRange(id); onRangeChange?.(id); };

  const label = isCustom
    ? 'Personalizado'
    : GROUPS.flatMap(g => g.items).find(i => i.id === activeRange)?.label || '30 dias';
  const prefix = !isCustom && ['7d', '30d', '90d'].includes(activeRange) ? 'Últimos ' : '';

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent('crm_leads_updated'));
    setTimeout(() => { setIsRefreshing(false); addToast('Dados atualizados.', 'success'); }, 600);
  };

  return (
    <div className="flex items-center gap-2 mb-6 justify-end">
      <div className="relative">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(o => !o)}>
          <CalendarRange size={14} />
          <span>{prefix}{label}</span>
          <span className="hidden sm:inline font-medium text-[var(--color-text-faint)]">
            · {from === to ? br(from) : `${short(from)} a ${br(to)}`}
          </span>
          <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
        </Button>

        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 4 }}
                className="absolute right-0 mt-2 w-72 max-w-[92vw] bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] z-50 text-xs overflow-hidden"
              >
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                  {GROUPS.map(g => (
                    <div key={g.title} className="mb-1">
                      <p className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)]">{g.title}</p>
                      {g.items.map(it => (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => { select(it.id); setOpen(false); }}
                          className={cn(
                            'w-full flex items-center justify-between px-2.5 py-2 rounded-[var(--radius-control)] font-semibold cursor-pointer transition-colors',
                            activeRange === it.id
                              ? 'bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)]'
                              : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)]'
                          )}
                        >
                          {it.label}
                          {activeRange === it.id && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  ))}

                  <div className="mt-1 pt-2 border-t border-[var(--color-border-default)] px-1">
                    <p className="px-1.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)]">Personalizado</p>
                    <div className="grid grid-cols-2 gap-2 px-1.5 pb-2">
                      <label className="space-y-1">
                        <span className="text-[10px] text-[var(--color-text-faint)] font-semibold">De</span>
                        <input
                          type="date" value={draftFrom} max={draftTo || undefined}
                          onChange={e => setDraftFrom(e.target.value)}
                          className="w-full px-2 py-1.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] outline-none"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] text-[var(--color-text-faint)] font-semibold">Até</span>
                        <input
                          type="date" value={draftTo} min={draftFrom || undefined}
                          onChange={e => setDraftTo(e.target.value)}
                          className="w-full px-2 py-1.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] outline-none"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="px-3 py-2.5 border-t border-[var(--color-border-default)] flex items-center justify-between bg-[var(--color-surface)]">
                  <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                    {isCustom ? `${br(from)} a ${br(to)}` : (from === to ? br(from) : `${br(from)} a ${br(to)}`)}
                  </span>
                  <Button
                    size="xs"
                    disabled={!draftOk}
                    onClick={() => { select(`custom:${draftFrom}:${draftTo}`); setOpen(false); }}
                  >
                    Aplicar datas
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={handleRefresh}
        className={cn(
          'p-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] transition-all cursor-pointer',
          isRefreshing && 'animate-spin text-[var(--color-primary-blue)]'
        )}
        title="Atualizar dados agora"
      >
        <RefreshCw size={15} />
      </button>
    </div>
  );
}
