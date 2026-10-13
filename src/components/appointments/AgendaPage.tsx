import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Check, ChevronLeft, ChevronRight, Clock, Home, MessageCircle, Phone, Plus, Search, Stethoscope, User, X, XCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/utils';
import ScheduleModal from './ScheduleModal';
import { detectAppointmentConflicts } from '../../lib/calendarConflicts';
import { BOOKING_PROFESSIONAL } from '../../lib/bookingRule';
import { fetchAppointmentsFromDb, isSupabaseConfigured, saveAppointmentsToDb, statusBucket, formatPhoneBR } from '../../lib/supabase';

type Apt = {
  id: string; patient: string; phone?: string; date: string; time: string; duration: number; procedure: string;
  status: string; clinicId?: string; clinicName?: string; professional?: string; notes?: string;
  kind?: 'appointment' | 'blocked'; category?: string; tags?: { name: string; color?: string | null }[];
  bookedBy?: string; bookedAt?: string;
};
type ViewMode = 'day' | 'week' | 'month' | 'list';

const TYPES = {
  consulta: { label: 'Consulta', color: '#5ec5f5' },
  avaliacao: { label: 'Avaliação', color: '#fdd36a' },
  retorno: { label: 'Retorno', color: '#6fe0a8' },
  procedimento: { label: 'Procedimento', color: '#ff7a95' },
  cirurgia: { label: 'Cirurgia', color: '#b79cf5' }
} as const;
type TypeKey = keyof typeof TYPES;

/** O Clinicorp não manda "tipo": deduzimos pela categoria/procedimento. */
function typeOf(a: Apt): TypeKey {
  const t = `${a.category || ''} ${a.procedure || ''}`.toLowerCase();
  if (/cirurg|implante|extra[cç]/.test(t)) return 'cirurgia';
  if (/avalia/.test(t)) return 'avaliacao';
  if (/retorno|follow|manuten|revis/.test(t)) return 'retorno';
  if (/procedim|molde|limpeza|clareamento|restaura|canal|faceta|lente|botox|harmoniza|est[eé]tic|ortod|aparelho/.test(t)) return 'procedimento';
  return 'consulta';
}

const ROW = 40; // altura de 15 minutos: cards de 30 min já têm 80px e mostram tudo
const LANE_MIN = 210; // largura mínima de cada card quando há atendimentos simultâneos
const DAY_START = 7;
const DAY_END = 21;
const WEEKDAYS = ['DOM.', 'SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.'];
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const toMin = (t: string) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const norm = (s?: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isMain = (s?: string) => norm(s).includes(BOOKING_PROFESSIONAL);

const STATUS_LABEL: Record<string, string> = { attended: 'Atendido', confirmed: 'Confirmado', missed: 'Faltou', cancelled: 'Cancelado', pending: 'Pendente' };

type Placed = { apt: Apt; start: number; end: number; lane: number; lanes: number };
/** Distribui compromissos simultâneos lado a lado. */
function layout(items: Apt[]): Placed[] {
  const sorted = [...items].sort((a, b) => toMin(a.time) - toMin(b.time) || b.duration - a.duration);
  const out: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map(c => c.lane + 1));
    cluster.forEach(c => { c.lanes = lanes; });
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
  };
  for (const apt of sorted) {
    const start = toMin(apt.time);
    const end = start + Math.max(apt.duration || 30, 15);
    if (cluster.length && start >= clusterEnd) flush();
    let lane = laneEnds.findIndex(e => e <= start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end); } else laneEnds[lane] = end;
    cluster.push({ apt, start, end, lane, lanes: 1 });
    clusterEnd = cluster.length === 1 ? end : Math.max(clusterEnd, end);
  }
  if (cluster.length) flush();
  return out;
}

