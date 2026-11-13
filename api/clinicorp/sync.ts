/**
 * Clinicorp -> CRM (Supabase). Roda no servidor (Vercel Function); a chave do Clinicorp
 * nunca vai para o navegador. Cada clínica tem as próprias credenciais (tabela clinic_integrations).
 *
 * Variáveis de ambiente (Vercel, sem prefixo VITE_):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   CRON_SECRET (agendador: Vercel Cron ou n8n chamam GET /api/clinicorp/sync com Bearer <CRON_SECRET>)
 *   (opcional, legado) CLINICORP_USER, CLINICORP_API_KEY, CLINICORP_CLINIC_ID: usados só se a clínica
 *   ainda não tiver credenciais salvas na tabela.
 *
 * POST /api/clinicorp/sync  { action?: 'sync' | 'connect' | 'disconnect', clinicId, ... }
 *   sync:       { clinicId, daysBack?: 30, daysForward?: 60, dryRun?: boolean }
 *   connect:    { clinicId, subscriberId, apiKey }   (testa a chave no Clinicorp e salva)
 *   disconnect: { clinicId }
 *   create_patient:      { clinicId, name, phone, email?, birthDate?, notes?, ignoreSameName? }
 *   create_appointment:  { clinicId, patient, phone, email?, date, time, duration, professional, procedure?, ignoreSameName? }
 *   confirm_appointment: { clinicId, appointmentId }   (id do agendamento no CRM)
 *   cancel_appointment:  { clinicId, appointmentId }
 * GET  /api/clinicorp/sync  (agendador) sincroniza todas as clínicas com sincronização automática ligada.
 * Authorization: Bearer <token da sessão do Supabase de um admin com acesso à clínica> ou <CRON_SECRET>
 */
import { createClient } from '@supabase/supabase-js';

const CLINICORP_BASE = 'https://api.clinicorp.com/rest/v1';

interface Req { method?: string; headers: Record<string, string | string[] | undefined>; body?: any; query?: Record<string, any> }
interface Res { status: (c: number) => Res; json: (b: unknown) => void }

// trim: valores colados no painel do Vercel costumam vir com quebra de linha no final
const env = (k: string) => (process.env[k] || '').trim();
const fail = (res: Res, code: number, message: string) => res.status(code).json({ ok: false, message });

interface Creds { subscriberId: string; apiKey: string }

async function clinicorpGet(creds: Creds, path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ subscriber_id: creds.subscriberId, ...params });
  const r = await fetch(`${CLINICORP_BASE}/${path}?${qs}`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${creds.subscriberId}:${creds.apiKey}`).toString('base64') }
  });
  if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'Clinicorp recusou as credenciais (usuário ou chave inválidos).' : `Clinicorp ${path} respondeu ${r.status}`);
  return r.json();
}

// Data no fuso de Brasília (toISOString usa UTC e depois das 21h já seria o dia seguinte)
async function clinicorpPost(creds: Creds, path: string, body: Record<string, unknown>) {
  const r = await fetch(`${CLINICORP_BASE}/${path}`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${creds.subscriberId}:${creds.apiKey}`).toString('base64'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriber_id: creds.subscriberId, ...body })
  });
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* resposta sem JSON */ }
  if (!r.ok) throw new Error(json?.message || json?.error || (typeof json === 'string' ? json : '') || `O Clinicorp recusou (${r.status}).`);
  return json ?? {};
}

const digitsOf = (v: unknown) => String(v || '').replace(/\D/g, '');
const phoneKey8 = (v: unknown) => { const d = digitsOf(v); return d.length >= 8 ? d.slice(-8) : ''; };
const pickId = (o: any): string => {
  if (o == null) return '';
  if (typeof o === 'number' || typeof o === 'string') return String(o);
  for (const k of ['id', 'PersonId', 'Patient_PersonId', 'patient_id', 'patientId']) if (o[k]) return String(o[k]);
  for (const v of Object.values(o)) if (v && typeof v === 'object') { const x = pickId(v); if (x) return x; }
  return '';
};

