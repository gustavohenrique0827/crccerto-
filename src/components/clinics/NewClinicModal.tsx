import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Building2, Check, CheckCircle2, ChevronDown, Loader2, PlugZap, Stethoscope, X } from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { Clinic, ModuleType, Role } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { connectClinicorp, runClinicorpSync } from '@/src/lib/clinicorpSync';
import { AgentSetupBody } from '../integrations/AgentSetupPanel';

interface NewClinicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClinicCreated?: (clinic: Clinic) => void;
}

const ALL_AVAILABLE_MODULES: { id: ModuleType; label: string; desc: string }[] = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Números e central de comando' },
  { id: 'crm', label: 'Funil, Chat e leads', desc: 'Pipeline e conversas' },
  { id: 'patients', label: 'Pacientes', desc: 'Cadastro e linha do tempo' },
  { id: 'appointments', label: 'Agenda', desc: 'Calendário e confirmações' },
  { id: 'followups', label: 'Follow-ups', desc: 'Relacionamento ativo' },
  { id: 'tasks', label: 'Tarefas', desc: 'Pendências da equipe' },
  { id: 'analise-dados', label: 'Análise de dados', desc: 'Tráfego e métricas' },
  { id: 'reports', label: 'Relatórios', desc: 'Exportação e auditoria' },
  { id: 'integrations', label: 'Integrações', desc: 'Clinicorp, WhatsApp e outras' }
];
const DEFAULT_MODULES: ModuleType[] = ['dashboard', 'crm', 'patients', 'appointments', 'followups', 'tasks', 'reports'];

type StepKey = 'dados' | 'clinicorp' | 'whatsapp' | 'pronto';

const input = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1';

/**
 * Cadastro de cliente em um só lugar e em etapas: dados da clínica, Clinicorp, agente de WhatsApp (com QR code).
 * Cada etapa de integração pode ser pulada e retomada depois em Integrações.
 */
