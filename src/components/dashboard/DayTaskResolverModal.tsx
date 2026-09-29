import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Phone, 
  Calendar, 
  AlertCircle, 
  DollarSign, 
  ArrowRight, 
  UserCheck, 
  UserX, 
  Send, 
  RotateCcw,
  Search,
  Check,
  Building2,
  Sparkles,
  ExternalLink,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';

export type TaskCategoryType = 
  | 'today_pending'
  | 'today_confirmed'
  | 'tomorrow_pending'
  | 'tomorrow_confirmed'
  | 'yesterday_attended'
  | 'yesterday_missed'
  | 'yesterday_closed'
  | 'general_leads'
  | 'general_appointments'
  | 'general_confirmations'
  | 'general_followups';

interface DayTaskItem {
  id: string;
  patientName: string;
  phone: string;
  procedure: string;
  time: string;
  date: string;
  doctor: string;
  clinic: string;
  status: 'pending' | 'confirmed' | 'attended' | 'missed' | 'closed';
  value?: number;
  origin?: string;
  notes?: string;
}

const INITIAL_TASK_DATA: Record<TaskCategoryType, DayTaskItem[]> = {
  today_pending: [],
  today_confirmed: [],
  tomorrow_pending: [],
  tomorrow_confirmed: [],
  yesterday_attended: [],
  yesterday_missed: [],
  yesterday_closed: [],
  general_leads: [],
  general_appointments: [],
  general_confirmations: [],
  general_followups: []
};

function loadTaskDataFromStorage(): Record<TaskCategoryType, DayTaskItem[]> {
  const result: Record<TaskCategoryType, DayTaskItem[]> = {
    today_pending: [],
    today_confirmed: [],
    tomorrow_pending: [],
    tomorrow_confirmed: [],
    yesterday_attended: [],
    yesterday_missed: [],
    yesterday_closed: [],
    general_leads: [],
    general_appointments: [],
    general_confirmations: [],
    general_followups: []
  };

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const todayStr = formatDate(now);
  const tom = new Date(now);
  tom.setDate(tom.getDate() + 1);
  const tomorrowStr = formatDate(tom);
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const yesterdayStr = formatDate(yest);

  try {
    const rawApts = localStorage.getItem('crm_appointments_data');
    if (rawApts) {
      const appointments: any[] = JSON.parse(rawApts);
      appointments.forEach((apt: any) => {
        const item: DayTaskItem = {
          id: apt.id,
          patientName: apt.patient || apt.patientName || 'Paciente',
          phone: apt.phone || '',
          procedure: apt.procedure || 'Consulta Odontológica',
          time: apt.time || '09:00',
          date: apt.date || todayStr,
          doctor: apt.professional || 'Dentista Responsável',
          clinic: apt.clinicName || 'Unidade Principal',
          status: apt.status === 'confirmed' ? 'confirmed' : apt.status === 'completed' ? 'attended' : apt.status === 'no_show' ? 'missed' : 'pending',
          value: apt.price || apt.value || 250,
          origin: apt.source || 'Agenda',
          notes: apt.notes
        };

        if (apt.date === todayStr) {
          if (apt.status === 'confirmed') {
            result.today_confirmed.push(item);
          } else if (apt.status === 'pending' || apt.status === 'scheduled') {
            result.today_pending.push(item);
          }
        } else if (apt.date === tomorrowStr) {
          if (apt.status === 'confirmed') {
            result.tomorrow_confirmed.push(item);
          } else if (apt.status === 'pending' || apt.status === 'scheduled') {
            result.tomorrow_pending.push(item);
          }
        } else if (apt.date === yesterdayStr) {
          if (apt.status === 'completed' || apt.status === 'attended') {
            result.yesterday_attended.push(item);
          } else if (apt.status === 'no_show' || apt.status === 'missed') {
            result.yesterday_missed.push(item);
          }
        }

        result.general_appointments.push(item);
        if (apt.status === 'confirmed') {
          result.general_confirmations.push(item);
        }
      });
    }

    const rawLeads = localStorage.getItem('crm_leads_data');
    if (rawLeads) {
      const leads: any[] = JSON.parse(rawLeads);
      leads.forEach((l: any) => {
        const item: DayTaskItem = {
          id: l.id,
          patientName: l.name || 'Lead',
          phone: l.phone || '',
          procedure: l.procedureInterest || l.procedure || 'Avaliação Inicial',
          time: 'Comercial',
          date: l.createdAt ? formatDate(new Date(l.createdAt)) : todayStr,
          doctor: l.assignedTo || 'Equipe Comercial',
          clinic: l.clinicName || 'Unidade Principal',
          status: 'pending',
          value: l.estimatedValue || 0,
          origin: l.source || 'Marketing Digital',
          notes: l.notes
        };

        result.general_leads.push(item);
        if (l.status === 'contacted' || l.status === 'negotiation') {
          result.general_followups.push(item);
        }
      });
    }
  } catch (err) {
    console.error('Error loading tasks from storage:', err);
  }

  return result;
}

