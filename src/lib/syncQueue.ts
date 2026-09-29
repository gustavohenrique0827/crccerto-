// Local Queuing Mechanism for Google Calendar Synchronization
// Handles capturing appointments created during sync failures/offline and auto-retrying upon reconnection

import { createCalendarEvent } from './googleCalendar';
import { buildGoogleEventFromAppointment, getCalendarFieldMapping } from './googleCalendarMapping';
import { addSyncLog } from './syncHistory';

export interface SyncQueueItem {
  id: string;
  appointmentId: string;
  patient: string;
  procedure: string;
  date: string;
  time: string;
  action: 'create' | 'update' | 'delete';
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  status: 'queued' | 'retrying' | 'failed';
  appointmentData: any;
}

const QUEUE_STORAGE_KEY = 'crm_google_sync_queue';

/**
 * Retrieve current sync queue items
 */
export function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Erro ao ler fila de sincronização:', err);
    return [];
  }
}

/**
 * Save sync queue to localStorage and dispatch update event
 */
function saveSyncQueue(items: SyncQueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('crm_sync_queue_changed', { detail: items }));
  } catch (err) {
    console.error('Erro ao gravar fila de sincronização:', err);
  }
}

/**
 * Enqueue an appointment that failed or couldn't sync with Google Calendar
 */