function StatusIcon({ apt, conflict, size = 16 }: { apt: Apt; conflict?: boolean; size?: number }) {
  const b = statusBucket(apt.status);
  if (conflict) return <AlertTriangle size={size} className="text-rose-700" strokeWidth={2.5} />;
  if (b === 'missed' || b === 'cancelled') return <XCircle size={size} className="text-rose-700" strokeWidth={2.5} />;
  if (b === 'attended' || b === 'confirmed') return <Check size={size + 1} className="text-emerald-800" strokeWidth={3.5} />;
  return <Clock size={size} className="text-amber-800" strokeWidth={2.5} />;
}

/** Card da agenda: mostra tudo que cabe na altura (horário, status, nome, tipo, profissional, telefone, etiquetas). */
function AptCard({ p, conflict, conflictNames, showPro, onOpen }: {
  key?: React.Key; p: Placed; conflict: boolean; conflictNames: string; showPro: boolean; onOpen: () => void;
}) {
  const { apt, start, end } = p;
  const bucket = statusBucket(apt.status);
  const cancelled = bucket === 'cancelled';
  const bg = cancelled ? '#cbd5e1' : TYPES[typeOf(apt)].color;
  const height = ((end - start) / 15) * ROW - 4;
  const range = `${apt.time} – ${toTime(end)}`;
  const kind = apt.category || apt.procedure;
  const tags = (apt.tags || []).filter(t => t.name);

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      title={`${range} · ${apt.patient} · ${kind || ''}${apt.professional ? ` · ${apt.professional}` : ''}`}
      className={cn('agenda-card absolute text-left rounded-xl overflow-hidden text-slate-900 shadow-sm hover:shadow-xl hover:z-30 transition-shadow cursor-pointer border border-black/10', conflict && 'ring-2 ring-rose-500')}
      style={{
        top: 0, height: Math.max(height, 36),
        left: `calc(${(p.lane * 100) / p.lanes}% + 3px)`, width: `calc(${100 / p.lanes}% - 6px)`,
        background: bg, zIndex: 2
      }}
    >
      <div className="h-full px-2.5 py-1.5 flex flex-col gap-0.5">
        {height < 56 ? (
          <div className="flex items-center gap-2 h-full">
            <span className="text-[12px] font-semibold opacity-80 shrink-0">{apt.time}</span>
            <span className={cn('text-[14px] font-extrabold leading-tight break-words', cancelled && 'line-through')}>{apt.patient}</span>
            <span className="ml-auto shrink-0"><StatusIcon apt={apt} conflict={conflict} /></span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-bold opacity-85">{range}</span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/55 text-[10.5px] font-bold shrink-0">
                <StatusIcon apt={apt} conflict={conflict} size={13} />{conflict ? 'Conflito' : STATUS_LABEL[bucket]}
              </span>
            </div>
            <span className={cn('text-[15px] font-extrabold leading-tight break-words', cancelled && 'line-through')}>{apt.patient}</span>
            {kind && <span className="text-[12px] font-semibold opacity-80 leading-tight break-words">{kind}{apt.procedure && apt.category && apt.procedure !== apt.category ? ` · ${apt.procedure}` : ''}</span>}
            {height >= 100 && showPro && apt.professional && (
              <span className="flex items-center gap-1.5 text-[11.5px] opacity-80 leading-tight"><Stethoscope size={12} className="shrink-0" />{apt.professional}</span>
            )}
            {height >= 120 && apt.phone && (
              <span className="flex items-center gap-1.5 text-[11.5px] opacity-80 leading-tight"><Phone size={12} className="shrink-0" />{formatPhoneBR(apt.phone)}</span>
            )}
            {height >= 150 && tags.length > 0 && (
              <span className="flex flex-wrap gap-1 mt-0.5">
                {tags.slice(0, 3).map(t => <span key={t.name} className="px-1.5 py-0.5 rounded-full bg-white/60 text-[10px] font-bold">{t.name}</span>)}
              </span>
            )}
            {height >= 150 && conflict && conflictNames && <span className="text-[11px] font-bold text-rose-800 leading-tight">Conflita com: {conflictNames}</span>}
          </>
        )}
      </div>
    </button>
  );
}