const CATEGORY_CONFIG: Record<TaskCategoryType, { title: string; subtitle: string; icon: any; color: string; badge: string }> = {
  today_pending: { title: 'Hoje - Agendamentos Pendentes de Confirmação', subtitle: 'Pacientes agendados para hoje aguardando confirmação. Confirme em 1 clique ou envie lembrete.', icon: Clock, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', badge: 'Hoje Pendente' },
  today_confirmed: { title: 'Hoje - Agendamentos Confirmados', subtitle: 'Pacientes com presença confirmada para hoje. Registre o check-in ou visualize a ficha médica.', icon: CheckCircle2, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', badge: 'Hoje Confirmado' },
  tomorrow_pending: { title: 'Amanhã - Confirmações Pendentes', subtitle: 'Agendamentos de amanhã que precisam de confirmação antecipada para garantir a agenda cheia.', icon: Clock, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', badge: 'Amanhã Pendente' },
  tomorrow_confirmed: { title: 'Amanhã - Agendamentos Confirmados', subtitle: 'Lista de atendimentos já garantidos para o próximo dia útil.', icon: Calendar, color: 'text-slate-700 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', badge: 'Amanhã Confirmado' },
  yesterday_attended: { title: 'Ontem - Compareceram à Clínica', subtitle: 'Pacientes que estiveram na clínica ontem. Registre vendas, planos de tratamento ou follow-ups de fechamento.', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', badge: 'Ontem Presença' },
  yesterday_missed: { title: 'Ontem - Pacientes que Faltaram (Recuperação)', subtitle: 'Pacientes faltosos de ontem. Acione a recuperação imediata via WhatsApp para reagendar a consulta.', icon: UserX, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800', badge: 'Ontem Faltas' },
  yesterday_closed: { title: 'Ontem - Vendas & Fechamentos Realizados', subtitle: 'Tratamentos vendidos e contratos assinados ontem pelas equipes clínicas.', icon: DollarSign, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800', badge: 'Ontem Fechamentos' },
  general_leads: { title: 'Leads do Período', subtitle: 'Todos os contatos captados e em negociação no período selecionado.', icon: Sparkles, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200', badge: 'Leads' },
  general_appointments: { title: 'Agendamentos do Período', subtitle: 'Consultas e avaliações agendadas no período.', icon: Calendar, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200', badge: 'Agendamentos' },
  general_confirmations: { title: 'Confirmações do Período', subtitle: 'Total de agendamentos com presença confirmada.', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200', badge: 'Confirmações' },
  general_followups: { title: 'Follow-ups Operacionais', subtitle: 'Acompanhamentos de leads ativos e orçamentos abertos.', icon: AlertCircle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200', badge: 'Follow-ups' }
};

interface DayTaskResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: TaskCategoryType;
  onOpenLeadDetail?: (leadId: string) => void;
}

export default function DayTaskResolverModal({
  isOpen,
  onClose,
  initialCategory,
  onOpenLeadDetail
}: DayTaskResolverModalProps) {
  const { addToast, setActiveTab } = useApp();
  const [activeCategory, setActiveCategory] = useState<TaskCategoryType>(initialCategory);
  const [taskData, setTaskData] = useState<Record<TaskCategoryType, DayTaskItem[]>>(() => loadTaskDataFromStorage());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClinicFilter, setSelectedClinicFilter] = useState('all');

  // Keep category and data in sync with prop changes when opening
  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory);
      setSearchTerm('');
      setTaskData(loadTaskDataFromStorage());
    }
  }, [isOpen, initialCategory]);

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

  if (!isOpen) return null;

  const currentConfig = CATEGORY_CONFIG[activeCategory] || CATEGORY_CONFIG.today_pending;
  const currentItems = (taskData[activeCategory] || []).filter(item => {
    const matchesSearch = item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.procedure.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.phone.includes(searchTerm);
    const matchesClinic = selectedClinicFilter === 'all' || item.clinic.includes(selectedClinicFilter);
    return matchesSearch && matchesClinic;
  });

  // Action Handlers
  const handleConfirmItem = (item: DayTaskItem) => {
    // Move from pending to confirmed or update status
    setTaskData(prev => {
      const updated = { ...prev };
      // Remove from current
      updated[activeCategory] = updated[activeCategory].filter(i => i.id !== item.id);
      // If was today_pending, add to today_confirmed
      if (activeCategory === 'today_pending') {
        updated.today_confirmed = [{ ...item, status: 'confirmed' }, ...updated.today_confirmed];
      }
      return updated;
    });

    // Persist to crm_appointments_data
    try {
      const raw = localStorage.getItem('crm_appointments_data');
      if (raw) {
        const apts = JSON.parse(raw);
        const updatedApts = apts.map((a: any) => a.id === item.id ? { ...a, status: 'confirmed' } : a);
        localStorage.setItem('crm_appointments_data', JSON.stringify(updatedApts));
        window.dispatchEvent(new Event('crm_appointments_updated'));
      }
    } catch (e) {
      console.error('Erro ao atualizar agendamento no localStorage:', e);
    }

    addToast(`Presença confirmada para ${item.patientName}!`, 'success');
  };

  const handleWhatsAppAction = (item: DayTaskItem) => {
    let msg = '';
    if (activeCategory === 'today_pending') {
      msg = `Olá ${item.patientName}, tudo bem? Aqui é da ${item.clinic}. Confirmamos sua consulta de ${item.procedure} hoje às ${item.time} com ${item.doctor}? Por favor, responda SIM para confirmar.`;
    } else if (activeCategory === 'yesterday_missed') {
      msg = `Olá ${item.patientName}, sentimos sua falta ontem na consulta de ${item.procedure} com ${item.doctor}. Gostaria de remarcar para um melhor dia e horário esta semana?`;
    } else if (activeCategory === 'tomorrow_pending') {
      msg = `Olá ${item.patientName}, lembrete de sua consulta agendada para amanhã às ${item.time} na ${item.clinic}. Podemos confirmar sua presença?`;
    } else {
      msg = `Olá ${item.patientName}, tudo bem? Segue o acompanhamento do seu plano de tratamento na ${item.clinic}.`;
    }

    navigator.clipboard?.writeText(msg);
    addToast(`Mensagem WhatsApp copiada para ${item.patientName}! Abrindo WhatsApp...`, 'info');
    
    // Clean phone number
    const cleanPhone = item.phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleReschedule = (item: DayTaskItem) => {
    addToast(`Abrindo reagendamento para ${item.patientName}...`, 'info');
    onClose();
    setActiveTab('agenda');
  };

  const handleRegisterSale = (item: DayTaskItem) => {
    try {
      const rawSales = localStorage.getItem('crm_sales_data');
      const sales = rawSales ? JSON.parse(rawSales) : [];
      sales.push({
        id: 'sale_' + Date.now(),
        patientName: item.patientName,
        phone: item.phone,
        procedure: item.procedure,
        doctor: item.doctor,
        clinic: item.clinic,
        value: item.value || 250,
        date: item.date || new Date().toISOString().split('T')[0],
        status: 'closed',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('crm_sales_data', JSON.stringify(sales));
      window.dispatchEvent(new Event('crm_sales_updated'));
    } catch (e) {
      console.error('Erro ao salvar venda:', e);
    }

    addToast(`Venda de R$ ${item.value?.toLocaleString('pt-BR')} registrada com sucesso para ${item.patientName}!`, 'success');
    setTaskData(prev => ({
      ...prev,
      yesterday_closed: [{ ...item, status: 'closed' }, ...prev.yesterday_closed]
    }));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
          className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3.5">
              <div className={cn("p-3 rounded-2xl border shadow-xs", currentConfig.color)}>
                <currentConfig.icon size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {currentConfig.title}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    {currentItems.length} {currentItems.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {currentConfig.subtitle}
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Category Tabs Bar */}
          <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Filter size={12} /> Visões Rápidas:
            </span>
            {[
              { id: 'today_pending', label: 'Hoje Pendentes', count: taskData.today_pending.length, alert: taskData.today_pending.length > 0 },
              { id: 'today_confirmed', label: 'Hoje Confirmados', count: taskData.today_confirmed.length },
              { id: 'tomorrow_pending', label: 'Amanhã Pendentes', count: taskData.tomorrow_pending.length },
              { id: 'tomorrow_confirmed', label: 'Amanhã Confirmados', count: taskData.tomorrow_confirmed.length },
              { id: 'yesterday_attended', label: 'Ontem Presença', count: taskData.yesterday_attended.length },
              { id: 'yesterday_missed', label: 'Ontem Faltas', count: taskData.yesterday_missed.length, danger: taskData.yesterday_missed.length > 0 },
              { id: 'yesterday_closed', label: 'Ontem Fechamentos', count: taskData.yesterday_closed.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as TaskCategoryType)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0",
                  activeCategory === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                  activeCategory === tab.id
                    ? "bg-white/20 text-white"
                    : tab.danger
                      ? "bg-rose-100 dark:bg-rose-950 text-rose-600"
                      : tab.alert
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-600"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por paciente, procedimento ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedClinicFilter}
                onChange={(e) => setSelectedClinicFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              >
                <option value="all">Todas as Clínicas</option>
                <option value="Jardins">Clínica Jardins</option>
                <option value="Paulista">Clínica Paulista</option>
                <option value="Morumbi">Clínica Morumbi</option>
              </select>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
            {currentItems.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <CheckCircle2 size={40} className="text-emerald-500 mb-2 opacity-80" />
                <h4 className="text-base font-bold text-slate-800 dark:text-white">Tudo em dia por aqui!</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Nenhum registro pendente para esta categoria. Excelente trabalho da equipe de recepção e CRC.
                </p>
              </div>
            ) : (
              currentItems.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  {/* Item Details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {item.patientName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {item.time} ({item.date})
                      </span>
                      {item.origin && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50">
                          {item.origin}
                        </span>
                      )}
                      {item.value && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
                          R$ {item.value.toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {item.procedure}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Building2 size={12} className="text-slate-400" />
                        {item.clinic}
                      </span>
                      <span>•</span>
                      <span>{item.doctor}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300">{item.phone}</span>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-200/40 w-fit">
                        💡 {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions / Direct Resolution Buttons */}
                  <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 dark:border-slate-800">
                    {/* WhatsApp Action */}
                    <button
                      onClick={() => handleWhatsAppAction(item)}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
                      title="Enviar mensagem personalizada de confirmação"
                    >
                      <MessageSquare size={14} className="text-emerald-600 dark:text-emerald-400" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Pending Action: Confirm */}
                    {(activeCategory === 'today_pending' || activeCategory === 'tomorrow_pending') && (
                      <button
                        onClick={() => handleConfirmItem(item)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
                      >
                        <Check size={14} />
                        <span>Confirmar</span>
                      </button>
                    )}

                    {/* Missed Action: Recover & Reschedule */}
                    {activeCategory === 'yesterday_missed' && (
                      <button
                        onClick={() => handleReschedule(item)}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
                      >
                        <RotateCcw size={14} />
                        <span>Remarcar Consulta</span>
                      </button>
                    )}

                    {/* Attended Action: Register Sale */}
                    {activeCategory === 'yesterday_attended' && (
                      <button
                        onClick={() => handleRegisterSale(item)}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
                      >
                        <DollarSign size={14} />
                        <span>Registrar Fechamento</span>
                      </button>
                    )}

                    {/* Confirmed Action: View Record */}
                    {(activeCategory === 'today_confirmed' || activeCategory === 'tomorrow_confirmed' || activeCategory === 'yesterday_closed') && (
                      <button
                        onClick={() => {
                          onClose();
                          setActiveTab('agenda');
                          addToast(`Abrindo agenda para o atendimento de ${item.patientName}...`, 'info');
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Calendar size={14} />
                        <span>Ver Agenda</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles size={14} className="text-blue-500" />
              Clique nas ações para resolver e atualizar a métrica instantaneamente.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold transition-colors"
            >
              Fechar Painel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
