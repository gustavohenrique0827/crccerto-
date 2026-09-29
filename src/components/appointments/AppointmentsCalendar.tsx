import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
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
  LogOut
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
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSlotForSchedule, setSelectedSlotForSchedule] = useState<{ date: string; time: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('Todos');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Todos');
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
        defaultClinicId: effectiveClinicId !== 'all' ? effectiveClinicId : '1',
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
    fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalizedApt)
    }).catch(console.error);
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
    fetch('/api/appointments/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedList)
    }).catch(console.error);
  };

  // Data Isolation by Clinic:
  // Strictly isolate appointments by clinicId.
  // Only administrators can view all clinics ('all'). Non-admins strictly see only their clinic.
  const clinicAppointments = useMemo(() => {
    return appointments.filter(a => {
      if (isAdmin && effectiveClinicId === 'all') return true;
      return (a.clinicId || '1') === effectiveClinicId;
    });
  }, [appointments, effectiveClinicId, isAdmin]);

  const filteredAppointments = useMemo(() => {
    return clinicAppointments.filter(a => {
      const matchesProfessional = selectedProfessional === 'Todos' || a.professional === selectedProfessional;
      const matchesStatus = selectedStatusFilter === 'Todos' || a.status === selectedStatusFilter;
      const matchesSearch = (a.patient && a.patient.toLowerCase().includes(searchTerm.toLowerCase())) || 
                           (a.procedure && a.procedure.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (a.phone && a.phone.includes(searchTerm)) ||
                           (a.notes && a.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchesRange = true;
      if (viewMode === 'custom') {
        matchesRange = a.date >= customStartDate && a.date <= customEndDate;
      }

      return matchesProfessional && matchesStatus && matchesSearch && matchesRange;
    }).sort((a, b) => {
      if (viewMode === 'custom') {
        const timeA = `${a.date} ${a.time}`;
        const timeB = `${b.date} ${b.time}`;
        return customSortOrder === 'asc' ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA);
      }
      return 0;
    });
  }, [clinicAppointments, selectedProfessional, selectedStatusFilter, searchTerm, viewMode, customStartDate, customEndDate, customSortOrder]);

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

  const totalConflicts = useMemo(() => {
    let count = 0;
    conflictMap.forEach(info => {
      if (info.hasConflict) count++;
    });
    return count;
  }, [conflictMap]);

  const professionals = useMemo(() => {
    return ['Todos', ...new Set((clinicAppointments || []).map(a => a.professional).filter(Boolean))];
  }, [clinicAppointments]);

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

  return (
    <div className="h-full flex flex-col space-y-4 max-w-[1700px] mx-auto">
      {/* Top Clinicorp-Style Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Hoje button */}
          <button
            onClick={handleJumpToToday}
            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95"
          >
            Hoje
          </button>

          {/* Admin Clinic Filter (Exclusive to Administrators) */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-2xs">
              <Building2 size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/80 px-1 py-0.5 rounded border border-blue-200 dark:border-blue-800 shrink-0">
                Admin
              </span>
              <select
                value={currentClinicId}
                onChange={(e) => setCurrentClinicId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-1"
                title="Filtrar eventos por clínica (Exclusivo Administrador)"
              >
                <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  Todas as Clínicas
                </option>
                {(clinics || []).map(clinic => (
                  <option key={clinic.id} value={clinic.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {clinic.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs shadow-2xs" title="Sua clínica ativa">
              <Building2 size={13} className="text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                {currentClinic?.name || 'Unidade Padrão'}
              </span>
            </div>
          )}

          {/* Date Range Navigation */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => {
                if (viewMode === 'custom') {
                  const s = new Date(customStartDate + 'T00:00:00');
                  const e = new Date(customEndDate + 'T00:00:00');
                  const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
                  s.setDate(s.getDate() - diffDays);
                  e.setDate(e.getDate() - diffDays);
                  setCustomStartDate(formatDateStr(s));
                  setCustomEndDate(formatDateStr(e));
                  return;
                }
                const d = new Date(selectedDate);
                if (viewMode === 'day') d.setDate(d.getDate() - 1);
                else if (viewMode === 'week') d.setDate(d.getDate() - 7);
                else d.setMonth(d.getMonth() - 1);
                setSelectedDate(d);
              }}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-800 dark:text-white px-2 uppercase tracking-wide">
              {viewMode === 'day' && selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
              {viewMode === 'week' && `De ${weekDays[0].getDate()} de ${weekDays[0].toLocaleDateString('pt-BR', { month: 'short' })} a ${weekDays[6].getDate()} de ${weekDays[6].toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`}
              {viewMode === 'month' && selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              {viewMode === 'custom' && `${new Date(customStartDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a ${new Date(customEndDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
            </span>
            <button 
              onClick={() => {
                if (viewMode === 'custom') {
                  const s = new Date(customStartDate + 'T00:00:00');
                  const e = new Date(customEndDate + 'T00:00:00');
                  const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
                  s.setDate(s.getDate() + diffDays);
                  e.setDate(e.getDate() + diffDays);
                  setCustomStartDate(formatDateStr(s));
                  setCustomEndDate(formatDateStr(e));
                  return;
                }
                const d = new Date(selectedDate);
                if (viewMode === 'day') d.setDate(d.getDate() + 1);
                else if (viewMode === 'week') d.setDate(d.getDate() + 7);
                else d.setMonth(d.getMonth() + 1);
                setSelectedDate(d);
              }}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button 
            onClick={() => addToast('Agenda atualizada em tempo real', 'info')}
            title="Atualizar Agenda"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
          >
            <RotateCw size={14} />
          </button>

          {/* Search bar */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input 
              type="text" 
              placeholder="Buscar pacientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-56 md:w-72 transition-all dark:text-white"
            />
          </div>
        </div>

        {/* View mode toggle + Agendar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Visual Conflict Summary Badge */}
          {totalConflicts > 0 && (
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 text-xs font-bold shadow-xs animate-pulse"
              title="Existem agendamentos sobrepostos ou no mesmo horário para o mesmo profissional/unidade"
            >
              <AlertTriangle size={14} className="text-rose-600 shrink-0" />
              <span>{totalConflicts} Conflito{totalConflicts > 1 ? 's' : ''} de Horário</span>
            </div>
          )}

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['day', 'week', 'month', 'custom'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                  viewMode === mode 
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : mode === 'month' ? 'Mês' : 'Personalizado'}
              </button>
            ))}
          </div>

          {/* Google Calendar Sync Button & Quick Pull */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowGoogleSyncModal(true)}
              title="Configurações e Integração do Google Calendar"
              className={cn(
                "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer",
                googleUser && googleAccessToken
                  ? "bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                  : googleUser && !googleAccessToken
                  ? "bg-amber-50/80 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200"
                  : "bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              )}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M38 44H10c-3.3 0-6-2.7-6-6V10c0-3.3 2.7-6 6-6h28c3.3 0 6 2.7 6 6v28c0 3.3-2.7 6-6 6z"/>
                <path fill="#FFF" d="M35 14H13c-1.1 0-2 .9-2 2v20c0 1.1.9 2 2 2h22c1.1 0 2-.9 2-2V16c0-1.1-.9-2-2-2zm-9 19h-8v-3h8v3zm8-6H14v-3h20v3zm0-6H14v-3h20v3z"/>
                <path fill="#EA4335" d="M35 10V6c0-.6-.4-1-1-1s-1 .4-1 1v4h-6V6c0-.6-.4-1-1-1s-1 .4-1 1v4h-6V6c0-.6-.4-1-1-1s-1 .4-1 1v4h-5c-2.2 0-4 1.8-4 4v2h34v-2c0-2.2-1.8-4-4-4h-5z"/>
              </svg>
              <span className="hidden sm:inline">
                {isPullingGoogleEvents
                  ? 'Sincronizando Google...'
                  : googleUser && googleAccessToken
                  ? 'Google Calendar Conectado'
                  : googleUser && !googleAccessToken
                  ? 'Renovar Google Agenda'
                  : 'Conectar Google'}
              </span>
              {googleUser && googleAccessToken && (
                <span className={cn("w-2 h-2 rounded-full", isPullingGoogleEvents ? "bg-blue-500 animate-spin" : "bg-emerald-500 animate-pulse")}></span>
              )}
              {googleUser && !googleAccessToken && (
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              )}
            </button>

            {googleUser && googleAccessToken && (
              <>
                <button
                  onClick={() => syncGoogleCalendarToCrm(undefined, true)}
                  disabled={isPullingGoogleEvents}
                  title="Sincronizar e puxar eventos do Google Calendar agora"
                  className="p-1.5 px-2.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <RotateCw size={13} className={isPullingGoogleEvents ? "animate-spin text-blue-600" : "text-blue-600"} />
                  <span className="hidden md:inline">{isPullingGoogleEvents ? 'Buscando...' : 'Puxar do Google'}</span>
                </button>
                <button
                  onClick={handleQuickDisconnect}
                  title="Desconectar do Google Agenda e remover os eventos do calendário"
                  className="p-1.5 px-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <LogOut size={13} className="text-rose-600 dark:text-rose-400" />
                  <span className="hidden md:inline">Desconectar</span>
                </button>
              </>
            )}

            {googleUser && !googleAccessToken && (
              <>
                <button
                  onClick={handleQuickRenew}
                  title="Reconectar e renovar token do Google Calendar"
                  className="p-1.5 px-2.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RotateCw size={13} className="text-amber-600 dark:text-amber-400" />
                  <span className="hidden md:inline">Reconectar</span>
                </button>
                <button
                  onClick={handleQuickDisconnect}
                  title="Desconectar do Google Agenda e remover os eventos do calendário"
                  className="p-1.5 px-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <LogOut size={13} className="text-rose-600 dark:text-rose-400" />
                  <span className="hidden md:inline">Desconectar</span>
                </button>
              </>
            )}
          </div>

          {/* Local Sync Queue Indicator Button */}
          {syncQueue.length > 0 && (
            <button
              onClick={() => setShowQueueModal(true)}
              title={`${syncQueue.length} agendamento(s) aguardando reenvio automático ao Google Calendar`}
              className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer animate-pulse"
            >
              <Clock size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{syncQueue.length} na Fila</span>
            </button>
          )}

          <button 
            onClick={handleExport}
            title="Exportar CSV"
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Download size={16} />
          </button>

          <button 
            onClick={() => {
              setSelectedSlotForSchedule(null);
              setShowScheduleModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all flex items-center gap-1.5 uppercase tracking-wider"
          >
            <Plus size={16} />
            <span>Agendar</span>
          </button>
        </div>
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

          {/* Clinic Filter Section (Admin Only switch, Non-admin read-only) */}
          {isAdmin ? (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={13} className="text-blue-500" />
                  Clínica
                </h3>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  Admin
                </span>
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() => setCurrentClinicId('all')}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                    isAllClinicsView
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <span className="truncate">Todas as Clínicas</span>
                  {isAllClinicsView && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </button>
                {(clinics || []).map(clinic => (
                  <button
                    key={clinic.id}
                    onClick={() => setCurrentClinicId(clinic.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                      !isAllClinicsView && currentClinicId === clinic.id
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <span className="truncate">{clinic.name}</span>
                    {!isAllClinicsView && currentClinicId === clinic.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Building2 size={16} />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unidade Vinculada</p>
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                  {currentClinic?.name || 'Unidade Padrão'}
                </p>
              </div>
            </div>
          )}

          {/* Professionals Filter */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-1.5">
               <Stethoscope size={13} className="text-blue-500" />
               Profissional
            </h3>
            <div className="space-y-1.5">
              {professionals.map(prof => (
                <button
                  key={prof}
                  onClick={() => setSelectedProfessional(prof)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                    selectedProfessional === prof 
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <span className="truncate">{prof}</span>
                  {selectedProfessional === prof && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </button>
              ))}
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
        <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
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
                  const dayApts = filteredAppointments.filter(a => a.date === dateStr);
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setSelectedDate(day);
                        setViewMode('day');
                      }}
                      className={cn(
                        "p-2.5 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0 cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors",
                        isToday ? "bg-blue-50/70 dark:bg-blue-950/40 font-bold" : ""
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

              {/* Time rows grid */}
              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
                {HOURS.map((hour) => {
                  const hourStr = `${hour.toString().padStart(2, '0')}:00`;
                  return (
                    <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[90px]">
                      {/* Hour label */}
                      <div className="p-2 text-[10px] font-bold text-slate-400 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 select-none">
                        {hourStr}
                      </div>

                      {/* 7 Days Columns */}
                      {weekDays.map((day, dIdx) => {
                        const dateStr = formatDateStr(day);
                        const aptsInSlot = filteredAppointments.filter(a => {
                          const aptHour = parseInt(a.time.split(':')[0]);
                          return aptHour === hour && a.date === dateStr;
                        });

                        return (
                          <div 
                            key={dIdx} 
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('.appointment-card')) return;
                              handleOpenSlot(dateStr, hourStr);
                            }}
                            className="p-1 border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors relative group/slot cursor-pointer flex flex-col gap-1"
                          >
                            {aptsInSlot.map((apt) => {
                              const conf = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                              const conflictInfo = conflictMap.get(apt.id);
                              const hasConflict = conflictInfo?.hasConflict;

                              return (
                                <div 
                                  key={apt.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAppointmentDetail(apt);
                                  }}
                                  className={cn(
                                    "appointment-card p-2 rounded-xl border-l-4 shadow-2xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer relative group/card",
                                    hasConflict 
                                      ? "bg-rose-50/90 dark:bg-rose-950/50 border-rose-500 ring-2 ring-rose-400/60" 
                                      : cn(conf.bg, conf.border)
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-mono text-[9px] font-black text-slate-700 dark:text-slate-300">
                                      {apt.time}
                                    </span>
                                    <div className="flex items-center gap-1">
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
                                      <span className={cn("text-[8px] font-bold px-1.5 py-0.2 rounded-full", conf.color, "text-white")}>
                                        {conf.label}
                                      </span>
                                    </div>
                                  </div>
                                  <h4 className="text-[11px] font-bold text-slate-900 dark:text-white mt-1 truncate">
                                    {apt.patient}
                                  </h4>
                                  <p className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate">
                                    {apt.procedure}
                                  </p>
                                  <div className="flex items-center gap-1 text-[8.5px] text-slate-400 mt-1 truncate">
                                    <Stethoscope size={9} />
                                    <span className="truncate">{apt.professional}</span>
                                  </div>

                                  {hasConflict && (
                                    <div 
                                      className="mt-1.5 px-1.5 py-0.5 rounded-md bg-rose-200/80 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 text-[8px] font-black flex items-center gap-1 border border-rose-300 dark:border-rose-700"
                                      title={`Conflito de horário com: ${conflictInfo.conflictingWith.map(c => c.patient).join(', ')}`}
                                    >
                                      <AlertTriangle size={9} className="text-rose-600 dark:text-rose-400 shrink-0" />
                                      <span className="truncate">CONFLITO</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {aptsInSlot.length === 0 && (
                              <div className="w-full h-full min-h-[40px] flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity">
                                <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Plus size={10} /> + Agendar
                                </span>
                              </div>
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

          {/* 3. DAY VIEW */}
          {viewMode === 'day' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {HOURS.map((hour) => {
                const hourStr = `${hour.toString().padStart(2, '0')}:00`;
                const dateStr = formatDateStr(selectedDate);
                const aptsInHour = filteredAppointments.filter(a => {
                  const aptHour = parseInt(a.time.split(':')[0]);
                  return aptHour === hour && a.date === dateStr;
                });

                return (
                  <div key={hour} className="flex gap-4 group">
                    <div className="w-14 pt-2 text-right shrink-0">
                      <span className="text-xs font-bold text-slate-400 font-mono">{hourStr}</span>
                    </div>

                    <div className="flex-1 min-h-[50px] relative">
                      <div className="absolute top-4 left-0 right-0 h-px bg-slate-100 dark:bg-slate-800 z-0" />

                      {aptsInHour.length > 0 ? (
                        <div className="space-y-2 relative z-10">
                          {aptsInHour.map((apt) => {
                            const conf = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                            const conflictInfo = conflictMap.get(apt.id);
                            const hasConflict = conflictInfo?.hasConflict;

                            return (
                              <motion.div 
                                key={apt.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={() => setSelectedAppointmentDetail(apt)}
                                className={cn(
                                  "p-3.5 rounded-2xl border-l-4 shadow-sm transition-all cursor-pointer hover:shadow-md",
                                  hasConflict 
                                    ? "bg-rose-50/90 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-400/70"
                                    : cn(conf.bg, conf.border)
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-2xs text-slate-600 dark:text-slate-300 font-bold text-xs">
                                      {apt.patient.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{apt.patient}</h4>
                                        {hasConflict && (
                                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 flex items-center gap-1">
                                            <AlertTriangle size={10} className="text-rose-600" />
                                            Conflito
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                        <span className="font-semibold text-blue-600">{apt.procedure}</span>
                                        <span>•</span>
                                        <span>{apt.professional}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-white">{apt.time}</span>
                                      <p className="text-[9px] text-slate-400">{apt.duration} min</p>
                                    </div>
                                    <GoogleSyncBadge 
                                      status={getAptSyncStatus(apt)} 
                                      errorMsg={apt.googleSyncError}
                                      size="xs"
                                      onRetry={(e) => {
                                        e.stopPropagation();
                                        handleRetryAppointmentSync(apt);
                                      }}
                                    />
                                    <span className={cn("text-[9px] font-bold px-2.5 py-1 rounded-full text-white", conf.color)}>
                                      {conf.label}
                                    </span>
                                  </div>
                                </div>

                                {hasConflict && (
                                  <div className="mt-2.5 p-2 rounded-xl bg-rose-100/70 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <AlertTriangle size={12} className="text-rose-600 shrink-0" />
                                      <span>Colisão com: <strong>{conflictInfo.conflictingWith.map(c => `${c.patient} (${c.time})`).join(', ')}</strong></span>
                                    </div>
                                    <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 underline cursor-pointer">
                                      Verificar Horário
                                    </span>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleOpenSlot(dateStr, hourStr)}
                          className="w-full h-11 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center text-slate-300 hover:text-blue-600 text-xs font-semibold relative z-10 gap-1"
                        >
                          <Plus size={14} /> Horário livre
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
          clinicId={effectiveClinicId !== 'all' ? effectiveClinicId : '1'}
          clinicName={clinics.find(c => c.id === effectiveClinicId)?.name || currentClinic?.name || 'Odonto Premium'}
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
