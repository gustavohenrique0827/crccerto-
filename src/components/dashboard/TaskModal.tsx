import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  User, 
  MessageSquare, 
  AlertCircle, 
  Bot, 
  Sparkles, 
  Loader2, 
  CheckSquare, 
  Clock, 
  Phone, 
  Send,
  FileText,
  Flag
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { cn } from '@/src/lib/utils';
import { useAssignableMembers, CrmTask } from '@/src/lib/tasksStore';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string;
  leadName?: string;
  onAddTask?: (task: any) => void;
  /** Quando informado, o modal abre em modo de edição desta tarefa. */
  editingTask?: CrmTask | null;
  onUpdateTask?: (task: CrmTask) => void;
}

const QUICK_CATEGORIES = [
  { label: 'WhatsApp Follow-up', icon: MessageSquare, prompt: 'Enviar mensagem de follow-up via WhatsApp sobre o orçamento' },
  { label: 'Retornar Ligação', icon: Phone, prompt: 'Ligar para o lead para esclarecer dúvidas sobre o procedimento' },
  { label: 'Apresentar Orçamento', icon: FileText, prompt: 'Enviar proposta comercial e plano de pagamento personalizado' },
  { label: 'Confirmar Presença', icon: Calendar, prompt: 'Confirmar agendamento de consulta de avaliação' },
];

export default function TaskModal({ isOpen, onClose, leadId, leadName, onAddTask, editingTask, onUpdateTask }: TaskModalProps) {
  const { addToast, user } = useApp();
  const members = useAssignableMembers(user ? { id: user.id, name: user.name } : null);
  const isEditing = Boolean(editingTask);
  const [loading, setLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: 'WhatsApp Follow-up',
    responsible: '',
    responsibleId: ''
  });

  // Abre preenchido ao editar; ao criar, o responsável padrão é quem está logado
  useEffect(() => {
    if (!isOpen) return;
    if (editingTask) {
      setFormData(prev => ({
        ...prev,
        title: editingTask.title,
        description: editingTask.description || '',
        dueDate: (editingTask.dueDate || '').slice(0, 10) || prev.dueDate,
        priority: editingTask.priority,
        responsible: editingTask.responsible || '',
        responsibleId: editingTask.responsibleId || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        title: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
        responsible: user?.name || '',
        responsibleId: user?.id || ''
      }));
    }
  }, [isOpen, editingTask?.id]);

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

  const setRelativeDate = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setFormData(prev => ({ ...prev, dueDate: d.toISOString().split('T')[0] }));
  };

  const handleSelectQuickCategory = (cat: typeof QUICK_CATEGORIES[0]) => {
    setFormData(prev => ({
      ...prev,
      category: cat.label,
      title: prev.title || `${cat.label} - ${leadName || 'Lead'}`,
      description: prev.description || cat.prompt
    }));
  };

  const suggestDescription = async () => {
    if (!leadName && !formData.title) return;
    setIsSuggesting(true);
    try {
      const prompt = `Sugira uma descrição prática e persuasiva de uma tarefa comercial de follow-up para um lead clínico chamado "${leadName || 'Paciente'}" com o objetivo "${formData.title || formData.category}". Máximo 25 palavras.`;
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });
      
      const data = await response.json();
      if (data.text) {
        setFormData(prev => ({ ...prev, description: data.text.trim() }));
        addToast('Sugestão gerada pela IA!', 'info');
      }
    } catch (error) {
      console.error('AI Suggestion Error:', error);
      addToast('Erro ao gerar sugestão.', 'error');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      addToast('Por favor, informe um título para a tarefa.', 'error');
      return;
    }

    if (editingTask && onUpdateTask) {
      setLoading(true);
      onUpdateTask({
        ...editingTask,
        title: formData.title.trim(),
        description: formData.description,
        dueDate: formData.dueDate,
        priority: formData.priority,
        responsible: formData.responsible,
        responsibleId: formData.responsibleId || undefined
      });
      setLoading(false);
      onClose();
      return;
    }

    setLoading(true);
    const newTask = {
      id: 'task_' + Date.now().toString(36),
      leadId,
      leadName,
      ...formData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (onAddTask) {
      onAddTask(newTask);
    } else {
      try {
        const saved = localStorage.getItem('crm_tasks_data');
        const list = saved ? JSON.parse(saved) : [];
        list.unshift(newTask);
        localStorage.setItem('crm_tasks_data', JSON.stringify(list));
      } catch (err) {
        console.error(err);
      }
    }

    setTimeout(() => {
      addToast('Tarefa criada com sucesso!', 'success');
      setLoading(false);
      onClose();
      setFormData({ 
        title: '', 
        description: '', 
        dueDate: new Date().toISOString().split('T')[0], 
        priority: 'medium', 
        category: 'WhatsApp Follow-up',
        responsible: user?.name || '',
        responsibleId: user?.id || ''
      });
    }, 400);
  };

  if (!isOpen) return null;

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
          className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                <CheckSquare size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{isEditing ? 'Editar Tarefa' : 'Criar Tarefa Comercial'}</h2>
                {leadName ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Vinculada ao lead: <strong className="text-blue-600 dark:text-blue-400">{leadName}</strong>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Defina prazos e ações de follow-up para a equipe.
                  </p>
                )}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-4">
            {/* Quick Category Suggestions */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">
                Modelos Rápidos de Tarefa:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = formData.category === cat.label;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => handleSelectQuickCategory(cat)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 text-xs font-semibold ${
                        isSelected
                          ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-400 text-orange-700 dark:text-orange-300'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Icon size={14} className={isSelected ? 'text-orange-600' : 'text-slate-400'} />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                Título da Tarefa *
              </label>
              <input
                required
                type="text"
                placeholder="Ex: Enviar lembrete de avaliação via WhatsApp..."
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              />
            </div>

            {/* Description with AI Assistant */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                  Detalhes / Instruções
                </label>
                <button 
                  type="button"
                  onClick={suggestDescription}
                  disabled={isSuggesting}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50 transition-opacity cursor-pointer"
                >
                  {isSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-amber-500" />}
                  <span>Gerar com IA</span>
                </button>
              </div>
              <textarea
                rows={3}
                placeholder="Descreva o contexto ou ação necessária..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white resize-none"
              />
            </div>

            {/* Date & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                  Prazo Limite *
                </label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  />
                </div>
                {/* Relative dates chips */}
                <div className="flex gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setRelativeDate(0)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelativeDate(1)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    Amanhã
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelativeDate(3)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    +3 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelativeDate(7)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    +7 dias
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                  Prioridade
                </label>
                <div className="relative">
                  <Flag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  >
                    <option value="low">Baixa Prioridade</option>
                    <option value="medium">Média Prioridade</option>
                    <option value="high">Alta Prioridade</option>
                    <option value="urgent">Urgente (Hoje)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Responsible */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                Responsável pela tarefa
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={formData.responsibleId || formData.responsible}
                  onChange={e => {
                    const m = members.find(x => (x.id || x.name) === e.target.value);
                    setFormData({ ...formData, responsible: m?.name || e.target.value, responsibleId: m?.id || '' });
                  }}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                >
                  {formData.responsible && !members.some(m => (m.id || m.name) === (formData.responsibleId || formData.responsible)) && (
                    <option value={formData.responsibleId || formData.responsible}>{formData.responsible}</option>
                  )}
                  {members.map(m => (
                    <option key={m.id || m.name} value={m.id || m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-400 ml-1">A tarefa aparece no painel de quem for escolhido, com lembrete perto do vencimento.</p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
                <span>{isEditing ? 'Salvar alterações' : 'Salvar Tarefa'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
