import { getSupabase } from './supabase';

export interface ClinicorpSyncResult {
  ok: boolean;
  message?: string;
  dryRun?: boolean;
  professionals?: number;
  patients?: number;
  appointments?: number;
  skippedBlocked?: number;
  blockedSlots?: number;
  tags?: number;
  warning?: string;
  range?: { from: string; to: string };
  /** Leads que a automação moveu de etapa conforme a agenda */
  leadsMoved?: { agendamento: number; compareceu: number; faltou: number };
}

export interface ClinicIntegration {
  clinicId: string;
  subscriberId: string | null;
  hasKey: boolean;
  enabled: boolean;
  autoSync: boolean;
  lastSyncAt: string | null;
  lastStatus: 'ok' | 'error' | null;
  lastMessage: string | null;
}

/** Chama a função do servidor (/api/clinicorp/sync) com a sessão do usuário logado. */
async function callServer(body: Record<string, unknown>): Promise<ClinicorpSyncResult> {
  const sb = getSupabase();
  const { data } = (await sb?.auth.getSession()) || { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) return { ok: false, message: 'Entre no sistema (login do Supabase) para usar o Clinicorp.' };

  try {
    const res = await fetch('/api/clinicorp/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => null);
    if (!json) return { ok: false, message: `O servidor respondeu ${res.status} sem detalhes. A função /api/clinicorp/sync está publicada no Vercel?` };
    return json;
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Não foi possível falar com o servidor.' };
  }
}

export function runClinicorpSync(opts: { clinicId: string; dryRun?: boolean; daysBack?: number; daysForward?: number }) {
  return callServer({ action: 'sync', ...opts });
}
export function connectClinicorp(clinicId: string, subscriberId: string, apiKey: string, autoSync = true) {
  return callServer({ action: 'connect', clinicId, subscriberId, apiKey, autoSync });
}
export function disconnectClinicorp(clinicId: string) {
  return callServer({ action: 'disconnect', clinicId });
}
export function setClinicorpAutoSync(clinicId: string, autoSync: boolean) {
  return callServer({ action: 'settings', clinicId, autoSync });
}

/** Estado da conexão de cada clínica (a view não expõe a chave). */
export async function fetchClinicIntegrations(): Promise<ClinicIntegration[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('clinic_integrations_public').select('*').eq('provider', 'clinicorp');
  if (error) return []; // migration ainda não rodada
  return (data || []).map((r: any) => ({
    clinicId: r.clinic_id, subscriberId: r.subscriber_id, hasKey: !!r.has_key, enabled: !!r.enabled, autoSync: !!r.auto_sync,
    lastSyncAt: r.last_sync_at, lastStatus: r.last_status, lastMessage: r.last_message
  }));
}

export interface ClinicorpWriteResult { ok: boolean; message?: string; clinicorpId?: string }

/** Cria o paciente no Clinicorp (e no CRM). */
export function createClinicorpPatient(clinicId: string, p: { name: string; phone: string; email?: string; birthDate?: string; notes?: string; ignoreSameName?: boolean }) {
  return callServer({ action: 'create_patient', clinicId, ...p }) as Promise<ClinicorpWriteResult>;
}
/** Cria o agendamento no Clinicorp; o CRM recebe o registro pela sincronização logo em seguida. */
export function createClinicorpAppointment(clinicId: string, a: { patient: string; phone: string; email?: string; date: string; time: string; duration: number; professional: string; procedure?: string; ignoreSameName?: boolean }) {
  return callServer({ action: 'create_appointment', clinicId, ...a }) as Promise<ClinicorpWriteResult>;
}
export function confirmClinicorpAppointment(clinicId: string, appointmentId: string) {
  return callServer({ action: 'confirm_appointment', clinicId, appointmentId }) as Promise<ClinicorpWriteResult>;
}
export function cancelClinicorpAppointment(clinicId: string, appointmentId: string) {
  return callServer({ action: 'cancel_appointment', clinicId, appointmentId }) as Promise<ClinicorpWriteResult>;
}
