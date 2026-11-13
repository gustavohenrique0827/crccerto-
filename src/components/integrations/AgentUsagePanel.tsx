import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, Loader2, Save } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApp } from '../../context/AppContext';
import { AgentBudget, AgentUsageRow, DEFAULT_AGENT_BUDGET, fetchAgentBudgets, fetchAgentUsage, saveAgentBudget } from '../../lib/supabase';

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const usd = (n: number) => `US$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const brl = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AgentUsagePanel() {
  const { clinics, addToast } = useApp();
  const [rows, setRows] = useState<AgentUsageRow[]>([]);
  const [budgets, setBudgets] = useState<Record<string, AgentBudget>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(); since.setDate(since.getDate() - 35);
    const [usage, b] = await Promise.all([fetchAgentUsage(since.toISOString()), fetchAgentBudgets()]);
    setRows(usage || []);
    setBudgets(b);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const monthStart = ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const days14 = useMemo(() => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return ymd(d); }), []);

  const setField = (id: string, patch: Partial<AgentBudget>) => setBudgets(prev => ({ ...prev, [id]: { ...(prev[id] || DEFAULT_AGENT_BUDGET), ...patch } }));
  const save = async (id: string) => {
    setSaving(id);
    const ok = await saveAgentBudget(id, budgets[id] || DEFAULT_AGENT_BUDGET);
    setSaving(null);
    addToast(ok ? 'Limite e custo salvos.' : 'Não foi possível salvar.', ok ? 'success' : 'error');
  };
  const input = 'w-24 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-5 max-w-5xl">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Estimativa feita pelas mensagens que o agente gravou: cada mensagem (do cliente ou da equipe) faz o agente trabalhar. O valor exato está na OpenAI; ajuste o custo médio por mensagem para se aproximar dele e defina um limite mensal para cada clínica.
      </p>
      {loading && <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" />Calculando…</p>}
      {!loading && clinics.map(c => {
        const b = budgets[c.id] || DEFAULT_AGENT_BUDGET;
        const mine = rows.filter(r => r.clinicId === c.id);
        const month = mine.filter(r => r.day >= monthStart).reduce((n, r) => n + r.messages, 0);
        const cost = month * b.costPerMessageUsd;
        const pct = b.monthlyLimitUsd > 0 ? Math.min(100, (cost / b.monthlyLimitUsd) * 100) : 0;
        const perDay = days14.map(d => mine.find(r => r.day === d)?.messages || 0);
        const max = Math.max(1, ...perDay);
        const over = b.monthlyLimitUsd > 0 && cost >= b.monthlyLimitUsd;
        return (
          <section key={c.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white"><Building2 size={15} />{c.name}</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">{month} mensagens neste mês</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5">
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{usd(cost)} <span className="text-sm font-semibold text-slate-400">≈ {brl(cost * b.usdBrl)}</span></p>
                <div className="mt-2 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className={cn('h-full rounded-full', over ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
                </div>
                <p className={cn('mt-1.5 text-xs font-semibold flex items-center gap-1.5', over ? 'text-rose-600' : pct > 80 ? 'text-amber-600' : 'text-slate-500 dark:text-slate-400')}>
                  {(over || pct > 80) && <AlertTriangle size={13} />}
                  {b.monthlyLimitUsd > 0 ? `${Math.round(pct)}% do limite de ${usd(b.monthlyLimitUsd)}${over ? ': limite atingido' : ''}` : 'Sem limite definido'}
                </p>
                <div className="mt-4 flex items-end gap-1 h-14" title="Mensagens por dia (últimos 14 dias)">
                  {perDay.map((n, i) => <div key={days14[i]} className="flex-1 rounded-t bg-blue-500/70" style={{ height: `${(n / max) * 100}%`, minHeight: n ? 3 : 1 }} title={`${days14[i].split('-').reverse().slice(0, 2).join('/')}: ${n}`} />)}
                </div>
              </div>
              <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-2 items-center text-xs text-slate-600 dark:text-slate-300 content-start">
                <label>Custo por mensagem (US$)</label>
                <input type="number" step="0.0005" min="0" value={b.costPerMessageUsd} onChange={e => setField(c.id, { costPerMessageUsd: Number(e.target.value) })} className={input} />
                <label>Limite mensal (US$)</label>
                <input type="number" step="1" min="0" value={b.monthlyLimitUsd} onChange={e => setField(c.id, { monthlyLimitUsd: Number(e.target.value) })} className={input} />
                <label>Dólar (R$)</label>
                <input type="number" step="0.1" min="0" value={b.usdBrl} onChange={e => setField(c.id, { usdBrl: Number(e.target.value) })} className={input} />
                <span />
                <button onClick={() => save(c.id)} disabled={saving === c.id} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 cursor-pointer">
                  {saving === c.id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}Salvar
                </button>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