/** Cria o paciente no Clinicorp e registra no banco do CRM. Devolve o id do Clinicorp. */
async function createPatientInClinicorp(sb: any, creds: Creds, clinicId: string, p: { name: string; phone: string; email?: string; birthDate?: string; notes?: string; ignoreSameName?: boolean }): Promise<string> {
  const d = digitsOf(p.phone);
  const res = await clinicorpPost(creds, 'patient/create', {
    Name: p.name,
    ...(d ? { MobilePhone: Number(d.length > 11 ? d.slice(-11) : d) } : {}),
    ...(p.email ? { Email: p.email } : {}),
    ...(p.birthDate ? { BirthDate: p.birthDate } : {}),
    ...(p.notes ? { Notes: p.notes } : {}),
    ...(p.ignoreSameName ? { IgnoreSameName: 'X' } : {})
  });
  const id = pickId(res);
  if (!id) throw new Error('O Clinicorp criou o paciente, mas não devolveu o identificador. Sincronize e confira na agenda.');
  await sb.from('patients').upsert({ clinic_id: clinicId, clinicorp_id: id, name: p.name, phone: p.phone || '', email: p.email || null }, { onConflict: 'clinic_id,clinicorp_id' });
  return id;
}

const ymd = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

/** Status a partir das etiquetas (tags) do agendamento no Clinicorp. */
export function statusFromTags(tags: any[]): 'pending' | 'confirmed' | 'attended' | 'missed' | 'cancelled' | 'rescheduled' {
  const names = (tags || []).map(t => String(t?.Name || '').toLowerCase()).join(' | ');
  if (/cancel/.test(names)) return 'cancelled';
  if (/reagendad|remarcar/.test(names)) return 'rescheduled';
  if (/falt|n[aã]o compareceu/.test(names)) return 'missed';
  if (/atendid|compareceu|chegou/.test(names)) return 'attended';
  if (/confirmad/.test(names)) return 'confirmed';
  return 'pending';
}

/**
 * Status do agendamento no CRM, na ordem de confiança:
 * 1) etiqueta de cancelamento; 2) status oficial do Clinicorp (Atendido, Faltou, Em espera...);
 * 3) demais etiquetas (Confirmado, Reagendada/Remarcar).
 */
export function resolveStatus(a: any, statusById: Map<string, { type: string }>): 'pending' | 'confirmed' | 'attended' | 'missed' | 'cancelled' | 'rescheduled' {
  const fromTags = statusFromTags(a.tags);
  if (fromTags === 'cancelled') return 'cancelled';
  const type = statusById.get(String(a.StatusId))?.type;
  if (type === 'CHECKOUT') return 'attended';
  if (type === 'MISSED') return 'missed';
  if (type === 'IN_SESSION' || type === 'ARRIVED' || type === 'CONFIRMED') return 'confirmed';
  return fromTags;
}

const atomicToDate = (n: number | string) => {
  const s = String(n);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};
const minutesBetween = (a: string, b: string) => {
  const [h1, m1] = a.split(':').map(Number);
  const [h2, m2] = b.split(':').map(Number);
  return Math.max(15, (h2 * 60 + m2) - (h1 * 60 + m1)) || 30;
};

async function fetchAll(sb: any, table: string, columns: string, clinicId: string) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(columns).eq('clinic_id', clinicId).not('clinicorp_id', 'is', null).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const RANK: Record<string, number> = { novo: 0, contatado: 1, '1_contato': 1, '2_contato': 2, '3_contato': 3, interagiu: 4, agendou: 5, agendamento: 5 };
const LABEL: Record<string, string> = { agendamento: 'Agendado', compareceu: 'Compareceu', faltou: 'Follow-up (faltou)' };
// Quem faltou volta para o Follow-up (no banco a etapa Follow-up é '2_contato'); "Comprou" é sempre manual
const DB_STATUS: Record<string, string> = { agendamento: 'agendamento', compareceu: 'compareceu', faltou: '2_contato' };
const phoneKey = (v: any) => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 8 ? d.slice(-8) : ''; };

