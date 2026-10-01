import { getSupabase } from './supabase';

export interface ClinicorpSyncResult {
  ok: boolean;
  message?: string;
  dryRun?: boolean;
  professionals?: number;
  patients?: number;
  appointments?: number;
  skippedBlocked?: number;
  range?: { from: string; to: string };
}

/** Chama a função do servidor (/api/clinicorp/sync) com a sessão do usuário logado. */
export async function runClinicorpSync(opts: { dryRun?: boolean; daysBack?: number; daysForward?: number } = {}): Promise<ClinicorpSyncResult> {
  const sb = getSupabase();
  const { data } = (await sb?.auth.getSession()) || { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) return { ok: false, message: 'Entre no sistema (login do Supabase) para sincronizar com o Clinicorp.' };

  try {
    const res = await fetch('/api/clinicorp/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(opts)
    });
    const json = await res.json().catch(() => null);
    if (!json) return { ok: false, message: `O servidor respondeu ${res.status} sem detalhes. A função /api/clinicorp/sync está publicada no Vercel?` };
    return json;
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Não foi possível falar com o servidor.' };
  }
}
