import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  AlertCircle,
  CheckCircle2,
  Building2,
  Trash2,
  X,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { exportToCSV } from '@/src/lib/exportUtils';
import { Card } from '@/src/components/ui/Card';

import { INITIAL_FOLLOWUPS } from '@/src/lib/mockData';

interface FollowUp {
  id: string;
  patientName: string;
  clinic: string;
  type: 'WhatsApp' | 'Phone' | 'Email';
  reason: string;
  responsible: string;
  lastInteraction: string;
  nextAction: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'new' | 'contacting' | 'waiting' | 'scheduled' | 'completed' | 'lost';
}

export default function FollowUpWorkspace() {
  const { clinics, user, addToast } = useApp();
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClinic, setSelectedClinic] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [followUps, setFollowUps] = useState<FollowUp[]>(() => {
    try {
      const saved = localStorage.getItem('crm_followups_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_FOLLOWUPS as FollowUp[];
  });

  const [newFollowUp, setNewFollowUp] = useState({
    patientName: '',
    clinic: clinics[0]?.name || 'Unidade Principal',
    type: 'WhatsApp' as 'WhatsApp' | 'Phone' | 'Email',
    reason: 'Confirmação de Agendamento',
    responsible: user?.name || 'Recepção / CRC',
    nextAction: 'Entrar em contato para confirmar horário',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'new' as const
  });

  const saveFollowUps = (updated: FollowUp[]) => {
    setFollowUps(updated);
    try {
      localStorage.setItem('crm_followups_data', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFollowUp.patientName.trim()) {
      addToast('Informe o nome do paciente para o follow-up', 'error');
      return;
    }

    const item: FollowUp = {
      id: String(Date.now()),
      patientName: newFollowUp.patientName.trim(),
      clinic: newFollowUp.clinic,
      type: newFollowUp.type,
      reason: newFollowUp.reason,
      responsible: newFollowUp.responsible,
      lastInteraction: 'Criado agora',
      nextAction: newFollowUp.nextAction,
      dueDate: newFollowUp.dueDate,
      priority: newFollowUp.priority,
      status: newFollowUp.status
    };

    saveFollowUps([item, ...followUps]);
    setIsNewModalOpen(false);
    setNewFollowUp({
      patientName: '',
      clinic: clinics[0]?.name || 'Unidade Principal',
      type: 'WhatsApp',
      reason: 'Confirmação de Agendamento',
      responsible: user?.name || 'Recepção / CRC',
      nextAction: 'Entrar em contato para confirmar horário',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      priority: 'medium',
      status: 'new'
    });
    addToast(`Follow-up para "${item.patientName}" criado com sucesso!`, 'success');
  };

  const handleDeleteFollowUp = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = followUps.filter(f => f.id !== id);
    saveFollowUps(updated);
    if (selectedFollowUp?.id === id) setSelectedFollowUp(null);
    addToast('Follow-up removido.', 'info');
  };

  const handleUpdateStatus = (id: string, newStatus: FollowUp['status']) => {
    const updated = followUps.map(f => f.id === id ? { ...f, status: newStatus } : f);
    saveFollowUps(updated);
    if (selectedFollowUp?.id === id) {
      setSelectedFollowUp({ ...selectedFollowUp, status: newStatus });
    }
    addToast('Status do follow-up atualizado!', 'success');
  };

  const filteredFollowUps = followUps.filter(f => {
    const matchesSearch = f.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.responsible.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClinic = selectedClinic === 'all' || f.clinic === selectedClinic;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'today' && f.dueDate === new Date().toISOString().split('T')[0]) ||
      (statusFilter === 'pending' && f.status !== 'completed');
    return matchesSearch && matchesClinic && matchesStatus;
  });

  const columns = [
    { id: 'new', label: 'Novos', color: 'bg-blue-500' },
    { id: 'contacting', label: 'Em Contato', color: 'bg-amber-500' },
    { id: 'waiting', label: 'Aguardando', color: 'bg-indigo-500' },
    { id: 'scheduled', label: 'Agendados', color: 'bg-emerald-500' },
    { id: 'completed', label: 'Finalizados', color: 'bg-slate-500' },
  ];

  const handleExportFollowUps = () => {
    if (followUps.length === 0) {
      addToast('Não há follow-ups para exportar.', 'info');
      return;
    }
    const dataToExport = followUps.map(f => ({
      Paciente: f.patientName,
      Clinica: f.clinic,
      Canal: f.type,
      Motivo: f.reason,
      Responsavel: f.responsible,
      ProximaAcao: f.nextAction,
      DataVencimento: f.dueDate,
      Prioridade: f.priority === 'high' ? 'Alta' : f.priority === 'medium' ? 'Média' : 'Baixa',
      Status: f.status
    }));
    exportToCSV(dataToExport, 'followups_crm');
    addToast('Follow-ups exportados com sucesso!', 'success');
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            Follow-up Operacional
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Acompanhamento contínuo de contatos, retornos e confirmações de orçamento.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportFollowUps}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            title="Exportar follow-ups para CSV"
          >
            <span>Exportar CSV</span>
          </button>
          <button 
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Novo Follow-up</span>
          </button>
        </div>
      </div>

      {/* Filters Bar with Pill Tabs in bg-sunken */}
      <Card className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-faint)]" />
            <input 
              type="text" 
              placeholder="Buscar por paciente, responsável ou motivo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] focus:border-[var(--color-primary-blue)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-faint)] outline-none transition-all w-full sm:w-64"
            />
          </div>

          {/* Pill Tabs Container */}
          <div className="bg-[var(--color-surface-sunken)] p-1 rounded-[var(--radius-control)] border border-[var(--color-border-default)] inline-flex items-center gap-1 overflow-x-auto max-w-full custom-scrollbar">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'today', label: 'Hoje' },
              { id: 'pending', label: 'Pendentes' }
            ].map(tab => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                    isActive
                      ? "bg-[var(--color-primary-blue)] !text-white shadow-xs"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <select 
            value={selectedClinic}
            onChange={e => setSelectedClinic(e.target.value)}
            className="bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] px-3 py-1.5 text-xs font-bold text-[var(--color-text-primary)] outline-none cursor-pointer"
          >
            <option value="all">Todas as Clínicas</option>
            {clinics.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="text-xs font-medium text-[var(--color-text-muted)] px-2">
          Exibindo <span className="font-bold text-[var(--color-text-primary)]">{filteredFollowUps.length}</span> follow-up(s)
        </div>
      </Card>

      {/* Pipeline View */}
      {filteredFollowUps.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-12 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 size={20} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Nenhum follow-up cadastrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            Sua fila operacional está limpa. Crie um novo follow-up para acompanhar orçamentos, pós-operatório ou retorno.
          </p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus size={15} />
            Criar Primeiro Follow-up
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-6 min-w-[1200px]">
            {columns.map((column) => {
              const colItems = filteredFollowUps.filter(f => f.status === column.id);
              return (
                <div key={column.id} className="flex-1 min-w-[280px]">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", column.color)} />
                      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {column.label}
                      </h3>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">
                        {colItems.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {colItems.length === 0 ? (
                      <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                        <p className="text-xs text-slate-400">Vazio</p>
                      </div>
                    ) : (
                      colItems.map((followUp) => (
                        <div
                          key={followUp.id}
                          onClick={() => setSelectedFollowUp(followUp)}
                          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 group"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">
                                {followUp.patientName}
                              </h4>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Building2 size={10} />
                                {followUp.clinic}
                              </p>
                            </div>
                            <span className={cn(
                              "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                              followUp.priority === 'high' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30' :
                              followUp.priority === 'medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-800'
                            )}>
                              {followUp.priority}
                            </span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl space-y-1">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">
                              {followUp.reason}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                              {followUp.nextAction}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {followUp.dueDate}
                            </span>
                            <button
                              onClick={(e) => handleDeleteFollowUp(followUp.id, e)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all p-1"
                              title="Remover"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Follow-up Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Plus size={18} className="text-blue-600" />
                Novo Follow-up
              </h3>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFollowUp} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nome do Paciente / Lead</label>
                <input 
                  type="text" 
                  placeholder="Ex: João Silva"
                  value={newFollowUp.patientName}
                  onChange={e => setNewFollowUp({ ...newFollowUp, patientName: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Unidade</label>
                  <select 
                    value={newFollowUp.clinic}
                    onChange={e => setNewFollowUp({ ...newFollowUp, clinic: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  >
                    {clinics.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Canal</label>
                  <select 
                    value={newFollowUp.type}
                    onChange={e => setNewFollowUp({ ...newFollowUp, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Phone">Telefone</option>
                    <option value="Email">E-mail</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Motivo do Contato</label>
                <input 
                  type="text" 
                  placeholder="Ex: Confirmação de consulta, pós-operatório..."
                  value={newFollowUp.reason}
                  onChange={e => setNewFollowUp({ ...newFollowUp, reason: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Próxima Ação</label>
                <textarea 
                  placeholder="Ex: Ligar para confirmar presença e repassar orientações de jejum..."
                  value={newFollowUp.nextAction}
                  onChange={e => setNewFollowUp({ ...newFollowUp, nextAction: e.target.value })}
                  required
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Data Limite</label>
                  <input 
                    type="date" 
                    value={newFollowUp.dueDate}
                    onChange={e => setNewFollowUp({ ...newFollowUp, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Prioridade</label>
                  <select 
                    value={newFollowUp.priority}
                    onChange={e => setNewFollowUp({ ...newFollowUp, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta / Urgente</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Salvar Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Detail Modal */}
      {selectedFollowUp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedFollowUp.patientName}</h3>
                <p className="text-xs text-slate-400">{selectedFollowUp.clinic} • {selectedFollowUp.type}</p>
              </div>
              <button 
                onClick={() => setSelectedFollowUp(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Motivo</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{selectedFollowUp.reason}</p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-blue-500">Próxima Ação</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{selectedFollowUp.nextAction}</p>
                <p className="text-[10px] text-slate-400 mt-1">Data Limite: {selectedFollowUp.dueDate}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Mover para Fase</span>
                <div className="grid grid-cols-3 gap-2">
                  {columns.map(col => (
                    <button
                      key={col.id}
                      onClick={() => handleUpdateStatus(selectedFollowUp.id, col.id as any)}
                      className={cn(
                        "py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer",
                        selectedFollowUp.status === col.id 
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      )}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleDeleteFollowUp(selectedFollowUp.id)}
                className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
              >
                Excluir
              </button>
              <button
                onClick={() => setSelectedFollowUp(null)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