export default function AgendaPage() {
  const { currentClinicId, clinics, addToast } = useApp();
  const clinicId = currentClinicId && currentClinicId !== 'all' ? currentClinicId : clinics[0]?.id;

  const [apts, setApts] = useState<Apt[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>(() => {
    try { const v = localStorage.getItem('crm_agenda_view'); return v === 'day' || v === 'month' || v === 'list' ? v : 'week'; } catch { return 'week'; }
  });
  const [search, setSearch] = useState('');
  const [pro, setPro] = useState<string | null>(() => { try { return localStorage.getItem('crm_agenda_pro_v3'); } catch { return null; } });
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [detail, setDetail] = useState<Apt | null>(null);
  const [schedule, setSchedule] = useState<{ date?: string; time?: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayStr = ymd(new Date());

  useEffect(() => { try { localStorage.setItem('crm_agenda_view', view); } catch { /* */ } }, [view]);
  useEffect(() => { try { if (pro !== null) localStorage.setItem('crm_agenda_pro_v3', pro); } catch { /* */ } }, [pro]);

  const load = useCallback(async () => {
    let list: any[] | null = null;
    if (isSupabaseConfigured()) list = await fetchAppointmentsFromDb(currentClinicId && currentClinicId !== 'all' ? currentClinicId : undefined);
    if (!list) { try { list = JSON.parse(localStorage.getItem('crm_appointments_data') || '[]'); } catch { list = []; } }
    setApts(list as Apt[]);
    setLoading(false);
  }, [currentClinicId]);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const professionals = useMemo(() => {
    const names = Array.from(new Set(apts.map(a => a.professional).filter(Boolean))) as string[];
    return names.sort((a, b) => Number(isMain(b)) - Number(isMain(a)) || a.localeCompare(b));
  }, [apts]);
  const activePro = pro ?? professionals.find(isMain) ?? 'Todos';

  const visible = useMemo(() => {
    const q = norm(search);
    return apts.filter(a =>
      (activePro === 'Todos' || a.professional === activePro) &&
      (statusFilter === 'Todos' || statusBucket(a.status) === statusFilter) &&
      (!q || norm(a.patient).includes(q) || (a.phone || '').includes(search))
    );
  }, [apts, activePro, statusFilter, search]);
  const real = useMemo(() => visible.filter(a => a.kind !== 'blocked' && statusBucket(a.status) !== 'cancelled'), [visible]);
  const blocked = useMemo(() => visible.filter(a => a.kind === 'blocked'), [visible]);
  const conflicts = useMemo(() => detectAppointmentConflicts(real), [real]);

  const weekStart = useMemo(() => addDays(date, -date.getDay()), [date]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const columns = view === 'day' ? [date] : weekDays;

  const shift = (dir: number) => {
    if (view === 'day') setDate(addDays(date, dir));
    else if (view === 'week' || view === 'list') setDate(addDays(date, dir * 7));
    else setDate(new Date(date.getFullYear(), date.getMonth() + dir, 1));
  };
  const rangeLabel = (() => {
    if (view === 'day') return `${WEEKDAYS[date.getDay()].replace('.', '')} ${date.getDate()} ${MONTHS[date.getMonth()]}. ${date.getFullYear()}`;
    if (view === 'month') return `${MONTHS[date.getMonth()]}. DE ${date.getFullYear()}`;
    const a = weekDays[0], b = weekDays[6];
    return `${a.getDate()} ${MONTHS[a.getMonth()]}. – ${b.getDate()} ${MONTHS[b.getMonth()]}. DE ${b.getFullYear()}`;
  })();

  const colApts = columns.flatMap(d => real.filter(a => a.date === ymd(d)));
  const first = colApts.length ? Math.min(DAY_START, Math.floor(Math.min(...colApts.map(a => toMin(a.time))) / 60)) : DAY_START;
  const last = colApts.length ? Math.max(DAY_END, Math.ceil(Math.max(...colApts.map(a => toMin(a.time) + a.duration)) / 60)) : DAY_END;
  const rows = (last - first) * 4;

  // Cada coluna cresce conforme o número de atendimentos simultâneos, para o card nunca ficar espremido
  const placedByDay = useMemo(() => {
    const m = new Map<string, Placed[]>();
    columns.forEach(d => m.set(ymd(d), layout(real.filter(a => a.date === ymd(d)))));
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real, view, date.getTime()]);
  const colTemplate = columns.map(d => {
    const lanes = Math.max(1, ...(placedByDay.get(ymd(d)) || []).map(p => p.lanes));
    return `minmax(${Math.max(view === 'day' ? 320 : 230, lanes * LANE_MIN)}px, 1fr)`;
  }).join(' ');

  useEffect(() => {
    if ((view !== 'week' && view !== 'day') || !scrollRef.current) return;
    const earliest = colApts.length ? Math.min(...colApts.map(a => toMin(a.time))) : 8 * 60;
    scrollRef.current.scrollTop = Math.max(0, ((earliest - first * 60) / 15) * ROW - 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, weekStart.getTime(), date.getTime(), loading]);

  const handleAdd = async (apt: any) => {
    const withClinic = { ...apt, clinicId: apt.clinicId && apt.clinicId !== '1' ? apt.clinicId : clinicId };
    setApts(prev => [withClinic, ...prev]);
    if (isSupabaseConfigured()) {
      const ok = await saveAppointmentsToDb([withClinic]);
      addToast(ok ? `Agendamento de "${withClinic.patient}" salvo.` : 'Não foi possível salvar o agendamento.', ok ? 'success' : 'error');
      load();
    } else {
      try {
        const list = JSON.parse(localStorage.getItem('crm_appointments_data') || '[]');
        list.unshift(withClinic);
        localStorage.setItem('crm_appointments_data', JSON.stringify(list));
      } catch { /* */ }
    }
  };

  const openSlot = (d: Date, e: React.MouseEvent<HTMLElement>) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    setSchedule({ date: ymd(d), time: toTime(first * 60 + Math.floor(y / ROW) * 15) });
  };

  const dayCount = (d: Date) => real.filter(a => a.date === ymd(d)).length;
  const field = 'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200';

  return (
    <div className="flex flex-col gap-2 h-full w-full" style={{ minHeight: 520 }}>
      {/* Barra única: navegação, visões, profissional, busca e novo agendamento */}
      <div className="shrink-0 flex flex-wrap items-center gap-2.5 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h1 className="text-lg font-extrabold text-slate-900 dark:text-white mr-1">Agenda</h1>
        <button onClick={() => setDate(new Date())} className={cn(field, 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700')}>Hoje</button>
        <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <button onClick={() => shift(-1)} aria-label="Anterior" className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"><ChevronLeft size={16} /></button>
          <button onClick={() => shift(1)} aria-label="Próximo" className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"><ChevronRight size={16} /></button>
          <span className="px-3 text-xs font-bold text-slate-800 dark:text-white whitespace-nowrap">{rangeLabel}</span>
        </div>
        <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800">
          {([['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês'], ['list', 'Lista']] as [ViewMode, string][]).map(([m, l]) => (
            <button key={m} onClick={() => setView(m)} className={cn('px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors', view === m ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')}>{l}</button>
          ))}
        </div>
        <select value={activePro} onChange={e => setPro(e.target.value)} title="Profissional" className={cn(field, 'max-w-[210px] outline-none cursor-pointer')}>
          <option value="Todos">Todos os profissionais</option>
          {professionals.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="flex-1" />
        <div className="relative w-44 xl:w-60">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente..." className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-violet-500 dark:text-white" />
        </div>
        <button onClick={() => setSchedule({})} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-md cursor-pointer">
          <Plus size={16} /> Novo agendamento
        </button>
      </div>

      {/* Calendário */}
      <div className="flex-1 min-h-0 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {loading && <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Carregando agenda…</div>}

        {!loading && (view === 'week' || view === 'day') && (
          <div ref={scrollRef} className="flex-1 overflow-auto custom-scrollbar">
            <div className="grid" style={{ gridTemplateColumns: `72px ${colTemplate}`, minWidth: '100%' }}>
              {/* Cabeçalho (fixo no topo) */}
              <div className="sticky top-0 left-0 z-40 flex items-center justify-center text-[11px] font-extrabold tracking-wider text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">HORÁRIO</div>
              {columns.map(d => {
                const isToday = ymd(d) === todayStr;
                const n = dayCount(d);
                return (
                  <button key={d.getTime()} onClick={() => { setDate(d); setView('day'); }} className={cn('sticky top-0 z-30 py-2 text-center cursor-pointer border-l border-b border-slate-200 dark:border-slate-800', isToday ? 'bg-blue-100 dark:bg-blue-950' : 'bg-white dark:bg-slate-900')}>
                    <div className="text-xs font-extrabold tracking-wider text-slate-700 dark:text-slate-200">{WEEKDAYS[d.getDay()]}</div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">{d.getDate()} {MONTHS[d.getMonth()]}.</div>
                    <span className={cn('inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold', isToday ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300')}>
                      {n} {n === 1 ? 'atendimento' : 'atendimentos'}
                    </span>
                  </button>
                );
              })}

              {/* Horas (fixas à esquerda) */}
              <div className="sticky left-0 z-20 bg-white dark:bg-slate-900" style={{ height: rows * ROW }}>
                <div className="relative h-full">
                  {Array.from({ length: rows }, (_, i) => {
                    const m = first * 60 + i * 15;
                    return (
                      <div key={i} className={cn('absolute inset-x-0 text-center text-[12px] leading-none', m % 60 === 0 ? 'font-bold text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500')} style={{ top: i * ROW + 6 }}>
                        {toTime(m)}
                      </div>
                    );
                  })}
                </div>
              </div>

              {columns.map(d => {
                const ds = ymd(d);
                const items = placedByDay.get(ds) || [];
                const isToday = ds === todayStr;
                const dayBlocks = blocked.filter(b => b.date === ds);
                const closed = d.getDay() === 0 && items.length === 0;
                return (
                  <div key={ds} onClick={(e) => openSlot(d, e)} className={cn('relative border-l border-slate-200 dark:border-slate-800 cursor-pointer', isToday && 'bg-blue-600/[0.06]')} style={{ height: rows * ROW }}>
                    {Array.from({ length: rows }, (_, i) => (
                      <div key={i} className={cn('absolute inset-x-0 border-t pointer-events-none', (first * 60 + i * 15) % 60 === 0 ? 'border-slate-200 dark:border-slate-700/80' : 'border-slate-100 dark:border-slate-800/70')} style={{ top: i * ROW }} />
                    ))}
                    {closed && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 pointer-events-none">
                        <Home size={28} /><span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Clínica fechada</span>
                      </div>
                    )}
                    {dayBlocks.map(b => {
                      const s = toMin(b.time);
                      return (
                        <div key={b.id} title={`Agenda fechada ${b.time} – ${toTime(s + b.duration)}`} className="absolute inset-x-0 pointer-events-none"
                          style={{ top: ((s - first * 60) / 15) * ROW, height: (Math.max(b.duration, 15) / 15) * ROW, background: 'repeating-linear-gradient(135deg, rgba(100,116,139,0.14) 0 6px, transparent 6px 12px)' }}>
                          <span className="absolute right-1 top-0.5 text-[9px] font-bold tracking-wider text-slate-400">FECHADA {b.time}–{toTime(s + b.duration)}</span>
                        </div>
                      );
                    })}
                    {isToday && (() => {
                      const now = new Date(); const nm = now.getHours() * 60 + now.getMinutes();
                      return nm >= first * 60 && nm <= last * 60 ? <div className="absolute inset-x-0 border-t-2 border-rose-500 z-10 pointer-events-none" style={{ top: ((nm - first * 60) / 15) * ROW }} /> : null;
                    })()}
                    {items.map(p => (
                      <div key={p.apt.id} className="absolute inset-x-0" style={{ top: ((p.start - first * 60) / 15) * ROW + 2, height: 0 }}>
                        <AptCard
                          p={p}
                          conflict={!!conflicts.get(p.apt.id)?.hasConflict}
                          conflictNames={(conflicts.get(p.apt.id)?.conflictingWith || []).map(x => x.patient).join(', ')}
                          showPro={activePro === 'Todos'}
                          onOpen={() => setDetail(p.apt)}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && view === 'month' && (() => {
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const gridStart = addDays(monthStart, -monthStart.getDay());
          const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
          return (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="grid grid-cols-7 shrink-0 border-b border-slate-200 dark:border-slate-800">
                {WEEKDAYS.map(w => <div key={w} className="py-2 text-center text-xs font-extrabold tracking-wider text-slate-600 dark:text-slate-300">{w}</div>)}
              </div>
              <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-0">
                {cells.map(d => {
                  const ds = ymd(d); const list = real.filter(a => a.date === ds).sort((a, b) => a.time.localeCompare(b.time));
                  const inMonth = d.getMonth() === date.getMonth();
                  return (
                    <div key={ds} onClick={() => { setDate(d); setView('day'); }} className={cn('border-l border-t border-slate-200 dark:border-slate-800 p-1.5 overflow-hidden cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40', !inMonth && 'opacity-40', ds === todayStr && 'bg-blue-600/10')}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center', ds === todayStr ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-200')}>{d.getDate()}</span>
                        {list.length > 0 && <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{list.length}</span>}
                      </div>
                      <div className="space-y-0.5">
                        {list.slice(0, 4).map(a => (
                          <div key={a.id} onClick={(e) => { e.stopPropagation(); setDetail(a); }} className="px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis" style={{ background: TYPES[typeOf(a)].color }}>{a.time} {a.patient}</div>
                        ))}
                        {list.length > 4 && <div className="text-[10px] font-bold text-slate-500 pl-1">+{list.length - 4} mais</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {!loading && view === 'list' && (() => {
          const days = weekDays.map(ymd).filter(ds => real.some(a => a.date === ds));
          if (days.length === 0) return <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Nenhum atendimento nesta semana.</div>;
          return (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {days.map(ds => {
                const list = real.filter(a => a.date === ds).sort((a, b) => a.time.localeCompare(b.time));
                const dd = new Date(ds + 'T12:00:00');
                return (
                  <section key={ds}>
                    <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      <span>{WEEKDAYS[dd.getDay()].replace('.', '')} {dd.getDate()} {MONTHS[dd.getMonth()]}.{ds === todayStr && ' · hoje'}</span>
                      <span className="text-slate-500">{list.length}</span>
                    </header>
                    {list.map(a => {
                      const b = statusBucket(a.status);
                      return (
                        <button key={a.id} onClick={() => setDetail(a)} className="w-full flex items-center gap-4 px-5 py-2.5 text-left border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                          <span className="w-1.5 self-stretch rounded-full" style={{ background: TYPES[typeOf(a)].color }} />
                          <span className="w-28 text-xs font-semibold text-slate-500 dark:text-slate-400">{a.time} – {toTime(toMin(a.time) + a.duration)}</span>
                          <span className="flex-1 min-w-0 text-sm font-bold text-slate-900 dark:text-white">{a.patient}</span>
                          <span className="hidden md:block w-44 text-xs text-slate-500 dark:text-slate-400">{a.category || a.procedure}</span>
                          <span className="hidden lg:block w-40 text-xs text-slate-500 dark:text-slate-400">{a.professional}</span>
                          <span className="hidden lg:block w-32 text-xs text-slate-500 dark:text-slate-400">{a.phone ? formatPhoneBR(a.phone) : ''}</span>
                          <span className="flex items-center gap-1.5 w-28 text-xs font-bold text-slate-700 dark:text-slate-200"><StatusIcon apt={a} conflict={!!conflicts.get(a.id)?.hasConflict} />{STATUS_LABEL[b]}</span>
                        </button>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Legenda: os status também filtram */}
      <div className="shrink-0 flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11.5px] text-slate-600 dark:text-slate-300">
        {(Object.keys(TYPES) as TypeKey[]).map(k => (
          <span key={k} className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full" style={{ background: TYPES[k].color }} />{TYPES[k].label}</span>
        ))}
        <span className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-slate-700" />
        {([['confirmed', 'Confirmado', <Check key="c" size={15} className="text-emerald-600" strokeWidth={3} />], ['pending', 'Pendente', <Clock key="p" size={15} className="text-amber-500" />], ['missed', 'Faltou', <XCircle key="m" size={15} className="text-rose-500" />]] as [string, string, React.ReactNode][]).map(([k, l, ic]) => (
          <button key={k} onClick={() => setStatusFilter(statusFilter === k ? 'Todos' : k)} title="Clique para filtrar" className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-md cursor-pointer', statusFilter === k ? 'bg-violet-600/20 ring-1 ring-violet-500 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800')}>{ic}{l}</button>
        ))}
        <span className="flex items-center gap-1.5"><AlertTriangle size={15} className="text-rose-500" />Conflito</span>
        {statusFilter !== 'Todos' && <button onClick={() => setStatusFilter('Todos')} className="ml-auto text-[11px] font-bold text-violet-500 hover:underline cursor-pointer">Limpar filtro</button>}
      </div>

      {/* Detalhe */}
      {detail && (() => {
        const b = statusBucket(detail.status);
        const digits = (detail.phone || '').replace(/\D/g, '');
        const conf = conflicts.get(detail.id);
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50" onClick={() => setDetail(null)}>
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="h-2" style={{ background: TYPES[typeOf(detail)].color }} />
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><User size={18} className="shrink-0" />{detail.patient}</h3>
                    {detail.phone && <p className="text-sm text-slate-500 dark:text-slate-400">{formatPhoneBR(detail.phone)}</p>}
                  </div>
                  <button onClick={() => setDetail(null)} aria-label="Fechar" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X size={18} /></button>
                </div>
                <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
                  <dt className="text-slate-400">Data</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{new Date(detail.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</dd>
                  <dt className="text-slate-400">Horário</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{detail.time} – {toTime(toMin(detail.time) + detail.duration)} ({detail.duration} min)</dd>
                  <dt className="text-slate-400">Profissional</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{detail.professional || '—'}</dd>
                  <dt className="text-slate-400">Tipo</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{TYPES[typeOf(detail)].label}</dd>
                  <dt className="text-slate-400">Categoria</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{detail.category || detail.procedure}</dd>
                  <dt className="text-slate-400">Status</dt><dd className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><StatusIcon apt={detail} />{STATUS_LABEL[b]}</dd>
                  {(detail.tags || []).length > 0 && <><dt className="text-slate-400">Etiquetas</dt><dd className="flex flex-wrap gap-1">{detail.tags!.map(t => <span key={t.name} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">{t.name}</span>)}</dd></>}
                  {detail.bookedBy && <><dt className="text-slate-400">Agendado por</dt><dd className="text-slate-700 dark:text-slate-200">{detail.bookedBy}</dd></>}
                  {detail.notes && <><dt className="text-slate-400">Observações</dt><dd className="text-slate-700 dark:text-slate-200">{detail.notes}</dd></>}
                </dl>
                {conf?.hasConflict && (
                  <p className="flex items-start gap-2 text-xs font-semibold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 rounded-lg p-2.5">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />Conflito com: {(conf.conflictingWith || []).map(x => x.patient).join(', ')}
                  </p>
                )}
                {digits && (
                  <a href={`https://wa.me/${digits.length <= 11 ? '55' + digits : digits}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">
                    <MessageCircle size={16} /> Chamar no WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {schedule && (
        <ScheduleModal
          isOpen
          onClose={() => setSchedule(null)}
          initialDate={schedule.date}
          initialTime={schedule.time}
          onAddAppointment={handleAdd}
          clinicId={clinicId || '1'}
          clinicName={clinics.find(c => c.id === clinicId)?.name || 'Clínica'}
        />
      )}
    </div>
  );
}
