import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, Copy, KeyRound, Loader2, PlugZap, RefreshCw, Unplug, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApp } from '../../context/AppContext';
import {
  ClinicIntegration, ClinicorpSyncResult, connectClinicorp, disconnectClinicorp, fetchClinicIntegrations, runClinicorpSync, setClinicorpAutoSync
} from '../../lib/clinicorpSync';

interface ClinicorpConfigPanelProps {
  onBack: () => void;
}

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const summarize = (r: ClinicorpSyncResult) => {
  if (!r.ok) return r.message || 'Falha ao sincronizar.';
  const moved = r.leadsMoved ? r.leadsMoved.agendamento + r.leadsMoved.compareceu + r.leadsMoved.faltou : 0;
  return [
    `${r.appointments ?? 0} agendamentos`, `${r.patients ?? 0} pacientes`, `${r.professionals ?? 0} profissionais`,
    r.blockedSlots ? `${r.blockedSlots} horários fechados` : '',
    moved ? `${moved} leads movidos no funil (${r.leadsMoved!.agendamento} agendados, ${r.leadsMoved!.compareceu} compareceram, ${r.leadsMoved!.faltou} faltaram)` : ''
  ].filter(Boolean).join(' · ');
};

export default function ClinicorpConfigPanel({ onBack: _onBack }: ClinicorpConfigPanelProps) {
  const { clinics, currentClinic, addToast } = useApp();
  const [clinicId, setClinicId] = useState<string>(() => (currentClinic?.id && clinics.some(c => c.id === currentClinic.id) ? currentClinic.id : clinics[0]?.id || ''));
  const [items, setItems] = useState<ClinicIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriber, setSubscriber] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState<null | 'connect' | 'sync' | 'test' | 'disconnect'>(null);
  const [report, setReport] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => { setLoading(true); setItems(await fetchClinicIntegrations()); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  const current = useMemo(() => items.find(i => i.clinicId === clinicId) || null, [items, clinicId]);
  const clinic = clinics.find(c => c.id === clinicId);
  useEffect(() => { setSubscriber(current?.subscriberId || ''); setApiKey(''); setReport(null); }, [clinicId, current?.subscriberId]);

  const finish = (r: ClinicorpSyncResult, okText?: string) => {
    setReport({ ok: r.ok, text: r.ok ? (okText || summarize(r)) : (r.message || 'Falha.') });
    addToast(r.ok ? (okText || 'Pronto!') : (r.message || 'Falha.'), r.ok ? 'success' : 'error');
  };

  const connect = async () => {
    if (!clinicId || !subscriber.trim() || !apiKey.trim()) { addToast('Preencha o usuário e a chave da API do Clinicorp.', 'error'); return; }
    setBusy('connect');
    const r = await connectClinicorp(clinicId, subscriber, apiKey);
    setBusy(null);
    finish(r, `Conectado: ${r.professionals ?? 0} profissionais encontrados. Agora clique em Sincronizar agora.`);
    if (r.ok) { setApiKey(''); load(); }
  };
  const sync = async (dryRun: boolean) => {
    if (!clinicId) return;
    setBusy(dryRun ? 'test' : 'sync');
    const r = await runClinicorpSync({ clinicId, dryRun, daysBack: 60, daysForward: 120 });
    setBusy(null);
    finish(r, r.ok ? (dryRun ? `Teste ok, nada foi gravado: ${summarize(r)}` : `Sincronizado: ${summarize(r)}`) : undefined);
    if (!dryRun) load();
  };
  const disconnect = async () => {
    if (!clinicId || !window.confirm(`Desconectar o Clinicorp de ${clinic?.name}? Os dados já importados continuam no sistema.`)) return;
    setBusy('disconnect');
    const r = await disconnectClinicorp(clinicId);
    setBusy(null);
    finish(r, 'Clinicorp desconectado desta clínica.');
    load();
  };
  const toggleAuto = async () => {
    if (!current) return;
    const next = !current.autoSync;
    setItems(prev => prev.map(i => i.clinicId === clinicId ? { ...i, autoSync: next } : i));
    const r = await setClinicorpAutoSync(clinicId, next);
    if (!r.ok) { addToast(r.message || 'Não foi possível salvar.', 'error'); load(); }
  };

  const endpoint = typeof window !== 'undefined' ? `${window.location.origin}/api/clinicorp/sync` : '/api/clinicorp/sync';
  const field = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white';

  if (clinics.length === 0) return <p className="text-sm text-slate-400">Cadastre uma clínica primeiro.</p>;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Clínica */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400"><Building2 size={14} />Clínica</label>
        <select value={clinicId} onChange={e => setClinicId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white outline-none cursor-pointer">
          {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {loading ? <Loader2 size={16} className="animate-spin text-slate-400" /> : (
          <span className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold', current?.hasKey ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
            {current?.hasKey ? <><CheckCircle2 size={13} />Conectada</> : 'Sem credenciais'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Credenciais */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white"><KeyRound size={16} />Credenciais do Clinicorp de {clinic?.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cada clínica usa o próprio usuário e a própria chave. A chave fica guardada no servidor e não aparece mais depois de salva.</p>
          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Usuário (subscriber_id)</span>
            <input value={subscriber} onChange={e => setSubscriber(e.target.value)} placeholder="ex.: minhaclinica" className={field} autoComplete="off" />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chave da API {current?.hasKey && <span className="normal-case font-medium">(já salva: preencha só para trocar)</span>}</span>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={current?.hasKey ? '••••••••••••' : 'Cole a chave'} className={field} autoComplete="new-password" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={connect} disabled={busy !== null} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
              {busy === 'connect' ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}Testar e salvar
            </button>
            {current?.hasKey && (
              <button onClick={disconnect} disabled={busy !== null} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50 cursor-pointer">
                <Unplug size={14} />Desconectar
              </button>
            )}
          </div>
        </section>

        {/* Sincronização */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white"><RefreshCw size={16} />Sincronização</h3>
          <dl className="grid grid-cols-[130px_1fr] gap-y-1.5 text-xs">
            <dt className="text-slate-400">Última execução</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{fmt(current?.lastSyncAt)}</dd>
            <dt className="text-slate-400">Resultado</dt>
            <dd className={cn('font-semibold', current?.lastStatus === 'error' ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100')}>{current?.lastStatus === 'ok' ? 'Sucesso' : current?.lastStatus === 'error' ? `Falhou: ${current.lastMessage}` : '—'}</dd>
          </dl>
          <label className={cn('flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700', !current?.hasKey && 'opacity-50')}>
            <span className="text-xs"><span className="block font-bold text-slate-800 dark:text-slate-100">Sincronização automática</span><span className="text-slate-500 dark:text-slate-400">Atualiza a agenda sozinha e move os leads no funil conforme a agenda.</span></span>
            <button type="button" disabled={!current?.hasKey} onClick={toggleAuto} aria-pressed={!!current?.autoSync} className={cn('w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 cursor-pointer', current?.autoSync ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700')}>
              <span className={cn('block w-5 h-5 rounded-full bg-white transition-transform', current?.autoSync && 'translate-x-5')} />
            </button>
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => sync(false)} disabled={busy !== null} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
              {busy === 'sync' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}Sincronizar agora
            </button>
            <button onClick={() => sync(true)} disabled={busy !== null} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer">
              Só testar (não grava)
            </button>
          </div>
          {report && (
            <p className={cn('flex items-start gap-2 text-xs font-semibold rounded-lg p-3', report.ok ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300')}>
              {report.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}{report.text}
            </p>
          )}
        </section>
      </div>

      {/* Automação */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Como a automação funciona</h3>
        <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-5">
          <li>A cada sincronização o sistema traz agenda, pacientes, profissionais, status e etiquetas do Clinicorp.</li>
          <li>O lead acompanha a consulta mais recente do telefone dele: <strong>agendada → Agendado</strong>, <strong>atendida → Compareceu</strong>, <strong>faltou → Faltou</strong>. Vendido e Desqualificado nunca são alterados.</li>
          <li>A Vercel sincroniza todas as clínicas conectadas uma vez por dia. Para atualizar de 15 em 15 minutos, crie no n8n um agendador (Schedule Trigger) que chame o endereço abaixo.</li>
        </ul>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <code className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 break-all">GET {endpoint}</code>
          <button onClick={() => { navigator.clipboard.writeText(endpoint); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 cursor-pointer"><Copy size={13} />{copied ? 'Copiado' : 'Copiar'}</button>
        </div>
        <p className="text-[11px] text-slate-400">Cabeçalho: <code>Authorization: Bearer &lt;CRON_SECRET&gt;</code>. O CRON_SECRET é uma variável do projeto na Vercel (você define o valor).</p>
      </section>

      {/* Todas as clínicas */}
      {clinics.length > 1 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-2.5 font-bold">Clínica</th><th className="px-4 py-2.5 font-bold">Usuário Clinicorp</th><th className="px-4 py-2.5 font-bold">Automática</th><th className="px-4 py-2.5 font-bold">Última sincronização</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map(c => {
                const it = items.find(i => i.clinicId === c.id);
                return (
                  <tr key={c.id} onClick={() => setClinicId(c.id)} className={cn('border-b last:border-0 border-slate-100 dark:border-slate-800/70 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40', c.id === clinicId && 'bg-blue-50/60 dark:bg-blue-950/20')}>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{it?.hasKey ? it.subscriberId : <span className="text-slate-400">Não conectada</span>}</td>
                    <td className="px-4 py-3">{it?.hasKey ? (it.autoSync ? 'Ligada' : 'Desligada') : '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmt(it?.lastSyncAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
