// Google Calendar API Client Operations
import { buildGoogleEventFromAppointment, getCalendarFieldMapping } from './googleCalendarMapping';
import { addSyncLog } from './syncHistory';
import { clearCachedAccessToken } from './googleAuth';

function isGoogleAuthError(status: number, message: string): boolean {
  if (status === 401) return true;
  const lower = (message || '').toLowerCase();
  return (
    lower.includes('invalid authentication credentials') ||
    lower.includes('unauthenticated') ||
    lower.includes('invalid credentials') ||
    lower.includes('expected oauth 2 access token') ||
    lower.includes('login cookie')
  );
}

function handleAuthError() {
  clearCachedAccessToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm_google_token_expired'));
  }
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
}

export interface SyncResult {
  syncedCount: number;
  importedCount: number;
  errors: string[];
}

/**
 * List events from Primary Google Calendar
 */
export async function listCalendarEvents(
  accessToken: string, 
  timeMin?: string, 
  timeMax?: string
): Promise<GoogleCalendarEvent[]> {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  if (timeMin) {
    url.searchParams.set('timeMin', new Date(timeMin).toISOString());
  } else {
    // Default to 3 months in the past so recent and current events appear
    const past = new Date();
    past.setMonth(past.getMonth() - 3);
    past.setHours(0, 0, 0, 0);
    url.searchParams.set('timeMin', past.toISOString());
  }

  if (timeMax) {
    url.searchParams.set('timeMax', new Date(timeMax).toISOString());
  } else {
    // Default to 12 months in the future so all upcoming appointments are included
    const future = new Date();
    future.setMonth(future.getMonth() + 12);
    future.setHours(23, 59, 59, 999);
    url.searchParams.set('timeMax', future.toISOString());
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let rawErrorMessage = errorData?.error?.message || `Erro ${response.status} ao consultar o Google Calendar.`;
    const isAuth = isGoogleAuthError(response.status, rawErrorMessage);

    if (isAuth) {
      handleAuthError();
      rawErrorMessage = 'Sua credencial do Google Agenda expirou ou é inválida. Conecte-se novamente para renovar o acesso.';
    }
    
    addSyncLog({
      direction: 'google_to_crm',
      action: 'two_way_sync',
      status: 'error',
      title: isAuth ? 'Credencial do Google Agenda Expirada (401)' : `Falha ao Listar Eventos do Google Calendar (${response.status})`,
      details: rawErrorMessage,
      apiStatusCode: response.status,
      apiEndpoint: url.toString(),
      apiResponse: JSON.stringify(errorData, null, 2)
    });

    throw new Error(rawErrorMessage);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Create a new event on Google Calendar using current field mappings
 */
export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string; // ISO string
    endDateTime: string; // ISO string
    attendeeEmail?: string;
    reminders?: any;
  }
): Promise<GoogleCalendarEvent> {
  const payload: any = {
    summary: event.summary,
    description: event.description || '',
    location: event.location || '',
    start: {
      dateTime: event.startDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
    },
    end: {
      dateTime: event.endDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
    },
  };

  if (event.attendeeEmail && event.attendeeEmail.includes('@')) {
    payload.attendees = [{ email: event.attendeeEmail }];
  }

  if (event.reminders) {
    payload.reminders = event.reminders;
  }

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let rawErrorMessage = errorData?.error?.message || `Erro ${response.status} ao criar evento no Google Calendar.`;
    const isAuth = isGoogleAuthError(response.status, rawErrorMessage);

    if (isAuth) {
      handleAuthError();
      rawErrorMessage = 'Sua credencial do Google Agenda expirou ou é inválida. Conecte-se novamente para renovar o acesso.';
    }

    addSyncLog({
      direction: 'crm_to_google',
      action: 'create_event',
      status: 'error',
      title: isAuth ? 'Credencial do Google Agenda Expirada (401)' : `Erro de Envio ao Google Calendar (${response.status})`,
      details: rawErrorMessage,
      apiStatusCode: response.status,
      apiEndpoint: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      apiResponse: JSON.stringify(errorData, null, 2)
    });

    throw new Error(rawErrorMessage);
  }

  const created = await response.json();

  addSyncLog({
    direction: 'crm_to_google',
    action: 'create_event',
    status: 'success',
    title: `Evento Criado no Google Agenda`,
    details: `"${event.summary}" sincronizado com sucesso.`,
    apiStatusCode: 200,
    apiEndpoint: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    apiResponse: JSON.stringify({ id: created.id, status: created.status, summary: created.summary }, null, 2),
    affectedItem: event.summary,
    affectedCount: 1
  });

  return created;
}

