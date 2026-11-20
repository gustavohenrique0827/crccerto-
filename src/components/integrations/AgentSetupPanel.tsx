import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Building2, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import { AgentInfo, AgentStatus, agentStatus, fetchAgentSetups, provisionAgent } from '../../lib/agentSetup';
import WhatsappQrCard from './WhatsappQrCard';

const STATUS_TEXT: Record<string, string> = {
  STOPPED: 'Sessão parada', STARTING: 'Iniciando…', SCAN_QR_CODE: 'Aguardando a leitura do QR code',
  WORKING: 'Conectada', FAILED: 'Falhou', NOT_FOUND: 'Sessão ainda não existe no WAHA', UNKNOWN: 'Estado desconhecido'
};

/** Implantação do agente de uma clínica (sem seletor de clínica): usado no assistente de cadastro e na tela de integrações. */
export function AgentSetupBody({ clinicId, onDone }: { clinicId: string; onDone?: () => void }) {
  const { clinics, user, addToast } = useApp();
  const isSuper = user?.role === Role.SUPER_ADMIN;
  const [setups, setSetups] = useState<Record<string, AgentInfo>>({});
  const [openaiKey, setOpenaiKey] = useState('');
  const [org, setOrg] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clinic = clinics.find(c => c.id === clinicId);
  const info = setups[clinicId];
  useEffect(() => { fetchAgentSetups().then(setSetups); }, []);
  useEffect(() => { setPhone(clinic?.whatsapp || clinic?.phone || ''); setStatus(null); }, [clinicId]);

  // Com o agente implantado: acompanha o estado da sessão e mostra o QR quando for a hora
  const refresh = useCallback(async () => {
    if (!clinicId || !setups[clinicId]) return;
    const s = await agentStatus(clinicId);
    setStatus(s);
  }, [clinicId, setups]);
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!info) return;
    refresh();
    timer.current = setInterval(refresh, 6000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [info, refresh]);

  const provision = async () => {
    if (!clinicId) return;
    setBusy(true);
    const r = await provisionAgent(clinicId, { openaiApiKey: openaiKey, openaiOrganizationId: org || undefined, telefoneAdmin: phone });
    setBusy(false);
    setOpenaiKey(''); // a chave não fica na tela nem em lugar nenhum do CRM
    if (!r.ok) { addToast(r.message || 'Não foi possível implantar o agente.', 'error'); return; }
    addToast('Agente criado. Agora leia o QR code com o WhatsApp da clínica.', 'success');
    setSetups(await fetchAgentSetups());
    onDone?.();
  };
  const field = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white';

  return (
    <div className="space-y-4">
      {info && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><CheckCircle2 size={13} />Agente implantado</span>}
      {!info ? (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          {!isSuper && <p className="flex items-start gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300"><ShieldAlert size={14} className="mt-0.5 shrink-0" />Só o administrador geral pode implantar um agente.</p>}
          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Telefone do administrador (com DDD)</span>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="11999999999" className={field} />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chave do projeto OpenAI da clínica</span>
            <input type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} placeholder="sk-proj-…" className={field} autoComplete="new-password" />
            <span className="text-[11px] text-slate-400">Vai direto para o n8n e não é guardada no CRM.</span>
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ID da organização OpenAI (opcional)</span>
            <input value={org} onChange={e => setOrg(e.target.value)} placeholder="org-…" className={field} autoComplete="off" />
          </label>
          <button onClick={provision} disabled={busy || !isSuper || !openaiKey.trim()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}Criar agente de {clinic?.name || 'a clínica'}
          </button>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <dl className="grid grid-cols-[130px_1fr] gap-y-1.5 text-xs">
            <dt className="text-slate-400">Agente</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{info.workflow_nome || '—'}</dd>
            <dt className="text-slate-400">Sessão WhatsApp</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{info.waha_session || '—'}</dd>
            <dt className="text-slate-400">Estado</dt>
            <dd className={cn('font-semibold', status?.status === 'WORKING' ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100')}>{status ? (STATUS_TEXT[status.status || 'UNKNOWN'] || status.status) : 'Verificando…'}{status?.me ? ` · ${status.me}` : ''}</dd>
            {info.proximo_passo && <><dt className="text-slate-400">Próximo passo</dt><dd className="text-slate-700 dark:text-slate-200">{info.proximo_passo}</dd></>}
          </dl>
          {status?.status === 'WORKING' && <p className="text-xs font-semibold text-emerald-600">WhatsApp conectado. O Chat desta clínica já mostra as conversas. Falta ligar a cópia do agente ao CRM e ativá-la no n8n.</p>}
        </section>
      )}
      <WhatsappQrCard clinicId={clinicId} />
    </div>
  );
}

/** Tela completa (Integrações): escolhe a clínica e mostra a implantação do agente. */
export default function AgentSetupPanel() {
  const { clinics, currentClinic } = useApp();
  const [clinicId, setClinicId] = useState(currentClinic?.id || clinics[0]?.id || '');
  return (
    <div className="space-y-5 max-w-3xl">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Cria o agente de WhatsApp de uma clínica nova: o n8n duplica o agente padrão para ela e cria a sessão do WhatsApp. A cópia nasce <strong>inativa</strong> e sem ligação com o CRM; depois de ler o QR code, o CRM é conectado e só então o agente é ativado.
      </p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400"><Building2 size={14} />Clínica</label>
        <select value={clinicId} onChange={e => setClinicId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white outline-none cursor-pointer">
          {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {clinicId && <AgentSetupBody key={clinicId} clinicId={clinicId} />}
    </div>
  );
}
