import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Plus,
  Building2,
  Download,
  MoreVertical,
  Search,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  RotateCw,
  RotateCcw,
  Calendar as CalendarIcon,
  Filter,
  Check,
  XCircle,
  Clock3,
  UserCheck,
  Sparkles,
  AlertTriangle,
  Wifi,
  WifiOff,
  LogOut,
  MoreHorizontal,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import { exportToCSV } from '../../lib/exportUtils';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import ScheduleModal from './ScheduleModal';
import GoogleCalendarSyncModal from './GoogleCalendarSyncModal';
import GoogleSyncBadge, { GoogleSyncStatus } from './GoogleSyncBadge';
import SyncQueueModal from './SyncQueueModal';
import { initAuth, googleLogout, googleSignIn, auth, isAccessTokenValid, TOKEN_STORAGE_KEY } from '../../lib/googleAuth';
import { User as FirebaseUser } from 'firebase/auth';
import { detectAppointmentConflicts } from '../../lib/calendarConflicts';
import { 
  getSyncQueue, 
  enqueueSyncAppointment, 
  removeSyncQueueItem, 
  clearSyncQueue, 
  processSyncQueue, 
  updateLocalAppointmentSyncStatus, 
  setupAutoSyncQueueListener, 
  SyncQueueItem 
} from '../../lib/syncQueue';
import { createCalendarEvent, performBidirectionalSync } from '../../lib/googleCalendar';
import { BOOKING_PROFESSIONAL } from '../../lib/bookingRule';
import { isSupabaseConfigured, fetchAppointmentsFromDb, saveAppointmentsToDb, fetchProfessionalsFromDb, statusBucket } from '../../lib/supabase';
import { buildGoogleEventFromAppointment, getCalendarFieldMapping } from '../../lib/googleCalendarMapping';
import { getGoogleSyncSettings, recordSyncExecution } from '../../lib/googleSyncSettings';

export type AppointmentStatusType = 'confirmed' | 'pending' | 'in_progress' | 'completed' | 'missed' | 'cancelled';

export interface Appointment {
  id: string;
  patient: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // in minutes
  procedure: string;
  status: AppointmentStatusType;
  clinicId: string;
  clinicName: string;
  professional: string;
  professionalAvatar?: string;
  phone?: string;
  price?: number;
  notes?: string;
  googleSyncStatus?: GoogleSyncStatus;
  googleEventId?: string;
  googleSyncError?: string;
  lastSyncedAt?: string;
  source?: 'crm' | 'google_calendar';
  /** Dados vindos do Clinicorp */
  kind?: 'appointment' | 'blocked';
  category?: string;
  categoryColor?: string;
  tags?: { name: string; color?: string | null }[];
  bookedBy?: string;
  bookedAt?: string;
  clinicorp?: any;
}

function TagChips({ tags, max = 3, size = 'sm' }: { tags?: { name: string; color?: string | null }[]; max?: number; size?: 'xs' | 'sm' }) {
  const list = (tags || []).filter(t => t.name);
  if (list.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {list.slice(0, max).map(t => (
        <span
          key={t.name}
          className={cn("inline-flex items-center gap-1 rounded-full border font-bold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70", size === 'xs' ? "px-1.5 py-0 text-[9px]" : "px-2 py-0.5 text-[10px]")}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.color || '#94a3b8' }} />
          {t.name}
        </span>
      ))}
      {list.length > max && <span className="text-[10px] font-bold text-slate-400">+{list.length - max}</span>}
    </span>
  );
}

/** Card de um compromisso dentro da grade: o mesmo desenho dos cards da lista, adaptado à altura disponível. */
function GridAptCard({ apt, height, widthPct, colPx, realEnd, hasConflict, conflictNames, pc, dimmed, onOpen, style, showPro }: {
  key?: React.Key; colPx: number; apt: Appointment; height: number; widthPct: number; realEnd: number; hasConflict?: boolean; conflictNames?: string;
  pc: { border: string; bg: string }; dimmed?: boolean; onOpen: () => void; style: React.CSSProperties; showPro: boolean;
}) {
  const conf = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
  // Largura real estimada do card em pixels (coluna × fração ocupada): decide quanto detalhe cabe
  const px = (colPx * widthPct) / 100;
  const compact = px < 150;
  const narrow = px < 80;
  const first = String(apt.patient || '').split(' ')[0];
  const accent = hasConflict ? '#f43f5e' : (apt.categoryColor || pc.border);
  const range = `${apt.time} - ${minutesToTime(realEnd)}`;
  const subtitle = apt.category || apt.procedure;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      title={`${range} · ${apt.patient} · ${apt.procedure}${apt.professional ? ` · ${apt.professional}` : ''}${(apt.tags || []).length ? ` · ${(apt.tags || []).map(t => t.name).join(', ')}` : ''}`}
      className={cn(
        'appointment-card absolute overflow-hidden cursor-pointer shadow-sm hover:shadow-lg hover:z-20 transition-shadow text-slate-900 dark:text-slate-50',
        height < 52 ? 'rounded-lg px-2 py-1' : 'rounded-xl px-3 py-2',
        apt.status === 'cancelled' && 'opacity-50'
      )}
      style={{
        ...style,
        borderLeft: `5px solid ${accent}`,
        background: `color-mix(in srgb, ${accent} ${hasConflict ? 30 : 22}%, var(--color-surface-elevated))`,
        opacity: dimmed ? 0.55 : undefined
      }}
    >
      {height < 52 ? (
        <div className="flex items-center gap-1.5 leading-none h-full">
          {!narrow && <span className="font-mono text-[10.5px] font-semibold opacity-80 shrink-0">{apt.time} - {minutesToTime(realEnd)}</span>}
          <span className={cn('text-[11.5px] font-bold truncate', apt.status === 'cancelled' && 'line-through')}>{compact ? first : apt.patient}</span>
          {hasConflict ? <AlertTriangle size={12} className="text-rose-500 shrink-0 ml-auto" /> : <span className={cn('w-2 h-2 rounded-full shrink-0 ml-auto', conf.color)} title={conf.label} />}
        </div>
      ) : (
        <div className="flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-mono text-[11px] font-semibold opacity-85 truncate">{compact ? apt.time : range}</span>
            <span className="flex items-center gap-1.5 shrink-0">
              {hasConflict && <AlertTriangle size={14} className="text-rose-500" />}
              {compact || narrow || px < 215 ? (
                !hasConflict && <span className={cn('w-2.5 h-2.5 rounded-full', conf.color)} title={conf.label} />
              ) : (
                apt.status === 'pending'
                  ? <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md text-white bg-amber-500">{conf.label}</span>
                  : <span className={cn('text-[9.5px] font-bold px-2 py-0.5 rounded-md text-white', conf.color)}>{conf.label}</span>
              )}
            </span>
          </div>
          <h4 className={cn('mt-1 font-extrabold leading-tight', compact || height < 100 ? 'text-[13px] truncate' : 'text-[13.5px] line-clamp-2', apt.status === 'cancelled' && 'line-through')}>
            {compact ? first : apt.patient}
          </h4>
          {height >= 64 && <p className="text-[11.5px] opacity-75 truncate leading-tight mt-0.5">{subtitle}</p>}
          {hasConflict && height >= 100 && !compact && (
            <p className="mt-1 text-[10.5px] font-semibold text-rose-500 dark:text-rose-300 leading-snug line-clamp-2">Conflito com: {conflictNames}</p>
          )}
          {height >= 96 && (apt.tags || []).length > 0 && !compact && <div className="mt-1"><TagChips tags={apt.tags} max={2} size="xs" /></div>}
          {showPro && apt.professional && height >= 90 && !compact && (
            <div className="mt-auto pt-1 text-[10.5px] opacity-70 truncate">{apt.professional}</div>
          )}
        </div>
      )}
    </div>
  );
}

const HOUR_PX_DEFAULT = 72; // altura de 1 hora na visão semanal com todos os profissionais
const HOUR_PX_FOCUS = 150; // altura de 1 hora quando um único profissional está selecionado
const HOUR_PX = HOUR_PX_DEFAULT;
const MIN_CARD_PX = 22; // altura mínima legível de um card
const MIN_LAYOUT_MIN = Math.ceil((MIN_CARD_PX / HOUR_PX) * 60); // minutos que um card curto ocupa de fato