/**
 * Automação do funil: o lead acompanha o que acontece na agenda do Clinicorp.
 * Usa a consulta mais recente do paciente (mesmo telefone, 8 últimos dígitos):
 *   agendada/confirmada -> "Agendado"; atendida -> "Compareceu"; faltou -> "Follow-up". "Vendido" é sempre manual.
 * Nunca mexe em Vendido nem Desqualificado e nunca faz o lead voltar para uma etapa anterior ao contato.
 */
async function advanceLeadStages(sb: any, clinicId: string, appointments: any[]) {
  const latest = new Map<string, any>();
  for (const a of appointments) {
    if (a.status === 'cancelled' || a.status === 'rescheduled') continue;
    const k = phoneKey(a.patient_phone);
    if (!k) continue;
    const when = `${a.appointment_date} ${a.start_time}`;
    const cur = latest.get(k);
    if (!cur || when > cur.when) latest.set(k, { when, status: a.status, name: a.patient_name });
  }
  if (latest.size === 0) return { agendamento: 0, compareceu: 0, faltou: 0 };

  const leads: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('leads').select('id,name,phone,whatsapp,status').eq('clinic_id', clinicId).range(from, from + 999);
    if (error) throw new Error(`leads: ${error.message}`);
    leads.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  const moves: Record<string, string[]> = { agendamento: [], compareceu: [], faltou: [] };
  const renames: { id: string; name: string }[] = [];
  for (const l of leads) {
    const apt = latest.get(phoneKey(l.phone)) || latest.get(phoneKey(l.whatsapp));
    if (!apt) continue;
    // Nome: o da agenda do Clinicorp vale mais que o do WhatsApp
    const aptName = String(apt.name || '').trim();
    if (aptName && !/^[\s+\d()\-.]+$/.test(aptName) && aptName.toLowerCase() !== String(l.name || '').trim().toLowerCase()) renames.push({ id: l.id, name: aptName });
    const cur = String(l.status);
    if (cur === 'vendido' || cur === 'comprou' || cur === 'desqualificado' || cur === 'perdido') continue;
    const target = apt.status === 'attended' ? 'compareceu' : apt.status === 'missed' ? 'faltou' : 'agendamento';
    if (DB_STATUS[target] === cur || (target === 'agendamento' && cur === 'agendou')) continue;
    const rank = RANK[cur];
    const ok =
      target === 'agendamento' ? (rank !== undefined && rank <= 4) || cur === 'faltou' :
      target === 'compareceu' ? (rank !== undefined && rank <= 5) || cur === 'faltou' :
      /* faltou -> follow-up */ rank !== undefined && rank <= 5;
    if (ok) moves[target].push(l.id);
  }

  for (let i = 0; i < renames.length; i += 20) {
    await Promise.all(renames.slice(i, i + 20).map(r => sb.from('leads').update({ name: r.name }).eq('id', r.id)));
  }

  const result = { agendamento: 0, compareceu: 0, faltou: 0 } as Record<string, number>;
  for (const [target, ids] of Object.entries(moves)) {
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { error } = await sb.from('leads').update({ status: DB_STATUS[target] }).in('id', chunk);
      if (error) throw new Error(`leads: ${error.message}`);
      await sb.from('lead_interactions').insert(chunk.map(id => ({
        lead_id: id, channel: 'sistema', interaction_type: 'mudanca_etapa', message: `Automático (agenda do Clinicorp): ${LABEL[target]}`
      })));
      result[target] += chunk.length;
    }
  }
  return result;
}

export interface SyncOpts { daysBack: number; daysForward: number; dryRun: boolean }

