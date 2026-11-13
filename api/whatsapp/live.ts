/**
 * Mensageria ao vivo: lê as conversas direto do WAHA, na hora, sem depender do n8n nem do banco.
 * A chave do WAHA fica só no servidor.
 *
 * Variáveis de ambiente (Vercel, sem prefixo VITE_):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   WAHA_URL      ex.: https://waha.spycrm.com.br
 *   WAHA_API_KEY  a mesma chave (X-Api-Key) do WAHA
 *
 * POST /api/whatsapp/live  { action: 'chats' | 'messages', clinicId, ... }
 *   chats:    { clinicId }                          -> últimas conversas de todas as sessões da clínica
 *   messages: { clinicId, leadId? | phone?, chatId?, session? }  -> mensagens da conversa (até 300 por sessão)
 * Authorization: Bearer <token da sessão do Supabase>. O acesso à clínica é conferido aqui.
 */
import { createClient } from '@supabase/supabase-js';

interface Req { method?: string; headers: Record<string, string | string[] | undefined>; body?: any }
interface Res { status: (c: number) => Res; json: (b: unknown) => void }

const env = (k: string) => (process.env[k] || '').trim();
const fail = (res: Res, code: number, message: string) => res.status(code).json({ ok: false, message });
const digits = (v: unknown) => String(v || '').replace(/\D/g, '');
const key8 = (v: unknown) => { const d = digits(v); return d.length >= 8 ? d.slice(-8) : ''; };

/** Número brasileiro com e sem o 9 depois do DDD: o WhatsApp às vezes guarda um e o CRM o outro. */
function variants(phone: unknown): string[] {
  let d = digits(phone);
  if (!d) return [];
  if (d.length <= 11) d = `55${d}`;
  const out = new Set([d]);
  if (d.startsWith('55')) {
    const ddd = d.slice(2, 4);
    const rest = d.slice(4);
    if (rest.length === 9 && rest.startsWith('9')) out.add(`55${ddd}${rest.slice(1)}`);
    if (rest.length === 8) out.add(`55${ddd}9${rest}`);
  }
  return [...out];
}

