/**
 * Chat ao vivo: lê as conversas direto do WAHA, na hora, sem depender do n8n nem do banco.
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
 *   media:    { clinicId, session, chatId, messageId }  -> o arquivo (áudio, imagem, vídeo, documento) em binário
 * Authorization: Bearer <token da sessão do Supabase>. O acesso à clínica é conferido aqui.
 */
import { createClient } from '@supabase/supabase-js';

interface Req { method?: string; headers: Record<string, string | string[] | undefined>; body?: any }
interface Res { status: (c: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void; send: (b: any) => void }

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

async function wahaPost(path: string, payload: unknown, ms = 15000): Promise<{ ok: boolean; status: number; json: any }> {
  const base = env('WAHA_URL').replace(/\/$/, '');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${base}${path}`, { method: 'POST', headers: { 'X-Api-Key': env('WAHA_API_KEY'), 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
    return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) };
  } catch {
    return { ok: false, status: 0, json: null };
  } finally {
    clearTimeout(t);
  }
}

async function wahaRaw(path: string, ms = 10000): Promise<{ status: number; json: any }> {
  const base = env('WAHA_URL').replace(/\/$/, '');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${base}${path}`, { headers: { 'X-Api-Key': env('WAHA_API_KEY') }, signal: ctrl.signal });
    return { status: r.status, json: await r.json().catch(() => null) };
  } catch {
    return { status: 0, json: null };
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

/** Lê as etiquetas do WhatsApp (WAHA) e coloca cada lead na etapa certa. apply=false só mostra o que mudaria. */
async function syncLabels(sb: any, clinicId: string, sessions: string[], apply: boolean) {
  // Lê as etiquetas do WhatsApp (WAHA) e coloca cada lead na etapa certa. apply=false só mostra o que mudaria.
  const norm = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const ruleFor = (name: string): string | null => {
    const n = norm(name);
    if (n.includes('paciente')) return 'paciente';
    if (n.includes('nao veio')) return 'faltou';
    if (n.includes('avaliacao feita')) return 'compareceu';
    if (n.includes('avaliacao agendada')) return 'agendamento';
    if (n.includes('follow') || n.includes('retornar contato')) return '2_contato';
    return null;
  };
  const PRIORITY = ['paciente', 'faltou', 'compareceu', 'agendamento', '2_contato'];
  const EARLY = new Set(['novo', 'contatado', '1_contato', '2_contato', '3_contato', 'interagiu', 'agendou']);
  const LOCKED = new Set(['vendido', 'comprou', 'desqualificado', 'perdido', 'paciente']);
  const forStatus = new Map<string, Set<string>>(); // chave do telefone -> estados sugeridos
  const perLabel: any[] = [];
  let unresolved = 0;
  let lidsLoaded = 0;
  for (const session of sessions) {
    const sess = encodeURIComponent(session);
    const labels = await waha(`/api/${sess}/labels`);
    if (!Array.isArray(labels)) continue;
    // Mapa lid -> telefone de uma vez só (uma chamada em vez de uma por contato)
    const lidMap = new Map<string, string>();
    const lids = await waha(`/api/${sess}/lids?limit=5000`, 20000);
    lidsLoaded += Array.isArray(lids) ? lids.length : 0;
    if (Array.isArray(lids)) for (const x of lids) { if (x?.lid && x?.pn) lidMap.set(String(x.lid), String(x.pn)); }
    await Promise.all(labels.map(async (l: any) => {
      const target = ruleFor(String(l.name || ''));
      if (!target) { perLabel.push({ label: l.name, regra: 'ignorada', chats: 0 }); return; }
      const chatsRes = await wahaRaw(`/api/${sess}/labels/${encodeURIComponent(String(l.id))}/chats`, 20000);
      const list: any[] = Array.isArray(chatsRes.json) ? chatsRes.json : [];
      let matched = 0;
      for (const c of list) {
        let id = String(c?.id?._serialized || c?.id || '');
        if (id.endsWith('@g.us')) continue;
        if (id.endsWith('@lid')) {
          const pn = lidMap.get(id) || '';
          if (!pn) { unresolved++; continue; }
          id = pn;
        }
        const k = key8(id.split('@')[0]);
        if (!k) continue;
        matched++;
        if (!forStatus.has(k)) forStatus.set(k, new Set());
        forStatus.get(k)!.add(target);
      }
      perLabel.push({ label: l.name, regra: target, httpStatus: chatsRes.status, chats: list.length, comTelefone: matched });
    }));
  }
  const { data: leadRows } = await sb.from('leads').select('id,name,phone,whatsapp,status').eq('clinic_id', clinicId).limit(5000);
  const moves: Record<string, string[]> = {};
  let touched = 0;
  for (const l of leadRows || []) {
    const ks = [key8(l.whatsapp), key8(l.phone)].filter(Boolean);
    const sug = new Set<string>();
    ks.forEach(k => forStatus.get(k)?.forEach(x => sug.add(x)));
    if (sug.size === 0) continue;
    const target = PRIORITY.find(x => sug.has(x))!;
    const cur = String(l.status);
    if (LOCKED.has(cur) || cur === target) continue;
    if (target !== 'paciente' && !EARLY.has(cur) && cur !== 'faltou') continue;
    (moves[target] ||= []).push(l.id);
    touched++;
  }
  const erros: string[] = [];
  if (apply) {
    for (const [st, ids] of Object.entries(moves)) {
      for (let i = 0; i < ids.length; i += 200) {
        const { error } = await sb.from('leads').update({ status: st }).in('id', ids.slice(i, i + 200));
        if (error) { erros.push(error.message.includes('invalid input value for enum') ? 'A etapa "Paciente" ainda não existe no banco. Rode no Supabase: ALTER TYPE lead_status ADD VALUE IF NOT EXISTS \'paciente\';' : error.message); break; }
      }
    }
  }
  return { ok: true, source: 'waha', aplicado: apply, leadsAfetados: touched, porEtapa: Object.fromEntries(Object.entries(moves).map(([k, v]) => [k, v.length])), porEtiqueta: perLabel, semTelefoneResolvido: unresolved, lidsCarregados: lidsLoaded, erros };
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST' && req.method !== 'GET') return fail(res, 405, 'Use POST.');
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(k => !env(k));
  if (missing.length) return fail(res, 500, `Variáveis ausentes no servidor: ${missing.join(', ')}`);
  if (!env('WAHA_URL') || !env('WAHA_API_KEY')) {
    return res.status(200).json({ ok: true, source: 'none', reason: 'WAHA_URL e WAHA_API_KEY ainda não foram configuradas na Vercel.' });
  }

  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  // Agendador (Vercel Schedules, a cada 15 min): aplica as etiquetas do WhatsApp em todas as clínicas, sem ninguém com a tela aberta
  const cronSecret = env('CRON_SECRET');
  if (cronSecret && token.length === cronSecret.length && token === cronSecret) {
    const byClinic = new Map<string, Set<string>>();
    const add = (cid: unknown, sess: unknown) => { if (cid && sess) { const k = String(cid); if (!byClinic.has(k)) byClinic.set(k, new Set()); byClinic.get(k)!.add(String(sess)); } };
    const { data: tn } = await sb.from('waha_tenants').select('clinic_id,waha_session,ativo');
    (tn || []).filter((t: any) => t.ativo !== false).forEach((t: any) => add(t.clinic_id, t.waha_session));
    const { data: ag } = await sb.from('clinic_integrations').select('clinic_id,subscriber_id').eq('provider', 'agent');
    (ag || []).forEach((a: any) => add(a.clinic_id, a.subscriber_id));
    const results: any[] = [];
    for (const [cid, sess] of byClinic) {
      try {
        const r = await syncLabels(sb, cid, [...sess], true);
        results.push({ clinicId: cid, leadsAfetados: r.leadsAfetados, porEtapa: r.porEtapa, erros: r.erros });
      } catch (e: any) {
        results.push({ clinicId: cid, erro: e?.message || 'falhou' });
      }
    }
    const resumo = results.map(r => r.erro ? `${r.clinicId}: ERRO ${r.erro}` : `${r.clinicId}: ${r.leadsAfetados} lead(s) movido(s) ${JSON.stringify(r.porEtapa || {})}${r.erros?.length ? ` | avisos: ${r.erros.join('; ')}` : ''}`);
    console.log(`[etiquetas] ${new Date().toISOString()} ${results.length} clínica(s). ${resumo.join(' || ') || 'nenhuma clínica com sessão de WhatsApp'}`);
    return res.status(200).json({ ok: true, cron: true, clinicas: results });
  }
  if (req.method !== 'POST') return fail(res, 405, 'Use POST.');
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
  // Sessão do agente implantado pelo painel (clínica nova): também aparece no Chat
  const { data: agentRow } = await sb.from('clinic_integrations').select('subscriber_id').eq('clinic_id', clinicId).eq('provider', 'agent').maybeSingle();
  if (agentRow?.subscriber_id && !sessions.includes(agentRow.subscriber_id)) sessions.push(agentRow.subscriber_id);
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

    if (body.action === 'media') {
      const session = String(body.session || '');
      const chatId = String(body.chatId || '');
      const messageId = String(body.messageId || '');
      if (!sessions.includes(session)) return fail(res, 403, 'Sessão não pertence a esta clínica.');
      if (!chatId || !messageId) return fail(res, 400, 'Informe a conversa e a mensagem.');
      const full = await waha(`/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}?downloadMedia=true`, 25000);
      const murl: string | undefined = full?.media?.url;
      if (!murl) return fail(res, 404, 'Não foi possível baixar este arquivo do WhatsApp.');
      // O WAHA devolve o endereço interno (localhost): trocamos pelo público e mantemos só o caminho do arquivo
      const path = new URL(murl, 'http://x').pathname;
      const r = await fetch(`${env('WAHA_URL').replace(/\/$/, '')}${path}`, { headers: { 'X-Api-Key': env('WAHA_API_KEY') } });
      if (!r.ok) return fail(res, 404, 'O arquivo não está mais disponível.');
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 4_300_000) return fail(res, 413, 'Arquivo grande demais para abrir aqui (mais de 4 MB). Abra no celular.');
      res.setHeader('Content-Type', String(full.media.mimetype || r.headers.get('content-type') || 'application/octet-stream').split(';')[0]);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.status(200).send(buf);
    }

    if (body.action === 'send') {
      const text = String(body.text || '').trim();
      if (!text) return fail(res, 400, 'Escreva a mensagem.');
      let session = sessions[0];
      let chatId = '';
      if (body.chatId && body.session) {
        if (!sessions.includes(String(body.session))) return fail(res, 403, 'Sessão não pertence a esta clínica.');
        session = String(body.session);
        chatId = String(body.chatId);
      } else {
        let phones: unknown[] = [body.phone];
        if (body.leadId) {
          const { data: lead } = await sb.from('leads').select('clinic_id,phone,whatsapp').eq('id', String(body.leadId)).maybeSingle();
          if (!lead || lead.clinic_id !== clinicId) return fail(res, 404, 'Lead não encontrado nesta clínica.');
          phones = [lead.whatsapp, lead.phone];
        }
        const nums = [...new Set(phones.flatMap(p => variants(p)))].slice(0, 4);
        if (nums.length === 0) return fail(res, 400, 'Este contato não tem telefone cadastrado.');
        // descobre qual variação do número (com ou sem o 9) existe no WhatsApp
        let found = '';
        for (const n of nums) {
          const chk = await waha(`/api/contacts/check-exists?phone=${n}&session=${encodeURIComponent(session)}`);
          if (chk?.numberExists) { found = String(chk.chatId || `${n}@c.us`); break; }
        }
        chatId = found || `${nums[0]}@c.us`;
      }
      const r = await wahaPost('/api/sendText', { session, chatId, text });
      if (!r.ok) return fail(res, 502, r.status === 0 ? 'O WAHA não respondeu. Tente de novo em instantes.' : `O WhatsApp recusou o envio (${r.status}). Verifique se a sessão está conectada.`);
      return res.status(200).json({ ok: true, source: 'waha', chatId, session });
    }

    if (body.action === 'diagnose') {
      // Só leitura: mostra se o WAHA devolve etiquetas e quais contatos têm nome salvo
      const out: any[] = [];
      for (const session of sessions) {
        const sess = encodeURIComponent(session);
        const labels = await wahaRaw(`/api/${sess}/labels`);
        const contacts = await wahaRaw(`/api/contacts/all?session=${sess}&limit=300`);
        const list: any[] = Array.isArray(contacts.json) ? contacts.json : [];
        const people = list.filter(c => String(c?.id || '').endsWith('@c.us'));
        const saved = people.filter(c => String(c?.name || '').trim());
        let chatLabels: any = null;
        const sample = saved[0] || people[0];
        if (sample) chatLabels = (await wahaRaw(`/api/${sess}/labels/chats/${encodeURIComponent(sample.id)}`)).status;
        out.push({
          session,
          labels: { status: labels.status, items: Array.isArray(labels.json) ? labels.json.map((l: any) => ({ id: l.id, name: l.name })).slice(0, 30) : null, error: labels.status === 200 ? null : (labels.json?.message || labels.json?.error || null) },
          contacts: {
            status: contacts.status,
            total: people.length,
            withSavedName: saved.length,
            fieldsSeen: sample ? Object.keys(sample).slice(0, 20) : [],
            sample: people.slice(0, 5).map(c => ({ id: String(c.id).replace(/\d(?=\d{4})/g, '•'), name: c.name || null, pushname: c.pushname || null, isMyContact: c.isMyContact ?? null }))
          },
          chatLabelsStatus: chatLabels
        });
      }
      return res.status(200).json({ ok: true, source: 'waha', sessions: out });
    }

    if (body.action === 'labels_sync') {
      return res.status(200).json(await syncLabels(sb, clinicId, sessions, body.apply === true));
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
      for (const { s, c, rows } of results) {
        for (const m of rows || []) {
          const id = String(m.id?._serialized || m.id || '');
          if (!id || seen.has(id)) continue;
          seen.set(id, {
            id, session: s, fromMe: !!m.fromMe,
            text: (m.body || '').toString() || (m.hasMedia ? mediaLabel(m) : ''),
            hasMedia: !!m.hasMedia,
            caption: (m.body || '').toString(),
            mediaType: String(m.media?.mimetype || ''),
            mediaName: m.media?.filename || '',
            chatId: c,
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