/** Clinicorp -> Supabase para UMA clínica. */
async function syncClinic(sb: any, creds: Creds, clinicId: string, opts: SyncOpts) {
  const { daysBack, daysForward, dryRun } = opts;
  const range = { from: ymd(addDays(-daysBack)), to: ymd(addDays(daysForward)) };
  {
  const [pros, apts, statusRes, catsRes] = await Promise.all([
    clinicorpGet(creds, 'professional/list_all_professionals'),
    clinicorpGet(creds, 'appointment/list', range),
    clinicorpGet(creds, 'appointment/status_list').catch(() => ({ list: [] })),
    clinicorpGet(creds, 'appointment/list_categories').catch(() => [])
  ]);
  // Status oficiais do Clinicorp (Confirmado, Em espera, Atendido, Faltou...) e cores das categorias
  const statusById = new Map<string, { type: string; label: string; color: string }>(
    ((statusRes as any)?.list || []).map((x: any) => [String(x.id), { type: x.Type, label: String(x.Description || '').replace(/^\d+-/, ''), color: x.Color }])
  );
  const catColor = new Map<string, string>((catsRes as any[]).map(c => [String(c.id), c.Color]));

  // "Agenda Fechada" e similares são horários bloqueados: ficam no banco como kind='blocked' (não são pacientes)
  const isPlaceholder = (name: string) => /^\s*(agenda\s+fechada|agendar\s+abert)/i.test(name || '');
  const isBlocked = (a: any) => a.CategoryDescription === 'Agenda Fechada' || isPlaceholder(a.PatientName);
  const real = (apts as any[]).filter(a => !isBlocked(a) && a.PatientName);
  const blockedList = (apts as any[]).filter(a => isBlocked(a));
  const blocked = blockedList.length;

  const patientsById = new Map<string, any>();
  real.forEach(a => {
    const id = String(a.Patient_PersonId);
    if (!patientsById.has(id)) patientsById.set(id, { name: a.PatientName, phone: a.MobilePhone || '', email: a.Email || null });
  });

  if (dryRun) {
    return ({ ok: true, dryRun: true, range, professionals: pros.length, patients: patientsById.size, appointments: real.length, blockedSlots: blocked, tags: new Set((apts as any[]).flatMap(a => (a.tags || []).map((t: any) => String(t.Name || '').trim()))).size });
  }

  // 1) profissionais
  const { error: pe } = await sb.from('professionals').upsert(
    (pros as any[]).map(p => ({ clinic_id: clinicId, clinicorp_id: String(p.id), name: p.name, is_active: true })),
    { onConflict: 'clinic_id,clinicorp_id' }
  );
  if (pe) throw new Error(`professionals: ${pe.message}`);
  const proMap = new Map((await fetchAll(sb, 'professionals', 'id,clinicorp_id', clinicId)).map(r => [r.clinicorp_id, r.id]));

  // 2) pacientes (dados vindos da agenda)
  const patientRows = Array.from(patientsById, ([cid, p]) => ({ clinic_id: clinicId, clinicorp_id: cid, name: p.name, phone: p.phone, email: p.email }));
  for (let i = 0; i < patientRows.length; i += 200) {
    const { error } = await sb.from('patients').upsert(patientRows.slice(i, i + 200), { onConflict: 'clinic_id,clinicorp_id' });
    if (error) throw new Error(`patients: ${error.message}`);
  }
  const patMap = new Map((await fetchAll(sb, 'patients', 'id,clinicorp_id', clinicId)).map(r => [r.clinicorp_id, r.id]));

  // 3) agendamentos
  const proName = new Map((pros as any[]).map(p => [String(p.id), p.name]));
  const buildRow = (a: any, kind: 'appointment' | 'blocked') => ({
    clinic_id: clinicId,
    clinicorp_id: String(a.id),
    patient_id: kind === 'appointment' ? (patMap.get(String(a.Patient_PersonId)) || null) : null,
    professional_id: proMap.get(String(a.Dentist_PersonId)) || null,
    patient_name: kind === 'appointment' ? a.PatientName : 'Agenda fechada',
    patient_phone: kind === 'appointment' ? (a.MobilePhone || '') : '',
    procedure_name: kind === 'appointment' ? (a.Procedures || a.CategoryDescription || 'Consulta') : (a.Notes || a.Name || 'Horário bloqueado'),
    professional_name: proName.get(String(a.Dentist_PersonId)) || null,
    appointment_date: atomicToDate(a.AtomicDate),
    start_time: a.fromTime,
    end_time: a.toTime,
    duration_minutes: minutesBetween(a.fromTime, a.toTime),
    status: kind === 'blocked' ? 'pending' : (a.Deleted ? 'cancelled' : resolveStatus(a, statusById)),
    notes: a.Notes || null,
    booked_at: a.CreateDate || null,
    booked_by: (a.CreateUserName || '').trim() || null,
    source: 'clinicorp',
    kind,
    category: (a.CategoryDescription || '').trim() || null,
    category_color: a.CategoryColor || catColor.get(String(a.CategoryId)) || null,
    tags: (a.tags || []).map((t: any) => ({ name: String(t.Name || '').trim(), color: t.Color || null, type: t.Type || null })),
    clinicorp_raw: {
      procedures: a.SelectedProceduresList || null, alert: a.AlertInfo || null, email: a.Email || null,
      patientConfirm: a.PatientConfirm || null, patientMessage: a.PatientMessage || null,
      whatsDelivered: a.WhatsConfimationDelivered || null, whatsRead: a.WhatsConfimationRead || null,
      firstAppointment: a.FirstAppointment || null, howDidMeet: a.HowDidMeet || null,
      checkin: a.CheckinTime || null, waitStart: a.WaitStart || null, waitEnds: a.WaitEnds || null,
      statusId: a.StatusId || null, statusColor: a.StatusColor || null,
      statusType: statusById.get(String(a.StatusId))?.type || null, statusLabel: statusById.get(String(a.StatusId))?.label || null,
      modifiedDate: a.ModifiedDate || null, editedBy: a.EditedBy || null, isNew: a.isNew || null
    }
  });
  const aptRows = [...real.map(a => buildRow(a, 'appointment')), ...blockedList.map(a => buildRow(a, 'blocked'))];
  let missingColumns = false;
  const NEW_COLS = ['kind', 'category', 'category_color', 'tags', 'clinicorp_raw'];
  for (let i = 0; i < aptRows.length; i += 200) {
    let chunk: any[] = aptRows.slice(i, i + 200);
    if (missingColumns) chunk = chunk.filter(r => r.kind === 'appointment').map(r => { const c = { ...r }; NEW_COLS.forEach(k => delete c[k]); return c; });
    let { error } = await sb.from('appointments').upsert(chunk, { onConflict: 'clinic_id,clinicorp_id' });
    if (error && /column|schema cache/i.test(error.message) && !missingColumns) {
      // migration das etiquetas ainda não foi rodada: grava o essencial e avisa
      missingColumns = true;
      chunk = chunk.filter(r => r.kind === 'appointment').map(r => { const c = { ...r }; NEW_COLS.forEach(k => delete c[k]); return c; });
      ({ error } = await sb.from('appointments').upsert(chunk, { onConflict: 'clinic_id,clinicorp_id' }));
    }
    if (error) throw new Error(`appointments: ${error.message}`);
  }

  const leadsMoved = await advanceLeadStages(sb, clinicId, aptRows.filter((r: any) => r.kind === 'appointment'));

  return ({ ok: true, range, leadsMoved, professionals: pros.length, patients: patientsById.size, appointments: real.length, blockedSlots: blocked, tags: new Set(aptRows.flatMap((r: any) => (r.tags || []).map((t: any) => t.name))).size,
    warning: missingColumns ? 'Etiquetas, categorias e horários bloqueados NÃO foram gravados: rode no Supabase o arquivo 20261014_appointment_clinicorp_full.sql e sincronize de novo.' : undefined });

  }
}

