import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Building2, Calendar, CheckCircle2, Database, MessageCircle, PlugZap, RefreshCw, Stethoscope, Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApp } from '../../context/AppContext';
import { getGoogleUser, isAccessTokenValid } from '../../lib/googleAuth';
import { fetchWhatsappSessions, getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import { ClinicIntegration, fetchClinicIntegrations } from '../../lib/clinicorpSync';
import GoogleIntegrationSettingsPanel from './GoogleIntegrationSettingsPanel';
import GoogleCalendarMappingPanel from './GoogleCalendarMappingPanel';
import SyncHistoryTab from './SyncHistoryTab';
import SimplesDentalConfigPanel from './SimplesDentalConfigPanel';
import ClinicorpConfigPanel from './ClinicorpConfigPanel';
import SupabaseConfigPanel from './SupabaseConfigPanel';
import AgentUsagePanel from './AgentUsagePanel';

type View = 'hub' | 'clinicorp' | 'google' | 'supabase' | 'simples_dental' | 'agent';
type GoogleTab = 'settings' | 'mapping' | 'history';
type Tone = 'ok' | 'warn' | 'off';

interface Card {
  id: string;
  name: string;
  group: string;
  description: string;
  tone: Tone;
  badge: string;
  facts: string[];
  icon: React.ReactNode;
  accent: string; // cor do ícone
  action: { label: string; onClick: () => void };
}

const TONE_STYLE: Record<Tone, string> = {
  ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  off: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
};

const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null;

interface ClinicStatus { lastSync: string | null; appointments: number; whatsapp: { session: string; active: boolean } | null }

export default function IntegrationsWorkspace() {
  const { currentClinic, clinics, isAllClinicsView, setActiveTab } = useApp();
  const [view, setView] = useState<View>('hub');
  const [googleTab, setGoogleTab] = useState<GoogleTab>('settings');
  const [loading, setLoading] = useState(true);
  const [byClinic, setByClinic] = useState<Record<string, ClinicStatus>>({});
  const [integrations, setIntegrations] = useState<ClinicIntegration[]>([]);
  const [msgs24h, setMsgs24h] = useState<number | null>(null);
  const [lastMsgAt, setLastMsgAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }
    const sessions = await fetchWhatsappSessions();
    setIntegrations(await fetchClinicIntegrations());
    const result: Record<string, ClinicStatus> = {};
    await Promise.all(clinics.map(async c => {
      const [last, count] = await Promise.all([
        sb.from('appointments').select('updated_at').eq('clinic_id', c.id).not('clinicorp_id', 'is', null).order('updated_at', { ascending: false }).limit(1),
        sb.from('appointments').select('id', { count: 'exact', head: true }).eq('clinic_id', c.id).not('clinicorp_id', 'is', null).neq('kind', 'blocked')
      ]);
      const s = sessions.find(x => x.clinicId === c.id);
      result[c.id] = {
        lastSync: last.data?.[0]?.updated_at || null,
        appointments: count.count || 0,
        whatsapp: s ? { session: s.session, active: s.active } : null
      };
    }));
    setByClinic(result);

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [recent, latest] = await Promise.all([
      sb.from('lead_interactions').select('id', { count: 'exact', head: true }).in('interaction_type', ['mensagem_cliente', 'mensagem_responsavel']).gte('created_at', since),
      sb.from('lead_interactions').select('created_at').in('interaction_type', ['mensagem_cliente', 'mensagem_responsavel']).order('created_at', { ascending: false }).limit(1)
    ]);
    setMsgs24h(recent.count ?? 0);
    setLastMsgAt(latest.data?.[0]?.created_at || null);
    setLoading(false);
  }, [clinics]);
  useEffect(() => { load(); }, [load]);

  const focus = currentClinic && !isAllClinicsView ? byClinic[currentClinic.id] : undefined;
  const googleOk = Boolean(getGoogleUser() && isAccessTokenValid());
  const supabaseOk = isSupabaseConfigured();

  const cards = useMemo<Card[]>(() => {
    // Em "todas as clínicas" somamos o que existe; com uma clínica escolhida, mostramos só a dela
    const scope = focus ? [focus] : Object.values(byClinic);
    const lastSync = scope.map(s => s.lastSync).filter(Boolean).sort().pop() || null;
    const apts = scope.reduce((n, s) => n + s.appointments, 0);
    const wa = scope.map(s => s.whatsapp).filter(Boolean) as { session: string; active: boolean }[];
    const waActive = wa.some(w => w.active);
    const connectedClinics = integrations.filter(i => i.hasKey && (!focus || i.clinicId === currentClinic?.id)).length;
    const autoClinics = integrations.filter(i => i.hasKey && i.autoSync && (!focus || i.clinicId === currentClinic?.id)).length;
    const syncAgeH = lastSync ? (Date.now() - new Date(lastSync).getTime()) / 3600000 : null;

    return [
      {
        id: 'clinicorp', name: 'Clinicorp', group: 'Sistema da clínica',
        description: 'Agenda, pacientes, profissionais, status e etiquetas: a fonte oficial dos atendimentos.',
        tone: !lastSync ? 'off' : syncAgeH! > 48 ? 'warn' : 'ok',
        badge: !lastSync ? 'Nunca sincronizado' : syncAgeH! > 48 ? 'Sincronização antiga' : 'Conectado',
        facts: [
          ...(lastSync ? [`Última sincronização: ${fmtDateTime(lastSync)}`, `${apts} agendamentos importados`] : ['Faça a primeira sincronização para trazer a agenda']),
          `${connectedClinics} de ${clinics.length} ${clinics.length === 1 ? 'clínica conectada' : 'clínicas conectadas'}${autoClinics ? ` · ${autoClinics} com sincronização automática` : ''}`
        ],
        icon: <Stethoscope size={22} />, accent: 'bg-sky-500',
        action: { label: 'Configurar e sincronizar', onClick: () => setView('clinicorp') }
      },
      {
        id: 'whatsapp', name: 'WhatsApp (agente n8n + WAHA)', group: 'Chat',
        description: 'O agente atende os contatos no WhatsApp e grava cada conversa e lead no sistema.',
        tone: wa.length === 0 ? 'off' : waActive ? 'ok' : 'warn',
        badge: wa.length === 0 ? 'Sem sessão cadastrada' : waActive ? 'Ativo' : 'Sessão pausada',
        facts: [
          wa.length ? `Sessão: ${wa.map(w => w.session).join(', ')}` : 'Cadastre a sessão do WAHA em waha_tenants',
          msgs24h === null ? 'Contando mensagens…' : `${msgs24h} mensagens nas últimas 24 h`,
          ...(lastMsgAt ? [`Última mensagem: ${fmtDateTime(lastMsgAt)}`] : [])
        ],
        icon: <MessageCircle size={22} />, accent: 'bg-emerald-500',
        action: { label: 'Abrir Chat', onClick: () => setActiveTab('mensageria') }
      },
      {
        id: 'agent-usage', name: 'Consumo do agente (estimado)', group: 'Chat',
        description: 'Quanto o agente de WhatsApp consome por clínica no mês, com limite e aviso quando chegar perto.',
        tone: 'off', badge: 'Estimativa',
        facts: ['Calculado pelas mensagens gravadas; o valor exato fica na OpenAI'],
        icon: <Zap size={22} />, accent: 'bg-amber-500',
        action: { label: 'Ver consumo e limites', onClick: () => setView('agent') }
      },
      {
        id: 'google', name: 'Google Agenda', group: 'Agenda',
        description: 'Envia os agendamentos para o Google Agenda da equipe e traz eventos de volta.',
        tone: googleOk ? 'ok' : 'off',
        badge: googleOk ? 'Conectado' : 'Não conectado',
        facts: [googleOk ? `Conta: ${getGoogleUser()?.email || 'Google'}` : 'Conecte uma conta Google para sincronizar'],
        icon: <Calendar size={22} />, accent: 'bg-blue-500',
        action: { label: googleOk ? 'Gerenciar' : 'Conectar', onClick: () => { setGoogleTab('settings'); setView('google'); } }
      },
      {
        id: 'supabase', name: 'Banco de dados (Supabase)', group: 'Dados',
        description: 'Onde ficam leads, pacientes, agenda e conversas. Todos os módulos leem daqui.',
        tone: supabaseOk ? 'ok' : 'warn',
        badge: supabaseOk ? 'Conectado' : 'Modo local',
        facts: [supabaseOk ? 'Dados em tempo real, com login por e-mail e senha' : 'Sem Supabase: os dados ficam só neste navegador'],
        icon: <Database size={22} />, accent: 'bg-violet-500',
        action: { label: 'Ver conexão', onClick: () => setView('supabase') }
      },
      {
        id: 'simples_dental', name: 'Simples Dental', group: 'Sistema da clínica',
        description: 'Alternativa ao Clinicorp para clínicas que usam o Simples Dental.',
        tone: 'off', badge: 'Não conectado',
        facts: ['Nenhuma clínica usa esta integração hoje'],
        icon: <PlugZap size={22} />, accent: 'bg-slate-500',
        action: { label: 'Configurar', onClick: () => setView('simples_dental') }
      }
    ];
  }, [byClinic, integrations, clinics.length, currentClinic?.id, focus, msgs24h, lastMsgAt, googleOk, supabaseOk, setActiveTab]);

  const connected = cards.filter(c => c.tone === 'ok').length;
  const attention = cards.filter(c => c.tone === 'warn').length;
  const groups = Array.from(new Set(cards.map(c => c.group)));

  const Back = ({ title }: { title: string }) => (
    <div className="flex items-center gap-3 mb-5">
      <button onClick={() => setView('hub')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
        <ArrowLeft size={14} /> Integrações
      </button>
      <h2 className="text-lg font-extrabold text-[var(--color-text-primary)]">{title}</h2>
    </div>
  );

  if (view === 'clinicorp') return <div><Back title="Clinicorp" /><ClinicorpConfigPanel onBack={() => { setView('hub'); load(); }} /></div>;
  if (view === 'agent') return <div><Back title="Consumo do agente" /><AgentUsagePanel /></div>;
  if (view === 'supabase') return <div><Back title="Banco de dados" /><SupabaseConfigPanel onBack={() => setView('hub')} /></div>;
  if (view === 'simples_dental') return <div><Back title="Simples Dental" /><SimplesDentalConfigPanel onBack={() => setView('hub')} /></div>;
  if (view === 'google') {
    const tabs: [GoogleTab, string][] = [['settings', 'Conexão'], ['mapping', 'Campos do evento'], ['history', 'Histórico']];
    return (
      <div>
        <Back title="Google Agenda" />
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit mb-5">
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setGoogleTab(id)} className={cn('px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer', googleTab === id ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400')}>{label}</button>
          ))}
        </div>
        {googleTab === 'settings' && <GoogleIntegrationSettingsPanel onNavigateToMapping={() => setGoogleTab('mapping')} onNavigateToHistory={() => setGoogleTab('history')} />}
        {googleTab === 'mapping' && <GoogleCalendarMappingPanel />}
        {googleTab === 'history' && <SyncHistoryTab />}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Integrações</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {focus && currentClinic ? <>Estado das conexões de <strong>{currentClinic.name}</strong>.</> : 'Visão geral de todas as clínicas. Escolha uma clínica no seletor do topo para ver só a dela.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">{connected} conectadas</span>
          {attention > 0 && <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">{attention} precisam de atenção</span>}
          <button onClick={load} aria-label="Atualizar" className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {groups.map(group => (
        <section key={group} className="space-y-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">{group}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cards.filter(c => c.group === group).map(c => (
              <div key={c.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <span className={cn('w-11 h-11 shrink-0 rounded-xl text-white flex items-center justify-center', c.accent)}>{c.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{c.name}</h3>
                      <span className={cn('shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold', TONE_STYLE[c.tone])}>
                        {c.tone === 'ok' ? <CheckCircle2 size={12} /> : c.tone === 'warn' ? <AlertTriangle size={12} /> : null}{c.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.description}</p>
                  </div>
                </div>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 pl-[60px]">
                  {c.facts.map(f => <li key={f}>{f}</li>)}
                </ul>
                <div className="pl-[60px]">
                  <button onClick={c.action.onClick} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer">
                    {c.action.label} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {isAllClinicsView && clinics.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Por clínica</h2>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-2.5 font-bold">Clínica</th>
                  <th className="px-4 py-2.5 font-bold">Clinicorp</th>
                  <th className="px-4 py-2.5 font-bold">WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {clinics.map(c => {
                  const s = byClinic[c.id];
                  return (
                    <tr key={c.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800/70">
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100"><span className="flex items-center gap-2"><Building2 size={14} className="text-slate-400" />{c.name}</span></td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s?.lastSync ? `${fmtDateTime(s.lastSync)} · ${s.appointments} agend.` : <span className="text-slate-400">Não sincronizado</span>}</td>
                      <td className="px-4 py-3">{s?.whatsapp ? <span className={cn('px-2 py-0.5 rounded-full text-[10.5px] font-bold', s.whatsapp.active ? TONE_STYLE.ok : TONE_STYLE.warn)}>{s.whatsapp.session}{s.whatsapp.active ? '' : ' (pausada)'}</span> : <span className="text-slate-400">Sem sessão</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
