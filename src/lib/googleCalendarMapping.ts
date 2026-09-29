// Google Calendar Field Mapping Configuration & Serializers

export interface GoogleCalendarFieldMapping {
  // Field for Google Calendar Summary (Event Title)
  summaryPattern: '{patient} - {procedure}' | '{patient} ({clinic})' | '{procedure} - {patient}' | 'custom';
  customSummaryFormat: string;

  // Field for Start and End Date/Time
  startDateTimeField: 'crm_date_and_time'; // Combines 'Data da Consulta' and 'Horário'
  durationField: 'crm_duration_minutes'; // 'Duração da Consulta' (minutes)
  defaultDurationMinutes: number;

  // Fields for Google Calendar Description
  descriptionFields: {
    patientName: boolean;
    procedure: boolean;
    professional: boolean;
    clinicName: boolean;
    phone: boolean;
    notes: boolean;
    crmId: boolean;
    status: boolean;
  };

  // Field for Google Calendar Location
  locationField: 'clinic_name' | 'clinic_address' | 'custom';
  customLocationText: string;

  // Reminders & Notifications (Google Calendar native)
  defaultReminderMinutes: number; // 15, 30, 60, 1440
  enablePopupReminder: boolean;

  // CRM In-App / Push / Email Reminders for Synced Google Events
  crmReminders: {
    enabled: boolean;
    channel: 'push' | 'email' | 'both';
    timingMinutesBefore: number; // 15, 30, 60, 120, 1440
    notifyDoctor: boolean;
    notifyPatient: boolean;
    alertSound: boolean;
    emailTemplate: string;
  };

  // Two-way synchronization & conflict preferences
  twoWaySyncEnabled: boolean;
  autoSyncOnCreate: boolean;
  conflictStrategy: 'highlight_conflicts' | 'warn_only';
}

const STORAGE_KEY = 'crm_gcal_field_mapping';

export const DEFAULT_MAPPING: GoogleCalendarFieldMapping = {
  summaryPattern: '{patient} - {procedure}',
  customSummaryFormat: 'Consulta: {patient} - {procedure}',
  startDateTimeField: 'crm_date_and_time',
  durationField: 'crm_duration_minutes',
  defaultDurationMinutes: 45,
  descriptionFields: {
    patientName: true,
    procedure: true,
    professional: true,
    clinicName: true,
    phone: true,
    notes: true,
    crmId: true,
    status: true,
  },
  locationField: 'clinic_name',
  customLocationText: 'Unidade Principal',
  defaultReminderMinutes: 30,
  enablePopupReminder: true,
  crmReminders: {
    enabled: true,
    channel: 'push',
    timingMinutesBefore: 30,
    notifyDoctor: true,
    notifyPatient: true,
    alertSound: true,
    emailTemplate: 'Lembrete de consulta para {patient}: agendada com {professional} às {time} do dia {date} na unidade {clinic}.',
  },
  twoWaySyncEnabled: true,
  autoSyncOnCreate: true,
  conflictStrategy: 'highlight_conflicts',
};

export function getCalendarFieldMapping(): GoogleCalendarFieldMapping {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MAPPING));
      return DEFAULT_MAPPING;
    }
    return { ...DEFAULT_MAPPING, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Erro ao ler mapeamento de campos do Google Calendar:', err);
    return DEFAULT_MAPPING;
  }
}

export function saveCalendarFieldMapping(mapping: GoogleCalendarFieldMapping): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
    window.dispatchEvent(new CustomEvent('crm_gcal_mapping_changed', { detail: mapping }));
  } catch (err) {
    console.error('Erro ao salvar mapeamento:', err);
  }
}

/**
 * Builds a Google Calendar Event payload using mapped fields from a CRM appointment
 */
export function buildGoogleEventFromAppointment(
  apt: {
    id: string;
    patient: string;
    date: string;
    time: string;
    duration?: number;
    procedure?: string;
    professional?: string;
    clinicName?: string;
    phone?: string;
    notes?: string;
    status?: string;
  },
  mapping = getCalendarFieldMapping()
) {
  // 1. Format Title / Summary
  let summary = `Consulta: ${apt.patient || 'Paciente'} - ${apt.procedure || 'Atendimento'}`;
  if (mapping.summaryPattern === '{patient} - {procedure}') {
    summary = `${apt.patient || 'Paciente'} - ${apt.procedure || 'Consulta'}`;
  } else if (mapping.summaryPattern === '{patient} ({clinic})') {
    summary = `${apt.patient || 'Paciente'} (${apt.clinicName || 'Clínica'})`;
  } else if (mapping.summaryPattern === '{procedure} - {patient}') {
    summary = `${apt.procedure || 'Consulta'} - ${apt.patient || 'Paciente'}`;
  } else if (mapping.summaryPattern === 'custom' && mapping.customSummaryFormat) {
    summary = mapping.customSummaryFormat
      .replace('{patient}', apt.patient || '')
      .replace('{procedure}', apt.procedure || '')
      .replace('{clinic}', apt.clinicName || '')
      .replace('{professional}', apt.professional || '');
  }

  // 2. Format Start and End DateTime
  const [year, month, day] = (apt.date || new Date().toISOString().split('T')[0]).split('-').map(Number);
  const [hour, minute] = (apt.time || '09:00').split(':').map(Number);
  const startDate = new Date(year, month - 1, day, hour || 9, minute || 0, 0);
  const duration = apt.duration || mapping.defaultDurationMinutes || 45;
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

  // 3. Format Description
  const descLines: string[] = ['=== AGENDAMENTO LEADGEN CRM ==='];
  if (mapping.descriptionFields.patientName) descLines.push(`Paciente: ${apt.patient}`);
  if (mapping.descriptionFields.procedure) descLines.push(`Procedimento: ${apt.procedure || 'Não informado'}`);
  if (mapping.descriptionFields.professional) descLines.push(`Profissional: ${apt.professional || 'A definir'}`);
  if (mapping.descriptionFields.clinicName) descLines.push(`Unidade: ${apt.clinicName || 'Clínica'}`);
  if (mapping.descriptionFields.phone && apt.phone) descLines.push(`Telefone/WhatsApp: ${apt.phone}`);
  if (mapping.descriptionFields.status && apt.status) descLines.push(`Status: ${apt.status.toUpperCase()}`);
  if (mapping.descriptionFields.notes && apt.notes) descLines.push(`Observações: ${apt.notes}`);
  if (mapping.descriptionFields.crmId) descLines.push(`CRM ID Ref: ${apt.id}`);

  // 4. Format Location
  let location = apt.clinicName || 'Clínica';
  if (mapping.locationField === 'custom' && mapping.customLocationText) {
    location = mapping.customLocationText;
  }

  return {
    summary,
    description: descLines.join('\n'),
    location,
    startDateTime: startDate.toISOString(),
    endDateTime: endDate.toISOString(),
    reminders: mapping.enablePopupReminder
      ? {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: mapping.defaultReminderMinutes || 30 }],
        }
      : undefined,
  };
}