const timeToMinutes = (t: string) => {
  const [h, m] = String(t || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const minutesToTime = (min: number) =>
  `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Cor estável por profissional (matiz derivado do nome): separa as agendas que correm em paralelo. */
const profHue = (name?: string) => {
  let h = 0;
  for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};
// Cores dos profissionais como aparecem na agenda do Clinicorp (a API não informa a cor deles).
const PRO_PALETTE: Record<string, string> = {
  bruno: '#5d8a1c', giselle: '#f06ea9', jardel: '#1b2a6b', jessica: '#ef6c7d', joao: '#f57c00', lucas: '#7fb2f0'
};
const profColors = (name?: string) => {
  const key = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/\s+/)[0];
  const fixed = PRO_PALETTE[key];
  if (fixed) return { border: fixed, bg: `${fixed}29` };
  const h = profHue(name);
  return { border: `hsl(${h} 62% 42%)`, bg: `hsl(${h} 70% 48% / 0.16)` };
};

type DayItem = { apt: Appointment; start: number; end: number; realEnd: number; lane: number; lanes: number; span: number };

/** Distribui os agendamentos de um dia em "faixas" lado a lado; cada card ocupa as faixas livres à direita. */
function layoutDayAppointments(apts: Appointment[]): DayItem[] {
  const items: DayItem[] = apts
    .map((apt): DayItem => {
      const start = timeToMinutes(apt.time);
      const duration = Math.max(Number(apt.duration) || 30, 5);
      // `end` é o espaço realmente ocupado na tela (inclui a altura mínima); `realEnd` é o horário de término
      return { apt, start, end: start + Math.max(duration, MIN_LAYOUT_MIN), realEnd: start + duration, lane: 0, lanes: 1, span: 1 };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  let cluster: DayItem[] = [];
  let clusterEnd = -1;
  const laneEnds: number[] = [];
  const closeCluster = () => {
    const lanes = laneEnds.length || 1;
    cluster.forEach(it => {
      it.lanes = lanes;
      let span = 1;
      for (let l = it.lane + 1; l < lanes; l++) {
        const blocked = cluster.some(o => o !== it && o.lane === l && o.start < it.end && it.start < o.end);
        if (blocked) break;
        span++;
      }
      it.span = span;
    });
    cluster = [];
    laneEnds.length = 0;
  };
  items.forEach(it => {
    if (cluster.length && it.start >= clusterEnd) closeCluster();
    let lane = laneEnds.findIndex(end => end <= it.start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.end); } else laneEnds[lane] = it.end;
    it.lane = lane;
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  });
  closeCluster();
  return items;
}

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

const STATUS_CONFIG: Record<AppointmentStatusType, { label: string; color: string; bg: string; border: string; text: string; dot: string }> = {
  confirmed: { 
    label: 'Confirmado', 
    color: 'bg-emerald-500', 
    bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
    border: 'border-emerald-500', 
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500'
  },
  pending: { 
    label: 'Em Espera', 
    color: 'bg-amber-500', 
    bg: 'bg-amber-50 dark:bg-amber-950/40', 
    border: 'border-amber-500', 
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500'
  },
  in_progress: { 
    label: 'Em Atendimento', 
    color: 'bg-blue-500', 
    bg: 'bg-blue-50 dark:bg-blue-950/40', 
    border: 'border-blue-500', 
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500'
  },
  completed: { 
    label: 'Atendido', 
    color: 'bg-teal-500', 
    bg: 'bg-teal-50 dark:bg-teal-950/40', 
    border: 'border-teal-500', 
    text: 'text-teal-700 dark:text-teal-300',
    dot: 'bg-teal-500'
  },
  missed: { 
    label: 'Faltou', 
    color: 'bg-rose-500', 
    bg: 'bg-rose-50 dark:bg-rose-950/40', 
    border: 'border-rose-500', 
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500'
  },
  cancelled: { 
    label: 'Cancelado', 
    color: 'bg-slate-400', 
    bg: 'bg-slate-50 dark:bg-slate-900/40', 
    border: 'border-slate-400', 
    text: 'text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-400'
  }
};

export default function AppointmentsCalendar() {
  const { currentClinicId, setCurrentClinicId, currentClinic, isAllClinicsView, clinics, user, addToast } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'list' | 'month' | 'custom'>(() => {
    try {
      const v = localStorage.getItem('crm_agenda_view');
      return v === 'day' || v === 'week' || v === 'list' || v === 'month' || v === 'custom' ? v : 'week';
    } catch { return 'week'; }
  });
  useEffect(() => { try { localStorage.setItem('crm_agenda_view', viewMode); } catch {} }, [viewMode]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSlotForSchedule, setSelectedSlotForSchedule] = useState<{ date: string; time: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Profissionais marcados na lateral (null = todos). Persistido; a primeira escolha ainda é automática.
  const [checkedProfs, setCheckedProfs] = useState<string[] | null>(() => {
    try { const v = localStorage.getItem('crm_agenda_profs'); return v ? JSON.parse(v) : null; } catch { return null; }
  });
  const profsTouchedRef = useRef((() => { try { return localStorage.getItem('crm_agenda_profs') !== null; } catch { return false; } })());
  useEffect(() => { try { localStorage.setItem('crm_agenda_profs', JSON.stringify(checkedProfs)); } catch {} }, [checkedProfs]);
  const selectedProfessional = checkedProfs === null ? 'Todos' : checkedProfs.length === 1 ? checkedProfs[0] : 'Vários';
  const isChecked = (name?: string) => checkedProfs === null || checkedProfs.includes(name || '');
  /** Mantém a assinatura antiga: um nome seleciona só ele, 'Todos' seleciona todos. */
  const setSelectedProfessional = (name: string) => { profsTouchedRef.current = true; setCheckedProfs(name === 'Todos' ? null : [name]); };
  const toggleProf = (name: string, all: string[]) => {
    profsTouchedRef.current = true;
    setCheckedProfs(prev => {
      const cur = prev === null ? all : prev;
      const next = cur.includes(name) ? cur.filter(x => x !== name) : [...cur, name];
      return next.length === 0 || next.length === all.length ? null : next;
    });
  };
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Todos');
  const [selectedTag, setSelectedTag] = useState<string>('Todas');
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<Appointment | null>(null);

  // Admin permission check: only administrators can switch or filter by clinic
  const isAdmin = useMemo(() => {
    if (!user) return false;
    return (
      user.role === Role.SUPER_ADMIN || 
      user.role === Role.CLINIC_ADMIN || 
      (user.role as any) === 'admin' || 
      (user.role as any) === 'super_admin'
    );
  }, [user]);

  // Non-administrators cannot change clinics and are strictly restricted to their assigned clinic
  const effectiveClinicId = useMemo(() => {
    if (!isAdmin) {
      if (currentClinicId && currentClinicId !== 'all') {
        return currentClinicId;
      }
      return user?.accessibleClinicIds?.[0] || '1';
    }
    return currentClinicId;
  }, [isAdmin, currentClinicId, user]);

  // Custom Date Range State
  const [customStartDate, setCustomStartDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [customDisplayMode, setCustomDisplayMode] = useState<'grouped' | 'cards' | 'table'>('grouped');
  const [customSortOrder, setCustomSortOrder] = useState<'asc' | 'desc'>('asc');

  // Google Calendar Integration State & Local Sync Queue
  const [showGoogleSyncModal, setShowGoogleSyncModal] = useState(false);
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isPullingGoogleEvents, setIsPullingGoogleEvents] = useState(false);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(getSyncQueue);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Checks if the Google Calendar integration is currently active and valid
  const isGoogleIntegrationActive = useMemo(() => {
    return Boolean(googleUser && googleAccessToken && isAccessTokenValid());
  }, [googleUser, googleAccessToken]);

  // Listen to network status online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Format Date to YYYY-MM-DD
  const formatDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDateStr(new Date());

  // Clean appointments state (no fictitious static data)
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem('crm_appointments_data');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch appointments from API
  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchAppointmentsFromDb(effectiveClinicId).then(list => {
        if (!list) return;
        setAppointments(list as any);
        try { localStorage.setItem('crm_appointments_data', JSON.stringify(list)); } catch {}
      });
      return;
    }
    const clinicParam = effectiveClinicId && effectiveClinicId !== 'all' ? `?clinicId=${effectiveClinicId}` : '';
    fetch(`/api/appointments${clinicParam}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAppointments(data);
        }
      })
      .catch(err => console.error("Error fetching appointments:", err));
  }, [effectiveClinicId]);

  // Bidirectional sync directly into CRM appointments - ONLY executes when integration is active
  const syncGoogleCalendarToCrm = useCallback(async (tokenToUse?: string, notify: boolean = false) => {
    const token = tokenToUse || googleAccessToken || (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null);
    
    // Strictly verify if integration is active and token is valid
    const hasValidToken = Boolean(token && isAccessTokenValid());
    if (!hasValidToken) {
      setGoogleAccessToken(null);
      if (notify) {
        addToast('A integração com o Google Agenda está inativa ou o token expirou. Conecte-se para sincronizar.', 'info');
        setShowGoogleSyncModal(true);
      }
      return;
    }

    setIsPullingGoogleEvents(true);
    try {
      const activeClinicName = clinics.find(c => c.id === effectiveClinicId)?.name || currentClinic?.name || 'Odonto Premium';
      const result = await performBidirectionalSync(token!, appointments, {
        defaultClinicId: effectiveClinicId !== 'all' ? effectiveClinicId : (clinics[0]?.id || '1'),
        defaultClinicName: activeClinicName,
      });

      if (result.updatedAppointments && result.updatedAppointments.length > 0) {
        setAppointments(result.updatedAppointments);
        try {
          localStorage.setItem('crm_appointments_data', JSON.stringify(result.updatedAppointments));
        } catch {}
        fetch('/api/appointments/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.updatedAppointments)
        }).catch(console.error);
      }

      if (notify) {
        if (result.importedCount > 0 || result.updatedCount > 0) {
          addToast(`Google Agenda: ${result.importedCount} eventos novos importados e ${result.updatedCount} atualizados no calendário!`, 'success');
        } else {
          addToast(`Google Agenda atualizado! Todos os eventos estão visíveis na sua agenda.`, 'info');
        }
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar eventos do Google Calendar:', err);
      const isAuthError = err?.message?.includes('expirou') || 
                          err?.message?.includes('inválida') || 
                          err?.message?.includes('401') || 
                          err?.message?.includes('credentials');
      if (isAuthError) {
        setGoogleAccessToken(null);
        if (notify) {
          addToast('Sua credencial do Google Agenda expirou. Clique em "Renovar Google Agenda" para renovar o acesso.', 'info');
        }
      } else if (notify) {
        addToast(`Erro ao sincronizar com Google Agenda: ${err.message || 'Verifique a conexão'}`, 'error');
      }
    } finally {
      setIsPullingGoogleEvents(false);
    }
  }, [googleAccessToken, appointments, effectiveClinicId, clinics, currentClinic, addToast]);

  // Vindo do botão "Agendar" da ficha do lead: abre o modal já preenchido
  useEffect(() => {
    try {
      if (localStorage.getItem('crm_schedule_prefill')) {
        setSelectedSlotForSchedule(null);
        setShowScheduleModal(true);
      }
    } catch {}
  }, []);

  const hasAutoSyncedRef = useRef(false);

  // Disconnect Google Calendar and purge all imported Google items from calendar & storage
  const handleGoogleDisconnect = useCallback(() => {
    setAppointments(prev => {
      // Remove all events originating from Google Calendar
      const cleaned = prev
        .filter(a => a.source !== 'google_calendar' && !a.id.startsWith('gcal_'))
        .map(a => ({
          ...a,
          googleEventId: undefined,
          googleSyncStatus: undefined,
          googleSyncError: undefined,
          lastSyncedAt: undefined
        }));

      try {
        localStorage.setItem('crm_appointments_data', JSON.stringify(cleaned));
        localStorage.removeItem('crm_notified_appointments');
        localStorage.removeItem('google_calendar_last_sync');
      } catch (e) {
        console.error(e);
      }

      // Sync removal to backend
      fetch('/api/appointments/google-calendar', {
        method: 'DELETE'
      }).catch(console.error);

      return cleaned;
    });

    setGoogleUser(null);
    setGoogleAccessToken(null);
    hasAutoSyncedRef.current = false;
  }, []);

  const handleQuickDisconnect = async () => {
    try {
      await googleLogout();
      handleGoogleDisconnect();
      addToast('Google Calendar desconectado. Os eventos do Google foram removidos do calendário.', 'info');
    } catch (err: any) {
      console.error(err);
      addToast('Erro ao desconectar: ' + (err.message || 'Falha na conexão'), 'error');
    }
  };

  const handleQuickRenew = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleAccessToken(result.accessToken);
        addToast(`Google Agenda reconectado! Carregando seus eventos...`, 'success');
        syncGoogleCalendarToCrm(result.accessToken, true);
      }
    } catch (err: any) {
      console.error(err);
      addToast('Não foi possível renovar a conexão: ' + (err.message || 'Tente novamente'), 'error');
    }
  };

  useEffect(() => {
    const unsub = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleAccessToken(token || null);
        // Only trigger API sync if integration is active and token is valid
        if (token && isAccessTokenValid() && !hasAutoSyncedRef.current) {
          hasAutoSyncedRef.current = true;
          syncGoogleCalendarToCrm(token, false);
        }
      },
      () => {
        const currentUserInAuth = auth.currentUser;
        setGoogleUser(currentUserInAuth || null);
        setGoogleAccessToken(null);
      }
    );

    const onTokenExpired = () => {
      setGoogleAccessToken(null);
    };
    const onTokenUpdated = (e: any) => {
      if (e.detail) {
        setGoogleAccessToken(e.detail);
        if (isAccessTokenValid() && !hasAutoSyncedRef.current) {
          hasAutoSyncedRef.current = true;
          syncGoogleCalendarToCrm(e.detail, false);
        }
      }
    };

    window.addEventListener('crm_google_token_expired', onTokenExpired);
    window.addEventListener('crm_google_token_updated', onTokenUpdated);

    return () => {
      unsub();
      window.removeEventListener('crm_google_token_expired', onTokenExpired);
      window.removeEventListener('crm_google_token_updated', onTokenUpdated);
    };
  }, [syncGoogleCalendarToCrm]);

  // Automatic Queue Re-sender on connection restore
  useEffect(() => {
    const unsubAutoQueue = setupAutoSyncQueueListener(
      () => googleAccessToken,
      (result) => {
        if (result.successCount > 0) {
          addToast(
            `Conexão restabelecida: ${result.successCount} agendamento(s) pendente(s) sincronizado(s) com o Google Agenda com sucesso!`,
            'success'
          );
          setSyncQueue(getSyncQueue());
          try {
            const saved = localStorage.getItem('crm_appointments_data');
            if (saved) setAppointments(JSON.parse(saved));
          } catch {}
        }
      }
    );
    return () => unsubAutoQueue();
  }, [googleAccessToken, addToast]);

  // Listen for sync queue, appointment updates, and integration deactivation/logout across windows/tabs
  useEffect(() => {
    const handleQueueChanged = (e: any) => {
      setSyncQueue(e.detail || getSyncQueue());
    };
    const handleAptSynced = () => {
      try {
        const saved = localStorage.getItem('crm_appointments_data');
        if (saved) setAppointments(JSON.parse(saved));
      } catch {}
    };
    const handleGoogleLoggedOut = () => {
      handleGoogleDisconnect();
    };
    const handleGoogleDisabled = () => {
      handleGoogleDisconnect();
    };

    window.addEventListener('crm_sync_queue_changed', handleQueueChanged);
    window.addEventListener('crm_appointment_synced', handleAptSynced);
    window.addEventListener('crm_google_logged_out', handleGoogleLoggedOut);
    window.addEventListener('crm_google_integration_disabled', handleGoogleDisabled);

    return () => {
      window.removeEventListener('crm_sync_queue_changed', handleQueueChanged);
      window.removeEventListener('crm_appointment_synced', handleAptSynced);
      window.removeEventListener('crm_google_logged_out', handleGoogleLoggedOut);
      window.removeEventListener('crm_google_integration_disabled', handleGoogleDisabled);
    };
  }, [handleGoogleDisconnect]);

  // Periodic automatic sync based on configured interval for current clinic
  useEffect(() => {
    let intervalTimer: any = null;

    const setupAutoSyncTimer = () => {
      if (intervalTimer) {
        clearInterval(intervalTimer);
        intervalTimer = null;
      }

      const settings = getGoogleSyncSettings(effectiveClinicId);
      if (!settings.autoSyncEnabled || !googleAccessToken || !isAccessTokenValid()) {
        return;
      }

      const intervalMs = Math.max(1, settings.syncIntervalMinutes) * 60 * 1000;
      intervalTimer = setInterval(() => {
        if (googleAccessToken && isAccessTokenValid() && navigator.onLine) {
          syncGoogleCalendarToCrm(googleAccessToken, false);
          recordSyncExecution(effectiveClinicId);
        }
      }, intervalMs);
    };

    setupAutoSyncTimer();

    const onSettingsChanged = () => {
      setupAutoSyncTimer();
    };

    window.addEventListener('crm_google_sync_settings_changed', onSettingsChanged);

    return () => {
      if (intervalTimer) clearInterval(intervalTimer);
      window.removeEventListener('crm_google_sync_settings_changed', onSettingsChanged);
    };
  }, [googleAccessToken, effectiveClinicId, syncGoogleCalendarToCrm]);

  // Determine Google Sync Status for an appointment
  const getAptSyncStatus = (apt: Appointment): GoogleSyncStatus => {
    if (apt.googleSyncStatus) return apt.googleSyncStatus;
    const inQueue = syncQueue.find(q => q.appointmentId === apt.id);
    if (inQueue) {
      return inQueue.status === 'failed' ? 'error' : 'pending';
    }
    if (apt.googleEventId || apt.source === 'google_calendar' || apt.lastSyncedAt) {
      return 'synced';
    }
    return 'pending';
  };

  const handleRetryAppointmentSync = async (apt: Appointment) => {
    if (!googleAccessToken) {
      addToast('Conecte sua conta do Google Agenda para sincronizar.', 'info');
      setShowGoogleSyncModal(true);
      return;
    }
    try {
      addToast(`Reenviando agendamento de "${apt.patient}" para o Google Agenda...`, 'info');
      const mapping = getCalendarFieldMapping();
      const payload = buildGoogleEventFromAppointment(apt, mapping);
      const created = await createCalendarEvent(googleAccessToken, payload);

      updateLocalAppointmentSyncStatus(apt.id, 'synced', created.id);

      setAppointments(prev => prev.map(a => a.id === apt.id ? {
        ...a,
        googleSyncStatus: 'synced',
        googleEventId: created.id,
        googleSyncError: undefined,
        lastSyncedAt: new Date().toISOString()
      } : a));

      // Remove from queue if present
      const q = getSyncQueue();
      const match = q.find(item => item.appointmentId === apt.id);
      if (match) removeSyncQueueItem(match.id);
      setSyncQueue(getSyncQueue());

      addToast(`"${apt.patient}" sincronizado com sucesso no Google Agenda!`, 'success');
    } catch (err: any) {
      const msg = err?.message || 'Erro de API';
      enqueueSyncAppointment(apt, 'create', msg);
      setAppointments(prev => prev.map(a => a.id === apt.id ? {
        ...a,
        googleSyncStatus: 'error',
        googleSyncError: msg
      } : a));
      setSyncQueue(getSyncQueue());
      addToast(`Erro ao reenviar: ${msg}. Mantido na fila para tentativa automática.`, 'error');
    }
  };

  const handleProcessQueueNow = async () => {
    if (!googleAccessToken) {
      addToast('Conecte sua conta do Google Agenda para processar a fila.', 'info');
      setShowGoogleSyncModal(true);
      return;
    }
    setIsProcessingQueue(true);
    try {
      const res = await processSyncQueue(googleAccessToken, true);
      setSyncQueue(getSyncQueue());
      if (res.successCount > 0) {
        addToast(`${res.successCount} agendamento(s) sincronizado(s) com sucesso com o Google Agenda!`, 'success');
        const saved = localStorage.getItem('crm_appointments_data');
        if (saved) setAppointments(JSON.parse(saved));
      }
      if (res.failCount > 0) {
        addToast(`${res.failCount} item(ns) falharam ao reenviar. Permanecem na fila para reenvio.`, 'error');
      }
    } catch (e: any) {
      addToast(`Falha ao processar fila: ${e.message}`, 'error');
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const handleAddAppointment = async (newApt: Appointment) => {
    const assignedClinicId = newApt.clinicId || (effectiveClinicId !== 'all' ? effectiveClinicId : '1');
    const assignedClinicName = newApt.clinicName || clinics.find(c => c.id === assignedClinicId)?.name || currentClinic?.name || 'Odonto Premium';

    const aptWithClinic: Appointment = {
      ...newApt,
      clinicId: assignedClinicId,
      clinicName: assignedClinicName,
    };

    const mapping = getCalendarFieldMapping();
    let initialSyncStatus: GoogleSyncStatus = 'pending';
    let gEventId: string | undefined = undefined;
    let syncError: string | undefined = undefined;

    // Check if online and Google account authenticated
    if (googleAccessToken && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const payload = buildGoogleEventFromAppointment(aptWithClinic, mapping);
        const created = await createCalendarEvent(googleAccessToken, payload);
        gEventId = created.id;
        initialSyncStatus = 'synced';
        addToast(`Consulta de "${aptWithClinic.patient}" agendada e sincronizada com o Google Agenda!`, 'success');
      } catch (err: any) {
        console.error("Falha ao sincronizar novo agendamento com Google:", err);
        initialSyncStatus = 'error';
        syncError = err?.message || 'Falha na API do Google Agenda';
        enqueueSyncAppointment(aptWithClinic, 'create', syncError);
        setSyncQueue(getSyncQueue());
        addToast(`Consulta salva no CRM. Adicionada à fila local para reenvio automático ao Google Calendar (${syncError}).`, 'warning');
      }
    } else {
      initialSyncStatus = 'pending';
      const reason = (typeof navigator !== 'undefined' && !navigator.onLine) 
        ? 'Sem conexão de internet (Offline)' 
        : 'Google Calendar não autenticado';
      enqueueSyncAppointment(aptWithClinic, 'create', reason);
      setSyncQueue(getSyncQueue());
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        addToast(`Modo Offline: Agendamento salvo localmente e enfileirado para envio automático ao Google.`, 'info');
      } else {
        addToast(`Consulta agendada no CRM (sincronização pendente na fila).`, 'info');
      }
    }

    const finalizedApt: Appointment = {
      ...aptWithClinic,
      googleSyncStatus: initialSyncStatus,
      googleEventId: gEventId,
      googleSyncError: syncError,
      lastSyncedAt: initialSyncStatus === 'synced' ? new Date().toISOString() : undefined,
    };

    const updated = [finalizedApt, ...appointments];
    setAppointments(updated);
    try {
      localStorage.setItem('crm_appointments_data', JSON.stringify(updated));
      window.dispatchEvent(new Event('crm_appointments_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
    if (isSupabaseConfigured()) {
      saveAppointmentsToDb([finalizedApt]).then(ok => {
        if (!ok) addToast('Agendamento salvo só neste navegador: não foi possível gravá-lo no banco de dados.', 'error');
      });
    } else {
      fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalizedApt)
      }).catch(console.error);
    }
  };

  const handleImportAppointments = (updatedList: Appointment[]) => {
    if (!Array.isArray(updatedList) || updatedList.length === 0) return;

    // Merge or replace with updated list
    setAppointments(updatedList);
    try {
      localStorage.setItem('crm_appointments_data', JSON.stringify(updatedList));
    } catch (e) {
      console.error(e);
    }

    // Save in batch to backend
    if (isSupabaseConfigured()) {
      saveAppointmentsToDb(updatedList);
    } else {
      fetch('/api/appointments/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList)
      }).catch(console.error);
    }
  };

  // Data Isolation by Clinic:
  // Strictly isolate appointments by clinicId.
  // Only administrators can view all clinics ('all'). Non-admins strictly see only their clinic.
  const inClinic = (a: Appointment) => (isAdmin && effectiveClinicId === 'all') || (a.clinicId || '1') === effectiveClinicId;
  // Horários bloqueados ("Agenda Fechada") não são pacientes: ficam fora de contagens, listas e conflitos
  const clinicAppointments = useMemo(
    () => appointments.filter(a => a.kind !== 'blocked' && inClinic(a)),
    [appointments, effectiveClinicId, isAdmin]
  );
  const blockedSlots = useMemo(
    () => appointments.filter(a => a.kind === 'blocked' && inClinic(a)),
    [appointments, effectiveClinicId, isAdmin]
  );

  const filteredAppointments = useMemo(() => {
    return clinicAppointments.filter(a => {
      const matchesProfessional = isChecked(a.professional);
      const matchesStatus = selectedStatusFilter === 'Todos' || a.status === selectedStatusFilter;
      const matchesTag = selectedTag === 'Todas' || (a.tags || []).some(t => t.name === selectedTag);
      const matchesSearch = (a.patient && a.patient.toLowerCase().includes(searchTerm.toLowerCase())) || 
                           (a.procedure && a.procedure.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (a.phone && a.phone.includes(searchTerm)) ||
                           (a.notes && a.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchesRange = true;
      if (viewMode === 'custom') {
        matchesRange = a.date >= customStartDate && a.date <= customEndDate;
      }

      return matchesProfessional && matchesStatus && matchesTag && matchesSearch && matchesRange;
    }).sort((a, b) => {
      if (viewMode === 'custom') {
        const timeA = `${a.date} ${a.time}`;
        const timeB = `${b.date} ${b.time}`;
        return customSortOrder === 'asc' ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA);
      }
      return 0;
    });
  }, [clinicAppointments, checkedProfs, selectedStatusFilter, selectedTag, searchTerm, viewMode, customStartDate, customEndDate, customSortOrder]);

  // Group appointments by date for custom view
  const customAppointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of filteredAppointments) {
      const list = map.get(apt.date) || [];
      list.push(apt);
      map.set(apt.date, list);
    }
    return Array.from(map.entries()).sort(([dateA], [dateB]) => {
      return customSortOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    });
  }, [filteredAppointments, customSortOrder]);

  // Conflict Detection Engine for Google Sync & Local Overlaps (scoped to current isolated clinic)
  const conflictMap = useMemo(() => {
    return detectAppointmentConflicts(clinicAppointments);
  }, [clinicAppointments]);

  // Etiquetas existentes na agenda (para o filtro), com a cor que o Clinicorp usa
  const tagOptions = useMemo(() => {
    const m = new Map<string, { color?: string | null; n: number }>();
    clinicAppointments.forEach(a => (a.tags || []).forEach(t => { const e = m.get(t.name) || { color: t.color, n: 0 }; e.n++; m.set(t.name, e); }));
    return Array.from(m, ([name, v]) => ({ name, ...v })).sort((x, y) => y.n - x.n);
  }, [clinicAppointments]);

  const totalConflicts = useMemo(() => {
    let count = 0;
    conflictMap.forEach(info => {
      if (info.hasConflict) count++;
    });
    return count;
  }, [conflictMap]);

  // Na primeira vez que a semana abre com vários profissionais, começa por um deles (agenda legível);
  // "Todos os profissionais" continua a um clique.

  // Profissionais cadastrados na(s) clínica(s) + quem já aparece em agendamentos
  const [dbProfessionalNames, setDbProfessionalNames] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchProfessionalsFromDb(effectiveClinicId).then(list => {
      if (!cancelled) setDbProfessionalNames(list.map(p => p.name));
    });
    return () => { cancelled = true; };
  }, [effectiveClinicId]);

  const normName = (v?: string) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const isMain = (name?: string) => normName(name).includes(BOOKING_PROFESSIONAL);

  // Bruno (profissional principal) sempre em primeiro
  const professionals = useMemo(() => {
    const all = Array.from(new Set([...dbProfessionalNames, ...(clinicAppointments || []).map(a => a.professional).filter(Boolean)])) as string[];
    return ['Todos', ...all.sort((x, y) => Number(isMain(y)) - Number(isMain(x)))];
  }, [clinicAppointments, dbProfessionalNames]);

  // Sem escolha feita ainda: a visão do dia mostra todos os profissionais lado a lado (como no Clinicorp);
  // semana e lista começam na agenda do principal (Bruno), com os demais a um clique.
  useEffect(() => {
    if (profsTouchedRef.current) return;
    const main = professionals.find(pn => pn !== 'Todos' && isMain(pn));
    if (!main) return;
    setCheckedProfs(viewMode === 'day' || viewMode === 'month' || viewMode === 'custom' ? null : [main]);
  }, [professionals, viewMode]);

  const handleExport = () => {
    exportToCSV(filteredAppointments, 'agendamentos_agenda');
    addToast('Agenda exportada com sucesso em CSV!', 'success');
  };

  const handleJumpToToday = () => {
    setSelectedDate(new Date());
    addToast('Visualizando o dia de hoje', 'info');
  };

  const handleOpenSlot = (dateStr: string, timeStr: string) => {
    setSelectedSlotForSchedule({ date: dateStr, time: timeStr });
    setShowScheduleModal(true);
  };

  // Week days calculation (Sunday to Saturday or Monday to Sunday)
  const weekDays = useMemo(() => {
    const current = new Date(selectedDate);
    const day = current.getDay(); // 0 is Sunday
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - day);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDate]);

  // Month days calculation (Complete 35-42 calendar grid)
  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const startingDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Previous month padding days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true });
    }

    // Next month padding days to complete grid
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }

    return days;
  }, [selectedDate]);

  // Avançar/voltar o período exibido, conforme o modo de visão
  const shiftRange = (dir: -1 | 1) => {
    if (viewMode === 'custom') {
      const s = new Date(customStartDate + 'T00:00:00');
      const e = new Date(customEndDate + 'T00:00:00');
      const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
      s.setDate(s.getDate() + dir * diffDays);
      e.setDate(e.getDate() + dir * diffDays);
      setCustomStartDate(formatDateStr(s));
      setCustomEndDate(formatDateStr(e));
      return;
    }
    const d = new Date(selectedDate);
    if (viewMode === 'day') d.setDate(d.getDate() + dir);
    else if (viewMode === 'week' || viewMode === 'list') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setSelectedDate(d);
  };
  const [moreOpen, setMoreOpen] = useState(false);
  const [dayHover, setDayHover] = useState<{ pn: string; idx: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Com um profissional selecionado (ou na visão de dia) cada hora ganha mais altura: os cards ficam legíveis
  const HOUR_PX = viewMode === 'day' ? 120 : (viewMode === 'week' && true) ? (selectedProfessional === 'Todos' || selectedProfessional === 'Vários' ? HOUR_PX_DEFAULT : HOUR_PX_FOCUS) : HOUR_PX_FOCUS;

  // Conflitos só do período que está na tela (e sem contar cancelados)
  const [rangeStart, rangeEnd] =
    viewMode === 'day' ? [formatDateStr(selectedDate), formatDateStr(selectedDate)]
    : (viewMode === 'week' || viewMode === 'list') ? [formatDateStr(weekDays[0]), formatDateStr(weekDays[6])]
    : viewMode === 'month' ? [formatDateStr(monthDays[0].date), formatDateStr(monthDays[monthDays.length - 1].date)]
    : [customStartDate, customEndDate];
  const visibleConflicts = filteredAppointments.filter(
    a => a.status !== 'cancelled' && a.date >= rangeStart && a.date <= rangeEnd && conflictMap.get(a.id)?.hasConflict
  ).length;

  return (
    <div className="h-full flex flex-col space-y-4 max-w-[1700px] mx-auto">
      {/* Barra da agenda: uma linha só; o que é secundário fica nos menus Filtros e Mais */}
      <div className="bg-white dark:bg-slate-900 px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-2 shrink-0">
        {/* Navegação de data */}
        <button onClick={handleJumpToToday} className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer">
          Hoje
        </button>
        <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
          <button onClick={() => shiftRange(-1)} aria-label="Período anterior" className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"><ChevronLeft size={16} /></button>
          <span className="text-xs font-bold text-slate-800 dark:text-white px-1.5 uppercase tracking-wide whitespace-nowrap">
            {viewMode === 'day' && selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
            {(viewMode === 'week' || viewMode === 'list') && `${weekDays[0].getDate()} ${weekDays[0].toLocaleDateString('pt-BR', { month: 'short' })} – ${weekDays[6].getDate()} ${weekDays[6].toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`}
            {viewMode === 'month' && selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            {viewMode === 'custom' && `${new Date(customStartDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${new Date(customEndDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
          </span>
          <button onClick={() => shiftRange(1)} aria-label="Próximo período" className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"><ChevronRight size={16} /></button>
        </div>

        {/* Modo de exibição */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
          {(['day', 'week', 'list', 'month', 'custom'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === mode ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : mode === 'list' ? 'Lista' : mode === 'month' ? 'Mês' : 'Período'}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[8px]" />

        {/* Busca */}
        <div className="relative w-44 xl:w-60">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            type="text"
            placeholder="Buscar paciente"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none w-full dark:text-white"
          />
        </div>

        {/* Conflitos do período (só aparece quando existem) */}
        {visibleConflicts > 0 && (
          <span
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold"
            title={`${visibleConflicts} agendamento(s) com horário sobreposto para o mesmo profissional neste período`}
          >
            <AlertTriangle size={13} />{visibleConflicts}
          </span>
        )}

        {/* Filtros */}
        <div className="relative">
          <button
            onClick={() => { setFiltersOpen(o => !o); setMoreOpen(false); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer",
              selectedTag !== 'Todas' ? "border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
            )}
          >
            <SlidersHorizontal size={13} />
            Filtros
            {selectedTag !== 'Todas' && <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">1</span>}
          </button>
          {filtersOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFiltersOpen(false)} />
              <div className="absolute right-0 mt-2 w-64 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 space-y-3 text-xs">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Etiqueta do Clinicorp</span>
                  <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white">
                    <option value="Todas">Todas</option>
                    {tagOptions.map(t => <option key={t.name} value={t.name}>{t.name} ({t.n})</option>)}
                  </select>
                  {tagOptions.length === 0 && <span className="text-[10px] text-slate-400">Sem etiquetas ainda: rode a migration e sincronize com o Clinicorp.</span>}
                </label>
                {selectedTag !== 'Todas' && (
                  <button onClick={() => setSelectedTag('Todas')} className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer">Limpar filtros</button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mais: Google, fila, exportar */}
        <div className="relative">
          <button
            onClick={() => { setMoreOpen(o => !o); setFiltersOpen(false); }}
            aria-label="Mais opções"
            className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            <MoreHorizontal size={16} />
            {(syncQueue.length > 0 || (googleUser && !googleAccessToken)) && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900" />}
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 text-xs">
                <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Google Agenda</p>
                <button onClick={() => { setShowGoogleSyncModal(true); setMoreOpen(false); }} className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <span>{googleUser && googleAccessToken ? 'Conectado — configurar' : googleUser ? 'Renovar conexão' : 'Conectar'}</span>
                  <span className={cn("w-2 h-2 rounded-full", googleUser && googleAccessToken ? "bg-emerald-500" : googleUser ? "bg-amber-500" : "bg-slate-300")} />
                </button>
                {googleUser && googleAccessToken && (
                  <>
                    <button disabled={isPullingGoogleEvents} onClick={() => { syncGoogleCalendarToCrm(undefined, true); setMoreOpen(false); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50">
                      {isPullingGoogleEvents ? 'Buscando...' : 'Puxar eventos do Google agora'}
                    </button>
                    <button onClick={() => { handleQuickDisconnect(); setMoreOpen(false); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold text-rose-600 cursor-pointer">Desconectar</button>
                  </>
                )}
                {googleUser && !googleAccessToken && (
                  <button onClick={() => { handleQuickRenew(); setMoreOpen(false); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 font-semibold text-amber-700 cursor-pointer">Reconectar agora</button>
                )}
                {syncQueue.length > 0 && (
                  <button onClick={() => { setShowQueueModal(true); setMoreOpen(false); }} className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-amber-700 cursor-pointer">
                    <span>Fila de envio ao Google</span><span className="font-black">{syncQueue.length}</span>
                  </button>
                )}
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button onClick={() => { handleExport(); setMoreOpen(false); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <Download size={14} />Exportar agenda (CSV)
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => { setSelectedSlotForSchedule(null); setShowScheduleModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-blue-200 dark:shadow-none cursor-pointer"
        >
          <Plus size={15} />
          Agendar
        </button>
      </div>

      {/* Google Calendar Sync Loading Component */}
      <AnimatePresence>
        {isPullingGoogleEvents && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden bg-gradient-to-r from-blue-50/95 via-indigo-50/90 to-blue-50/95 dark:from-blue-950/60 dark:via-indigo-950/50 dark:to-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-4 py-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs shrink-0"
          >
            {/* Shimmer loading progress bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-blue-100 dark:bg-blue-950 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-600 dark:from-blue-500 dark:to-indigo-400 animate-pulse" />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-400/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <RotateCw size={17} className="animate-spin text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-blue-950 dark:text-blue-100">
                    Sincronizando com o Google Agenda...
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-blue-600 text-white shadow-2xs">
                    Sincronizando
                  </span>
                </div>
                <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                  Buscando eventos da sua conta Google, validando horários e atualizando a grade de consultas da clínica em tempo real.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-semibold text-blue-700 dark:text-blue-300">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span className="text-[11px]">Atualizando grade...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-500/95 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <WifiOff size={16} className="shrink-0" />
            <span>Modo Offline: Operando com dados locais. Agendamentos criados serão salvos na fila e reenviados automaticamente ao Google Agenda assim que você reconectar à internet.</span>
          </div>
          <span className="px-2.5 py-0.5 bg-amber-600 rounded-lg text-[10px] uppercase font-black tracking-wider shrink-0">Offline</span>
        </div>
      )}

      {/* Sync Queue Prompt Banner */}
      {syncQueue.length > 0 && isOnline && (
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 px-4 py-2.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <RotateCcw size={15} className={isProcessingQueue ? "animate-spin" : ""} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {syncQueue.length} agendamento{syncQueue.length > 1 ? 's' : ''} aguardando reenvio ao Google Calendar
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400">
                Capturados durante falhas na API ou modo offline. O reenvio automático é feito continuamente em segundo plano.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowQueueModal(true)}
              className="px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
            >
              Ver Fila ({syncQueue.length})
            </button>
            <button
              onClick={handleProcessQueueNow}
              disabled={isProcessingQueue}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw size={13} className={isProcessingQueue ? "animate-spin" : ""} />
              <span>{isProcessingQueue ? 'Reenviando...' : 'Reenviar Agora'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace: Left Mini-Calendar/Filters + Right Calendar Grid */}
      <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
        {/* Left Side Panel: Mini Calendar + Filter */}
        <div className="w-72 hidden lg:flex flex-col gap-4 shrink-0 overflow-y-auto pr-1 custom-scrollbar">
          {/* Mini Calendar Widget */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex gap-1">
                <button 
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <ChevronLeft size={14} />
                </button>
                <button 
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                <span key={`${d}-${i}`} className="text-[9px] font-bold text-slate-400 uppercase">{d}</span>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center">
              {monthDays.slice(0, 35).map((item, i) => {
                const isSelected = formatDateStr(item.date) === formatDateStr(selectedDate);
                const isToday = formatDateStr(item.date) === todayStr;
                return (
                  <button 
                    key={i} 
                    onClick={() => setSelectedDate(item.date)}
                    className={cn(
                      "text-[11px] h-7 w-7 flex items-center justify-center rounded-lg transition-all",
                      isSelected 
                        ? "bg-blue-600 text-white font-bold shadow-xs" 
                        : isToday 
                        ? "border border-blue-500 font-bold text-blue-600"
                        : item.isCurrentMonth
                        ? "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        : "text-slate-300 dark:text-slate-600"
                    )}
                  >
                    {item.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profissionais: caixas de seleção, como no Clinicorp */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope size={13} className="text-blue-500" />
                Profissionais
              </h3>
              <button
                onClick={() => { profsTouchedRef.current = true; setCheckedProfs(checkedProfs === null ? [] : null); }}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {checkedProfs === null ? 'Limpar' : 'Todos'}
              </button>
            </div>
            <div className="space-y-0.5">
              {professionals.filter(pn => pn !== 'Todos').map(prof => {
                const allPros = professionals.filter(pn => pn !== 'Todos');
                const n = clinicAppointments.filter(a => a.professional === prof && a.status !== 'cancelled' && (viewMode === 'day' ? a.date === formatDateStr(selectedDate) : weekDays.some(d => formatDateStr(d) === a.date))).length;
                const on = isChecked(prof);
                const col = profColors(prof).border;
                return (
                  <label key={prof} className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer select-none">
                    <span
                      className="w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-colors"
                      style={{ borderColor: col, background: on ? col : 'transparent' }}
                    >
                      {on && <Check size={12} className="text-white" strokeWidth={3} />}
                    </span>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleProf(prof, allPros)} />
                    <span className="flex-1 min-w-0 text-[13px] font-medium text-slate-700 dark:text-slate-200 truncate">{prof}</span>
                    {isMain(prof) && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-primary-blue)]/15 text-[var(--color-primary-blue)] shrink-0">Principal</span>}
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{n}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Status Color Legend & Filter */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle size={13} className="text-emerald-500" />
                Status
              </h3>
              {selectedStatusFilter !== 'Todos' && (
                <button 
                  onClick={() => setSelectedStatusFilter('Todos')}
                  className="text-[10px] text-blue-600 font-bold hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="space-y-2">
              {(Object.keys(STATUS_CONFIG) as AppointmentStatusType[]).map(st => {
                const conf = STATUS_CONFIG[st];
                const isSelected = selectedStatusFilter === st;
                return (
                  <div 
                    key={st}
                    onClick={() => setSelectedStatusFilter(isSelected ? 'Todos' : st)}
                    className={cn(
                      "flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors",
                      isSelected ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full shadow-xs", conf.dot)} />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{conf.label}</span>
                    </div>
                    {isSelected && <Check size={12} className="text-blue-600" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Google Sync Status Panel */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-blue-500" />
                Status Google Agenda
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-1.5 rounded-lg text-xs bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Sincronizados</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  {appointments.filter(a => getAptSyncStatus(a) === 'synced').length}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded-lg text-xs bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Pendentes</span>
                </div>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                  {appointments.filter(a => getAptSyncStatus(a) === 'pending').length}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded-lg text-xs bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Com Erro de API</span>
                </div>
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                  {appointments.filter(a => getAptSyncStatus(a) === 'error').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Area: Interactive Schedule Views */}
        <div
          className={cn(
            "flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden",
            (viewMode === 'week' || viewMode === 'day' || viewMode === 'list') && "self-start"
          )}
          // Semana: o quadro tem altura própria e só a grade de horários rola. Assim o cabeçalho com
          // os dias fica sempre visível e cada card continua ligado à sua coluna.
          style={viewMode === 'week' || viewMode === 'day' || viewMode === 'list' ? { height: 'calc(100vh - 262px)', minHeight: 560 } : undefined}
        >
          {/* 1. WEEK VIEW (Clinicorp standard 7-day columns) */}
          {viewMode === 'week' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex flex-col overflow-x-auto custom-scrollbar min-w-full">
                <div className="min-w-[760px] flex-1 flex flex-col h-full">
                  {/* Header row: Days of Week */}
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
                <div className="p-3 text-[10px] font-bold text-slate-400 uppercase text-center flex items-center justify-center border-r border-slate-200 dark:border-slate-800">
                  Hora
                </div>
                {weekDays.map((day, idx) => {
                  const dateStr = formatDateStr(day);
                  const isToday = dateStr === todayStr;
                  const dayApts = filteredAppointments.filter(a => a.date === dateStr && (selectedStatusFilter === 'cancelled' || a.status !== 'cancelled'));
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setSelectedDate(day);
                        setViewMode('day');
                      }}
                      className={cn(
                        "p-2.5 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0 cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors",
                        isToday ? "bg-[var(--color-primary-blue)]/12 font-bold" : ""
                      )}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </div>
                      <div className="flex items-center justify-center gap-1.5 mt-0.5">
                        <span className={cn(
                          "text-sm font-extrabold w-6 h-6 rounded-full flex items-center justify-center",
                          isToday ? "bg-blue-600 text-white shadow-xs" : "text-slate-800 dark:text-white"
                        )}>
                          {day.getDate()}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded-full inline-block",
                          dayApts.length > 0 ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}>
                          {dayApts.length} {dayApts.length === 1 ? 'paciente' : 'pacientes'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grade contínua: 1 coluna por dia; cada card é posicionado pelo horário e a altura segue a duração */}
              {(() => {
                // Cancelados não ocupam horário: só aparecem se o filtro de status for "Cancelado"
                const gridApts = filteredAppointments.filter(a => selectedStatusFilter === 'cancelled' || a.status !== 'cancelled');
                const weekApts = weekDays.flatMap(d => gridApts.filter(a => a.date === formatDateStr(d)));
                const first = weekApts.length ? Math.min(...weekApts.map(a => Math.floor(timeToMinutes(a.time) / 60))) : 7;
                const last = weekApts.length ? Math.max(...weekApts.map(a => Math.ceil((timeToMinutes(a.time) + (a.duration || 30)) / 60))) : 21;
                const gridStart = Math.min(7, first);
                const gridEnd = Math.max(22, last);
                const hours = Array.from({ length: gridEnd - gridStart }, (_, i) => gridStart + i);
                const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

                return (
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))]" style={{ height: hours.length * HOUR_PX }}>
                      {/* Rótulos de hora */}
                      <div className="relative border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 select-none">
                        {hours.map(h => (
                          <div key={h} className={cn("absolute inset-x-0 text-[10px] font-bold text-slate-400 text-center", h === gridStart ? "pt-1" : "-translate-y-1/2")} style={{ top: (h - gridStart) * HOUR_PX }}>
                            {String(h).padStart(2, '0')}:00
                          </div>
                        ))}
                      </div>

                      {weekDays.map((day, dIdx) => {
                        const dateStr = formatDateStr(day);
                        const dayApts = layoutDayAppointments(gridApts.filter(a => a.date === dateStr));
                        const isToday = dateStr === todayStr;

                        return (
                          <div
                            key={dIdx}
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('.appointment-card')) return;
                              const y = e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top;
                              const minutes = gridStart * 60 + Math.floor((y / HOUR_PX) * 2) * 30; // arredonda para 30 min
                              handleOpenSlot(dateStr, minutesToTime(minutes));
                            }}
                            className={cn(
                              "relative border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 cursor-pointer hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors",
                              isToday && "bg-[var(--color-primary-blue)]/8"
                            )}
                          >
                            {hours.map(h => (
                              <div key={h} className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-800 pointer-events-none" style={{ top: (h - gridStart) * HOUR_PX }} />
                            ))}

                            {isToday && nowMin >= gridStart * 60 && nowMin <= gridEnd * 60 && (
                              <div className="absolute inset-x-0 border-t-2 border-rose-500 z-20 pointer-events-none" style={{ top: ((nowMin - gridStart * 60) / 60) * HOUR_PX }} />
                            )}

                            {blockedSlots.filter(bs => bs.date === dateStr && isChecked(bs.professional)).map(bs => {
                              const bStart = timeToMinutes(bs.time);
                              const bEnd = bStart + Math.max(Number(bs.duration) || 30, 15);
                              return (
                                <div
                                  key={bs.id}
                                  title={`Agenda fechada${bs.professional ? ` · ${bs.professional}` : ''}: ${bs.time}–${minutesToTime(bEnd)}${bs.procedure && bs.procedure !== 'Horário bloqueado' ? ` · ${bs.procedure}` : ''}`}
                                  className="absolute inset-x-0 pointer-events-none"
                                  style={{
                                    top: ((bStart - gridStart * 60) / 60) * HOUR_PX,
                                    height: ((bEnd - bStart) / 60) * HOUR_PX,
                                    background: 'repeating-linear-gradient(135deg, rgba(100,116,139,0.10) 0 6px, transparent 6px 12px)',
                                    borderTop: '1px dashed rgba(100,116,139,0.35)',
                                    zIndex: 0
                                  }}
                                >
                                  <span className="absolute right-1 top-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-400/80 bg-white/70 dark:bg-slate-900/70 px-1 rounded">Fechada</span>
                                </div>
                              );
                            })}

                            {dayApts.map(({ apt, start, end, realEnd, lane, lanes, span }) => {
                              const conf = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                              const conflictInfo = conflictMap.get(apt.id);
                              const hasConflict = conflictInfo?.hasConflict;
                              const height = Math.max(((end - start) / 60) * HOUR_PX - 2, MIN_CARD_PX);
                              // Simultâneos ficam lado a lado (como no Clinicorp); com 2+ o card fica compacto
                              const widthPct = (100 / lanes) * span;
                              const leftPct = lane * (100 / lanes);
                              const compact = widthPct < 60;
                              const tiny = widthPct < 22;
                              const pc = profColors(apt.professional);

                              return (
                                <GridAptCard
                                  key={apt.id}
                                  apt={apt}
                                  height={height}
                                  widthPct={widthPct}
                                  colPx={190}
                                  realEnd={realEnd}
                                  hasConflict={hasConflict}
                                  conflictNames={(conflictInfo?.conflictingWith || []).map(x => x.patient).join(', ')}
                                  pc={pc}
                                  dimmed={selectedProfessional === 'Todos' && !isMain(apt.professional)}
                                  showPro={selectedProfessional === 'Todos'}
                                  onOpen={() => setSelectedAppointmentDetail(apt)}
                                  style={{
                                    top: ((start - gridStart * 60) / 60) * HOUR_PX + 1,
                                    height,
                                    zIndex: isMain(apt.professional) ? 2 : 1,
                                    left: `calc(${leftPct}% + 1px)`,
                                    width: `calc(${widthPct}% - 2px)`
                                  }}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
                </div>
              </div>
            </div>
          )}

          {/* 2. MONTH VIEW (Rich grid with appointment chips & counts) */}
          {viewMode === 'month' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex flex-col overflow-x-auto custom-scrollbar min-w-full">
                <div className="min-w-[700px] flex-1 flex flex-col h-full">
                  {/* Month Header Days */}
                  <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
                    {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((wd, i) => (
                      <div key={i} className="p-2.5 text-[10px] font-bold text-slate-400 uppercase text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                        <span className="hidden sm:inline">{wd}</span>
                        <span className="sm:hidden">{wd.slice(0, 3)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Month Grid Cells */}
                  <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
                {monthDays.map((item, idx) => {
                  const dateStr = formatDateStr(item.date);
                  const dayApts = filteredAppointments.filter(a => a.date === dateStr);
                  const isToday = dateStr === todayStr;
                  const dayHasConflict = dayApts.some(a => conflictMap.get(a.id)?.hasConflict);

                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        setSelectedDate(item.date);
                        setViewMode('day');
                      }}
                      className={cn(
                        "min-h-[110px] p-2 border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 transition-colors flex flex-col gap-1 cursor-pointer group hover:bg-blue-50/30 dark:hover:bg-blue-900/10",
                        item.isCurrentMonth ? "bg-white dark:bg-slate-900" : "bg-slate-50/40 dark:bg-slate-950/40 opacity-50",
                        isToday && "bg-blue-50/40 dark:bg-blue-950/30 font-bold",
                        dayHasConflict && "bg-rose-50/30 dark:bg-rose-950/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center",
                            isToday ? "bg-blue-600 text-white shadow-xs" : "text-slate-700 dark:text-slate-300"
                          )}>
                            {item.date.getDate()}
                          </span>
                          {dayHasConflict && (
                            <span title="Conflito de horário de agendamentos neste dia" className="text-rose-500">
                              <AlertTriangle size={12} className="animate-pulse" />
                            </span>
                          )}
                        </div>
                        {dayApts.length > 0 && (
                          <span className={cn(
                            "text-[8.5px] font-bold px-1.5 py-0.2 rounded-full",
                            dayHasConflict 
                              ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700" 
                              : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                          )}>
                            {dayApts.length} {dayApts.length === 1 ? 'cons.' : 'cons.'}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                        {dayApts.slice(0, 3).map(apt => {
                          const conf = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                          const aptHasConflict = conflictMap.get(apt.id)?.hasConflict;

                          return (
                            <div 
                              key={apt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppointmentDetail(apt);
                              }}
                              className={cn(
                                "px-1.5 py-1 rounded-md text-[9px] font-medium truncate shadow-2xs border-l-2 flex items-center justify-between gap-1 hover:brightness-95",
                                aptHasConflict 
                                  ? "bg-rose-100 dark:bg-rose-950/80 border-rose-500 text-rose-800 dark:text-rose-200 font-bold" 
                                  : cn(conf.bg, conf.border, conf.text)
                              )}
                              title={aptHasConflict ? "Conflito de horário detectado!" : undefined}
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                {aptHasConflict && <AlertTriangle size={8} className="text-rose-600 shrink-0" />}
                                <span className="font-mono font-bold">{apt.time}</span>
                                <span className="truncate flex-1">{apt.patient}</span>
                              </div>
                              <GoogleSyncBadge 
                                status={getAptSyncStatus(apt)} 
                                errorMsg={apt.googleSyncError}
                                compact
                                size="xs"
                                onRetry={(e) => {
                                  e.stopPropagation();
                                  handleRetryAppointmentSync(apt);
                                }}
                              />
                            </div>
                          );
                        })}

                        {dayApts.length > 3 && (
                          <span className="text-[8.5px] font-bold text-blue-600 dark:text-blue-400 pl-1 block">
                            +{dayApts.length - 3} mais
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. DIA: uma coluna por profissional, no modelo da agenda do Clinicorp */}
          {viewMode === 'day' && (() => {
            const dateStr = formatDateStr(selectedDate);
            const dayAll = filteredAppointments.filter(a => a.date === dateStr && (selectedStatusFilter === 'cancelled' || a.status !== 'cancelled'));
            const dayBlocked = blockedSlots.filter(bs => bs.date === dateStr && isChecked(bs.professional));
            const base = professionals.filter(pn => pn !== 'Todos' && isChecked(pn));
            const extra = Array.from(new Set(dayAll.map(a => a.professional).filter(pn => pn && !base.includes(pn)))) as string[];
            const hasNone = dayAll.some(a => !a.professional);
            const names = [...base, ...extra, ...(hasNone ? ['Sem profissional'] : [])];
            const all = [...dayAll, ...dayBlocked];
            const first = all.length ? Math.min(...all.map(a => Math.floor(timeToMinutes(a.time) / 60))) : 8;
            const last = all.length ? Math.max(...all.map(a => Math.ceil((timeToMinutes(a.time) + (a.duration || 30)) / 60))) : 19;
            const gridStart = Math.min(8, first);
            const gridEnd = Math.max(19, last);
            const slots = (gridEnd - gridStart) * 4;                // linhas de 15 minutos
            const SLOT = HOUR_PX / 4;
            const isToday = dateStr === todayStr;
            const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
            const cols = `64px repeat(${Math.max(names.length, 1)}, minmax(150px, 1fr))`;
            const hm = (min: number, suffix = false) => `${Math.floor(min / 60)}${min % 60 ? ':' + String(min % 60).padStart(2, '0') : ''}${suffix ? 'h' : ''}`;
            const label = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
            const range = (s: number, e: number) => `${hm(s)} - ${hm(e, true)}`;
            const tint = (col: string, pct: number) => `color-mix(in srgb, ${col} ${pct}%, var(--color-surface-elevated))`;

            if (names.length === 0) {
              return <div className="flex-1 flex items-center justify-center text-sm text-slate-400 p-8">Marque ao menos um profissional na lista à esquerda.</div>;
            }

            return (
              <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-slate-900">
                <div className="min-w-full">
                  <div className="grid sticky top-0 z-30 bg-white dark:bg-slate-900" style={{ gridTemplateColumns: cols }}>
                    <div className="sticky left-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800" />
                    {names.map(pn => {
                      const count = dayAll.filter(a => (a.professional || 'Sem profissional') === pn).length;
                      const col = profColors(pn).border;
                      return (
                        <div key={pn} className="text-center pt-2 pb-1.5 min-w-0 border-b border-slate-200 dark:border-slate-800" style={{ boxShadow: `inset 0 -3px 0 ${col}` }}>
                          <p className="text-[13.5px] font-medium text-slate-800 dark:text-white truncate px-2">{pn}</p>
                          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 pb-0.5">Pacientes: {count}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid relative" style={{ gridTemplateColumns: cols, height: slots * SLOT }}>
                    {/* Horários de 15 em 15 minutos */}
                    <div className="sticky left-0 z-20 relative bg-white dark:bg-slate-900 select-none">
                      {Array.from({ length: slots }, (_, i) => {
                        const min = gridStart * 60 + i * 15;
                        const isNow = isToday && nowMin >= min && nowMin < min + 15;
                        return (
                          <div key={i} className={cn('absolute inset-x-0 text-right pr-2 text-[11.5px] leading-none', min % 60 === 0 ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400', isNow && 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200')} style={{ top: i * SLOT, height: SLOT, paddingTop: 3 }}>
                            {label(min)}
                          </div>
                        );
                      })}
                    </div>

                    {names.map(pn => {
                      const col = profColors(pn).border;
                      const colApts = layoutDayAppointments(dayAll.filter(a => (a.professional || 'Sem profissional') === pn));
                      const colBlocked = dayBlocked.filter(bs => (bs.professional || 'Sem profissional') === pn);
                      return (
                        <div
                          key={pn}
                          onMouseMove={(e) => {
                            const y = e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top;
                            const idx = Math.max(0, Math.min(slots - 1, Math.floor(y / SLOT)));
                            setDayHover(h => (h && h.pn === pn && h.idx === idx ? h : { pn, idx }));
                          }}
                          onMouseLeave={() => setDayHover(null)}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('.appointment-card')) return;
                            const y = e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top;
                            handleOpenSlot(dateStr, minutesToTime(gridStart * 60 + Math.floor(y / SLOT) * 15));
                          }}
                          className="relative cursor-pointer min-w-0 border-l border-white/60 dark:border-slate-900"
                          style={{ background: `color-mix(in srgb, ${col} 9%, var(--color-surface-elevated))` }}
                        >
                          {Array.from({ length: slots }, (_, i) => (
                            <div key={i} className="absolute inset-x-0 pointer-events-none" style={{ top: i * SLOT, borderTop: `1px solid ${(gridStart * 60 + i * 15) % 60 === 0 ? 'rgba(100,116,139,0.28)' : 'rgba(100,116,139,0.12)'}` }} />
                          ))}
                          {isToday && nowMin >= gridStart * 60 && nowMin <= gridEnd * 60 && (
                            <div className="absolute inset-x-0 z-10 pointer-events-none bg-rose-400/25" style={{ top: Math.floor((nowMin - gridStart * 60) / 15) * SLOT, height: SLOT }} />
                          )}
                          {dayHover && dayHover.pn === pn && (
                            <div className="absolute inset-x-0 z-10 pointer-events-none" style={{ top: dayHover.idx * SLOT, height: SLOT, background: 'rgba(15,107,120,0.12)' }}>
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 text-white text-[12px] px-2.5 py-1 shadow-lg">Clique para criar um agendamento</span>
                            </div>
                          )}

                          {colBlocked.map(bs => {
                            const s = timeToMinutes(bs.time), e = s + Math.max(Number(bs.duration) || 30, 15);
                            const label = bs.procedure && bs.procedure !== 'Horário bloqueado' ? bs.procedure : (bs.category || 'Agenda fechada');
                            const h = ((e - s) / 15) * SLOT - 2;
                            return (
                              <div key={bs.id} className="absolute inset-x-1 rounded-lg px-2.5 py-1 overflow-hidden pointer-events-none text-[12px] text-slate-600 dark:text-slate-300" style={{ top: ((s - gridStart * 60) / 15) * SLOT + 1, height: h, background: tint(bs.categoryColor || '#94a3b8', 28), zIndex: 1 }}>
                                {h < 40 ? <span className="truncate block">{label}, <span className="text-[11px] opacity-70">{range(s, e)}</span></span> : (<><p className="truncate">{label}</p><p className="text-[11px] opacity-70">{range(s, e)}</p></>)}
                              </div>
                            );
                          })}

                          {colApts.map(({ apt, start, realEnd, end, lane, lanes, span }) => {
                            const hasConflict = conflictMap.get(apt.id)?.hasConflict;
                            const catColor = apt.categoryColor || col;
                            const h = ((end - start) / 15) * SLOT - 2;
                            const bucket = statusBucket(apt.status);
                            const done = bucket === 'attended' || bucket === 'confirmed';
                            const wPct = (100 / lanes) * span;
                            return (
                              <div
                                key={apt.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedAppointmentDetail(apt); }}
                                title={`${apt.patient} · ${range(start, realEnd)}${apt.procedure ? ` · ${apt.procedure}` : ''}`}
                                className={cn('appointment-card absolute overflow-hidden rounded-lg px-2 py-1 cursor-pointer text-slate-700 dark:text-slate-100 hover:shadow-lg hover:z-20 transition-shadow', hasConflict && 'ring-2 ring-rose-500')}
                                style={{
                                  top: ((start - gridStart * 60) / 15) * SLOT + 1,
                                  height: h,
                                  left: `calc(${lane * (100 / lanes)}% + 3px)`,
                                  width: `calc(${wPct}% - 6px)`,
                                  background: tint(catColor, 38),
                                  borderLeft: `4px solid ${catColor}`,
                                  zIndex: 2
                                }}
                              >
                                {done && <Check size={14} className="absolute right-1.5 top-1 text-emerald-700 dark:text-emerald-300" strokeWidth={3} />}
                                {bucket === 'missed' && <X size={14} className="absolute right-1.5 top-1 text-rose-600" strokeWidth={3} />}
                                {h < 44 ? (
                                  <p className={cn('truncate text-[12px] leading-tight mt-0.5', (done || bucket === 'missed') && 'pr-4', apt.status === 'cancelled' && 'line-through opacity-60')}>{apt.patient}, <span className="text-[11px] opacity-70">{range(start, realEnd)}</span></p>
                                ) : (
                                  <>
                                    <p className={cn('truncate text-[12.5px] leading-tight', (done || bucket === 'missed') && 'pr-4', apt.status === 'cancelled' && 'line-through opacity-60')}>{apt.patient}</p>
                                    <p className="text-[11px] opacity-70 leading-tight">{range(start, realEnd)}</p>
                                    {h >= 72 && apt.category && <p className="text-[11px] opacity-70 truncate leading-tight mt-0.5">{apt.category}</p>}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* LISTA: clientes agendados, dia a dia, com o profissional principal primeiro */}
          {viewMode === 'list' && (() => {
            const days = weekDays.map(dd => formatDateStr(dd));
            const rows = filteredAppointments
              .filter(a => days.includes(a.date) && (selectedStatusFilter === 'cancelled' || a.status !== 'cancelled'))
              .sort((x, y) => x.date.localeCompare(y.date) || Number(isMain(y.professional)) - Number(isMain(x.professional)) || x.time.localeCompare(y.time));
            const fmtDay = (ds: string) => new Date(ds + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
            if (rows.length === 0) {
              return <div className="flex-1 flex items-center justify-center text-sm text-slate-400 p-8">Nenhum cliente agendado nesta semana{selectedProfessional !== 'Todos' ? ` para ${selectedProfessional.split(' ')[0]}` : ''}.</div>;
            }
            return (
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {days.filter(ds => rows.some(r => r.date === ds)).map(ds => {
                  const dayRows = rows.filter(r => r.date === ds);
                  return (
                    <section key={ds}>
                      <header className={cn("sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900", ds === todayStr && "bg-blue-50 dark:bg-blue-950/40")}>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 capitalize">{fmtDay(ds)}{ds === todayStr && <span className="ml-2 text-[10px] text-blue-600">hoje</span>}</h3>
                        <span className="text-[11px] font-bold text-slate-400">{dayRows.length} {dayRows.length === 1 ? 'cliente' : 'clientes'}</span>
                      </header>
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dayRows.map(apt => {
                          const conf = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                          const pc = profColors(apt.professional);
                          const hasConflict = conflictMap.get(apt.id)?.hasConflict;
                          const end = minutesToTime(timeToMinutes(apt.time) + (apt.duration || 30));
                          return (
                            <li
                              key={apt.id}
                              onClick={() => setSelectedAppointmentDetail(apt)}
                              className={cn("flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-4", apt.status === 'cancelled' && "opacity-50")}
                              style={{ borderLeftColor: hasConflict ? 'rgb(244 63 94)' : pc.border }}
                            >
                              <div className="w-24 shrink-0">
                                <p className="font-mono text-sm font-black text-slate-800 dark:text-white">{apt.time}</p>
                                <p className="font-mono text-[10px] text-slate-400">até {end}</p>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={cn("text-sm font-bold text-slate-900 dark:text-white truncate", apt.status === 'cancelled' && "line-through")}>{apt.patient}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{apt.category && apt.category !== apt.procedure ? `${apt.category} · ` : ''}{apt.procedure}{apt.phone ? ` · ${apt.phone}` : ''}</p>
                                <TagChips tags={apt.tags} size="xs" />
                              </div>
                              <div className="hidden md:flex items-center gap-1.5 w-44 shrink-0 text-xs text-slate-600 dark:text-slate-300">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: pc.border }} />
                                <span className="truncate">{apt.professional || 'Sem profissional'}</span>
                              </div>
                              {hasConflict && <AlertTriangle size={14} className="text-rose-500 shrink-0" />}
                              <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full text-white shrink-0", conf.color)}>{conf.label}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            );
          })()}

          {/* 4. CUSTOM VIEW (Personalizado with interactive range calendar, timeline grouping, and metrics) */}
          {viewMode === 'custom' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6">
              {/* Custom Date Range Picker Header */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                      <CalendarIcon size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Período Personalizado da Agenda</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                          {Math.max(1, Math.round((new Date(customEndDate + 'T00:00:00').getTime() - new Date(customStartDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1)} dias
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        De {new Date(customStartDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} até {new Date(customEndDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">De:</label>
                      <input 
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomStartDate(val);
                          if (val > customEndDate) {
                            setCustomEndDate(val);
                          }
                        }}
                        className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Até:</label>
                      <input 
                        type="date"
                        value={customEndDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomEndDate(val);
                          if (val < customStartDate) {
                            setCustomStartDate(val);
                          }
                        }}
                        className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setSelectedSlotForSchedule({ date: customStartDate, time: '09:00' });
                        setShowScheduleModal(true);
                      }}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus size={14} /> Novo Agendamento
                    </button>
                  </div>
                </div>

                {/* Quick Presets for Custom Range */}
                <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Atalhos:</span>
                  {[
                    { 
                      label: 'Hoje', 
                      action: () => {
                        const today = formatDateStr(new Date());
                        setCustomStartDate(today);
                        setCustomEndDate(today);
                      }
                    },
                    { 
                      label: 'Próximos 7 Dias', 
                      action: () => {
                        const now = new Date();
                        const end = new Date();
                        end.setDate(now.getDate() + 7);
                        setCustomStartDate(formatDateStr(now));
                        setCustomEndDate(formatDateStr(end));
                      }
                    },
                    { 
                      label: 'Próximos 15 Dias', 
                      action: () => {
                        const now = new Date();
                        const end = new Date();
                        end.setDate(now.getDate() + 15);
                        setCustomStartDate(formatDateStr(now));
                        setCustomEndDate(formatDateStr(end));
                      }
                    },
                    { 
                      label: 'Próximos 30 Dias', 
                      action: () => {
                        const now = new Date();
                        const end = new Date();
                        end.setDate(now.getDate() + 30);
                        setCustomStartDate(formatDateStr(now));
                        setCustomEndDate(formatDateStr(end));
                      }
                    },
                    { 
                      label: 'Este Mês', 
                      action: () => {
                        const now = new Date();
                        const first = new Date(now.getFullYear(), now.getMonth(), 1);
                        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        setCustomStartDate(formatDateStr(first));
                        setCustomEndDate(formatDateStr(last));
                      }
                    },
                    { 
                      label: 'Próximo Mês', 
                      action: () => {
                        const now = new Date();
                        const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                        const last = new Date(now.getFullYear(), now.getMonth() + 2, 0);
                        setCustomStartDate(formatDateStr(first));
                        setCustomEndDate(formatDateStr(last));
                      }
                    },
                    { 
                      label: 'Últimos 30 Dias', 
                      action: () => {
                        const now = new Date();
                        const past = new Date();
                        past.setDate(now.getDate() - 30);
                        setCustomStartDate(formatDateStr(past));
                        setCustomEndDate(formatDateStr(now));
                      }
                    }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={preset.action}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs hover:border-blue-300 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* KPI Summary Cards for Custom Range */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total do Período</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {filteredAppointments.length}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Confirmadas</p>
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {filteredAppointments.filter(a => a.status === 'confirmed').length}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Atendidas</p>
                  <p className="text-xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">
                    {filteredAppointments.filter(a => a.status === 'completed').length}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Conflitos</p>
                  <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                    {filteredAppointments.filter(a => conflictMap.get(a.id)?.hasConflict).length}
                  </p>
                </div>
              </div>

              {/* View Mode & Filter Controls for Custom Range */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Visualização:</span>
                  <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                    <button
                      onClick={() => setCustomDisplayMode('grouped')}
                      className={cn(
                        "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                        customDisplayMode === 'grouped'
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      )}
                    >
                      Por Data
                    </button>
                    <button
                      onClick={() => setCustomDisplayMode('cards')}
                      className={cn(
                        "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                        customDisplayMode === 'cards'
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      )}
                    >
                      Cartões
                    </button>
                    <button
                      onClick={() => setCustomDisplayMode('table')}
                      className={cn(
                        "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                        customDisplayMode === 'table'
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      )}
                    >
                      Tabela
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCustomSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
                  >
                    <span>Ordem: {customSortOrder === 'asc' ? 'Mais Antigo Primeiro' : 'Mais Recente Primeiro'}</span>
                  </button>
                  <button
                    onClick={handleExport}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
                  >
                    <Download size={13} /> Exportar CSV
                  </button>
                </div>
              </div>

              {/* View 1: GROUPED BY DATE TIMELINE */}
              {customDisplayMode === 'grouped' && (
                <div className="space-y-6">
                  {customAppointmentsByDate.length > 0 ? (
                    customAppointmentsByDate.map(([dateStr, apts]) => {
                      const dateObj = new Date(dateStr + 'T00:00:00');
                      const isDateToday = dateStr === todayStr;
                      const hasDateConflict = apts.some(a => conflictMap.get(a.id)?.hasConflict);

                      return (
                        <div key={dateStr} className="space-y-3">
                          {/* Date Group Header */}
                          <div className={cn(
                            "flex items-center justify-between p-3.5 rounded-2xl border shadow-xs transition-colors",
                            isDateToday 
                              ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800" 
                              : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                          )}>
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs",
                                isDateToday ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              )}>
                                {dateObj.getDate()}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-white capitalize">
                                  {dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {apts.length} {apts.length === 1 ? 'consulta programada' : 'consultas programadas'}
                                  </span>
                                  {hasDateConflict && (
                                    <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                      <AlertTriangle size={10} /> Conflito detectado
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedSlotForSchedule({ date: dateStr, time: '09:00' });
                                setShowScheduleModal(true);
                              }}
                              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                            >
                              <Plus size={13} /> Agendar nesta data
                            </button>
                          </div>

                          {/* Appointments Cards for this Date */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {apts.map(apt => {
                              const conf = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                              const aptConflict = conflictMap.get(apt.id);
                              const hasAptConflict = aptConflict?.hasConflict;

                              return (
                                <div
                                  key={apt.id}
                                  onClick={() => setSelectedAppointmentDetail(apt)}
                                  className={cn(
                                    "p-4 rounded-2xl border-l-4 shadow-sm transition-all cursor-pointer hover:shadow-md bg-white dark:bg-slate-900 border",
                                    hasAptConflict 
                                      ? "border-rose-500 ring-2 ring-rose-400/60 bg-rose-50/40 dark:bg-rose-950/20" 
                                      : "border-slate-200 dark:border-slate-800",
                                    conf.border
                                  )}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1">
                                      <Clock size={12} className="text-blue-500" />
                                      {apt.time} ({apt.duration} min)
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <GoogleSyncBadge 
                                        status={getAptSyncStatus(apt)} 
                                        errorMsg={apt.googleSyncError}
                                        size="xs"
                                        onRetry={(e) => {
                                          e.stopPropagation();
                                          handleRetryAppointmentSync(apt);
                                        }}
                                      />
                                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full text-white", conf.color)}>
                                        {conf.label}
                                      </span>
                                    </div>
                                  </div>

                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{apt.patient}</h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{apt.procedure}</p>

                                  {hasAptConflict && (
                                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-2 flex items-center gap-1">
                                      <AlertTriangle size={11} /> Conflito com: {aptConflict.conflictingWith.map(c => `${c.patient} (${c.time})`).join(', ')}
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <span className="truncate flex items-center gap-1">
                                      <Stethoscope size={10} /> {apt.professional}
                                    </span>
                                    <span className="truncate">{apt.clinicName}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 shadow-xs">
                      <CalendarIcon size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Nenhum agendamento neste período</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Não há consultas agendadas entre {new Date(customStartDate + 'T00:00:00').toLocaleDateString('pt-BR')} e {new Date(customEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}.
                      </p>
                      <button 
                        onClick={() => {
                          setSelectedSlotForSchedule({ date: customStartDate, time: '09:00' });
                          setShowScheduleModal(true);
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={14} /> Agendar Consulta
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* View 2: CARDS GRID */}
              {customDisplayMode === 'cards' && (
                <div>
                  {filteredAppointments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredAppointments.map((apt) => {
                        const conf = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                        const aptConflict = conflictMap.get(apt.id);
                        const hasAptConflict = aptConflict?.hasConflict;

                        return (
                          <div 
                            key={apt.id}
                            onClick={() => setSelectedAppointmentDetail(apt)}
                            className={cn(
                              "p-4 rounded-2xl border-l-4 shadow-sm transition-all cursor-pointer hover:shadow-md bg-white dark:bg-slate-900 border",
                              hasAptConflict 
                                ? "border-rose-500 ring-2 ring-rose-400/60 bg-rose-50/40 dark:bg-rose-950/20" 
                                : "border-slate-200 dark:border-slate-800",
                              conf.border
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <CalendarIcon size={12} className="text-blue-500" />
                                {apt.date} • {apt.time}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {hasAptConflict && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 flex items-center gap-1">
                                    <AlertTriangle size={10} className="text-rose-600" />
                                    Conflito
                                  </span>
                                )}
                                <GoogleSyncBadge 
                                  status={getAptSyncStatus(apt)} 
                                  errorMsg={apt.googleSyncError}
                                  size="xs"
                                  onRetry={(e) => {
                                    e.stopPropagation();
                                    handleRetryAppointmentSync(apt);
                                  }}
                                />
                                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full text-white", conf.color)}>
                                  {conf.label}
                                </span>
                              </div>
                            </div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{apt.patient}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{apt.procedure}</p>

                            {hasAptConflict && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-2 flex items-center gap-1">
                                <AlertTriangle size={11} /> Conflito com: {aptConflict.conflictingWith.map(c => `${c.patient} (${c.time})`).join(', ')}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <span>{apt.professional}</span>
                              <span>{apt.clinicName}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 shadow-xs">
                      <CalendarIcon size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Nenhum agendamento neste período</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Não há consultas agendadas entre {new Date(customStartDate + 'T00:00:00').toLocaleDateString('pt-BR')} e {new Date(customEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* View 3: DETAILED TABLE */}
              {customDisplayMode === 'table' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Data/Hora</th>
                          <th className="py-3 px-4">Paciente</th>
                          <th className="py-3 px-4">Procedimento</th>
                          <th className="py-3 px-4">Profissional</th>
                          <th className="py-3 px-4">Unidade</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Google Sync</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {filteredAppointments.length > 0 ? (
                          filteredAppointments.map(apt => {
                            const conf = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                            const aptConflict = conflictMap.get(apt.id);
                            const hasAptConflict = aptConflict?.hasConflict;

                            return (
                              <tr 
                                key={apt.id} 
                                onClick={() => setSelectedAppointmentDetail(apt)}
                                className={cn(
                                  "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer",
                                  hasAptConflict ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                                )}
                              >
                                <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {apt.date} • {apt.time}
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                  {apt.patient}
                                </td>
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                  {apt.procedure}
                                </td>
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {apt.professional}
                                </td>
                                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                  {apt.clinicName}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full text-white", conf.color)}>
                                    {conf.label}
                                  </span>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <GoogleSyncBadge 
                                    status={getAptSyncStatus(apt)} 
                                    errorMsg={apt.googleSyncError}
                                    size="xs"
                                    onRetry={(e) => {
                                      e.stopPropagation();
                                      handleRetryAppointmentSync(apt);
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                              Nenhum agendamento encontrado no período.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Appointment Detail Modal */}
      <AnimatePresence>
        {selectedAppointmentDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Detalhes do Agendamento
                  </h3>
                  <p className="text-xs text-slate-400">ID: {selectedAppointmentDetail.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedAppointmentDetail(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                    {selectedAppointmentDetail.patient.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{selectedAppointmentDetail.patient}</h4>
                    <p className="text-slate-400">{selectedAppointmentDetail.phone || '(11) 99999-9999'}</p>
                  </div>
                </div>

                {((selectedAppointmentDetail.tags || []).length > 0 || selectedAppointmentDetail.category || selectedAppointmentDetail.bookedBy) && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl space-y-2">
                    {selectedAppointmentDetail.category && (
                      <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: selectedAppointmentDetail.categoryColor || '#94a3b8' }} />
                        {selectedAppointmentDetail.category}
                      </p>
                    )}
                    <TagChips tags={selectedAppointmentDetail.tags} max={10} />
                    {selectedAppointmentDetail.bookedBy && (
                      <p className="text-[11px] text-slate-400">
                        Agendado por <strong className="text-slate-600 dark:text-slate-300">{selectedAppointmentDetail.bookedBy}</strong>
                        {selectedAppointmentDetail.bookedAt ? ` em ${new Date(selectedAppointmentDetail.bookedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
                      </p>
                    )}
                    {selectedAppointmentDetail.clinicorp?.whatsRead && <p className="text-[11px] text-emerald-600">Confirmação por WhatsApp lida pelo paciente</p>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Data & Hora</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {selectedAppointmentDetail.date} às {selectedAppointmentDetail.time}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Procedimento</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {selectedAppointmentDetail.procedure}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Profissional</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {selectedAppointmentDetail.professional}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Clínica</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {selectedAppointmentDetail.clinicName}
                    </p>
                  </div>
                </div>

                {/* Google Calendar Sync Status Detail Card */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <CalendarIcon size={14} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Sincronização Google Agenda
                        </span>
                      </div>
                    </div>

                    <GoogleSyncBadge 
                      status={getAptSyncStatus(selectedAppointmentDetail)} 
                      errorMsg={selectedAppointmentDetail.googleSyncError}
                      size="sm"
                    />
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-400 pl-9 space-y-1">
                    {selectedAppointmentDetail.googleEventId && (
                      <p className="font-mono text-[10px] text-slate-500">
                        ID Google: <span className="text-slate-700 dark:text-slate-300">{selectedAppointmentDetail.googleEventId}</span>
                      </p>
                    )}
                    {selectedAppointmentDetail.lastSyncedAt && (
                      <p className="text-[10px] text-slate-400">
                        Última sincronização: {new Date(selectedAppointmentDetail.lastSyncedAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                    {selectedAppointmentDetail.googleSyncError && (
                      <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] flex items-center justify-between gap-2 mt-1">
                        <span className="truncate">Erro: {selectedAppointmentDetail.googleSyncError}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => handleRetryAppointmentSync(selectedAppointmentDetail)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>{getAptSyncStatus(selectedAppointmentDetail) === 'synced' ? 'Ressincronizar com Google' : 'Reenviar para Google'}</span>
                    </button>
                  </div>
                </div>

                {/* Conflict Alert Banner if this appointment conflicts */}
                {conflictMap.get(selectedAppointmentDetail.id)?.hasConflict && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 space-y-1.5 animate-pulse">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                      <span>Conflito de Horário Detectado</span>
                    </div>
                    <p className="text-[11px] text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
                      Este agendamento coincide no mesmo horário com: <strong>{conflictMap.get(selectedAppointmentDetail.id)?.conflictingWith.map(c => `${c.patient} às ${c.time} (${c.procedure})`).join(', ')}</strong>.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Alterar Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(STATUS_CONFIG) as AppointmentStatusType[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          selectedAppointmentDetail.status = st;
                          addToast(`Status alterado para ${STATUS_CONFIG[st].label}`, 'success');
                          setSelectedAppointmentDetail(null);
                        }}
                        className={cn(
                          "py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all truncate",
                          selectedAppointmentDetail.status === st 
                            ? `${STATUS_CONFIG[st].color} text-white`
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                        )}
                      >
                        {STATUS_CONFIG[st].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal 
          isOpen={showScheduleModal} 
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedSlotForSchedule(null);
          }}
          initialDate={selectedSlotForSchedule?.date}
          initialTime={selectedSlotForSchedule?.time}
          onAddAppointment={handleAddAppointment}
          clinicId={effectiveClinicId !== 'all' ? effectiveClinicId : (clinics[0]?.id || '1')}
          clinicName={clinics.find(c => c.id === effectiveClinicId)?.name || currentClinic?.name || clinics[0]?.name || 'Clínica'}
        />
      )}

      {/* Google Calendar Sync Modal */}
      {showGoogleSyncModal && (
        <GoogleCalendarSyncModal
          isOpen={showGoogleSyncModal}
          onClose={() => setShowGoogleSyncModal(false)}
          appointments={clinicAppointments}
          onImportAppointments={handleImportAppointments}
          onDisconnect={handleGoogleDisconnect}
          onToast={addToast}
          clinicId={effectiveClinicId !== 'all' ? effectiveClinicId : '1'}
          clinicName={clinics.find(c => c.id === effectiveClinicId)?.name || currentClinic?.name}
        />
      )}

      {/* Local Sync Queue Modal */}
      {showQueueModal && (
        <SyncQueueModal
          isOpen={showQueueModal}
          onClose={() => setShowQueueModal(false)}
          queue={syncQueue}
          accessToken={googleAccessToken}
          onToast={addToast}
          onQueueUpdated={() => {
            setSyncQueue(getSyncQueue());
            try {
              const saved = localStorage.getItem('crm_appointments_data');
              if (saved) setAppointments(JSON.parse(saved));
            } catch {}
          }}
        />
      )}
    </div>
  );
}