async function waha(path: string, ms = 8000): Promise<any | null> {
  const base = env('WAHA_URL').replace(/\/$/, '');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${base}${path}`, { headers: { 'X-Api-Key': env('WAHA_API_KEY') }, signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const mediaLabel = (m: any) => {
  const mime = String(m?.media?.mimetype || m?._data?.mimetype || m?.type || '');
  if (/image/i.test(mime)) return '📷 Imagem';
  if (/audio|ptt/i.test(mime)) return '🎧 Áudio';
  if (/video/i.test(mime)) return '🎥 Vídeo';
  if (/sticker|webp/i.test(mime)) return 'Figurinha';
  return '📎 Arquivo';
};

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return fail(res, 405, 'Use POST.');
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(k => !env(k));
  if (missing.length) return fail(res, 500, `Variáveis ausentes no servidor: ${missing.join(', ')}`);
  if (!env('WAHA_URL') || !env('WAHA_API_KEY')) {
    return res.status(200).json({ ok: true, source: 'none', reason: 'WAHA_URL e WAHA_API_KEY ainda não foram configuradas na Vercel.' });
  }

  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return fail(res, 401, 'Entre no sistema para ver as conversas.');
  const { data: u, error: ue } = await sb.auth.getUser(token);
  if (ue || !u.user) return fail(res, 401, 'Sessão inválida. Entre novamente.');
  const { data: prof } = await sb.from('profiles').select('role,is_active,clinic_id,default_clinic_id,accessible_clinic_ids').eq('id', u.user.id).maybeSingle();
  if (!prof || prof.is_active === false) return fail(res, 403, 'Usuário sem acesso.');

  const body = req.body || {};
  const clinicId = String(body.clinicId || '');
  if (!clinicId) return fail(res, 400, 'Informe a clínica (clinicId).');
  const mine = new Set([prof.clinic_id, prof.default_clinic_id, ...(prof.accessible_clinic_ids || [])].filter(Boolean));
  if (prof.role !== 'super_admin' && !mine.has(clinicId)) return fail(res, 403, 'Você não tem acesso a esta clínica.');

  // Sessões do WAHA desta clínica (cada sessão é um número de WhatsApp)
  const { data: tenants } = await sb.from('waha_tenants').select('waha_session,ativo').eq('clinic_id', clinicId);
  const sessions: string[] = (tenants || []).filter((t: any) => t.ativo !== false && t.waha_session).map((t: any) => t.waha_session);
  if (sessions.length === 0) return res.status(200).json({ ok: true, source: 'none', reason: 'Esta clínica não tem sessão de WhatsApp cadastrada.' });

  try {
    if (body.action === 'chats') {
      const { data: leadRows } = await sb.from('leads').select('id,name,phone,whatsapp,status').eq('clinic_id', clinicId).limit(5000);
      const byKey = new Map<string, any>();
      (leadRows || []).forEach((l: any) => { [key8(l.whatsapp), key8(l.phone)].filter(Boolean).forEach(k => { if (!byKey.has(k)) byKey.set(k, l); }); });

      const lists = await Promise.all(sessions.map(async s => ({ s, rows: (await waha(`/api/${encodeURIComponent(s)}/chats/overview?limit=80`)) as any[] | null })));
      const reachable = lists.some(l => Array.isArray(l.rows));
      const out = new Map<string, any>();
      for (const { s, rows } of lists) {
        for (const c of rows || []) {
          const id = String(c.id || '');
          if (!id || /@g\.us$|@newsletter$|^status@broadcast$/.test(id)) continue;
          const last = c.lastMessage || {};
          const at = last.timestamp ? new Date(Number(last.timestamp) * 1000).toISOString() : null;
          const phone = /@c\.us$/.test(id) ? digits(id) : '';
          const lead = phone ? byKey.get(key8(phone)) : undefined;
          const k = phone ? key8(phone) : id;
          const item = {
            session: s, chatId: id, phone, name: c.name || '', leadId: lead?.id || null, leadName: lead?.name || null, status: lead?.status || null,
            last: { body: last.body || (last.hasMedia ? mediaLabel(last) : ''), at, fromMe: !!last.fromMe }
          };
          const prev = out.get(k);
          if (!prev || (item.last.at || '') > (prev.last.at || '')) out.set(k, item);
        }
      }
      const chats = [...out.values()].sort((a, b) => (b.last.at || '').localeCompare(a.last.at || ''));
      return res.status(200).json({ ok: true, source: reachable ? 'waha' : 'none', reason: reachable ? undefined : 'O WAHA não respondeu.', chats });
    }

    if (body.action === 'messages') {
      let chatIds: string[] = [];
      let useSessions = sessions;
      if (body.chatId && body.session) {
        // conversa escolhida na lista: a sessão precisa ser da clínica
        if (!sessions.includes(String(body.session))) return fail(res, 403, 'Sessão não pertence a esta clínica.');
        chatIds = [String(body.chatId)];
        useSessions = [String(body.session)];
      } else {
        let phones: unknown[] = [body.phone];
        if (body.leadId) {
          const { data: lead } = await sb.from('leads').select('clinic_id,phone,whatsapp').eq('id', String(body.leadId)).maybeSingle();
          if (!lead || lead.clinic_id !== clinicId) return fail(res, 404, 'Lead não encontrado nesta clínica.');
          phones = [lead.whatsapp, lead.phone];
        }
        chatIds = [...new Set(phones.flatMap(p => variants(p)))].slice(0, 4).map(n => `${n}@c.us`);
      }
      if (chatIds.length === 0) return res.status(200).json({ ok: true, source: 'none', reason: 'Contato sem telefone.', messages: [] });

      const jobs = useSessions.flatMap(s => chatIds.map(async c => ({ s, c, rows: (await waha(`/api/${encodeURIComponent(s)}/chats/${encodeURIComponent(c)}/messages?limit=300&downloadMedia=false`)) as any[] | null })));
      const results = await Promise.all(jobs);
      const reachable = results.some(r => Array.isArray(r.rows));
      const seen = new Map<string, any>();
      for (const { s, rows } of results) {
        for (const m of rows || []) {
          const id = String(m.id?._serialized || m.id || '');
          if (!id || seen.has(id)) continue;
          seen.set(id, {
            id, session: s, fromMe: !!m.fromMe,
            text: (m.body || '').toString() || (m.hasMedia ? mediaLabel(m) : ''),
            hasMedia: !!m.hasMedia,
            at: new Date(Number(m.timestamp) * 1000).toISOString()
          });
        }
      }
      const messages = [...seen.values()].filter(m => m.text).sort((a, b) => a.at.localeCompare(b.at));
      return res.status(200).json({ ok: true, source: reachable ? 'waha' : 'none', reason: reachable ? undefined : 'O WAHA não respondeu.', messages });
    }

    return fail(res, 400, 'Ação desconhecida.');
  } catch (e: any) {
    return fail(res, 502, e?.message || 'Falha ao ler o WAHA.');
  }
}
