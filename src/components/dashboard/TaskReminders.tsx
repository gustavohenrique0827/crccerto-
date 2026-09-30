import React, { useMemo, useState } from 'react';
import { AlarmClock, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTasks, dueState, CrmTask, DueState } from '../../lib/tasksStore';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';
import { Role } from '../../types';

const LABEL: Record<DueState, string> = {
  overdue: 'Atrasada',
  today: 'Vence hoje',
  tomorrow: 'Vence amanhã',
  soon: 'Vence em breve',
  later: '',
  none: ''
};

const TONE: Record<DueState, string> = {
  overdue: 'text-[var(--color-danger)] bg-[var(--color-danger)]/10 border-[var(--color-danger)]/25',
  today: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/25',
  tomorrow: 'text-[var(--color-primary-blue)] bg-[var(--color-primary-blue)]/10 border-[var(--color-primary-blue)]/25',
  soon: 'text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] border-[var(--color-border-default)]',
  later: '',
  none: ''
};

const ORDER: Record<DueState, number> = { overdue: 0, today: 1, tomorrow: 2, soon: 3, later: 4, none: 5 };

const fmtDate = (d: string) => d.slice(0, 10).split('-').reverse().join('/');

export default function TaskReminders() {
  const { user, setActiveTab } = useApp();
  const { tasks } = useTasks();
  const canSeeTeam = user?.role === Role.SUPER_ADMIN || user?.role === Role.CRC_MANAGER;
  const [scope, setScope] = useState<'mine' | 'team'>('mine');

  const isMine = (t: CrmTask) =>
    Boolean(user) && ((t.responsibleId && t.responsibleId === user!.id) || (!t.responsibleId && t.responsible && t.responsible.trim().toLowerCase() === user!.name.trim().toLowerCase()));

  const due = useMemo(() => {
    return tasks
      .filter(t => (scope === 'team' && canSeeTeam ? true : isMine(t)))
      .map(t => ({ task: t, state: dueState(t) }))
      .filter(x => x.state !== 'none' && x.state !== 'later')
      .sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.task.dueDate.localeCompare(b.task.dueDate));
  }, [tasks, scope, user?.id]);

  const overdue = due.filter(x => x.state === 'overdue').length;

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          {overdue > 0 ? <AlertTriangle size={16} className="text-[var(--color-danger)]" /> : <AlarmClock size={16} className="text-[var(--color-primary-blue)]" />}
          <h2 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)]">
            {scope === 'team' && canSeeTeam ? 'Tarefas da equipe perto do vencimento' : 'Minhas tarefas perto do vencimento'}
          </h2>
          {due.length > 0 && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)]">{due.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canSeeTeam && (
            <div className="inline-flex rounded-[var(--radius-control)] border border-[var(--color-border-default)] overflow-hidden text-[10px] font-bold">
              {(['mine', 'team'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={cn('px-2.5 py-1 cursor-pointer', scope === s ? 'bg-[var(--color-primary-blue)] text-white' : 'text-[var(--color-text-muted)]')}
                >
                  {s === 'mine' ? 'Minhas' : 'Equipe'}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setActiveTab('tasks')} className="text-[11px] font-bold text-[var(--color-primary-blue)] hover:underline flex items-center gap-0.5 cursor-pointer">
            Ver todas <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {due.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
          <CheckCircle2 size={14} className="text-[var(--color-success)]" />
          Nenhuma tarefa atrasada ou perto de vencer. Tudo em dia.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border-subtle)]">
          {due.slice(0, 6).map(({ task, state }) => (
            <li key={task.id} onClick={() => setActiveTab('tasks')} className="py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--color-surface-sunken)]/50 px-1 rounded">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{task.title}</p>
                <p className="text-[10px] text-[var(--color-text-faint)] truncate">
                  {task.responsible || 'Sem responsável'} · prazo {fmtDate(task.dueDate)}
                  {task.patientName ? ` · ${task.patientName}` : ''}
                </p>
              </div>
              <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0', TONE[state])}>{LABEL[state]}</span>
            </li>
          ))}
        </ul>
      )}
      {due.length > 6 && <p className="text-[10px] text-[var(--color-text-faint)]">+ {due.length - 6} outras tarefas com prazo próximo</p>}
    </Card>
  );
}
