import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  MoreHorizontal,
  Layout,
  List as ListIcon,
  Calendar as CalendarIcon,
  User,
  Building2,
  Trash2,
  Circle,
  Activity,
  Check,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { exportToCSV } from '@/src/lib/exportUtils';
import TaskModal from '../dashboard/TaskModal';

import { useTasks, CrmTask, dueState } from '@/src/lib/tasksStore';
import { isSupabaseConfigured, newUuid } from '@/src/lib/supabase';

type Task = CrmTask;

export default function TaskWorkspace() {
  const { clinics, user, addToast, currentClinicId } = useApp();
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'pending' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { tasks, saveTask, removeTask } = useTasks();

  const persist = async (task: Task, okMessage: string) => {
    const ok = await saveTask(task, user?.id);
    if (ok) addToast(okMessage, 'success');
    else addToast('Não foi possível salvar a tarefa no banco de dados.', 'error');
  };

  const handleAddTask = (taskData: any) => {
    const targetClinic = clinics.find(c => c.id === currentClinicId) || clinics[0];
    const newTask: Task = {
      id: isSupabaseConfigured() ? newUuid() : String(Date.now()),
      title: taskData.title || 'Nova Tarefa',
      description: taskData.description || '',
      responsible: taskData.responsible || user?.name || 'Comercial',
      responsibleId: taskData.responsibleId || undefined,
      clinic: targetClinic?.name || 'Unidade Principal',
      clinicId: targetClinic?.id,
      priority: taskData.priority || 'medium',
      status: 'todo',
      dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
      patientName: taskData.leadName || undefined,
      leadId: taskData.leadId || undefined
    };
    persist(newTask, 'Tarefa criada com sucesso!');
  };

  const handleUpdateTask = (updated: Task) => {
    persist(updated, 'Tarefa atualizada.');
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleToggleTaskStatus = (id: string) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    persist({ ...t, status: t.status === 'completed' ? 'todo' : 'completed' }, t.status === 'completed' ? 'Tarefa reaberta.' : 'Tarefa concluída.');
  };

  const handleDeleteTask = async (id: string) => {
    const ok = await removeTask(id);
    addToast(ok ? 'Tarefa excluída.' : 'Não foi possível excluir a tarefa no banco de dados.', ok ? 'info' : 'error');
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.patientName && t.patientName.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeFilter === 'today') {
        return t.dueDate.includes(todayStr) || t.dueDate.toLowerCase().includes('hoje');
      }
      if (activeFilter === 'pending') {
        return t.status !== 'completed';
      }
      if (activeFilter === 'completed') {
        return t.status === 'completed';
      }

      return true;
    });
  }, [tasks, searchTerm, activeFilter, todayStr]);

  const stats = [
    { label: 'Hoje', count: tasks.filter(t => t.dueDate.includes(todayStr) || t.dueDate.toLowerCase().includes('hoje')).length, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Pendentes', count: tasks.filter(t => t.status === 'todo' || t.status === 'waiting').length, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/30' },
    { label: 'Em Progresso', count: tasks.filter(t => t.status === 'in_progress').length, icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    { label: 'Concluídas', count: tasks.filter(t => t.status === 'completed').length, icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  ];

  const handleExportTasks = () => {
    if (tasks.length === 0) {
      addToast('Não há tarefas para exportar.', 'info');
      return;
    }
    const dataToExport = tasks.map(t => ({
      Titulo: t.title,
      Descricao: t.description || '',
      Responsavel: t.responsible,
      Clinica: t.clinic,
      Prioridade: t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Média' : 'Baixa',
      Status: t.status === 'completed' ? 'Concluída' : t.status === 'in_progress' ? 'Em Progresso' : t.status === 'waiting' ? 'Aguardando' : 'A Fazer',
      DataVencimento: t.dueDate,
      Paciente: t.patientName || ''
    }));
    exportToCSV(dataToExport, 'tarefas_crm');
    addToast('Tarefas exportadas com sucesso!', 'success');
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-blue-600" />
            Tarefas & Pendências
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Organize e acompanhe as atividades operacionais da sua clínica.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportTasks}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            title="Exportar tarefas para CSV"
          >
            <span>Exportar CSV</span>
          </button>
          <button 
            onClick={() => setIsTaskModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Criar Tarefa</span>
          </button>
        </div>
      </div>

      {/* Task Dashboard Mini */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", stat.bg)}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{stat.label}</p>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{stat.count}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button 
            onClick={() => setView('list')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
              view === 'list' ? "bg-white dark:bg-slate-700 text-blue-600 font-semibold" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <ListIcon size={14} />
            <span>Lista</span>
          </button>
          <button 
            onClick={() => setView('kanban')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
              view === 'kanban' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Layout size={14} />
            <span>Kanban</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar tarefa..."
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all w-[200px]"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['all', 'today', 'pending', 'completed'] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setActiveFilter(filterKey)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer",
                  activeFilter === filterKey ? "bg-white dark:bg-slate-700 text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {filterKey === 'all' ? 'Todas' : filterKey === 'today' ? 'Hoje' : filterKey === 'pending' ? 'Pendentes' : 'Concluídas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
          <CheckSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhuma tarefa cadastrada</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Crie tarefas para gerenciar lembretes de contato, follow-ups e rotinas da recepção.
          </p>
          <button 
            onClick={() => setIsTaskModalOpen(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus size={14} />
            Criar Primeira Tarefa
          </button>
        </div>
      ) : view === 'list' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-12"></th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarefa</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Responsável</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidade</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencimento</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prioridade</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleToggleTaskStatus(task.id)}
                        className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer",
                          task.status === 'completed'
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 dark:border-slate-600 hover:border-blue-500"
                        )}
                      >
                        {task.status === 'completed' && <Check size={12} strokeWidth={3} />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className={cn(
                          "text-sm font-bold text-slate-800 dark:text-white leading-tight",
                          task.status === 'completed' && "line-through text-slate-400 dark:text-slate-500"
                        )}>
                          {task.title}
                        </p>
                        {task.patientName && (
                          <p className="text-[10px] text-blue-500 font-bold mt-1 uppercase tracking-tighter">Paciente: {task.patientName}</p>
                        )}
                        {task.description && (
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{task.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                          <User size={12} />
                        </div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{task.responsible}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500">{task.clinic}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {task.dueDate}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                        task.priority === 'high' ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-800" :
                        task.priority === 'medium' ? "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/40 dark:border-amber-800" : "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:border-blue-800"
                      )}>
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-0.5">
                        <button 
                          onClick={() => openEdit(task)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                          title="Editar tarefa"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Excluir tarefa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(['todo', 'in_progress', 'waiting', 'completed'] as const).map((status) => (
            <div key={status} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                   {status === 'todo' ? 'A Fazer' : status === 'in_progress' ? 'Em Progresso' : status === 'waiting' ? 'Aguardando' : 'Concluído'}
                 </h3>
                 <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                    {tasks.filter(t => t.status === status).length}
                 </span>
              </div>
              <div className="space-y-3 min-h-[300px]">
                {tasks.filter(t => t.status === status).map((task) => (
                  <div key={task.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-2">
                       <span className={cn(
                         "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                         task.priority === 'high' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                       )}>
                         {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                       </span>
                       <div className="flex items-center gap-1.5">
                         <button
                           onClick={() => openEdit(task)}
                           className="text-slate-300 hover:text-blue-500 transition-colors cursor-pointer"
                           title="Editar"
                         >
                           <Pencil size={14} />
                         </button>
                         <button 
                           onClick={() => handleDeleteTask(task.id)}
                           className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                           title="Excluir"
                         >
                           <Trash2 size={14} />
                         </button>
                       </div>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 leading-snug">{task.title}</h4>
                    {task.description && (
                      <p className="text-[10px] text-slate-500 line-clamp-2 mb-3">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800 mt-2">
                       <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase">
                          <Clock size={10} />
                          <span>{task.dueDate}</span>
                       </div>
                       <button 
                         onClick={() => handleToggleTaskStatus(task.id)}
                         className={cn(
                           "text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer",
                           task.status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600"
                         )}
                       >
                         {task.status === 'completed' ? 'Concluída' : 'Concluir'}
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
        onAddTask={handleAddTask}
        editingTask={editingTask}
        onUpdateTask={handleUpdateTask}
      />
    </div>
  );
}