export function enqueueSyncAppointment(
  appointment: any,
  action: 'create' | 'update' | 'delete' = 'create',
  errorMessage?: string
): SyncQueueItem {
  const queue = getSyncQueue();
  
  // Check if this appointment is already in queue with this action
  const existingIdx = queue.findIndex(item => item.appointmentId === appointment.id && item.action === action);
  
  const newItem: SyncQueueItem = {
    id: existingIdx >= 0 ? queue[existingIdx].id : `queue_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    appointmentId: appointment.id,
    patient: appointment.patient || 'Paciente',
    procedure: appointment.procedure || 'Consulta',
    date: appointment.date || '',
    time: appointment.time || '',
    action,
    createdAt: existingIdx >= 0 ? queue[existingIdx].createdAt : new Date().toISOString(),
    attempts: existingIdx >= 0 ? queue[existingIdx].attempts + 1 : 1,
    lastAttemptAt: new Date().toISOString(),
    lastError: errorMessage || 'Aguardando conexão ou autenticação com Google Calendar',
    status: 'queued',
    appointmentData: appointment,
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = newItem;
  } else {
    queue.push(newItem);
  }

  saveSyncQueue(queue);

  // Update appointment status in local storage
  updateLocalAppointmentSyncStatus(appointment.id, 'pending', undefined, errorMessage);

  addSyncLog({
    direction: 'crm_to_google',
    action: 'queue_item',
    status: 'warning',
    title: `Agendamento Enfileirado para Reenvio (${appointment.patient})`,
    details: errorMessage 
      ? `Falha de sincronização (${errorMessage}). Adicionado à fila local para reenvio automático assim que a conexão for restaurada.` 
      : `Adicionado à fila de espera para sincronização com o Google Agenda.`,
    apiStatusCode: 0,
    affectedItem: `${appointment.patient} - ${appointment.procedure}`
  });

  return newItem;
}

/**
 * Remove an item from the sync queue
 */
export function removeSyncQueueItem(id: string): void {
  const queue = getSyncQueue();
  const filtered = queue.filter(item => item.id !== id);
  saveSyncQueue(filtered);
}

/**
 * Clear the entire sync queue
 */
export function clearSyncQueue(): void {
  saveSyncQueue([]);
}

/**
 * Update the sync status of an appointment in localStorage
 */
export function updateLocalAppointmentSyncStatus(
  appointmentId: string,
  status: 'synced' | 'pending' | 'error',
  googleEventId?: string,
  errorMsg?: string
): void {
  try {
    const rawApts = localStorage.getItem('crm_appointments_data');
    if (!rawApts) return;

    const apts = JSON.parse(rawApts);
    if (!Array.isArray(apts)) return;

    let modified = false;
    const updatedApts = apts.map(a => {
      if (a.id === appointmentId) {
        modified = true;
        return {
          ...a,
          googleSyncStatus: status,
          ...(googleEventId ? { googleEventId, lastSyncedAt: new Date().toISOString() } : {}),
          googleSyncError: errorMsg || (status === 'synced' ? undefined : a.googleSyncError)
        };
      }
      return a;
    });

    if (modified) {
      localStorage.setItem('crm_appointments_data', JSON.stringify(updatedApts));
      window.dispatchEvent(new CustomEvent('crm_appointment_synced', {
        detail: { appointmentId, status, googleEventId, errorMsg }
      }));
    }
  } catch (err) {
    console.error('Erro ao atualizar status de sincronização do agendamento:', err);
  }
}

/**
 * Process the local sync queue by attempting to resend all queued items to Google Calendar
 */
export async function processSyncQueue(
  accessToken: string,
  forceRetryAll: boolean = true
): Promise<{
  successCount: number;
  failCount: number;
  remainingCount: number;
  results: Array<{ id: string; patient: string; success: boolean; error?: string }>;
}> {
  const queue = getSyncQueue();
  if (queue.length === 0) {
    return { successCount: 0, failCount: 0, remainingCount: 0, results: [] };
  }

  let successCount = 0;
  let failCount = 0;
  const results: Array<{ id: string; patient: string; success: boolean; error?: string }> = [];
  const remainingQueue: SyncQueueItem[] = [];
  const mapping = getCalendarFieldMapping();

  for (const item of queue) {
    // If it's already failed max times and not forced, keep it
    if (item.status === 'failed' && !forceRetryAll) {
      remainingQueue.push(item);
      continue;
    }

    try {
      if (item.action === 'create' || item.action === 'update') {
        const payload = buildGoogleEventFromAppointment(item.appointmentData, mapping);
        const createdEvent = await createCalendarEvent(accessToken, payload);

        // Update appointment as synced
        updateLocalAppointmentSyncStatus(item.appointmentId, 'synced', createdEvent.id);

        successCount++;
        results.push({ id: item.id, patient: item.patient, success: true });

        addSyncLog({
          direction: 'crm_to_google',
          action: 'queue_retry_success',
          status: 'success',
          title: `Fila Processada: "${item.patient}" Reenviado com Sucesso`,
          details: `Agendamento pendente reenviado ao Google Calendar após conexão restaurada. ID Google: ${createdEvent.id}`,
          apiStatusCode: 200,
          affectedItem: item.patient
        });
      }
    } catch (err: any) {
      failCount++;
      const errorMessage = err?.message || 'Falha ao comunicar com a API do Google Agenda';
      const updatedAttempts = item.attempts + 1;

      const updatedItem: SyncQueueItem = {
        ...item,
        attempts: updatedAttempts,
        lastAttemptAt: new Date().toISOString(),
        lastError: errorMessage,
        status: updatedAttempts >= 5 ? 'failed' : 'retrying'
      };

      remainingQueue.push(updatedItem);
      results.push({ id: item.id, patient: item.patient, success: false, error: errorMessage });

      updateLocalAppointmentSyncStatus(item.appointmentId, 'error', undefined, errorMessage);
    }
  }

  saveSyncQueue(remainingQueue);

  return {
    successCount,
    failCount,
    remainingCount: remainingQueue.length,
    results
  };
}

/**
 * Hook or setup to automatically listen for reconnection ('online' event)
 * and resend queued items when connection is back
 */
export function setupAutoSyncQueueListener(
  getToken: () => string | null,
  onAutoProcessComplete?: (res: { successCount: number; failCount: number }) => void
): () => void {
  const handleOnline = async () => {
    console.log('[SyncQueue] Conexão de rede restabelecida (online)! Verificando fila de sincronização...');
    const queue = getSyncQueue();
    if (queue.length === 0) return;

    const token = getToken();
    if (!token) {
      console.log('[SyncQueue] Conexão ativa, mas token do Google Calendar ausente. Aguardando login.');
      return;
    }

    try {
      const result = await processSyncQueue(token, true);
      if (result.successCount > 0 || result.failCount > 0) {
        onAutoProcessComplete?.(result);
      }
    } catch (e) {
      console.error('[SyncQueue] Erro no processamento automático ao voltar online:', e);
    }
  };

  window.addEventListener('online', handleOnline);

  // Also setup a gentle periodic retry every 45 seconds if queue has items and browser is online
  const intervalId = setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const queue = getSyncQueue();
      if (queue.length > 0) {
        const token = getToken();
        if (token) {
          processSyncQueue(token, false)
            .then(res => {
              if (res.successCount > 0) {
                onAutoProcessComplete?.(res);
              }
            })
            .catch(console.error);
        }
      }
    }
  }, 45000);

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(intervalId);
  };
}
