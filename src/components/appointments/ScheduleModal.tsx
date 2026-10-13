import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Stethoscope, 
  Building2, 
  Check, 
  Sparkles, 
  Phone, 
  AlertCircle, 
  CheckCircle2, 
  Share2, 
  MessageSquare, 
  Copy,
  CalendarCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/googleAuth';
import { createCalendarEvent } from '../../lib/googleCalendar';
import { fetchProfessionalsFromDb, isSupabaseConfigured, newUuid, saveAppointmentsToDb } from '../../lib/supabase';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  initialTime?: string;
  onAddAppointment?: (appointment: any) => void;
  clinicId?: string;
  clinicName?: string;
}

const POPULAR_TIMES = [
  '08:00', '09:00', '10:00', '11:00', '13:30', '14:30', '15:30', '16:30', '17:30', '18:30'
];

const POPULAR_PROCEDURES = [
  'Consulta Avaliação',
  'Implante Dentário',
  'Ortodontia / Invisalign',
  'Profilaxia & Limpeza',
  'Clareamento Laser',
  'Harmonização Facial',
  'Facetas / Lentes de Contato',
  'Endodontia (Canal)',
  'Restauração Estética'
];

export default function ScheduleModal({ 
  isOpen, 
  onClose, 
  initialDate, 
  initialTime, 
  onAddAppointment,
  clinicId: propClinicId,
  clinicName: propClinicName
}: ScheduleModalProps) {
  const { addToast, currentClinicId, clinics, user } = useApp();

  const [patient, setPatient] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialTime || '09:00');
  const [duration, setDuration] = useState('45');
  const [procedure, setProcedure] = useState('Consulta Avaliação');
  const [notes, setNotes] = useState('');
  const [syncWithGoogle, setSyncWithGoogle] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const leadIdRef = React.useRef<string | undefined>(undefined);

  const [dbProfessionals, setDbProfessionals] = useState<string[]>([]);
  const localTeam = useMemo(() => {
    try {
      const saved = localStorage.getItem('crm_team_data');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.map((m: any) => m.name).filter(Boolean) : [];
    } catch {
      return [];
    }
  }, []);
  // Profissionais reais da clínica (tabela professionals); sem nomes inventados
  const teamMembers = dbProfessionals.length > 0 ? dbProfessionals : localTeam;

  const [professional, setProfessional] = useState(teamMembers[0] || '');
  const [clinicId, setClinicId] = useState(propClinicId || currentClinicId || clinics[0]?.id || '1');

  useEffect(() => {
    if (initialDate) setDate(initialDate);
    if (initialTime) setTime(initialTime);
  }, [initialDate, initialTime]);

  useEffect(() => {
    if (teamMembers.length > 0 && !teamMembers.includes(professional)) {
      setProfessional(teamMembers[0]);
    }
  }, [teamMembers]);

  // Carrega os profissionais da clínica escolhida
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetchProfessionalsFromDb(clinicId).then(list => {
      if (!cancelled) setDbProfessionals(list.map(p => p.name));
    });
    return () => { cancelled = true; };
  }, [isOpen, clinicId]);

  // Vindo do botão "Agendar" da ficha do lead: preenche paciente, telefone, clínica e procedimento
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem('crm_schedule_prefill');
      if (!raw) return;
      localStorage.removeItem('crm_schedule_prefill');
      const pre = JSON.parse(raw);
      if (pre.name) setPatient(pre.name);
      if (pre.phone) setPhone(pre.phone);
      if (pre.clinicId) setClinicId(pre.clinicId);
      if (pre.procedure) setProcedure(pre.procedure);
      if (pre.leadId) leadIdRef.current = pre.leadId;
    } catch {}
  }, [isOpen]);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const copyConfirmationMessage = () => {
    const resolvedClinic = clinics.find(c => c.id === clinicId);
    const clinicName = resolvedClinic ? resolvedClinic.name : (propClinicName || 'Nossa Clínica');
    
    const text = `Olá ${patient || 'Paciente'}, confirmamos seu agendamento na clínica *${clinicName}*!\n\n📅 *Data:* ${date}\n⏰ *Horário:* ${time}\n👨‍⚕️ *Profissional:* ${professional}\n🩺 *Procedimento:* ${procedure}\n\nPor favor, responda com *1 para Confirmar* ou avise caso precise reagendar. Te esperamos!`;
    navigator.clipboard.writeText(text);
    addToast('Mensagem de confirmação copiada!', 'info');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient.trim()) {
      addToast('Por favor, informe o nome do paciente', 'error');
      return;
    }

    setIsSubmitting(true);
    const dur = parseInt(duration) || 45;
    const resolvedClinic = clinics.find(c => c.id === clinicId);
    const clinicName = resolvedClinic ? resolvedClinic.name : (propClinicName || 'Unidade Principal');

    const newApt = {
      id: isSupabaseConfigured() ? newUuid() : 'apt_' + Date.now().toString(36),
      leadId: leadIdRef.current,
      patient: patient.trim(),
      phone: phone.trim(),
      date,
      time,
      duration: dur,
      procedure,
      professional,
      clinicId: clinicId || '1',
      clinicName,
      status: 'confirmed' as const,
      notes
    };

    if (onAddAppointment) {
      onAddAppointment(newApt);
    } else {
      try {
        const saved = localStorage.getItem('crm_appointments_data');
        const list = saved ? JSON.parse(saved) : [];
        list.unshift(newApt);
        localStorage.setItem('crm_appointments_data', JSON.stringify(list));
      } catch (e) {
        console.error(e);
      }
      if (isSupabaseConfigured()) {
        saveAppointmentsToDb([newApt as any]);
      } else {
        fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newApt)
        }).catch(console.error);
      }
    }

    // Google Calendar Sync
    if (syncWithGoogle) {
      try {
        const token = await getAccessToken();
        if (token) {
          const [y, m, d] = date.split('-').map(Number);
          const [h, min] = time.split(':').map(Number);
          const start = new Date(y, m - 1, d, h, min, 0);
          const end = new Date(start.getTime() + dur * 60 * 1000);

          await createCalendarEvent(token, {
            summary: `Consulta: ${patient.trim()} - ${procedure}`,
            description: `Agendamento CRM Multi-unidades\nPaciente: ${patient.trim()}\nProcedimento: ${procedure}\nProfissional: ${professional}\nClínica: ${clinicName}\nTelefone: ${phone.trim()}\nNotas: ${notes}`,
            location: clinicName,
            startDateTime: start.toISOString(),
            endDateTime: end.toISOString()
          });
          addToast(`Agendamento criado e sincronizado no Google Calendar!`, 'success');
        } else {
          addToast(`Agendamento de "${patient}" salvo com sucesso!`, 'success');
        }
      } catch (err: any) {
        console.warn('Google Calendar sync warning:', err);
        addToast(`Agendamento salvo. (Aviso Google Calendar: ${err.message || 'Verifique login'})`, 'info');
      }
    } else {
      addToast(`Agendamento de "${patient}" confirmado para ${date} às ${time}!`, 'success');
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <CalendarCheck size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Novo Agendamento</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Reserve a consulta na agenda e sincronize com o Google Calendar.
                </p>
              </div>
            </div>

            <button 
              onClick={onClose} 
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                  Nome do Paciente *
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Carlos Eduardo"
                    value={patient}
                    onChange={e => setPatient(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                  WhatsApp / Celular
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                  <input 
                    type="text" 
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={e => setPhone(formatPhone(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Date & Time Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                  Data da Consulta *
                </label>
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                  Horário *
                </label>
                <input 
                  type="time" 
                  required
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                  Duração Estimada
                </label>
                <select 
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                >
                  <option value="15">15 minutos (Rápido)</option>
                  <option value="30">30 minutos</option>
                  <option value="45">45 minutos (Padrão)</option>
                  <option value="60">1 hora (Completo)</option>
                  <option value="90">1h 30m (Cirurgia)</option>
                  <option value="120">2 horas (Reabilitação)</option>
                </select>
              </div>
            </div>

            {/* Quick Time Selector Chips */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">
                Horários Frequentes:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TIMES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTime(t)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      time === t
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Procedure & Professional Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                  Procedimento
                </label>
                <select 
                  value={procedure}
                  onChange={e => setProcedure(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                >
                  {POPULAR_PROCEDURES.map(proc => (
                    <option key={proc} value={proc}>{proc}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                  Profissional Responsável
                </label>
                {teamMembers.length > 0 ? (
                  <select 
                    value={professional}
                    onChange={e => setProfessional(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  >
                    {teamMembers.map((member, idx) => (
                      <option key={idx} value={member}>{member}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      value={professional}
                      onChange={e => setProfessional(e.target.value)}
                      placeholder="Nome do profissional"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                    />
                    <p className="text-[10px] text-slate-400 ml-1">Esta clínica ainda não tem profissionais cadastrados. Cadastre em Equipe para aparecerem aqui.</p>
                  </>
                )}
              </div>
            </div>

            {/* Clinic Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                Unidade / Clínica
              </label>
              <select 
                value={clinicId}
                onChange={e => setClinicId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
              >
                {clinics.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                Observações Clínicas / Preferências
              </label>
              <textarea 
                placeholder="Ex: Primeira avaliação, paciente com fobia de dentista, prefere atendimento matutino..." 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white h-20 resize-none"
              />
            </div>

            {/* Google Calendar Sync Option */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-transparent dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-transparent rounded-2xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center p-1.5">
                  <svg className="w-full h-full" viewBox="0 0 48 48">
                    <path fill="#4285F4" d="M38 44H10c-3.3 0-6-2.7-6-6V10c0-3.3 2.7-6 6-6h28c3.3 0 6 2.7 6 6v28c0 3.3-2.7 6-6 6z"/>
                    <path fill="#FFF" d="M35 14H13c-1.1 0-2 .9-2 2v20c0 1.1.9 2 2 2h22c1.1 0 2-.9 2-2V16c0-1.1-.9-2-2-2zm-9 19h-8v-3h8v3zm8-6H14v-3h20v3zm0-6H14v-3h20v3z"/>
                    <path fill="#EA4335" d="M35 10V6c0-.6-.4-1-1-1s-1 .4-1 1v4h-6V6c0-.6-.4-1-1-1s-1 .4-1 1v4h-6V6c0-.6-.4-1-1-1s-1 .4-1 1v4h-5c-2.2 0-4 1.8-4 4v2h34v-2c0-2.2-1.8-4-4-4h-5z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Sincronizar no Google Calendar</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Gera o evento na conta conectada</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={syncWithGoogle} 
                  onChange={(e) => setSyncWithGoogle(e.target.checked)} 
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Quick Action: Copy WhatsApp Confirmation */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={copyConfirmationMessage}
                className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy size={13} />
                <span>Copiar texto de confirmação WhatsApp</span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check size={16} />
                <span>{isSubmitting ? 'Salvando...' : 'Confirmar Agendamento'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
