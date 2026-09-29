// Centralized Sync History and Audit Logging for CRM Integrations

export interface SyncLogEntry {
  id: string;
  timestamp: string; // ISO string
  direction: 'crm_to_google' | 'google_to_crm' | 'webhook_to_crm' | 'crm_internal';
  action: 'create_event' | 'update_event' | 'delete_event' | 'import_batch' | 'sync_batch' | 'two_way_sync' | 'conflict_detected' | 'webhook_received' | 'queue_item' | 'queue_retry_success' | 'event_reminder';
  status: 'success' | 'error' | 'warning';
  title: string;
  details: string;
  apiStatusCode?: number;
  apiEndpoint?: string;
  apiResponse?: string;
  affectedItem?: string;
  affectedCount?: number;
  clinicName?: string;
}

const STORAGE_KEY = 'crm_sync_history_logs';

const INITIAL_LOGS: SyncLogEntry[] = [
  {
    id: 'log_seed_1',
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    direction: 'google_to_crm',
    action: 'two_way_sync',
    status: 'success',
    title: 'Sincronização Bidirecional Executada',
    details: '3 eventos atualizados e 1 novo agendamento importado do Google Calendar para o CRM com sucesso.',
    apiStatusCode: 200,
    apiEndpoint: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    apiResponse: JSON.stringify({ status: 200, itemsFound: 4, synced: 4, message: 'Events synced successfully' }, null, 2),
    affectedCount: 4,
    clinicName: 'Odonto Premium'
  },
  {
    id: 'log_seed_2',
    timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    direction: 'crm_to_google',
    action: 'create_event',
    status: 'success',
    title: 'Consulta Enviada ao Google Agenda',
    details: 'Agendamento de "Mariana Siqueira" (Implante Dentário) criado no calendário principal.',
    apiStatusCode: 200,
    apiEndpoint: 'https://www.googleapis.com/calendar/v3/calendars/primary/events (POST)',
    apiResponse: JSON.stringify({ id: 'gcal_ev_8492048', status: 'confirmed', summary: 'Consulta: Mariana Siqueira - Implante Dentário' }, null, 2),
    affectedItem: 'Mariana Siqueira',
    affectedCount: 1,
    clinicName: 'Odonto Premium'
  },
  {
    id: 'log_seed_3',
    timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    direction: 'crm_to_google',
    action: 'conflict_detected',
    status: 'warning',
    title: 'Conflito de Horário Detectado',
    details: 'Evento "Consulta Avaliação" colidiu com consulta pré-existente de "Carlos Eduardo" às 14:30.',
    apiStatusCode: 409,
    apiEndpoint: 'CRM Conflict Engine / Google Calendar Sync',
    apiResponse: JSON.stringify({ conflict: true, existingId: 'apt_102', incomingTime: '14:30', room: 'Consultório 1', resolution: 'marked_for_review' }, null, 2),
    affectedItem: 'Carlos Eduardo',
    affectedCount: 1,
    clinicName: 'Odonto Premium'
  },
  {
    id: 'log_seed_4',
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    direction: 'crm_to_google',
    action: 'create_event',
    status: 'error',
    title: 'Erro de API Google Calendar (403 Rate Limit)',
    details: 'Limite temporário de requisições por minuto excedido na API do Google Calendar. Tentativa reagendada automaticamente.',
    apiStatusCode: 403,
    apiEndpoint: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    apiResponse: JSON.stringify({
      error: {
        code: 403,
        message: 'Rate Limit Exceeded. User Rate Limit Exceeded.',
        errors: [{ domain: 'usageLimits', reason: 'userRateLimitExceeded', message: 'User Rate Limit Exceeded' }]
      }
    }, null, 2),
    affectedItem: 'Fernando Lima',
    affectedCount: 1,
    clinicName: 'Odonto Premium'
  },
  {
    id: 'log_seed_5',
    timestamp: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    direction: 'webhook_to_crm',
    action: 'webhook_received',
    status: 'success',
    title: 'Lead Recebido via Webhook Facebook Ads',
    details: 'Novo lead importado automaticamente da campanha "Implantes Estéticos".',
    apiStatusCode: 201,
    apiEndpoint: '/v1/webhook/lead',
    apiResponse: JSON.stringify({ status: 'created', leadId: 'lead_fb_9941', campaign: 'Implantes Estéticos' }, null, 2),
    affectedItem: 'Ana Clara Mendes',
    affectedCount: 1,
    clinicName: 'Odonto Premium'
  }
];

export function getSyncLogs(): SyncLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler logs de sincronização:', err);
    return INITIAL_LOGS;
  }
}

export function addSyncLog(entry: Omit<SyncLogEntry, 'id' | 'timestamp'>): SyncLogEntry {
  const newEntry: SyncLogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const current = getSyncLogs();
    const updated = [newEntry, ...current].slice(0, 200); // Keep last 200 logs
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('crm_sync_log_added', { detail: newEntry }));
  } catch (err) {
    console.error('Erro ao salvar log de sincronização:', err);
  }

  return newEntry;
}

export function clearSyncLogs(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('crm_sync_log_added', { detail: null }));
  } catch (err) {
    console.error('Erro ao limpar logs:', err);
  }
}

export function exportSyncLogsToCSV(): void {
  const logs = getSyncLogs();
  if (logs.length === 0) return;

  const headers = ['ID', 'Data/Hora', 'Direção', 'Ação', 'Status', 'Código HTTP', 'Título', 'Item Afetado', 'Detalhes'];
  const rows = logs.map(l => [
    l.id,
    new Date(l.timestamp).toLocaleString('pt-BR'),
    l.direction,
    l.action,
    l.status,
    l.apiStatusCode || '-',
    `"${(l.title || '').replace(/"/g, '""')}"`,
    `"${(l.affectedItem || '-').replace(/"/g, '""')}"`,
    `"${(l.details || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `historico_sincronizacao_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
