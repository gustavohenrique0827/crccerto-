import { useState, useEffect, useCallback } from 'react';
import { getSupabase, isSupabaseConfigured, isUuid, fetchProfilesFromDb } from './supabase';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'completed' | 'cancelled';

export interface CrmTask {
  id: string;
  title: string;
  description: string;
  responsible: string;
  responsibleId?: string;
  clinic: string;
  clinicId?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD
  patientName?: string;
  leadId?: string;
}

const KEY = 'crm_tasks_data';

const readLocal = (): CrmTask[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map((t: any) => ({ ...t, status: t.status === 'pending' ? 'todo' : t.status, description: t.description || '', responsible: t.responsible || '' }))
      : [];
  } catch {
    return [];
  }
};

const writeLocal = (tasks: CrmTask[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(tasks));
  } catch {}
};

function rowToTask(r: any): CrmTask {
  return {
    id: r.id,
    title: r.title,
    description: r.description || '',
    responsible: r.responsible_name || '',
    responsibleId: r.assigned_to || undefined,
    clinic: r.clinic?.name || '',
    clinicId: r.clinic_id,
    priority: r.priority || 'medium',
    status: r.status || 'todo',
    dueDate: r.due_date ? String(r.due_date).slice(0, 10) : '',
    patientName: r.patient_name || undefined,
    leadId: r.lead_id || undefined
  };
}

function taskToRow(t: CrmTask, createdBy?: string): Record<string, any> {
  return {
    id: t.id,
    clinic_id: t.clinicId,
    title: t.title,
    description: t.description || null,
    assigned_to: isUuid(t.responsibleId) ? t.responsibleId : null,
    responsible_name: t.responsible || null,
    patient_name: t.patientName || null,
    lead_id: isUuid(t.leadId) ? t.leadId : null,
    priority: t.priority,
    status: t.status,
    due_date: t.dueDate ? `${t.dueDate}T12:00:00Z` : null,
    completed_at: t.status === 'completed' ? new Date().toISOString() : null,
    created_by: isUuid(createdBy) ? createdBy : null
  };
}

async function loadFromDb(): Promise<CrmTask[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('tasks').select('*, clinic:clinics(name)').order('due_date', { ascending: true, nullsFirst: false });
  if (error) {
    console.error('Erro ao carregar tarefas do Supabase:', error.message);
    return null;
  }
  return (data || []).map(rowToTask);
}

export async function saveTaskToDb(task: CrmTask, createdBy?: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return true;
  if (!isUuid(task.id) || !isUuid(task.clinicId)) {
    console.error('Tarefa sem id/clínica válidos para o Supabase:', task.id, task.clinicId);
    return false;
  }
  const { error } = await sb.from('tasks').upsert([taskToRow(task, createdBy)]);
  if (error) console.error('Erro ao salvar tarefa no Supabase:', error.message);
  return !error;
}

export async function deleteTaskFromDb(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !isUuid(id)) return true;
  const { error } = await sb.from('tasks').delete().eq('id', id);
  if (error) console.error('Erro ao excluir tarefa no Supabase:', error.message);
  return !error;
}

/** Lista de tarefas: banco quando o Supabase está ativo, localStorage caso contrário. */
export function useTasks() {
  const [tasks, setTasks] = useState<CrmTask[]>(() => (isSupabaseConfigured() ? [] : readLocal()));
  const [loading, setLoading] = useState(isSupabaseConfigured());

  const refresh = useCallback(async () => {
    const fromDb = await loadFromDb();
    if (fromDb) {
      setTasks(fromDb);
      writeLocal(fromDb);
    } else {
      setTasks(readLocal());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('crm_tasks_updated', refresh);
    return () => window.removeEventListener('crm_tasks_updated', refresh);
  }, [refresh]);

  /** Cria ou atualiza. Devolve false se o banco recusou (a UI mostra o erro). */
  const saveTask = useCallback(async (task: CrmTask, createdBy?: string): Promise<boolean> => {
    setTasks(prev => {
      const next = prev.some(t => t.id === task.id) ? prev.map(t => (t.id === task.id ? task : t)) : [task, ...prev];
      writeLocal(next);
      return next;
    });
    const ok = await saveTaskToDb(task, createdBy);
    if (!ok) refresh();
    window.dispatchEvent(new Event('crm_tasks_updated_local'));
    return ok;
  }, [refresh]);

  const removeTask = useCallback(async (id: string): Promise<boolean> => {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id);
      writeLocal(next);
      return next;
    });
    const ok = await deleteTaskFromDb(id);
    if (!ok) refresh();
    return ok;
  }, [refresh]);

  return { tasks, loading, saveTask, removeTask, refresh };
}

export interface AssignableMember { id?: string; name: string }

/** Quem pode receber tarefas: usuários do sistema (profiles) + equipe cadastrada localmente. */
export function useAssignableMembers(currentUser?: { id: string; name: string } | null) {
  const [members, setMembers] = useState<AssignableMember[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list: AssignableMember[] = [];
      const profiles = await fetchProfilesFromDb();
      (profiles || []).filter(p => p.isActive).forEach(p => list.push({ id: p.id, name: p.fullName }));
      try {
        const local = JSON.parse(localStorage.getItem('crm_team_members') || '[]');
        if (Array.isArray(local)) local.forEach((m: any) => m?.name && list.push({ name: m.name }));
      } catch {}
      if (currentUser && !list.some(m => m.id === currentUser.id)) list.unshift({ id: currentUser.id, name: currentUser.name });
      const seen = new Set<string>();
      const unique = list.filter(m => {
        const k = m.name.trim().toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      if (!cancelled) setMembers(unique);
    })();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  return members;
}

const isoDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export type DueState = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later' | 'none';

export function dueState(task: Pick<CrmTask, 'dueDate' | 'status'>): DueState {
  if (task.status === 'completed' || task.status === 'cancelled' || !task.dueDate) return 'none';
  const d = task.dueDate.slice(0, 10);
  if (d < isoDay(0)) return 'overdue';
  if (d === isoDay(0)) return 'today';
  if (d === isoDay(1)) return 'tomorrow';
  if (d <= isoDay(3)) return 'soon';
  return 'later';
}
