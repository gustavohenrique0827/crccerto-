import { getSupabase } from './supabase';

export interface LiveChat {
  session: string;
  chatId: string;
  phone: string;
  name: string;
  leadId: string | null;
  leadName: string | null;
  status: string | null;
  last: { body: string; at: string | null; fromMe: boolean };
}
export interface LiveMessage { id: string; session: string; fromMe: boolean; text: string; hasMedia: boolean; at: string }

interface LiveResult<T> { ok: boolean; source: 'waha' | 'none'; reason?: string; data: T }

async function call<T>(body: Record<string, unknown>, pick: (j: any) => T, empty: T): Promise<LiveResult<T>> {
  const sb = getSupabase();
  const { data } = (await sb?.auth.getSession()) || { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) return { ok: false, source: 'none', reason: 'Sem sessão.', data: empty };
  try {
    const res = await fetch('/api/whatsapp/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const j = await res.json().catch(() => null);
    if (!j) return { ok: false, source: 'none', reason: `O servidor respondeu ${res.status}.`, data: empty };
    if (j.ok === false) return { ok: false, source: 'none', reason: j.message, data: empty };
    return { ok: true, source: j.source === 'waha' ? 'waha' : 'none', reason: j.reason, data: pick(j) };
  } catch (e: any) {
    return { ok: false, source: 'none', reason: e?.message || 'Sem conexão com o servidor.', data: empty };
  }
}

export const fetchLiveChats = (clinicId: string) =>
  call<LiveChat[]>({ action: 'chats', clinicId }, j => (j.chats || []) as LiveChat[], []);

export const fetchLiveMessages = (clinicId: string, target: { leadId?: string; phone?: string; chatId?: string; session?: string }) =>
  call<LiveMessage[]>({ action: 'messages', clinicId, ...target }, j => (j.messages || []) as LiveMessage[], []);
