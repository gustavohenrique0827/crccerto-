import { getSupabase } from './supabase';

export interface AgentInfo { workflow_id?: string | null; workflow_nome?: string | null; waha_session?: string | null; webhook_url?: string | null; proximo_passo?: string | null }
export interface AgentStatus { ok: boolean; message?: string; session?: string; status?: string; me?: string | null; info?: AgentInfo | null; qr?: string | null }

async function call(body: Record<string, unknown>): Promise<AgentStatus & Record<string, any>> {
  const sb = getSupabase();
  const { data } = (await sb?.auth.getSession()) || { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) return { ok: false, message: 'Sem sessão.' };
  try {
    const res = await fetch('/api/implementacao/agent', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    return (await res.json().catch(() => null)) || { ok: false, message: `O servidor respondeu ${res.status}.` };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Sem conexão com o servidor.' };
  }
}

export const provisionAgent = (clinicId: string, p: { openaiApiKey: string; openaiOrganizationId?: string; telefoneAdmin: string }) => call({ action: 'provision', clinicId, ...p });
export const agentStatus = (clinicId: string) => call({ action: 'status', clinicId });
export const agentStart = (clinicId: string) => call({ action: 'start', clinicId });
export const agentQr = (clinicId: string) => call({ action: 'qr', clinicId });

/** Clínicas que já têm agente implantado (a view não expõe nada sensível). */
export async function fetchAgentSetups(): Promise<Record<string, AgentInfo>> {
  const sb = getSupabase();
  if (!sb) return {};
  const { data, error } = await sb.from('clinic_integrations_public').select('clinic_id,last_counts').eq('provider', 'agent');
  if (error) return {};
  return Object.fromEntries((data || []).map((r: any) => [r.clinic_id, (r.last_counts || {}) as AgentInfo]));
}
