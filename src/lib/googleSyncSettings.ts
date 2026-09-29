// Configuration and State Management for Clinic Google Calendar Synchronization

export interface GoogleSyncSettings {
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number; // e.g. 5, 10, 15, 30, 60, 120
  syncDirection: 'bidirectional' | 'crm_to_google' | 'google_to_crm';
  clinicId: string;
  clinicName: string;
  applyToAllClinics: boolean;
  targetCalendarId: string; // 'primary' or custom calendar
  conflictResolution: 'prefer_crm' | 'prefer_google' | 'notify_both';
  autoSyncOnCreate: boolean;
  notifyOnSyncSuccess: boolean;
  notifyOnSyncError: boolean;
  importExternalEvents: boolean;
  lastSyncAt?: string | null;
  nextScheduledSyncAt?: string | null;
}

export const DEFAULT_SYNC_INTERVALS = [
  { value: 5, label: '5 minutos', description: 'Tempo quase real (Recomendado para alto fluxo e múltiplos atendentes)' },
  { value: 15, label: '15 minutos', description: 'Equilibrado (Recomendado pela equipe técnica, otimiza cota)' },
  { value: 30, label: '30 minutos', description: 'Econômico (Ideal para consultórios individuais)' },
  { value: 60, label: '1 hora', description: 'Sincronização por hora cheia' },
  { value: 120, label: '2 horas', description: 'Periódico espaçado' },
];

export const DEFAULT_GOOGLE_SYNC_SETTINGS: GoogleSyncSettings = {
  autoSyncEnabled: true,
  syncIntervalMinutes: 15,
  syncDirection: 'bidirectional',
  clinicId: '1',
  clinicName: 'Odonto Premium Central',
  applyToAllClinics: true,
  targetCalendarId: 'primary',
  conflictResolution: 'prefer_crm',
  autoSyncOnCreate: true,
  notifyOnSyncSuccess: false,
  notifyOnSyncError: true,
  importExternalEvents: true,
  lastSyncAt: null,
  nextScheduledSyncAt: null,
};

const SETTINGS_STORAGE_KEY_PREFIX = 'crm_gcal_sync_settings_';
const GLOBAL_SETTINGS_KEY = 'crm_gcal_global_sync_settings';

/**
 * Get Google Calendar sync settings for a specific clinic (or global fallback)
 */
export function getGoogleSyncSettings(clinicId?: string): GoogleSyncSettings {
  try {
    const key = clinicId ? `${SETTINGS_STORAGE_KEY_PREFIX}${clinicId}` : GLOBAL_SETTINGS_KEY;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_GOOGLE_SYNC_SETTINGS, ...parsed };
    }

    // Try global settings
    const globalRaw = localStorage.getItem(GLOBAL_SETTINGS_KEY);
    if (globalRaw) {
      const parsedGlobal = JSON.parse(globalRaw);
      return { 
        ...DEFAULT_GOOGLE_SYNC_SETTINGS, 
        ...parsedGlobal,
        ...(clinicId ? { clinicId } : {})
      };
    }

    // Also migrate or respect legacy 'google_calendar_autosync' if present
    const legacyAutoSync = localStorage.getItem('google_calendar_autosync');
    if (legacyAutoSync !== null) {
      return {
        ...DEFAULT_GOOGLE_SYNC_SETTINGS,
        autoSyncEnabled: legacyAutoSync === 'true',
        clinicId: clinicId || DEFAULT_GOOGLE_SYNC_SETTINGS.clinicId,
      };
    }
  } catch (err) {
    console.error('Erro ao ler configurações de sincronização do Google Calendar:', err);
  }

  return {
    ...DEFAULT_GOOGLE_SYNC_SETTINGS,
    clinicId: clinicId || DEFAULT_GOOGLE_SYNC_SETTINGS.clinicId,
  };
}

/**
 * Save Google Calendar sync settings and emit update event
 */
export function saveGoogleSyncSettings(settings: GoogleSyncSettings): void {
  try {
    const now = new Date();
    const nextSync = new Date(now.getTime() + settings.syncIntervalMinutes * 60000);
    const updated: GoogleSyncSettings = {
      ...settings,
      nextScheduledSyncAt: settings.autoSyncEnabled ? nextSync.toISOString() : null,
    };

    // Save for specific clinic
    if (settings.clinicId) {
      localStorage.setItem(`${SETTINGS_STORAGE_KEY_PREFIX}${settings.clinicId}`, JSON.stringify(updated));
    }

    // Always save as global default if applyToAllClinics or no specific
    if (settings.applyToAllClinics || !settings.clinicId) {
      localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(updated));
    }

    // Sync legacy flag for backward compatibility
    localStorage.setItem('google_calendar_autosync', String(settings.autoSyncEnabled));
    localStorage.setItem('google_calendar_sync_interval', String(settings.syncIntervalMinutes));

    // Dispatch custom event to notify all components (AppointmentsCalendar, IntegrationsWorkspace, etc.)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm_google_sync_settings_changed', { detail: updated }));
    }
  } catch (err) {
    console.error('Erro ao salvar configurações de sincronização do Google Calendar:', err);
  }
}

/**
 * Record a successful sync run and compute next run
 */
export function recordSyncExecution(clinicId?: string): void {
  try {
    const current = getGoogleSyncSettings(clinicId);
    const now = new Date();
    const nextSync = new Date(now.getTime() + current.syncIntervalMinutes * 60000);
    
    current.lastSyncAt = now.toISOString();
    current.nextScheduledSyncAt = current.autoSyncEnabled ? nextSync.toISOString() : null;

    saveGoogleSyncSettings(current);
  } catch (e) {
    console.warn('Erro ao registrar execução de sincronização:', e);
  }
}

/**
 * Format minutes into a friendly label
 */
export function formatIntervalLabel(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hora${hours > 1 ? 's' : ''}`;
  }
  return `${hours}h ${remainingMinutes}min`;
}
