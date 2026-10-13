import React, { useMemo, useState } from 'react';
import { MessageCircle, UserX, CalendarClock, PhoneCall, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useClinicDataset, statusBucket, phoneDigits } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export type Kind = 'missed' | 'rebook' | 'confirm';
export interface Suggestion { key: string; kind: Kind; patient: string; phone: string; date: string; time: string; professional: string; reason: string; tag?: string }

export const KIND = {
  missed: { label: 'Recuperar falta', icon: UserX, tone: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900' },
  rebook: { label: 'Reagendar', icon: CalendarClock, tone: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900' },
  confirm: { label: 'Confirmar presença', icon: PhoneCall, tone: 'text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900' }
} as const;

const dayStr = (offset: number) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const br = (ymd: string) => ymd.split('-').reverse().slice(0, 2).join('/');

export function buildSuggestions(appointments: any[]): Suggestion[] {
    const today = dayStr(0), from = dayStr(-14), soon = dayStr(2);
    const nowHM = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    // consulta de hoje que já passou do horário não é mais "para confirmar"
    const upcoming = (a: any) => a.date > today || (a.date === today && String(a.time) > nowHM);
    const tagNames = (a: any) => (a.tags || []).map((t: any) => String(t.name || '').toLowerCase());
    const out = new Map<string, Suggestion>();
    // Quem já tem consulta marcada daqui para frente não precisa de reagendamento
    const hasFuture = new Set(appointments.filter(a => upcoming(a) && statusBucket(a.status) !== 'cancelled').map(a => phoneDigits(a.phone).slice(-8) || a.patient));
    const key = (a: any) => phoneDigits(a.phone).slice(-8) || a.patient;

    appointments.forEach((a: any) => {
      const tags = tagNames(a);
      const base = { patient: a.patient, phone: a.phone || '', date: a.date, time: a.time, professional: a.professional || '' };
      const bucket = statusBucket(a.status);
      if (a.date >= from && a.date <= today && bucket === 'missed' && !hasFuture.has(key(a))) {
        out.set(`m_${a.id}`, { key: `m_${a.id}`, kind: 'missed', reason: 'Faltou e não tem nova consulta marcada', ...base });
      } else if (a.date >= from && !hasFuture.has(key(a)) && tags.some((t: string) => /cancel|remarcar|reagend/.test(t)) && bucket !== 'attended') {
        const tag = (a.tags || []).find((t: any) => /cancel|remarcar|reagend/i.test(t.name))?.name;
        out.set(`r_${a.id}`, { key: `r_${a.id}`, kind: 'rebook', reason: `Etiqueta “${tag}” e sem nova consulta`, tag, ...base });
      } else if (upcoming(a) && a.date <= soon && bucket === 'pending' && !tags.some((t: string) => /confirmad/.test(t))) {
        out.set(`c_${a.id}`, { key: `c_${a.id}`, kind: 'confirm', reason: 'Consulta nos próximos 2 dias ainda sem confirmação', ...base });
      }
    });
    // um item por paciente (o mais recente)
    const byPatient = new Map<string, Suggestion>();
    [...out.values()].sort((x, y) => y.date.localeCompare(x.date)).forEach(s => { const k = phoneDigits(s.phone).slice(-8) || s.patient; if (!byPatient.has(k)) byPatient.set(k, s); });
    return [...byPatient.values()].sort((x, y) => (x.kind === 'confirm' ? 0 : 1) - (y.kind === 'confirm' ? 0 : 1) || x.date.localeCompare(y.date));
}

export const suggestionWhatsApp = (s: Suggestion) => {
  const d = phoneDigits(s.phone);
  if (!d) return undefined;
  const num = d.startsWith('55') ? d : `55${d}`;
  const msg = s.kind === 'confirm'
    ? `Olá ${s.patient.split(' ')[0]}, tudo bem? Passando para confirmar sua consulta em ${br(s.date)} às ${s.time}. Podemos confirmar?`
    : `Olá ${s.patient.split(' ')[0]}, tudo bem? Aqui é da clínica. Vamos encontrar um novo horário para a sua consulta?`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
};

/** Fila de follow-up gerada sozinha a partir da agenda do Clinicorp. */
export default function ClinicorpSuggestions() {
  const { currentClinicId } = useApp();
  const { appointments, loading } = useClinicDataset(currentClinicId);
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState<'all' | Kind>('all');

  const items = useMemo<Suggestion[]>(() => buildSuggestions(appointments), [appointments]);

  const shown = items.filter(i => filter === 'all' || i.kind === filter);
  const count = (k: Kind) => items.filter(i => i.kind === k).length;
  if (loading || items.length === 0) return null;

  const wa = suggestionWhatsApp;

  return (
    <section className="bg-[var(--color-surface-elevated)] rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)] overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 px-4 py-3 cursor-pointer text-left">
        <div>
          <h2 className="text-sm font-black text-[var(--color-text-primary)]">Sugeridos pela agenda do Clinicorp <span className="ml-1 text-[var(--color-primary-blue)]">{items.length}</span></h2>
          <p className="text-xs text-[var(--color-text-muted)]">Faltas, cancelamentos e consultas sem confirmação, gerados sozinhos.</p>
        </div>
        <ChevronDown size={16} className={cn('text-[var(--color-text-faint)] transition-transform', !open && '-rotate-90')} />
      </button>

      {open && (
        <div className="border-t border-[var(--color-border-subtle)]">
          <div className="flex flex-wrap gap-1.5 px-4 py-2.5">
            {([['all', `Todos (${items.length})`], ['confirm', `Confirmar (${count('confirm')})`], ['missed', `Faltas (${count('missed')})`], ['rebook', `Reagendar (${count('rebook')})`]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id as any)} className={cn('px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer', filter === id ? 'bg-[var(--color-primary-blue)] text-white border-transparent' : 'border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)]')}>{label}</button>
            ))}
          </div>
          <ul className="divide-y divide-[var(--color-border-subtle)] max-h-80 overflow-y-auto custom-scrollbar">
            {shown.slice(0, 60).map(s => {
              const K = KIND[s.kind]; const Icon = K.icon; const link = wa(s);
              return (
                <li key={s.key} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={cn('flex items-center gap-1 px-2 py-1 rounded-lg border text-[10.5px] font-bold shrink-0 w-36', K.tone)}><Icon size={12} />{K.label}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{s.patient}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{s.reason} · {br(s.date)} {s.time}{s.professional ? ` · ${s.professional.split(' ')[0]}` : ''}</p>
                  </div>
                  {link ? (
                    <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0"><MessageCircle size={13} />WhatsApp</a>
                  ) : <span className="text-[11px] text-[var(--color-text-faint)] shrink-0">sem telefone</span>}
                </li>
              );
            })}
          </ul>
          {shown.length > 60 && <p className="px-4 py-2 text-[11px] text-[var(--color-text-faint)]">Mostrando 60 de {shown.length}.</p>}
        </div>
      )}
    </section>
  );
}
