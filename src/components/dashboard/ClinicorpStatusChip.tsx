import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { ClinicIntegration, fetchClinicIntegrations, runClinicorpSync } from '@/src/lib/clinicorpSync';

const ago = (iso: string) => {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
};

/** Mostra se o dashboard está ligado ao Clinicorp (última sincronização) e deixa sincronizar na hora. */
export default function ClinicorpStatusChip({ clinicId }: { clinicId?: string }) {
  const { addToast } = useApp();
  const [items, setItems] = useState<ClinicIntegration[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => setItems(await fetchClinicIntegrations()), []);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const scope = useMemo(() => items.filter(i => i.hasKey && (!clinicId || clinicId === 'all' || i.clinicId === clinicId)), [items, clinicId]);
  const last = scope.map(i => i.lastSyncAt).filter(Boolean).sort().pop() || null;
  const failed = scope.some(i => i.lastStatus === 'error');
  const stale = !last || Date.now() - new Date(last).getTime() > 24 * 3600000;
  const tone = scope.length === 0 ? 'off' : failed ? 'error' : stale ? 'warn' : 'ok';

  const sync = async () => {
    if (scope.length === 0) return;
    setBusy(true);
    const results = await Promise.all(scope.map(i => runClinicorpSync({ clinicId: i.clinicId, daysBack: 60, daysForward: 120 })));
    setBusy(false);
    const bad = results.find(r => !r.ok);
    addToast(bad ? (bad.message || 'Falha ao sincronizar com o Clinicorp.') : 'Clinicorp sincronizado: números atualizados.', bad ? 'error' : 'success');
    await load();
    window.dispatchEvent(new Event('crm_leads_updated')); // recalcula os cards do dashboard
  };

  return (
    <span className={cn('inline-flex items-center gap-2 pl-2.5 pr-1 py-1 rounded-full text-[11px] font-bold border',
      tone === 'ok' ? 'border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30'
      : tone === 'warn' ? 'border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30'
      : tone === 'error' ? 'border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30'
      : 'border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40')}>
      <span className={cn('w-2 h-2 rounded-full', tone === 'ok' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-500' : tone === 'error' ? 'bg-rose-500' : 'bg-slate-400')} />
      {scope.length === 0 ? 'Clinicorp não conectado' : `Clinicorp ${failed ? 'com erro' : last ? `sincronizado ${ago(last)}` : 'ainda não sincronizado'}`}
      {scope.length > 0 && (
        <button onClick={sync} disabled={busy} title="Sincronizar agora" className="ml-1 p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50 cursor-pointer">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        </button>
      )}
    </span>
  );
}
