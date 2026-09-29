import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  ArrowRight, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  AlignLeft, 
  Tag, 
  Sparkles,
  Layers,
  AlertTriangle,
  Info,
  Bell,
  Mail,
  Smartphone,
  Volume2,
  Send,
  Radio
} from 'lucide-react';
import { 
  GoogleCalendarFieldMapping, 
  DEFAULT_MAPPING, 
  getCalendarFieldMapping, 
  saveCalendarFieldMapping,
  buildGoogleEventFromAppointment
} from '../../lib/googleCalendarMapping';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/utils';

export default function GoogleCalendarMappingPanel() {
  const { addToast } = useApp();
  const [mapping, setMapping] = useState<GoogleCalendarFieldMapping>(getCalendarFieldMapping);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const handleMappingChanged = (e: any) => {
      if (e.detail) setMapping(e.detail);
    };
    window.addEventListener('crm_gcal_mapping_changed', handleMappingChanged);
    return () => window.removeEventListener('crm_gcal_mapping_changed', handleMappingChanged);
  }, []);

  const handleSave = () => {
    saveCalendarFieldMapping(mapping);
    setSavedSuccess(true);
    addToast('Configurações e mapeamento de campos do Google Agenda salvos com sucesso!', 'success');
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleReset = () => {
    setMapping(DEFAULT_MAPPING);
    saveCalendarFieldMapping(DEFAULT_MAPPING);
    addToast('Mapeamento restaurado para as configurações padrão!', 'info');
  };

  const [testingReminder, setTestingReminder] = useState(false);

  const handleTestReminder = () => {
    setTestingReminder(true);
    const channel = mapping.crmReminders?.channel || 'push';
    const channelLabel = channel === 'push' ? 'Notificação Push' : channel === 'email' ? 'Disparo de E-mail' : 'Push & E-mail';
    
    try {
      if (mapping.crmReminders?.alertSound && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        }
      }
    } catch (e) {
      console.warn('Audio context unavailable:', e);
    }

    setTimeout(() => {
      setTestingReminder(false);
      addToast(
        `[Lembrete CRM - ${channelLabel}] Consulta de Ana Clara às 14:30 com Dr. Roberto Silveira (${mapping.crmReminders?.timingMinutesBefore || 30} min antes).`,
        'success'
      );
    }, 400);
  };

  // Sample appointment for real-time live preview
  const sampleAppointment = {
    id: 'apt_preview_01',
    patient: 'Ana Clara Albuquerque',
    date: new Date().toISOString().split('T')[0],
    time: '14:30',
    duration: mapping.defaultDurationMinutes || 45,
    procedure: 'Clareamento Dental a Laser',
    professional: 'Dr. Roberto Silveira',
    clinicName: 'Odonto Premium - Jardins',
    phone: '(11) 98765-4321',
    notes: 'Paciente prefere atendimento pontual. Primeira sessão de clareamento.',
    status: 'confirmed'
  };

  const previewEvent = buildGoogleEventFromAppointment(sampleAppointment, mapping);

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100 dark:border-blue-800">
              <Calendar size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mapeamento de Campos: CRM ➔ Google Agenda</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Sincronização Precisa
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Personalize como as consultas, horários e dados dos pacientes no CRM são convertidos em eventos no Google Calendar. Garanta que profissionais e recepcionistas vejam as informações exatamente no padrão desejado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              <span>Restaurar Padrões</span>
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
            >
              {savedSuccess ? <CheckCircle2 size={16} className="text-emerald-300" /> : <Save size={16} />}
              <span>{savedSuccess ? 'Salvo!' : 'Salvar Mapeamento'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Mapping Controls Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Event Title / Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                <Tag size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Título do Evento (Campo Google: summary)</h3>
                <p className="text-xs text-slate-500">Define o texto principal exibido no card do Google Calendar</p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                Formato do Título
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { value: '{patient} - {procedure}', label: 'Nome do Paciente - Procedimento (Recomendado)', sample: 'Ana Clara - Clareamento Dental' },
                  { value: '{patient} ({clinic})', label: 'Nome do Paciente (Unidade)', sample: 'Ana Clara (Odonto Premium)' },
                  { value: '{procedure} - {patient}', label: 'Procedimento - Paciente', sample: 'Clareamento Dental - Ana Clara' },
                  { value: 'custom', label: 'Formato Personalizado', sample: 'Ex: Consulta: {patient}' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMapping({ ...mapping, summaryPattern: opt.value as any })}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all text-xs",
                      mapping.summaryPattern === opt.value
                        ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30"
                    )}
                  >
                    <p className="font-bold">{opt.label}</p>
                    <p className="text-[10px] text-slate-400 mt-1 italic font-mono">{opt.sample}</p>
                  </button>
                ))}
              </div>

              {mapping.summaryPattern === 'custom' && (
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Tags disponíveis: <code className="text-blue-600">{'{patient}'}</code>, <code className="text-blue-600">{'{procedure}'}</code>, <code className="text-blue-600">{'{clinic}'}</code>, <code className="text-blue-600">{'{professional}'}</code>
                  </label>
                  <input
                    type="text"
                    value={mapping.customSummaryFormat}
                    onChange={(e) => setMapping({ ...mapping, customSummaryFormat: e.target.value })}
                    placeholder="Ex: Consulta: {patient} - {procedure} com {professional}"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Date, Time & Duration */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Data, Hora e Duração (Campos: start.dateTime / end.dateTime)</h3>
                <p className="text-xs text-slate-500">Mapeia o início e o término da consulta na grade de horários do Google</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Início do Evento (Start DateTime)
                </label>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    <span>Data da Consulta</span>
                    <span className="text-slate-400">+</span>
                    <span>Horário (HH:mm)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Sincronizado no fuso America/Sao_Paulo (GMT-3)</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Duração Padrão se Não Informada
                </label>
                <select
                  value={mapping.defaultDurationMinutes}
                  onChange={(e) => setMapping({ ...mapping, defaultDurationMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
                >
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos (Padrão)</option>
                  <option value={60}>60 minutos (1 hora)</option>
                  <option value={90}>90 minutos (1h 30m)</option>
                  <option value={120}>120 minutos (2 horas)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Calcula automaticamente o horário final do evento</p>
              </div>
            </div>
          </div>

          {/* Section 3: Description Content */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                <AlignLeft size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Detalhes & Descrição (Campo Google: description)</h3>
                <p className="text-xs text-slate-500">Selecione quais dados do CRM devem ser incluídos no corpo do evento</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {[
                { key: 'patientName', label: 'Nome do Paciente' },
                { key: 'procedure', label: 'Procedimento / Tratamento' },
                { key: 'professional', label: 'Profissional Responsável' },
                { key: 'clinicName', label: 'Nome da Clínica / Unidade' },
                { key: 'phone', label: 'Telefone / WhatsApp do Paciente' },
                { key: 'notes', label: 'Observações do Agendamento' },
                { key: 'crmId', label: 'ID de Referência do CRM (Anti-duplicata)' },
                { key: 'status', label: 'Status da Consulta (Confirmado/Pendente)' },
              ].map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={(mapping.descriptionFields as any)[field.key]}
                    onChange={(e) =>
                      setMapping({
                        ...mapping,
                        descriptionFields: {
                          ...mapping.descriptionFields,
                          [field.key]: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 4: Location, Two-Way Sync & Conflict Policies */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">4. Sincronização Bidirecional & Regras de Conflito</h3>
                <p className="text-xs text-slate-500">Controle o fluxo duplo de eventos e como sobreposições são tratadas</p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              {/* Two-Way Sync Switch */}
              <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers size={14} className="text-blue-600" />
                    Habilitar Sincronização Bidirecional (Two-Way Sync)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Eventos criados, alterados de horário ou editados diretamente no Google Calendar serão importados e atualizados automaticamente no CRM.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={mapping.twoWaySyncEnabled}
                    onChange={(e) => setMapping({ ...mapping, twoWaySyncEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Conflict Highlighting Option */}
              <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-600" />
                    Detecção e Destaque Visual de Conflitos de Horário
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Exibe alerta visual imediato na agenda (marcação âmbar pulsante e banner informativo) caso um agendamento do Google colida com uma consulta no CRM.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  Ativo na Agenda
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: CRM Notification Reminders (Push & Email) for Synced Google Events */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600">
                  <Bell size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">5. Lembretes de Notificação no CRM (Push ou E-mail)</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      CRM Alerts
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Configure avisos locais automáticos no CRM para cada evento sincronizado com o Google</p>
                </div>
              </div>

              {/* Master toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mapping.crmReminders?.enabled ?? true}
                  onChange={(e) =>
                    setMapping({
                      ...mapping,
                      crmReminders: {
                        ...(mapping.crmReminders || DEFAULT_MAPPING.crmReminders),
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {(mapping.crmReminders?.enabled ?? true) ? (
              <div className="space-y-4 pt-1">
                {/* Notification Channel: Push, Email, Both */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Canal de Envio do Lembrete no CRM
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'push', label: 'Notificação Push', desc: 'Alertas no navegador e app', icon: Smartphone },
                      { id: 'email', label: 'E-mail Automático', desc: 'Disparo para caixa de entrada', icon: Mail },
                      { id: 'both', label: 'Ambos (Push + E-mail)', desc: 'Máxima taxa de presença', icon: Radio },
                    ].map((channel) => {
                      const IconComp = channel.icon;
                      const isSelected = (mapping.crmReminders?.channel || 'push') === channel.id;
                      return (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() =>
                            setMapping({
                              ...mapping,
                              crmReminders: {
                                ...(mapping.crmReminders || DEFAULT_MAPPING.crmReminders),
                                channel: channel.id as 'push' | 'email' | 'both',
                              },
                            })
                          }
                          className={cn(
                            "p-3 rounded-2xl border text-left transition-all flex flex-col gap-1",
                            isSelected
                              ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 shadow-xs ring-2 ring-amber-400/40"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <IconComp size={15} className={isSelected ? "text-amber-600 dark:text-amber-400" : "text-slate-400"} />
                            <span className="text-xs font-bold">{channel.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{channel.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Timing Before Event */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Antecedência do Lembrete no CRM
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { minutes: 15, label: '15 min antes' },
                      { minutes: 30, label: '30 min antes' },
                      { minutes: 60, label: '1 hora antes' },
                      { minutes: 120, label: '2 horas antes' },
                      { minutes: 1440, label: '24 horas antes' },
                    ].map((timing) => {
                      const isSelected = (mapping.crmReminders?.timingMinutesBefore || 30) === timing.minutes;
                      return (
                        <button
                          key={timing.minutes}
                          type="button"
                          onClick={() =>
                            setMapping({
                              ...mapping,
                              crmReminders: {
                                ...(mapping.crmReminders || DEFAULT_MAPPING.crmReminders),
                                timingMinutesBefore: timing.minutes,
                              },
                            })
                          }
                          className={cn(
                            "py-2 px-2.5 rounded-xl border text-center text-xs font-bold transition-all",
                            isSelected
                              ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          )}
                        >
                          {timing.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recipients & Sound Alert */}
                <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Destinatários e Efeitos do Alerta
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mapping.crmReminders?.notifyDoctor ?? true}
                        onChange={(e) =>
                          setMapping({
                            ...mapping,
                            crmReminders: {
                              ...(mapping.crmReminders || DEFAULT_MAPPING.crmReminders),
                              notifyDoctor: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Profissional / Dentista
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mapping.crmReminders?.notifyPatient ?? true}
                        onChange={(e) =>
                          setMapping({
                            ...mapping,
                            crmReminders: {
                              ...(mapping.crmReminders || DEFAULT_MAPPING.crmReminders),
                              notifyPatient: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Paciente Agendado
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mapping.crmReminders?.alertSound ?? true}
                        onChange={(e) =>
                          setMapping({
                            ...mapping,
                            crmReminders: {
                              ...(mapping.crmReminders || DEFAULT_MAPPING.crmReminders),
                              alertSound: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Volume2 size={13} className="text-amber-600" />
                        Sinal Sonoro no CRM
                      </span>
                    </label>
                  </div>
                </div>

                {/* Email / Notification Message Template */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Modelo da Mensagem de Notificação
                    </label>
                    <span className="text-[10px] text-slate-400">Suporta tags dinâmicas</span>
                  </div>
                  <textarea
                    value={mapping.crmReminders?.emailTemplate || DEFAULT_MAPPING.crmReminders.emailTemplate}
                    onChange={(e) =>
                      setMapping({
                        ...mapping,
                        crmReminders: {
                          ...(mapping.crmReminders || DEFAULT_MAPPING.crmReminders),
                          emailTemplate: e.target.value,
                        },
                      })
                    }
                    rows={2}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                    placeholder="Escreva a mensagem do lembrete..."
                  />
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] font-bold text-slate-400">Variáveis:</span>
                    {['{patient}', '{procedure}', '{professional}', '{date}', '{time}', '{clinic}'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const current = mapping.crmReminders?.emailTemplate || DEFAULT_MAPPING.crmReminders.emailTemplate;
                          setMapping({
                            ...mapping,
                            crmReminders: {
                              ...(mapping.crmReminders || DEFAULT_MAPPING.crmReminders),
                              emailTemplate: `${current} ${tag}`,
                            },
                          });
                        }}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-mono font-bold text-amber-700 dark:text-amber-400 rounded-md border border-slate-200 dark:border-slate-700 hover:border-amber-400"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Test Dispatch Button */}
                <div className="pt-2 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    Dispare uma notificação simulada para verificar áudio e visualização imediata.
                  </p>
                  <button
                    type="button"
                    onClick={handleTestReminder}
                    disabled={testingReminder}
                    className="px-3.5 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/80 text-xs font-bold flex items-center gap-1.5 border border-amber-300 dark:border-amber-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Send size={13} className={testingReminder ? "animate-spin" : ""} />
                    <span>{testingReminder ? "Disparando..." : "Testar Lembrete Agora"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500">Lembretes de notificação no CRM desativados para eventos sincronizados.</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-6">
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Prévia no Google Calendar</h4>
                    <p className="text-[10px] text-slate-500">Renderização em tempo real do evento sincronizado</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold">
                  LIVE
                </span>
              </div>

              {/* Event Card Mockup */}
              <div className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700/80 space-y-4 shadow-inner">
                {/* Event Title */}
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400 block mb-1">
                    Título (Summary)
                  </span>
                  <p className="text-sm font-bold text-white leading-snug">
                    {previewEvent.summary}
                  </p>
                </div>

                {/* Date / Time */}
                <div className="flex items-center gap-3 py-2 border-y border-slate-700/60 text-xs">
                  <Clock size={14} className="text-amber-400 shrink-0" />
                  <div>
                    <p className="text-slate-200 font-semibold">
                      {new Date(previewEvent.startDateTime).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(previewEvent.startDateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} – {new Date(previewEvent.endDateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({mapping.defaultDurationMinutes} min)
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-3 text-xs">
                  <MapPin size={14} className="text-rose-400 shrink-0" />
                  <span className="text-slate-300 font-medium truncate">{previewEvent.location}</span>
                </div>

                {/* Description Body */}
                <div className="pt-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                    Corpo da Descrição (Description)
                  </span>
                  <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700/50 text-[11px] font-mono text-slate-300 whitespace-pre-line leading-relaxed max-h-52 overflow-y-auto custom-scrollbar">
                    {previewEvent.description}
                  </div>
                </div>

                {/* Popup Reminder Pill */}
                {mapping.enablePopupReminder && (
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Notificação no celular / Google Calendar: 30 minutos antes</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleSave}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
              >
                <Save size={15} />
                <span>Aplicar e Salvar Mapeamento</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
