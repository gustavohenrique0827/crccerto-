/**
 * Clinicorp -> CRM (Supabase). Roda no servidor (Vercel Function); a chave do Clinicorp
 * nunca vai para o navegador.
 *
 * Variáveis de ambiente (Vercel, sem prefixo VITE_):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   CLINICORP_USER (subscriber_id, ex.: ceopodontologia), CLINICORP_API_KEY
 *   CLINICORP_CLINIC_ID (uuid da clínica no Supabase)
 *   CRON_SECRET (opcional, para agendar a rota)
 *
 * POST /api/clinicorp/sync  { daysBack?: 30, daysForward?: 60, dryRun?: boolean }
 * Authorization: Bearer <token da sessão do Supabase de um admin>
 */
import { createClient } from '@supabase/supabase-js';

const CLINICORP_BASE = 'https://api.clinicorp.com/rest/v1';

interface Req { method?: string; headers: Record<string, string | string[] | undefined>; body?: any; query?: Record<string, any> }
interface Res { status: (c: number) => Res; json: (b: unknown) => void }

// trim: valores colados no painel do Vercel costumam vir com quebra de linha no final
const env = (k: string) => (process.env[k] || '').trim();
const fail = (res: Res, code: number, message: string) => res.status(code).json({ ok: false, message });

async function clinicorpGet(path: string, params: Record<string, string> = {}) {
  const user = env('CLINICORP_USER');
  const qs = new URLSearchParams({ subscriber_id: user, ...params });
  const r = await fetch(`${CLINICORP_BASE}/${path}?${qs}`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${user}:${env('CLINICORP_API_KEY')}`).toString('base64') }
  });
  if (!r.ok) throw new Error(`Clinicorp ${path} respondeu ${r.status}`);
  return r.json();
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
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

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST' && req.method !== 'GET') return fail(res, 405, 'Use POST.');

  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CLINICORP_USER', 'CLINICORP_API_KEY', 'CLINICORP_CLINIC_ID'];
  const missing = required.filter(k => !env(k));
  if (missing.length) return fail(res, 500, `Variáveis de ambiente ausentes no servidor: ${missing.join(', ')}`);

  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

  // Quem pode disparar: admin logado, ou o agendador (CRON_SECRET)
  const auth = String(req.headers.authorization || '');
  const token = auth.replace(/^Bearer\s+/i, '');
  const isCron = Boolean(env('CRON_SECRET')) && token === env('CRON_SECRET');
  if (!isCron) {
    if (!token) return fail(res, 401, 'Entre no sistema para sincronizar.');
    const { data: u, error: ue } = await sb.auth.getUser(token);
    if (ue || !u.user) return fail(res, 401, 'Sessão inválida. Entre novamente.');
    const { data: prof } = await sb.from('profiles').select('role,is_active').eq('id', u.user.id).maybeSingle();
    if (!prof || prof.is_active === false || !['super_admin', 'admin'].includes(prof.role)) {
      return fail(res, 403, 'Apenas administradores podem sincronizar com o Clinicorp.');
    }
  }

  const body = (req.method === 'POST' ? req.body : req.query) || {};
  const daysBack = Math.min(Math.max(Number(body.daysBack ?? 30), 0), 365);
  const daysForward = Math.min(Math.max(Number(body.daysForward ?? 60), 0), 365);
  const dryRun = body.dryRun === true || body.dryRun === 'true' || body.dryRun === '1';
  const clinicId = env('CLINICORP_CLINIC_ID');
  const range = { from: ymd(addDays(-daysBack)), to: ymd(addDays(daysForward)) };

  try {
    const [pros, apts, statusRes, catsRes] = await Promise.all([
      clinicorpGet('professional/list_all_professionals'),
      clinicorpGet('appointment/list', range),
      clinicorpGet('appointment/status_list').catch(() => ({ list: [] })),
      clinicorpGet('appointment/list_categories').catch(() => [])
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
      return res.status(200).json({ ok: true, dryRun: true, range, professionals: pros.length, patients: patientsById.size, appointments: real.length, blockedSlots: blocked, tags: new Set((apts as any[]).flatMap(a => (a.tags || []).map((t: any) => String(t.Name || '').trim()))).size });
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

    return res.status(200).json({ ok: true, range, professionals: pros.length, patients: patientsById.size, appointments: real.length, blockedSlots: blocked, tags: new Set(aptRows.flatMap((r: any) => (r.tags || []).map((t: any) => t.name))).size,
      warning: missingColumns ? 'Etiquetas, categorias e horários bloqueados NÃO foram gravados: rode no Supabase o arquivo 20261014_appointment_clinicorp_full.sql e sincronize de novo.' : undefined });
  } catch (e: any) {
    return fail(res, 502, e?.message || 'Falha ao sincronizar com o Clinicorp.');
  }
}
