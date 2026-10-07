import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { 
  X, 
  User, 
  Phone, 
  MessageSquare,
  History, 
  Calendar, 
  FileText, 
  Tag as TagIcon,
  ClipboardList,
  CheckCircle2,
  Clock,
  MoreVertical,
  Stethoscope,
  Download,
  Eye,
  Plus,
  TrendingUp,
  Target,
  Sparkles,
  PieChart as PieChartIcon,
  Bot,
  Mic,
  Square,
  StickyNote,
  Send,
  CalendarCheck,
  Mail,
  AlertTriangle,
  BookOpen,
  Trash2
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { Lead } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { fetchLeadTimelineFromDb, LeadTimelineItem, updateLeadEverywhere, addLeadNote, deleteLeadNote, isSupabaseConfigured, isUuid } from '@/src/lib/supabase';

interface LeadDetailProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

const SOURCE_OPTIONS = ['Meta Ads', 'Google Ads', 'Instagram', 'Facebook', 'WhatsApp', 'Site', 'Indicação', 'Manual / CRM'];

const EDITABLE_FIELDS = ['name', 'whatsapp', 'phone', 'email', 'birthDate', 'cpf', 'cep', 'address', 'procedureType', 'sourceId', 'estimatedValue'] as const;

export default function LeadDetail({ isOpen, onClose, lead: leadProp }: LeadDetailProps) {
  const { addToast, currentClinic, clinics, setActiveTab: navigateTo, user } = useApp();

  // Alterações salvas na ficha valem imediatamente, mesmo antes de o pai recarregar o lead
  const [overrides, setOverrides] = useState<Partial<Lead>>({});
  const lead = useMemo(() => (leadProp ? ({ ...leadProp, ...overrides } as Lead) : null), [leadProp, overrides]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setOverrides({});
    setIsEditing(false);
  }, [leadProp?.id]);

  useEffect(() => {
    if (!lead) return;
    setDraft({
      name: lead.name || '',
      whatsapp: lead.whatsapp || '',
      phone: lead.phone || '',
      email: lead.email || '',
      birthDate: lead.birthDate ? String(lead.birthDate).slice(0, 10) : '',
      cpf: lead.cpf || '',
      cep: lead.cep || '',
      address: lead.address || '',
      procedureType: lead.procedureType || '',
      sourceId: lead.sourceId || '',
      estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : ''
    });
  }, [lead?.id, leadProp, overrides]);

  const isDirty = !!lead && EDITABLE_FIELDS.some(f => (draft[f] ?? '') !== String(f === 'birthDate' ? (lead.birthDate || '').slice(0, 10) : (lead as any)[f] ?? (f === 'estimatedValue' ? '' : '')) && !(f === 'estimatedValue' && !lead.estimatedValue && !draft[f]));

  const handleSaveProfile = async () => {
    if (!lead) return;
    if (!draft.name?.trim()) {
      addToast('O nome do lead não pode ficar vazio.', 'error');
      return;
    }
    const updates: Record<string, any> = {};
    EDITABLE_FIELDS.forEach(f => {
      const before = f === 'birthDate' ? (lead.birthDate || '').slice(0, 10) : String((lead as any)[f] ?? (f === 'estimatedValue' ? '' : ''));
      if ((draft[f] ?? '') !== before) {
        updates[f] = f === 'estimatedValue' ? Number(String(draft[f]).replace(',', '.')) || 0 : draft[f].trim();
      }
    });
    if (Object.keys(updates).length === 0) return;
    setSaving(true);
    const ok = await updateLeadEverywhere(lead.id, updates);
    setSaving(false);
    if (ok) {
      setOverrides(prev => ({ ...prev, ...updates }));
      setIsEditing(false);
      addToast('Dados do lead atualizados.', 'success');
    } else {
      addToast('Não foi possível salvar as alterações no banco de dados.', 'error');
    }
  };

  const handleCancelEdit = () => {
    if (!lead) return;
    setDraft({
      name: lead.name || '',
      whatsapp: lead.whatsapp || '',
      phone: lead.phone || '',
      email: lead.email || '',
      birthDate: lead.birthDate ? String(lead.birthDate).slice(0, 10) : '',
      cpf: lead.cpf || '',
      cep: lead.cep || '',
      address: lead.address || '',
      procedureType: lead.procedureType || '',
      sourceId: lead.sourceId || '',
      estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : ''
    });
    setIsEditing(false);
  };

  const clinicName = lead ? (clinics.find(c => c.id === lead.clinicId)?.name || 'Clínica não identificada') : '';

  const handleSchedule = () => {
    if (!lead) return;
    try {
      localStorage.setItem('crm_schedule_prefill', JSON.stringify({ leadId: lead.id, name: lead.name, phone: lead.whatsapp || lead.phone, clinicId: lead.clinicId, procedure: lead.procedureType || '' }));
    } catch {}
    onClose();
    navigateTo('agenda');
  };
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'procedures' | 'docs' | 'tasks' | 'plan' | 'ai'>('info');
  const [timeline, setTimeline] = useState<LeadTimelineItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Background duplicate validation state
  const [duplicateWarning, setDuplicateWarning] = useState<{ name: string; matchType: string } | null>(null);

  // Message Templates Library State
  const [templates, setTemplates] = useState<{ id: string; title: string; content: string; type: 'whatsapp' | 'email' | 'call' }[]>(() => {
    const saved = localStorage.getItem('crm_message_templates');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Primeiro Contato WhatsApp', content: 'Olá {nome}, tudo bem? Sou da equipe da {clinica}. Notamos seu interesse em {procedimento} e gostaríamos de agendar sua avaliação. Como está sua agenda?', type: 'whatsapp' },
      { id: '2', title: 'Lembrete de Avaliação', content: 'Olá {nome}! Passando para confirmar nossa avaliação agendada na {clinica}. Estamos te esperando. Confirma sua presença?', type: 'whatsapp' },
      { id: '3', title: 'Proposta Comercial E-mail', content: 'Olá {nome},\n\nPreparamos uma condição especial para o seu tratamento de {procedimento} na {clinica}.\n\nSeguem os detalhes e valores conforme conversamos.\n\nAtenciosamente,\nEquipe de Relacionamento', type: 'email' }
    ];
  });
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<'whatsapp' | 'email' | 'call'>('whatsapp');

  // Quick Action Modal State
  const [quickActionModal, setQuickActionModal] = useState<{
    isOpen: boolean;
    type: 'call' | 'whatsapp' | 'email';
    title: string;
    content: string;
    subject?: string;
  }>({ isOpen: false, type: 'whatsapp', title: '', content: '' });

  // AI Lead Score calculation (0-100 likelihood of conversion)
  const leadScore = useMemo(() => {
    if (!lead) return 70;
    let score = 55;
    if (lead.whatsapp || lead.phone) score += 15;
    if (lead.email) score += 10;
    if (lead.cpf) score += 10;
    if (lead.status === 'vendido') score = 98;
    else if (lead.status === 'compareceu' || lead.status === 'agendamento') score += 20;
    else if (lead.status === 'interagiu') score += 15;
    if (lead.priority === 'urgent' || lead.priority === 'high') score += 10;
    return Math.min(score, 100);
  }, [lead]);

  // Quick Notes State
  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingNote, setSavingNote] = useState(false);
  const [notes, setNotes] = useState<{id: string, text: string, date: string}[]>(() => {
    const saved = localStorage.getItem(`lead_notes_${lead?.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Tasks State
  const [taskTitle, setTaskTitle] = useState('');
  const [tasks, setTasks] = useState<{id: string, title: string, date: string, status: 'pending' | 'completed'}[]>(() => {
    const saved = localStorage.getItem(`lead_tasks_${lead?.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const reloadTimeline = React.useCallback(async () => {
    if (!lead) return;
    setTimelineLoading(true);
    try {
      setTimeline(await fetchLeadTimelineFromDb(lead));
    } finally {
      setTimelineLoading(false);
    }
  }, [lead?.id, lead?.phone, lead?.whatsapp]);

  // Carrega ao abrir a ficha (o contador "Notas" do topo precisa do número certo) e ao entrar no Histórico
  useEffect(() => {
    if (!isOpen || !lead) return;
    reloadTimeline();
  }, [isOpen, lead?.id, activeTab === 'history', reloadTimeline]);

  const dbNotes = timeline.filter(t => t.kind === 'note');
  const useDbNotes = isSupabaseConfigured() && isUuid(lead?.id);

  const handleAddNote = async () => {
    if (!lead || !noteContent.trim()) return;
    if (!useDbNotes) {
      saveNote(); // modo demonstração: guarda só neste navegador
      return;
    }
    setSavingNote(true);
    const ok = await addLeadNote(lead.id, noteContent, noteDate, user?.id);
    setSavingNote(false);
    if (ok) {
      setNoteContent('');
      setNoteDate(new Date().toISOString().slice(0, 10));
      addToast('Anotação adicionada ao histórico.', 'success');
      reloadTimeline();
    } else {
      addToast('Não foi possível salvar a anotação no banco de dados.', 'error');
    }
  };

  const handleDeleteNote = async (noteId?: string) => {
    if (!noteId) return;
    const ok = await deleteLeadNote(noteId);
    addToast(ok ? 'Anotação excluída.' : 'Não foi possível excluir a anotação.', ok ? 'info' : 'error');
    if (ok) reloadTimeline();
  };

  useEffect(() => {
    if (lead) {
      const savedNotes = localStorage.getItem(`lead_notes_${lead.id}`);
      setNotes(savedNotes ? JSON.parse(savedNotes) : []);
      
      const savedTasks = localStorage.getItem(`lead_tasks_${lead.id}`);
      setTasks(savedTasks ? JSON.parse(savedTasks) : []);

      // Background validation service for duplicate check in CRM
      try {
        const allLeadsRaw = localStorage.getItem('crm_leads_data');
        if (allLeadsRaw) {
          const allLeads: Lead[] = JSON.parse(allLeadsRaw);
          const duplicate = allLeads.find(l => 
            l.id !== lead.id && (
              (lead.cpf && l.cpf && l.cpf.replace(/\D/g, '') === lead.cpf.replace(/\D/g, '')) ||
              (lead.email && l.email && l.email.toLowerCase() === lead.email.toLowerCase())
            )
          );
          if (duplicate) {
            const matchType = (lead.cpf && duplicate.cpf && duplicate.cpf === lead.cpf) ? 'CPF' : 'E-mail';
            setDuplicateWarning({ name: duplicate.name, matchType });
          } else {
            setDuplicateWarning(null);
          }
        } else {
          setDuplicateWarning(null);
        }
      } catch (e) {
        console.error('Error checking duplicate leads:', e);
        setDuplicateWarning(null);
      }
    }
  }, [lead]);

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

  const handleQuickAction = (type: 'call' | 'whatsapp' | 'email') => {
    if (!lead) return;
    if (type === 'whatsapp') {
      const text = `Olá ${lead.name}, aqui é da equipe de atendimento da clínica. Notamos seu interesse em nossos procedimentos e gostaríamos de saber se tem dúvidas ou deseja agendar sua avaliação!`;
      setQuickActionModal({
        isOpen: true,
        type: 'whatsapp',
        title: 'Mensagem WhatsApp pré-definida',
        content: text
      });
    } else if (type === 'call') {
      const script = `Script de Chamada para ${lead.name}:\n\n1. Apresentação: "Olá ${lead.name}, tudo bem? Sou da clínica Odonto Premium."\n2. Contexto: "Notei seu interesse em ${lead.procedureType || 'nossos tratamentos'}."\n3. Oferta: "Teríamos um horário disponível esta semana para sua avaliação sem compromisso. Como fica para você?"`;
      setQuickActionModal({
        isOpen: true,
        type: 'call',
        title: 'Assistente de Ligação',
        content: script
      });
    } else if (type === 'email') {
      const subject = `Proposta e Agendamento - ${lead.name}`;
      const body = `Olá ${lead.name},\n\nRecebemos seu contato com interesse em nossos tratamentos de saúde e estética. Preparamos condições especiais para sua avaliação inicial.\n\nAtenciosamente,\nEquipe de Relacionamento`;
      setQuickActionModal({
        isOpen: true,
        type: 'email',
        title: 'E-mail Corporativo',
        content: body,
        subject
      });
    }
  };

  const saveNote = () => {
    if (!noteContent.trim() || !lead) return;
    
    const newNote = {
      id: Math.random().toString(36).substr(2, 9),
      text: noteContent,
      date: new Date().toLocaleString('pt-BR')
    };
    
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    localStorage.setItem(`lead_notes_${lead.id}`, JSON.stringify(updatedNotes));
    setNoteContent('');
    addToast('Nota salva com sucesso!', 'success');
  };

  const addTask = () => {
    if (!taskTitle.trim() || !lead) return;
    
    const newTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: taskTitle,
      date: new Date().toISOString().split('T')[0],
      status: 'pending' as const
    };
    
    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    localStorage.setItem(`lead_tasks_${lead.id}`, JSON.stringify(updatedTasks));
    setTaskTitle('');
    addToast('Tarefa associada ao lead!', 'success');
  };

  const toggleTaskStatus = (id: string) => {
    if (!lead) return;
    const updatedTasks = tasks.map(t => 
      t.id === id ? { ...t, status: t.status === 'pending' ? 'completed' : 'pending' } : t
    );
    setTasks(updatedTasks as any);
    localStorage.setItem(`lead_tasks_${lead.id}`, JSON.stringify(updatedTasks));
  };

  if (!lead) return null;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        setIsSummarizing(true);
        // Simulate sending to AI for transcription
        setTimeout(() => {
          setIsSummarizing(false);
          addToast('Nota de voz transcrita e adicionada ao histórico.', 'success');
        }, 2000);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      (recorder as any)._interval = interval;
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      clearInterval((mediaRecorder as any)._interval);
      setMediaRecorder(null);
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const generateAISummary = async () => {
    setIsSummarizing(true);
    try {
      const response = await fetch('/api/ai/summarize-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leadName: lead.name,
          interactions: [
            { title: 'Status Atualizado', desc: 'Alterado para Agendamento por Gustavo', date: 'Há 2 horas' },
            { title: 'Ligação Realizada', desc: 'Paciente demonstrou interesse em implantes.', date: 'Hoje, 10:30' },
            { title: 'Anotação Clínica', desc: 'Paciente relata dor no molar superior direito.', date: 'Ontem, 18:20' },
          ],
          procedures: mockProcedures
        })
      });
      const data = await response.json();
      setAiSummary(data.summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      setAiSummary('Não foi possível gerar o resumo automático no momento. Por favor, tente novamente mais tarde.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const mockProcedures: any[] = [];
  const mockDocs: any[] = [];

  const tabs = [
    { id: 'info', label: 'Cliente', icon: User },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'tasks', label: 'Tarefas', icon: CalendarCheck },
    { id: 'plan', label: 'Plano', icon: ClipboardList },
    { id: 'procedures', label: 'Origem', icon: Target },
    { id: 'docs', label: 'Docs', icon: FileText },
    { id: 'ai', label: 'IA', icon: Sparkles },
  ] as const;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100]"
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-3 sm:p-6 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="pointer-events-auto w-full max-w-2xl max-h-[88vh] bg-white dark:bg-slate-950 shadow-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Target size={100} />
              </div>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none ring-4 ring-blue-50 dark:ring-blue-900/20">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight tracking-tight">{lead.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-bold uppercase rounded-full tracking-wider">
                      {lead.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {lead.procedureType || 'Implante Verão'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 relative z-10">
                {/* Lead Score Component */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/60 dark:border-blue-900/40 rounded-xl shadow-xs" title="Likelihood of conversion calculated by AI">
                  <Sparkles size={14} className="text-blue-600 dark:text-blue-400 animate-pulse" />
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Score IA</span>
                    <span className="text-xs font-extrabold text-blue-700 dark:text-blue-300">{leadScore}/100</span>
                  </div>
                </div>

                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm",
                    isRecording 
                      ? "bg-red-500 text-white animate-pulse" 
                      : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                  )}
                >
                  {isRecording ? <Square size={12} fill="currentColor" /> : <Mic size={12} />}
                  {isRecording ? `${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}` : "Voz"}
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Duplicate Warning Alert Banner */}
            {duplicateWarning && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 p-3 px-4 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span><strong>Atenção (CRM):</strong> Já existe outro lead ({duplicateWarning.name}) cadastrado com o mesmo {duplicateWarning.matchType}.</span>
                </div>
              </div>
            )}

            {/* Quick Info Bar */}
            <div className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-center">
              <div className="p-3 border-r border-slate-100 dark:border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">WhatsApp</span>
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate block">{lead.whatsapp || lead.phone || '-'}</span>
              </div>
              <div className="p-3 border-r border-slate-100 dark:border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Notas</span>
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block">{useDbNotes ? dbNotes.length : notes.length}</span>
              </div>
              <div className="p-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Tarefas</span>
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block">{tasks.filter(t => t.status === 'pending').length}</span>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 gap-6 overflow-x-auto no-scrollbar bg-slate-50/20 dark:bg-slate-900/20">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "py-3 text-[10px] font-bold uppercase tracking-[0.15em] border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap",
                    activeTab === tab.id 
                      ? "border-blue-600 text-blue-600" 
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  )}
                >
                  <tab.icon size={13} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-white dark:bg-slate-950 space-y-5">
              <AnimatePresence mode="wait">
                {activeTab === 'info' && (
                  <motion.div
                    key="info"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <User size={14} className="text-blue-500" />
                          Informações cadastrais
                        </h3>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleSaveProfile}
                              disabled={saving || !isDirty}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          >
                            Editar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 block ">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nome Completo</span>
                          <input type="text" value={draft.name ?? ''} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} readOnly={!isEditing} className={cn("w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none", isEditing ? "focus:text-blue-600" : "cursor-default")} />
                        </label>
                        <label className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 block ">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">WhatsApp</span>
                          <input type="tel" value={draft.whatsapp ?? ''} onChange={e => setDraft(d => ({ ...d, whatsapp: e.target.value }))} readOnly={!isEditing} className={cn("w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none", isEditing ? "focus:text-blue-600" : "cursor-default")} />
                        </label>
                        <label className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 block ">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Telefone</span>
                          <input type="tel" value={draft.phone ?? ''} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} readOnly={!isEditing} className={cn("w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none", isEditing ? "focus:text-blue-600" : "cursor-default")} />
                        </label>
                        <label className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 block ">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">E-mail</span>
                          <input type="email" value={draft.email ?? ''} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} readOnly={!isEditing} className={cn("w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none", isEditing ? "focus:text-blue-600" : "cursor-default")} />
                        </label>
                        <label className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 block ">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Data de Nascimento</span>
                          <input type="date" value={draft.birthDate ?? ''} onChange={e => setDraft(d => ({ ...d, birthDate: e.target.value }))} readOnly={!isEditing} className={cn("w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none", isEditing ? "focus:text-blue-600" : "cursor-default")} />
                        </label>
                        <label className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 block ">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">CPF</span>
                          <input type="text" value={draft.cpf ?? ''} onChange={e => setDraft(d => ({ ...d, cpf: e.target.value }))} readOnly={!isEditing} className={cn("w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none", isEditing ? "focus:text-blue-600" : "cursor-default")} />
                        </label>
                        <label className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 block ">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">CEP</span>
                          <input type="text" value={draft.cep ?? ''} onChange={e => setDraft(d => ({ ...d, cep: e.target.value }))} readOnly={!isEditing} className={cn("w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none", isEditing ? "focus:text-blue-600" : "cursor-default")} />
                        </label>
                        <label className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 block ">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Procedimento de interesse</span>
                          <input type="text" value={draft.procedureType ?? ''} onChange={e => setDraft(d => ({ ...d, procedureType: e.target.value }))} readOnly={!isEditing} className={cn("w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none", isEditing ? "focus:text-blue-600" : "cursor-default")} />
                        </label>
                      </div>
                        <label className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 block ">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Endereço Completo</span>
                          <input type="text" value={draft.address ?? ''} onChange={e => setDraft(d => ({ ...d, address: e.target.value }))} readOnly={!isEditing} className={cn("w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none", isEditing ? "focus:text-blue-600" : "cursor-default")} />
                        </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Clínica / Unidade</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{clinicName}</span>
                        </div>
                        <label className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 block">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Origem / Canal</span>
                          <select value={draft.sourceId ?? ''} disabled={!isEditing} onChange={e => setDraft(d => ({ ...d, sourceId: e.target.value }))} className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none disabled:appearance-none disabled:cursor-default">
                            {draft.sourceId && !SOURCE_OPTIONS.includes(draft.sourceId) && <option value={draft.sourceId}>{draft.sourceId}</option>}
                            {SOURCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </label>
                      </div>
                        <label className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 block ">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Valor estimado (R$)</span>
                          <input type="number" value={draft.estimatedValue ?? ''} onChange={e => setDraft(d => ({ ...d, estimatedValue: e.target.value }))} readOnly={!isEditing} className={cn("w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none", isEditing ? "focus:text-blue-600" : "cursor-default")} />
                        </label>

                      {lead?.tags && lead.tags.length > 0 && (
                        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tags / Interesses</span>
                          <div className="flex flex-wrap gap-1.5">
                            {(lead?.tags || []).map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-md">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-8"
                  >
                    {/* O que foi conversado com o lead: anotação com data, salva no banco */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <StickyNote size={14} className="text-blue-500" />
                        Registrar conversa
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="date"
                          value={noteDate}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={e => setNoteDate(e.target.value)}
                          aria-label="Data da conversa"
                          className="sm:w-40 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                        <textarea
                          value={noteContent}
                          onChange={e => setNoteContent(e.target.value)}
                          rows={2}
                          placeholder="O que foi conversado ou combinado? Ex.: pediu orçamento; combinado retomar contato sexta."
                          className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={handleAddNote}
                          disabled={savingNote || !noteContent.trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          {savingNote ? 'Salvando...' : 'Adicionar ao histórico'}
                        </button>
                      </div>
                    </div>

                    {/* Combined Timeline: System events + Quick Notes */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Atividades e Notas</h3>
                      </div>
                      
                      <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 pl-8 space-y-10 py-2">
                        {/* Quick Notes Rendering */}
                        {(useDbNotes ? [] : (notes || [])).map((note) => (
                          <div key={note.id} className="relative group">
                            <div className="absolute -left-[45px] top-0 w-8 h-8 rounded-xl flex items-center justify-center border-4 border-white dark:border-slate-950 shadow-sm transition-transform group-hover:scale-110 bg-blue-50 text-blue-600 dark:bg-blue-900/30">
                              <StickyNote size={14} />
                            </div>
                            <div className="bg-blue-50/30 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100/20">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-bold text-blue-600 tracking-tight">Nota do Consultor</h4>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{note.date}</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">"{note.text}"</p>
                            </div>
                          </div>
                        ))}

                        {/* Conversas e eventos reais (Supabase / agente n8n) */}
                        {timelineLoading && timeline.length === 0 && (
                          <p className="text-xs text-slate-400">Carregando histórico...</p>
                        )}
                        {!timelineLoading && timeline.length === 0 && (
                          <p className="text-xs text-slate-400">Nenhuma conversa ou evento registrado para este lead ainda.</p>
                        )}
                        {timeline.map(item => (
                          <div key={item.id} className="relative group">
                            <div className={cn(
                              "absolute -left-[45px] top-0 w-8 h-8 rounded-xl flex items-center justify-center border-4 border-white dark:border-slate-950 shadow-sm transition-transform group-hover:scale-110",
                              item.kind === 'client' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30'
                                : item.kind === 'note' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30'
                                : item.kind === 'team' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
                                : 'text-purple-600 bg-purple-50 dark:bg-purple-900/30'
                            )}>
                              {item.kind === 'event' ? <Clock size={14} /> : item.kind === 'note' ? <StickyNote size={14} /> : <MessageSquare size={14} />}
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">
                                  {item.title}
                                  {item.author && <span className="ml-1.5 text-[10px] font-semibold text-slate-400 normal-case">por {item.author}</span>}
                                </h4>
                                <span className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                  {item.kind === 'note'
                                    ? new Date(item.date).toLocaleDateString('pt-BR')
                                    : new Date(item.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  {item.kind === 'note' && (
                                    <button onClick={() => handleDeleteNote(item.noteId)} title="Excluir anotação" className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer">
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{item.text || '(mensagem sem texto registrada)'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'tasks' && (
                  <motion.div
                    key="tasks"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Nova Tarefa para este Lead</h3>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          placeholder="Ex: Ligar para confirmar horário..."
                          className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                        <button 
                          onClick={addTask}
                          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Plus size={16} />
                          Adicionar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agendamentos e Pendências</h3>
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[8px] font-bold uppercase rounded-md">{(tasks || []).filter(t => t.status === 'pending').length} Pendentes</span>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                        {(tasks || []).map((task) => (
                          <div 
                            key={task.id} 
                            className={cn(
                              "p-4 flex items-center justify-between transition-colors",
                              task.status === 'completed' ? "bg-slate-50/50 dark:bg-slate-900/20" : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => toggleTaskStatus(task.id)}
                                className={cn(
                                  "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                                  task.status === 'completed' 
                                    ? "bg-emerald-500 border-emerald-500 text-white" 
                                    : "border-slate-200 dark:border-slate-700 hover:border-blue-500"
                                )}
                              >
                                {task.status === 'completed' && <CheckCircle2 size={12} />}
                              </button>
                              <div>
                                <p className={cn(
                                  "text-xs font-bold",
                                  task.status === 'completed' ? "text-slate-400 line-through" : "text-slate-800 dark:text-white"
                                )}>
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Calendar size={10} className="text-slate-400" />
                                  <span className="text-[10px] text-slate-400 font-medium">Data: {new Date(task.date).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                            </div>
                            <button className="p-1.5 text-slate-300 hover:text-slate-600 dark:hover:text-slate-100 transition-colors">
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        ))}

                        {tasks.length === 0 && (
                          <div className="p-8 text-center text-slate-400">
                            <CalendarCheck size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma tarefa agendada</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'ai' && (
                  <motion.div
                    key="ai"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group">
                      <div className="absolute -right-4 -top-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
                        <Bot size={120} />
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                          <Sparkles size={20} className="text-amber-300" />
                          Resumo Clínico IA
                        </h3>
                        <p className="text-indigo-100 text-xs leading-relaxed mb-6">
                          Gere uma síntese inteligente do plano de tratamento, notas clínicas e status de saúde baseado em todas as interações e histórico deste paciente.
                        </p>
                        <button 
                          onClick={generateAISummary}
                          disabled={isSummarizing}
                          className="bg-white text-indigo-600 font-bold text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg hover:shadow-2xl transition-all disabled:opacity-50"
                        >
                          {isSummarizing ? 'Gerando...' : 'Gerar Documentação'}
                        </button>
                      </div>
                    </div>

                    {aiSummary ? (
                      <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 text-xs leading-relaxed space-y-4">
                          <div className="whitespace-pre-wrap">{aiSummary}</div>
                        </div>
                      </div>
                    ) : !isSummarizing && (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Bot size={48} className="opacity-20 mb-4" />
                        <p className="text-xs font-medium tracking-wide">Nenhuma documentação gerada ainda</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'plan' && (
                  <motion.div
                    key="plan"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div className="p-6 bg-slate-900 rounded-2xl text-white shadow-xl relative overflow-hidden group">
                      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <TrendingUp size={120} />
                      </div>
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-1">Ticket Estimado</p>
                        <h3 className="text-3xl font-bold mb-4">
                          {lead.estimatedValue ? `R$ ${lead.estimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                            <p className="text-[9px] font-bold uppercase opacity-60">Status</p>
                            <p className="text-xs font-bold capitalize">{lead.status || 'Novo Lead'}</p>
                          </div>
                          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                            <p className="text-[9px] font-bold uppercase opacity-60">Prioridade</p>
                            <p className="text-xs font-bold capitalize">{lead.priority === 'urgent' ? 'Urgente' : lead.priority === 'high' ? 'Alta' : lead.priority === 'medium' ? 'Média' : 'Baixa'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        Itens do Orçamento
                        <button className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                          <Plus size={14} />
                        </button>
                      </h3>
                      <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400">
                        <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Nenhum item adicionado ao orçamento</p>
                        <p className="text-[10px] text-slate-400 mt-1">Clique no botão "+" acima para adicionar procedimentos e valores.</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'procedures' && (
                  <motion.div
                    key="procedures"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Target size={14} className="text-blue-500" />
                        Origem de captação
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2">De qual anúncio ou canal este contato chegou.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Canal de captação</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white break-words">{lead.sourceId || 'Não informado'}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Campanha</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white break-words">{lead.utmCampaign || lead.campaignId || 'Não informado'}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Mídia / formato</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white break-words">{lead.utmMedium || lead.sourceMedium || 'Não informado'}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Anúncio / conteúdo</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white break-words">{lead.utmContent || 'Não informado'}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Palavra-chave</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white break-words">{lead.utmTerm || 'Não informado'}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Página de origem</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white break-words">{lead.referralUrl || 'Não informado'}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Entrou em</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{lead.createdAt ? new Date(lead.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Não informado'}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                {activeTab === 'docs' && (
                  <motion.div
                    key="docs"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <button className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 hover:border-blue-400 transition-colors group">
                        <Plus size={24} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enviar Arquivo</span>
                      </button>
                      <button className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 hover:border-emerald-400 transition-colors group">
                        <Eye size={24} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ver Galeria</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(mockDocs || []).map((doc, i) => (
                        <div key={i} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:shadow-md transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors">
                              <FileText size={24} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-white">{doc.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{doc.type} • {doc.size} • {doc.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                              <Download size={18} />
                            </button>
                            <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                              <Eye size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Actions Floating Menu */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md grid grid-cols-3 gap-2 shrink-0">
              <button 
                onClick={() => handleQuickAction('call')}
                className="py-2.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
              >
                <Phone size={14} className="text-blue-600" />
                Ligar
              </button>
              <button 
                onClick={() => handleQuickAction('whatsapp')}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
              >
                <MessageSquare size={14} />
                WhatsApp
              </button>
              <button 
                onClick={handleSchedule}
                className="py-2.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
              >
                <CalendarCheck size={14} className="text-indigo-600" />
                Agendar
              </button>
            </div>
          </motion.div>
          </div>

          {/* Quick Action Template Modal */}
          {quickActionModal.isOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {quickActionModal.type === 'whatsapp' && <MessageSquare className="text-emerald-500" size={20} />}
                    {quickActionModal.type === 'call' && <Phone className="text-blue-500" size={20} />}
                    {quickActionModal.type === 'email' && <Mail className="text-indigo-500" size={20} />}
                    {quickActionModal.title}
                  </h3>
                  <button 
                    onClick={() => setQuickActionModal(prev => ({ ...prev, isOpen: false }))}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X size={18} />
                  </button>
                </div>

                {quickActionModal.subject !== undefined && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Assunto</label>
                    <input 
                      type="text" 
                      value={quickActionModal.subject || ''}
                      onChange={(e) => setQuickActionModal(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white font-medium"
                    />
                  </div>
                )}

                {/* Templates Selector */}
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Modelos de Mensagem (Templates)</label>
                  <button 
                    onClick={() => setIsTemplateManagerOpen(true)}
                    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <BookOpen size={12} />
                    Gerenciar Biblioteca
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  {templates
                    .filter(t => t.type === quickActionModal.type || quickActionModal.type === 'call')
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          const parsed = t.content
                            .replace(/\{nome\}/g, lead?.name || 'Cliente')
                            .replace(/\{clinica\}/g, currentClinic?.name || 'Clínica')
                            .replace(/\{procedimento\}/g, lead?.procedureType || 'tratamento');
                          setQuickActionModal(prev => ({ ...prev, content: parsed }));
                          addToast(`Template "${t.title}" aplicado!`, 'success');
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-bold transition-all shadow-xs"
                      >
                        {t.title}
                      </button>
                    ))}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Modelo de Mensagem / Script</label>
                  <textarea 
                    rows={5}
                    value={quickActionModal.content}
                    onChange={(e) => setQuickActionModal(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button 
                    onClick={() => setQuickActionModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      if (quickActionModal.type === 'whatsapp') {
                        window.open(`https://wa.me/${lead?.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(quickActionModal.content)}`, '_blank');
                      } else if (quickActionModal.type === 'email') {
                        window.open(`mailto:${lead?.email}?subject=${encodeURIComponent(quickActionModal.subject || '')}&body=${encodeURIComponent(quickActionModal.content)}`, '_blank');
                      } else {
                        addToast(`Iniciando discagem para ${lead?.name}...`, 'success');
                      }
                      setQuickActionModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center gap-2"
                  >
                    <Send size={14} />
                    {quickActionModal.type === 'whatsapp' ? 'Enviar WhatsApp' : quickActionModal.type === 'email' ? 'Enviar E-mail' : 'Registrar Chamada'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Template Manager Modal */}
          {isTemplateManagerOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen size={20} className="text-blue-600" />
                    Biblioteca de Templates de Mensagens
                  </h3>
                  <button 
                    onClick={() => setIsTemplateManagerOpen(false)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Existing Templates list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Templates Salvos</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {(templates || []).map(t => (
                      <div key={t.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-white">{t.title}</span>
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded text-[9px] font-bold uppercase">{t.type}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.content}</p>
                        </div>
                        <button 
                          onClick={() => {
                            const updated = templates.filter(item => item.id !== t.id);
                            setTemplates(updated);
                            localStorage.setItem('crm_message_templates', JSON.stringify(updated));
                            addToast('Template removido', 'info');
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add New Template Form */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Criar Novo Template</h4>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Título do Template</label>
                    <input 
                      type="text" 
                      value={newTemplateTitle}
                      onChange={e => setNewTemplateTitle(e.target.value)}
                      placeholder="Ex: Abordagem Pós-Consulta"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Canal</label>
                    <select 
                      value={newTemplateType}
                      onChange={e => setNewTemplateType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white font-medium"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">E-mail</option>
                      <option value="call">Ligação</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Conteúdo (use &#123;nome&#125;, &#123;clinica&#125;, &#123;procedimento&#125;)</label>
                    <textarea 
                      rows={4}
                      value={newTemplateContent}
                      onChange={e => setNewTemplateContent(e.target.value)}
                      placeholder="Olá {nome}, tudo bem? Aqui é da {clinica}..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (!newTemplateTitle.trim() || !newTemplateContent.trim()) {
                        addToast('Preencha todos os campos do template', 'error');
                        return;
                      }
                      const newItem = {
                        id: 't_' + Date.now(),
                        title: newTemplateTitle,
                        content: newTemplateContent,
                        type: newTemplateType
                      };
                      const updated = [...templates, newItem];
                      setTemplates(updated);
                      localStorage.setItem('crm_message_templates', JSON.stringify(updated));
                      setNewTemplateTitle('');
                      setNewTemplateContent('');
                      setIsTemplateManagerOpen(false);
                      addToast('Template criado com sucesso!', 'success');
                    }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Salvar Novo Template
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