type Integration = { clinic_id: string; subscriber_id: string; api_key: string; enabled: boolean; auto_sync: boolean };

/** Credenciais da clínica: tabela clinic_integrations; legado: variáveis de ambiente (só para a clínica antiga). */
async function loadCreds(sb: any, clinicId: string): Promise<Creds | null> {
  const { data } = await sb.from('clinic_integrations').select('subscriber_id,api_key,enabled').eq('clinic_id', clinicId).eq('provider', 'clinicorp').maybeSingle();
  if (data && data.enabled !== false && data.subscriber_id && data.api_key) return { subscriberId: data.subscriber_id, apiKey: data.api_key };
  if (!data && env('CLINICORP_CLINIC_ID') === clinicId && env('CLINICORP_USER') && env('CLINICORP_API_KEY')) {
    return { subscriberId: env('CLINICORP_USER'), apiKey: env('CLINICORP_API_KEY') };
  }
  return null;
}

async function recordRun(sb: any, clinicId: string, ok: boolean, message: string, counts: any) {
  await sb.from('clinic_integrations').update({
    last_sync_at: new Date().toISOString(), last_status: ok ? 'ok' : 'error', last_message: message.slice(0, 500), last_counts: counts || null
  }).eq('clinic_id', clinicId).eq('provider', 'clinicorp');
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST' && req.method !== 'GET') return fail(res, 405, 'Use POST.');

  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(k => !env(k));
  if (missing.length) return fail(res, 500, `Variáveis de ambiente ausentes no servidor: ${missing.join(', ')}`);
  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

  // Quem chama: o agendador (CRON_SECRET) ou um admin logado com acesso à clínica
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const secret = env('CRON_SECRET');
  const isCron = Boolean(secret) && token.length === secret.length && token === secret;
  let allowed: (clinicId: string) => boolean = () => true;
  if (!isCron) {
    if (!token) return fail(res, 401, 'Entre no sistema para sincronizar.');
    const { data: u, error: ue } = await sb.auth.getUser(token);
    if (ue || !u.user) return fail(res, 401, 'Sessão inválida. Entre novamente.');
    const { data: prof } = await sb.from('profiles').select('role,is_active,clinic_id,default_clinic_id,accessible_clinic_ids').eq('id', u.user.id).maybeSingle();
    if (!prof || prof.is_active === false || !['super_admin', 'admin'].includes(prof.role)) {
      return fail(res, 403, 'Apenas administradores podem configurar ou sincronizar o Clinicorp.');
    }
    const mine = new Set([prof.clinic_id, prof.default_clinic_id, ...(prof.accessible_clinic_ids || [])].filter(Boolean));
    allowed = (id: string) => prof.role === 'super_admin' || mine.has(id);
  }

  const body = (req.method === 'POST' ? req.body : req.query) || {};
  const action = String(body.action || 'sync');
  const clinicId = String(body.clinicId || '');
  const opts: SyncOpts = {
    daysBack: Math.min(Math.max(Number(body.daysBack ?? 30), 0), 365),
    daysForward: Math.min(Math.max(Number(body.daysForward ?? 60), 0), 365),
    dryRun: body.dryRun === true || body.dryRun === 'true' || body.dryRun === '1'
  };

  try {
    // Agendador sem clínica definida: todas as clínicas com sincronização automática ligada
    if (isCron && !clinicId) {
      const { data: list } = await sb.from('clinic_integrations').select('clinic_id').eq('provider', 'clinicorp').eq('enabled', true).eq('auto_sync', true);
      const ids: string[] = (list || []).map((r: Integration) => r.clinic_id);
      if (env('CLINICORP_CLINIC_ID') && !ids.includes(env('CLINICORP_CLINIC_ID'))) {
        const { data: row } = await sb.from('clinic_integrations').select('clinic_id').eq('clinic_id', env('CLINICORP_CLINIC_ID')).maybeSingle();
        if (!row) ids.push(env('CLINICORP_CLINIC_ID'));
      }
      const results: Record<string, unknown> = {};
      for (const id of ids) {
        const creds = await loadCreds(sb, id);
        if (!creds) { results[id] = { ok: false, message: 'Sem credenciais' }; continue; }
        try {
          const r = await syncClinic(sb, creds, id, { ...opts, dryRun: false, daysBack: 7, daysForward: 60 });
          await recordRun(sb, id, true, 'Sincronização automática', r);
          results[id] = r;
        } catch (e: any) {
          await recordRun(sb, id, false, e?.message || 'Falha', null);
          results[id] = { ok: false, message: e?.message };
        }
      }
      return res.status(200).json({ ok: true, clinics: ids.length, results });
    }

    if (!clinicId) return fail(res, 400, 'Informe a clínica (clinicId).');
    if (!allowed(clinicId)) return fail(res, 403, 'Você não tem acesso a esta clínica.');

    if (action === 'connect') {
      const subscriberId = String(body.subscriberId || '').trim();
      const apiKey = String(body.apiKey || '').trim();
      if (!subscriberId || !apiKey) return fail(res, 400, 'Informe o usuário (subscriber) e a chave da API do Clinicorp.');
      const creds = { subscriberId, apiKey };
      const pros = await clinicorpGet(creds, 'professional/list_all_professionals'); // falha aqui = credenciais inválidas
      const { error } = await sb.from('clinic_integrations').upsert(
        { clinic_id: clinicId, provider: 'clinicorp', subscriber_id: subscriberId, api_key: apiKey, enabled: true, auto_sync: body.autoSync !== false, updated_at: new Date().toISOString() },
        { onConflict: 'clinic_id,provider' }
      );
      if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
      return res.status(200).json({ ok: true, professionals: (pros as any[]).length, message: 'Credenciais válidas e salvas.' });
    }

    if (action === 'disconnect') {
      await sb.from('clinic_integrations').delete().eq('clinic_id', clinicId).eq('provider', 'clinicorp');
      return res.status(200).json({ ok: true, message: 'Clinicorp desconectado desta clínica.' });
    }

    if (action === 'settings') {
      const { error } = await sb.from('clinic_integrations').update({ auto_sync: body.autoSync !== false, updated_at: new Date().toISOString() }).eq('clinic_id', clinicId).eq('provider', 'clinicorp');
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true });
    }

    const writeActions = ['create_patient', 'create_appointment', 'confirm_appointment', 'cancel_appointment'];
    if (writeActions.includes(action)) {
      const wcreds = await loadCreds(sb, clinicId);
      if (!wcreds) return fail(res, 400, 'Esta clínica ainda não tem credenciais do Clinicorp. Conecte primeiro.');

      if (action === 'create_patient') {
        const name = String(body.name || '').trim();
        if (!name) return fail(res, 400, 'Informe o nome do paciente.');
        const id = await createPatientInClinicorp(sb, wcreds, clinicId, { name, phone: String(body.phone || ''), email: body.email, birthDate: body.birthDate, notes: body.notes, ignoreSameName: body.ignoreSameName === true });
        return res.status(200).json({ ok: true, clinicorpId: id, message: 'Paciente criado no Clinicorp.' });
      }

      if (action === 'create_appointment') {
        const patientName = String(body.patient || '').trim();
        const date = String(body.date || '');
        const time = String(body.time || '');
        if (!patientName || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return fail(res, 400, 'Informe paciente, data e horário.');
        const dur = Math.max(15, Number(body.duration) || 30);
        const [h, m] = time.split(':').map(Number);
        const endMin = h * 60 + m + dur;
        const toTime = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

        // profissional: precisa existir no Clinicorp (tabela professionals vem da sincronização)
        const profName = String(body.professional || '').trim();
        const { data: pros } = await sb.from('professionals').select('name,clinicorp_id').eq('clinic_id', clinicId).not('clinicorp_id', 'is', null);
        const norm = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const pro = (pros || []).find((x: any) => norm(x.name) === norm(profName)) || (pros || []).find((x: any) => profName && norm(x.name).includes(norm(profName).split(' ')[0]));
        if (!pro) return fail(res, 400, 'Escolha o profissional da lista (ele precisa existir no Clinicorp). Sincronize se o profissional é novo.');

        // paciente: o mesmo telefone na base do Clinicorp, senão cria
        let patientId = '';
        const key = phoneKey8(body.phone);
        if (key) {
          const { data: pats } = await sb.from('patients').select('clinicorp_id,phone').eq('clinic_id', clinicId).not('clinicorp_id', 'is', null);
          patientId = (pats || []).find((x: any) => phoneKey8(x.phone) === key)?.clinicorp_id || '';
        }
        if (!patientId) patientId = await createPatientInClinicorp(sb, wcreds, clinicId, { name: patientName, phone: String(body.phone || ''), email: body.email, ignoreSameName: body.ignoreSameName === true });

        // id da clínica no Clinicorp: vem dos agendamentos existentes
        const t = (offset: number) => ymd(addDays(offset));
        const sample = await clinicorpGet(wcreds, 'appointment/list', { from: t(-30), to: t(30) });
        const businessId = (sample as any[]).find(a => a.Clinic_BusinessId)?.Clinic_BusinessId;
        if (!businessId) return fail(res, 400, 'Não consegui descobrir o código da clínica no Clinicorp (não há agendamentos recentes para consultar).');

        // categoria: a que mais combina com o procedimento escolhido
        const cats = (await clinicorpGet(wcreds, 'appointment/list_categories').catch(() => [])) as any[];
        const wanted = norm(String(body.procedure || ''));
        const cat = wanted ? cats.find(c => norm(c.Description || '').includes(wanted) || wanted.includes(norm(c.Description || ''))) || cats.find(c => /avalia/.test(wanted) && /avalia/.test(norm(c.Description || ''))) : undefined;

        const created = await clinicorpPost(wcreds, 'appointment/create_appointment_by_api', {
          Patient_PersonId: Number(patientId),
          PatientName: patientName,
          MobilePhone: String(body.phone || ''),
          ...(body.email ? { Email: body.email } : {}),
          fromTime: time,
          toTime,
          date: `${date}T03:00:00.000Z`,
          Clinic_BusinessId: Number(businessId),
          Dentist_PersonId: Number(pro.clinicorp_id),
          ...(body.procedure ? { Procedures: String(body.procedure) } : {}),
          ...(cat ? { CategoryId: Number(cat.id) } : {})
        });
        // traz o agendamento criado para o CRM do mesmo jeito que os demais (status, etiquetas, funil)
        await syncClinic(sb, wcreds, clinicId, { daysBack: 1, daysForward: 400, dryRun: false });
        await recordRun(sb, clinicId, true, 'Sincronização após criar agendamento', null);
        return res.status(200).json({ ok: true, clinicorpId: pickId(created), message: 'Agendamento criado no Clinicorp.' });
      }

      // confirmar / cancelar: age no Clinicorp e depois no banco
      const appointmentId = String(body.appointmentId || '');
      const { data: apt } = await sb.from('appointments').select('id,clinic_id,clinicorp_id').eq('id', appointmentId).maybeSingle();
      if (!apt || apt.clinic_id !== clinicId) return fail(res, 404, 'Agendamento não encontrado nesta clínica.');
      if (!apt.clinicorp_id) return fail(res, 400, 'Este agendamento não existe no Clinicorp (foi criado só no CRM), então não dá para alterar por lá.');
      if (action === 'confirm_appointment') {
        await clinicorpPost(wcreds, 'appointment/confirm_appointment', { id: Number(apt.clinicorp_id) });
        await sb.from('appointments').update({ status: 'confirmed' }).eq('id', apt.id);
        return res.status(200).json({ ok: true, message: 'Agendamento confirmado no Clinicorp.' });
      }
      await clinicorpPost(wcreds, 'appointment/cancel_appointment', { id: String(apt.clinicorp_id) });
      await sb.from('appointments').update({ status: 'cancelled' }).eq('id', apt.id);
      return res.status(200).json({ ok: true, message: 'Agendamento cancelado no Clinicorp.' });
    }

    const creds = await loadCreds(sb, clinicId);
    if (!creds) return fail(res, 400, 'Esta clínica ainda não tem credenciais do Clinicorp. Conecte primeiro.');
    const result = await syncClinic(sb, creds, clinicId, opts);
    if (!opts.dryRun) await recordRun(sb, clinicId, true, 'Sincronização manual', result);
    return res.status(200).json(result);
  } catch (e: any) {
    if (clinicId && action === 'sync') await recordRun(sb, clinicId, false, e?.message || 'Falha ao sincronizar', null).catch(() => {});
    return fail(res, 502, e?.message || 'Falha ao sincronizar com o Clinicorp.');
  }
}