/**
 * Delete an event on Google Calendar
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<boolean> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorData = await response.json().catch(() => ({}));
    let rawErrorMessage = errorData?.error?.message || `Erro ${response.status} ao excluir evento no Google Calendar.`;
    if (isGoogleAuthError(response.status, rawErrorMessage)) {
      handleAuthError();
      rawErrorMessage = 'Sua credencial do Google Agenda expirou ou é inválida. Conecte-se novamente para renovar o acesso.';
    }
    throw new Error(rawErrorMessage);
  }

  return true;
}

/**
 * Sync an array of CRM appointments to Google Calendar using mapped fields
 */
export async function syncAppointmentsToGoogle(
  accessToken: string,
  appointments: any[]
): Promise<SyncResult> {
  let syncedCount = 0;
  const errors: string[] = [];
  const mapping = getCalendarFieldMapping();

  for (const apt of appointments) {
    try {
      const eventPayload = buildGoogleEventFromAppointment(apt, mapping);

      await createCalendarEvent(accessToken, {
        summary: eventPayload.summary,
        description: eventPayload.description,
        location: eventPayload.location,
        startDateTime: eventPayload.startDateTime,
        endDateTime: eventPayload.endDateTime,
        reminders: eventPayload.reminders
      });

      syncedCount++;
    } catch (err: any) {
      console.error(`Falha ao sincronizar agendamento ID ${apt.id}:`, err);
      errors.push(`${apt.patient}: ${err.message || 'Erro desconhecido'}`);
    }
  }

  if (syncedCount > 0) {
    addSyncLog({
      direction: 'crm_to_google',
      action: 'sync_batch',
      status: errors.length > 0 ? 'warning' : 'success',
      title: `Lote de ${syncedCount} Agendamentos Enviado ao Google`,
      details: `${syncedCount} consultas enviadas com sucesso. ${errors.length > 0 ? `${errors.length} erro(s) encontrados.` : ''}`,
      apiStatusCode: 200,
      affectedCount: syncedCount
    });
  }

  return {
    syncedCount,
    importedCount: 0,
    errors,
  };
}

/**
 * Bidirectional Sync: Imports new or edited events from Google Calendar into CRM appointments
 */