export default function NewClinicModal({ isOpen, onClose, onClinicCreated }: NewClinicModalProps) {
  const { createClinic, user, addToast } = useApp();
  const isSuper = user?.role === Role.SUPER_ADMIN;

  const emptyForm = { name: '', corporateName: '', cnpj: '', responsible: '', email: '', phone: '', whatsapp: '', city: '', state: '', address: '', system: 'clinicorp' as Clinic['system'] };
  const [form, setForm] = useState(emptyForm);
  const [modules, setModules] = useState<ModuleType[]>(DEFAULT_MODULES);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [step, setStep] = useState<StepKey>('dados');
  const [busy, setBusy] = useState(false);
  const [subscriber, setSubscriber] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [clinicorpDone, setClinicorpDone] = useState<string | null>(null);
  const [agentDone, setAgentDone] = useState(false);
  const set = (patch: Partial<typeof emptyForm>) => setForm(f => ({ ...f, ...patch }));

  const steps = useMemo<{ key: StepKey; title: string }[]>(() => [
    { key: 'dados', title: 'Dados' },
    ...(form.system === 'clinicorp' ? [{ key: 'clinicorp' as StepKey, title: 'Clinicorp' }] : []),
    { key: 'whatsapp', title: 'WhatsApp' },
    { key: 'pronto', title: 'Pronto' }
  ], [form.system]);
  const idx = steps.findIndex(s => s.key === step);
  const next = () => setStep(steps[Math.min(idx + 1, steps.length - 1)].key);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const reset = () => {
    setForm(emptyForm); setModules(DEFAULT_MODULES); setClinic(null); setStep('dados'); setSubscriber(''); setApiKey(''); setClinicorpDone(null); setAgentDone(false);
  };
  const close = () => { onClose(); setTimeout(reset, 200); };

  const createNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { addToast('Informe o nome da clínica.', 'error'); return; }
    setBusy(true);
    const created = await createClinic({
      name: form.name.trim(),
      corporateName: form.corporateName.trim() || form.name.trim(),
      cnpj: form.cnpj.trim(),
      responsible: form.responsible.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim() || form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      status: 'active',
      system: form.system,
      enabledModules: modules
    } as Omit<Clinic, 'id' | 'createdAt'>);
    setBusy(false);
    if (!created) return;
    setClinic(created);
    addToast(`Clínica "${created.name}" criada.`, 'success');
    next();
  };

  const connectNow = async () => {
    if (!clinic) return;
    if (!subscriber.trim() || !apiKey.trim()) { addToast('Preencha o usuário e a chave do Clinicorp.', 'error'); return; }
    setBusy(true);
    const c = await connectClinicorp(clinic.id, subscriber, apiKey);
    if (!c.ok) { setBusy(false); addToast(c.message || 'O Clinicorp recusou as credenciais.', 'error'); return; }
    setApiKey('');
    const s = await runClinicorpSync({ clinicId: clinic.id, daysBack: 60, daysForward: 120 });
    setBusy(false);
    if (!s.ok) { addToast(s.message || 'Conectou, mas a primeira sincronização falhou. Tente de novo em Integrações.', 'warning'); setClinicorpDone('Conectado (sincronize em Integrações)'); return; }
    setClinicorpDone(`${s.appointments ?? 0} agendamentos e ${s.patients ?? 0} pacientes importados`);
  };

  const finish = () => {
    if (clinic && onClinicCreated) onClinicCreated(clinic);
    close();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget && !clinic) close(); }}>
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" role="dialog" aria-modal="true" aria-label="Cadastrar clínica">
        {/* Cabeçalho + etapas */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center"><Building2 size={20} /></div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Cadastrar clínica</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Os dados, o Clinicorp e o WhatsApp do cliente, tudo em uma só tela.</p>
              </div>
            </div>
            <button onClick={close} aria-label="Fechar" className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X size={18} /></button>
          </div>
          <ol className="mt-4 flex items-center gap-2">
            {steps.map((s, i) => (
              <li key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
                <span className={cn('w-6 h-6 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0', i < idx ? 'bg-emerald-500 text-white' : i === idx ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500')}>
                  {i < idx ? <Check size={13} strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn('text-xs font-bold', i === idx ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>{s.title}</span>
                {i < steps.length - 1 && <span className={cn('flex-1 h-px', i < idx ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700')} />}
              </li>
            ))}
          </ol>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
          {step === 'dados' && (
            <form id="clinic-form" onSubmit={createNow} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className={label}>Nome da clínica *</label>
                  <input autoFocus required value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Ex.: Clínica Odonto Prime" className={input} />
                </div>
                <div><label className={label}>WhatsApp da clínica</label><input value={form.whatsapp} onChange={e => set({ whatsapp: e.target.value })} placeholder="(11) 99999-9999" className={input} /></div>
                <div><label className={label}>Telefone fixo</label><input value={form.phone} onChange={e => set({ phone: e.target.value })} placeholder="(11) 3333-4444" className={input} /></div>
                <div><label className={label}>Responsável</label><input value={form.responsible} onChange={e => set({ responsible: e.target.value })} placeholder="Nome do doutor ou gestor" className={input} /></div>
                <div><label className={label}>E-mail</label><input type="email" value={form.email} onChange={e => set({ email: e.target.value })} placeholder="contato@clinica.com" className={input} /></div>
                <div className="sm:col-span-2">
                  <label className={label}>Sistema que a clínica usa</label>
                  <select value={form.system} onChange={e => set({ system: e.target.value as Clinic['system'] })} className={input}>
                    <option value="clinicorp">Clinicorp (conecta a agenda automaticamente)</option>
                    <option value="simples_dental">Simples Dental</option>
                    <option value="google_calendar">Google Agenda</option>
                    <option value="other">Outro</option>
                    <option value="none">Nenhum (só o CRM)</option>
                  </select>
                </div>
              </div>

              <details className="group rounded-xl border border-slate-200 dark:border-slate-700">
                <summary className="flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer list-none">
                  Endereço e documentos (opcional)
                  <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 px-4 pb-4">
                  <div><label className={label}>Razão social</label><input value={form.corporateName} onChange={e => set({ corporateName: e.target.value })} className={input} /></div>
                  <div><label className={label}>CNPJ</label><input value={form.cnpj} onChange={e => set({ cnpj: e.target.value })} placeholder="00.000.000/0000-00" className={input} /></div>
                  <div className="sm:col-span-2"><label className={label}>Endereço</label><input value={form.address} onChange={e => set({ address: e.target.value })} className={input} /></div>
                  <div><label className={label}>Cidade</label><input value={form.city} onChange={e => set({ city: e.target.value })} className={input} /></div>
                  <div><label className={label}>UF</label><input value={form.state} onChange={e => set({ state: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} className={input} /></div>
                </div>
              </details>

              <details className="group rounded-xl border border-slate-200 dark:border-slate-700">
                <summary className="flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer list-none">
                  Módulos liberados ({modules.length})
                  <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-4 pb-4">
                  {ALL_AVAILABLE_MODULES.map(m => {
                    const on = modules.includes(m.id);
                    return (
                      <button type="button" key={m.id} onClick={() => setModules(prev => on ? prev.filter(x => x !== m.id) : [...prev, m.id])} className={cn('flex items-start gap-2.5 text-left p-2.5 rounded-xl border cursor-pointer transition-colors', on ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800')}>
                        <span className={cn('mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0', on ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-600')}>{on && <Check size={11} strokeWidth={3} />}</span>
                        <span><span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{m.label}</span><span className="block text-[11px] text-slate-500 dark:text-slate-400">{m.desc}</span></span>
                      </button>
                    );
                  })}
                </div>
              </details>
            </form>
          )}

          {step === 'clinicorp' && clinic && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white"><Stethoscope size={16} />Conectar o Clinicorp de {clinic.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Use o usuário (subscriber) e a chave da API do Clinicorp deste cliente. O sistema testa a chave, guarda no servidor e já traz a agenda, os pacientes e os profissionais.</p>
              {clinicorpDone ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600"><CheckCircle2 size={16} />{clinicorpDone}</p>
              ) : (
                <>
                  <div><label className={label}>Usuário (subscriber_id)</label><input value={subscriber} onChange={e => setSubscriber(e.target.value)} placeholder="ex.: minhaclinica" autoComplete="off" className={input} /></div>
                  <div><label className={label}>Chave da API</label><input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Cole a chave" autoComplete="new-password" className={input} /></div>
                  <button onClick={connectNow} disabled={busy} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />}Conectar e importar
                  </button>
                </>
              )}
            </div>
          )}

          {step === 'whatsapp' && clinic && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white"><Bot size={16} />Agente de WhatsApp de {clinic.name}</h3>
              {isSuper
                ? <AgentSetupBody clinicId={clinic.id} onDone={() => setAgentDone(true)} />
                : <p className="text-xs text-slate-500 dark:text-slate-400">Só o administrador geral implanta o agente de WhatsApp. Peça a ele em Integrações quando a clínica estiver pronta.</p>}
            </div>
          )}

          {step === 'pronto' && clinic && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white"><CheckCircle2 size={20} className="text-emerald-500" />{clinic.name} está cadastrada</h3>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" />Clínica criada com {modules.length} módulos liberados</li>
                {form.system === 'clinicorp' && <li className="flex items-center gap-2">{clinicorpDone ? <Check size={15} className="text-emerald-500" /> : <span className="w-[15px] text-center text-slate-400">–</span>}{clinicorpDone ? `Clinicorp: ${clinicorpDone}` : 'Clinicorp: não conectado (conecte em Integrações)'}</li>}
                <li className="flex items-center gap-2">{agentDone ? <Check size={15} className="text-emerald-500" /> : <span className="w-[15px] text-center text-slate-400">–</span>}{agentDone ? 'Agente de WhatsApp implantado (leia o QR code, se ainda não leu)' : 'Agente de WhatsApp: não implantado (implante em Integrações)'}</li>
              </ul>
              <p className="text-xs text-slate-500 dark:text-slate-400">O acesso da equipe do cliente (usuários e senhas) é criado em Equipe.</p>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          {step === 'dados' ? (
            <>
              <button onClick={close} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer">Cancelar</button>
              <button type="submit" form="clinic-form" disabled={busy || !form.name.trim()} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer">
                {busy && <Loader2 size={15} className="animate-spin" />}Criar clínica e continuar
              </button>
            </>
          ) : step === 'pronto' ? (
            <>
              <span />
              <button onClick={finish} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer">Concluir</button>
            </>
          ) : (
            <>
              <span className="text-xs text-slate-400">Você pode fazer esta etapa depois em Integrações.</span>
              <button onClick={next} className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold cursor-pointer hover:opacity-90">
                {(step === 'clinicorp' && clinicorpDone) || (step === 'whatsapp' && agentDone) ? 'Continuar' : 'Pular por agora'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