export async function performBidirectionalSync(
  accessToken: string,
  currentAppointments: any[],
  options?: {
    defaultClinicId?: string;
    defaultClinicName?: string;
    defaultProfessional?: string;
  }
): Promise<{
  updatedAppointments: any[];
  importedCount: number;
  updatedCount: number;
  conflictsCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let importedCount = 0;
  let updatedCount = 0;
  let conflictsCount = 0;

  try {
    const googleEvents = await listCalendarEvents(accessToken);
    const existingById = new Map<string, any>();
    const existingByGoogleId = new Map<string, any>();

    currentAppointments.forEach(a => {
      existingById.set(a.id, a);
      if (a.googleEventId) {
        existingByGoogleId.set(a.googleEventId, a);
      }
    });

    const updatedList = [...currentAppointments];

    for (const ev of googleEvents) {
      if (!ev.id) continue;
      // Skip cancelled events from Google Calendar
      if ((ev as any).status === 'cancelled') {
        const cancelIdx = updatedList.findIndex(a => a.googleEventId === ev.id);
        if (cancelIdx !== -1) {
          updatedList[cancelIdx].status = 'cancelled';
          updatedList[cancelIdx].lastSyncedAt = new Date().toISOString();
        }
        continue;
      }

      // Determine date and time in local timezone
      let date = '';
      let time = '09:00';
      let duration = 45;

      if (ev.start?.dateTime) {
        const d = new Date(ev.start.dateTime);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        date = `${year}-${month}-${day}`;
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        time = `${h}:${m}`;

        if (ev.end?.dateTime) {
          const endD = new Date(ev.end.dateTime);
          const diffMinutes = Math.round((endD.getTime() - d.getTime()) / (60 * 1000));
          if (diffMinutes > 0) duration = diffMinutes;
        }
      } else if (ev.start?.date) {
        // All-day event (e.g. 2026-09-08)
        date = ev.start.date.split('T')[0];
        time = '08:00';
        duration = 60;
      }

      if (!date) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        date = `${year}-${month}-${day}`;
      }

      // Extract patient and procedure from summary
      let patient = ev.summary ? ev.summary.trim() : 'Compromisso Google Agenda';
      let procedure = 'Consulta Google Agenda';

      if (ev.summary) {
        if (ev.summary.includes(' - ')) {
          const parts = ev.summary.split(' - ');
          patient = parts[0].replace(/^(Consulta:\s*)/i, '').trim() || patient;
          procedure = parts.slice(1).join(' - ').trim() || procedure;
        } else if (ev.summary.includes(': ')) {
          const parts = ev.summary.split(': ');
          procedure = parts[0].trim() || procedure;
          patient = parts.slice(1).join(': ').trim() || patient;
        }
      }

      // Check if event already exists in CRM
      const existingMatch = existingByGoogleId.get(ev.id) || 
        updatedList.find(a => (a.googleEventId === ev.id) || (a.patient === patient && a.date === date && a.time === time));

      if (existingMatch) {
        // Check if date, time, or procedure changed in Google Calendar
        const hasChanged = existingMatch.date !== date || existingMatch.time !== time || existingMatch.patient !== patient;
        if (hasChanged) {
          existingMatch.date = date;
          existingMatch.time = time;
          existingMatch.duration = duration;
          existingMatch.patient = patient;
          existingMatch.procedure = procedure;
          existingMatch.lastSyncedAt = new Date().toISOString();
          existingMatch.source = 'google_calendar';
          existingMatch.googleEventId = ev.id;
          existingMatch.googleSyncStatus = 'synced';
          updatedCount++;
        }
      } else {
        // Create new CRM appointment from Google Calendar event
        const newApt = {
          id: `gcal_${ev.id}`,
          patient,
          phone: '',
          date,
          time,
          duration,
          procedure,
          professional: options?.defaultProfessional || 'Dr. Responsável',
          clinicId: options?.defaultClinicId || '1',
          clinicName: options?.defaultClinicName || 'Odonto Premium',
          status: 'confirmed' as const,
          notes: ev.description || (ev.location ? `Local: ${ev.location}` : `Sincronizado do Google Agenda`),
          source: 'google_calendar' as const,
          googleEventId: ev.id,
          googleSyncStatus: 'synced' as const,
          lastSyncedAt: new Date().toISOString()
        };

        // Check conflict with other appointments in CRM
        const collides = updatedList.some(other => {
          if (other.date !== date) return false;
          const [oh, om] = (other.time || '09:00').split(':').map(Number);
          const [th, tm] = time.split(':').map(Number);
          const oStart = oh * 60 + om;
          const oEnd = oStart + (other.duration || 45);
          const tStart = th * 60 + tm;
          const tEnd = tStart + duration;
          return tStart < oEnd && tEnd > oStart;
        });

        if (collides) {
          conflictsCount++;
        }

        updatedList.unshift(newApt);
        importedCount++;
      }
    }

    addSyncLog({
      direction: 'google_to_crm',
      action: 'two_way_sync',
      status: conflictsCount > 0 ? 'warning' : 'success',
      title: 'Sincronização Bidirecional Concluída',
      details: `${importedCount} novos eventos importados, ${updatedCount} atualizados do Google Calendar.${conflictsCount > 0 ? ` Atenção: ${conflictsCount} conflito(s) de horário detectado(s).` : ''}`,
      apiStatusCode: 200,
      affectedCount: importedCount + updatedCount
    });

    return {
      updatedAppointments: updatedList,
      importedCount,
      updatedCount,
      conflictsCount,
      errors
    };
  } catch (err: any) {
    errors.push(err.message || 'Erro na sincronização bidirecional');
    addSyncLog({
      direction: 'google_to_crm',
      action: 'two_way_sync',
      status: 'error',
      title: 'Erro na Sincronização Bidirecional',
      details: err.message || 'Falha ao sincronizar eventos com o CRM',
      apiStatusCode: 500
    });

    return {
      updatedAppointments: currentAppointments,
      importedCount: 0,
      updatedCount: 0,
      conflictsCount: 0,
      errors
    };
  }
}

