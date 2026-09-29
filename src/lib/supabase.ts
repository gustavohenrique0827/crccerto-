import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useState, useEffect, useCallback } from 'react';
import { Lead, LeadStatus, Clinic, ModuleType } from '../types';
import { INITIAL_LEADS } from './mockData';

const readLocal = (key: string): string => {
  try {
    return (typeof localStorage !== 'undefined' && localStorage.getItem(key)) || '';
  } catch {
    return '';
  }
};

const getEnvVar = (key: string): string => {
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
  const procEnv = (typeof process !== 'undefined' && process.env) || {};

  return metaEnv[`VITE_${key}`] || metaEnv[key] || procEnv[`VITE_${key}`] || procEnv[key] || '';
};

// Env vars win; the localStorage keys are what the "Integrações > Supabase" panel writes.
const resolveUrl = () => getEnvVar('SUPABASE_URL') || readLocal('crm_supabase_url');
const resolveKey = () => getEnvVar('SUPABASE_ANON_KEY') || readLocal('crm_supabase_key');

let supabaseInstance: SupabaseClient | null = null;
let supabaseInstanceKey = '';

export function getSupabase(): SupabaseClient | null {
  const url = resolveUrl();
  const key = resolveKey();
  if (!url || !key) return null;

  if (supabaseInstance && supabaseInstanceKey === `${url}|${key}`) return supabaseInstance;

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: typeof window !== 'undefined'
      }
    });
    supabaseInstanceKey = `${url}|${key}`;
    return supabaseInstance;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(resolveUrl() && resolveKey());
}

// ---------------------------------------------------------------------
// Mapeamento app <-> banco
// ---------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);
export const newUuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

// Valores antigos do enum lead_status -> etapas do funil do app.
// Os valores novos (1_contato, agendamento...) são iguais nos dois lados
// (ver supabase/migrations/20260929_lead_status_funnel.sql).
const STATUS_FROM_DB: Record<string, LeadStatus> = {
  novo: LeadStatus.NEW,
  contatado: LeadStatus.FIRST_CONTACT,
  '1_contato': LeadStatus.FIRST_CONTACT,
  '2_contato': LeadStatus.SECOND_CONTACT,
  '3_contato': LeadStatus.THIRD_CONTACT,
  interagiu: LeadStatus.INTERACTED,
  agendou: LeadStatus.APPOINTMENT,
  agendamento: LeadStatus.APPOINTMENT,
  compareceu: LeadStatus.ATTENDED,
  faltou: LeadStatus.MISSED,
  vendido: LeadStatus.SOLD,
  comprou: LeadStatus.SOLD,
  perdido: LeadStatus.DISQUALIFIED,
  desqualificado: LeadStatus.DISQUALIFIED
};

const ORIGIN_LABEL: Record<string, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  website: 'Site',
  referral: 'Indicação',
  manual: 'Manual / CRM'
};

const originToDb = (label?: string): string => {
  const s = (label || '').toLowerCase();
  if (s.includes('insta')) return 'instagram';
  if (s.includes('face')) return 'facebook';
  if (s.includes('meta')) return 'meta';
  if (s.includes('google')) return 'google';
  if (s.includes('whats') || s.includes('zap')) return 'whatsapp';
  if (s.includes('site') || s.includes('web') || s.includes('elementor')) return 'website';
  if (s.includes('indica') || s.includes('referral')) return 'referral';
  return 'manual';
};

export type DbLead = Lead & { notes?: string };

export function rowToLead(row: any): DbLead {
  return {
    id: row.id,
    name: row.name || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || row.phone || '',
    email: row.email || '',
    clinicId: row.clinic_id,
    sourceId: ORIGIN_LABEL[row.origin] || row.origin || 'Manual / CRM',
    utmCampaign: row.campaign_name || undefined,
    status: STATUS_FROM_DB[row.status] ?? LeadStatus.NEW,
    responsibleName: row.responsible_name || undefined,
    estimatedValue: Number(row.estimated_value || 0),
    priority: row.priority || 'medium',
    procedureType: row.procedure_interest || undefined,
    notes: row.notes || '',
    tags: row.tags || [],
    lastInteractionAt: row.updated_at || row.created_at,
    createdAt: row.created_at
  };
}

// Só inclui no payload o que foi informado (serve para insert e update parcial).
function leadToRow(lead: Partial<DbLead>): Record<string, any> {
  const row: Record<string, any> = {};
  if (lead.id !== undefined) row.id = lead.id;
  if (lead.clinicId !== undefined) row.clinic_id = lead.clinicId;
  if (lead.name !== undefined) row.name = lead.name;
  if (lead.phone !== undefined) row.phone = lead.phone;
  if (lead.whatsapp !== undefined) row.whatsapp = lead.whatsapp || null;
  if (lead.email !== undefined) row.email = lead.email || null;
  if (lead.status !== undefined) row.status = lead.status;
  if (lead.sourceId !== undefined) row.origin = originToDb(lead.sourceId);
  if (lead.utmCampaign !== undefined || lead.campaignId !== undefined) {
    row.campaign_name = lead.utmCampaign || lead.campaignId || null;
  }
  if (lead.procedureType !== undefined) row.procedure_interest = lead.procedureType || null;
  if (lead.estimatedValue !== undefined) row.estimated_value = lead.estimatedValue || 0;
  if (lead.priority !== undefined) row.priority = lead.priority;
  if (lead.responsibleName !== undefined) row.responsible_name = lead.responsibleName || null;
  if (lead.notes !== undefined) row.notes = lead.notes || null;
  if (lead.tags !== undefined) row.tags = lead.tags;
  return row;
}

const VALID_SYSTEMS = ['clinicorp', 'simples_dental', 'google_calendar', 'other', 'none'];
const MODULE_FLAG_TO_APP: Record<string, ModuleType[]> = {
  leads: ['crm'],
  patients: ['patients'],
  agenda: ['appointments'],
  tasks: ['tasks', 'followups'],
  marketing: ['analytics', 'analise-dados'],
  financial: ['reports']
};

export function rowToClinic(row: any): Clinic {
  let enabledModules: ModuleType[] = Array.isArray(row.metadata?.enabledModules) ? row.metadata.enabledModules : [];
  if (enabledModules.length === 0) {
    const flags = row.enabled_modules || {};
    const set = new Set<ModuleType>(['dashboard']);
    Object.keys(flags).forEach(k => flags[k] && (MODULE_FLAG_TO_APP[k] || []).forEach(m => set.add(m)));
    enabledModules = Array.from(set);
  }
  return {
    id: row.id,
    name: row.name,
    corporateName: row.corporate_name || '',
    cnpj: row.cnpj || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    address: row.address || '',
    city: row.city || '',
    state: row.state || '',
    responsible: row.responsible_name || '',
    status: row.status === 'inactive' || row.status === 'blocked' ? 'inactive' : 'active',
    system: VALID_SYSTEMS.includes(row.system) ? row.system : 'none',
    logo: row.logo_url || undefined,
    enabledModules,
    createdAt: row.created_at
  };
}

export function clinicToRow(c: Partial<Clinic>, existingMetadata: Record<string, any> = {}): Record<string, any> {
  const row: Record<string, any> = {};
  if (c.id !== undefined) row.id = c.id;
  if (c.name !== undefined) row.name = c.name;
  if (c.corporateName !== undefined) row.corporate_name = c.corporateName || null;
  if (c.cnpj !== undefined) row.cnpj = c.cnpj || null;
  if (c.phone !== undefined) row.phone = c.phone || null;
  if (c.whatsapp !== undefined) row.whatsapp = c.whatsapp || null;
  if (c.email !== undefined) row.email = c.email || null;
  if (c.address !== undefined) row.address = c.address || null;
  if (c.city !== undefined) row.city = c.city || null;
  if (c.state !== undefined) row.state = c.state || null;
  if (c.responsible !== undefined) row.responsible_name = c.responsible || null;
  if (c.status !== undefined) row.status = c.status;
  if (c.system !== undefined) row.system = c.system;
  if (c.logo !== undefined) row.logo_url = c.logo || null;
  if (c.enabledModules !== undefined) row.metadata = { ...existingMetadata, enabledModules: c.enabledModules };
  return row;
}

// ---------------------------------------------------------------------
// Clínicas
// ---------------------------------------------------------------------

/** null = Supabase indisponível/erro (o chamador mantém o cache local). */
export async function fetchClinicsFromDb(): Promise<Clinic[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('clinics').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('Erro ao carregar clínicas do Supabase:', error.message);
    return null;
  }
  return (data || []).map(rowToClinic);
}

export async function insertClinicInDb(clinic: Clinic): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb.from('clinics').insert([clinicToRow(clinic)]);
  if (error) console.error('Erro ao criar clínica no Supabase:', error.message);
  return !error;
}

export async function updateClinicInDb(id: string, updates: Partial<Clinic>): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return true;
  let metadata: Record<string, any> = {};
  if (updates.enabledModules !== undefined) {
    const { data } = await sb.from('clinics').select('metadata').eq('id', id).maybeSingle();
    metadata = data?.metadata || {};
  }
  const { id: _ignored, ...rest } = updates;
  const { error } = await sb.from('clinics').update(clinicToRow(rest, metadata)).eq('id', id);
  if (error) console.error('Erro ao atualizar clínica no Supabase:', error.message);
  return !error;
}

export async function deleteClinicFromDb(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb.from('clinics').delete().eq('id', id);
  if (error) console.error('Erro ao excluir clínica no Supabase:', error.message);
  return !error;
}

// ---------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------

const readLocalLeads = (): Lead[] => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('crm_leads_data') : null;
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return INITIAL_LEADS as Lead[];
};

const writeLocalLeads = (leads: Lead[]) => {
  try {
    localStorage.setItem('crm_leads_data', JSON.stringify(leads));
  } catch {}
};

/** null = Supabase não configurado ou com erro. Lista vazia é um resultado válido. */
export async function loadLeadsFromDb(clinicId?: string): Promise<DbLead[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  let query = sb.from('leads').select('*').order('created_at', { ascending: false });
  if (clinicId && clinicId !== 'all') query = query.eq('clinic_id', clinicId);
  const { data, error } = await query;
  if (error) {
    console.error('Erro ao carregar leads do Supabase:', error.message);
    return null;
  }
  return (data || []).map(rowToLead);
}

export async function fetchLeadsFromDb(clinicId?: string): Promise<Lead[]> {
  const fromDb = await loadLeadsFromDb(clinicId);
  if (fromDb) return fromDb;
  const local = readLocalLeads();
  return clinicId && clinicId !== 'all' ? local.filter(l => l.clinicId === clinicId) : local;
}

export async function updateLeadInDb(id: string, updates: Partial<DbLead>): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return true;
  const row = leadToRow({ ...updates, id: undefined });
  if (Object.keys(row).length === 0) return true;
  const { error } = await sb.from('leads').update(row).eq('id', id);
  if (error) console.error('Erro ao atualizar lead no Supabase:', error.message);
  return !error;
}

export async function deleteLeadFromDb(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb.from('leads').delete().eq('id', id);
  if (error) console.error('Erro ao excluir lead no Supabase:', error.message);
  return !error;
}

/** O id do lead precisa ser UUID quando o Supabase está ativo (use newUuid()). */
export async function saveLeadToDb(lead: DbLead): Promise<boolean> {
  const sb = getSupabase();

  // Cache local para resposta instantânea da UI (outros componentes leem daqui)
  if (typeof window !== 'undefined') {
    try {
      const updatedList = [lead, ...readLocalLeads().filter(l => l.id !== lead.id)];
      writeLocalLeads(updatedList);
      window.dispatchEvent(new CustomEvent('crm_leads_updated', { detail: lead }));
    } catch (e) {
      console.error('Error saving lead to localStorage:', e);
    }
  }

  if (!sb) {
    // Sem Supabase: servidor Express local (dev)
    try {
      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      }).catch(() => {});
    } catch {}
    return true;
  }

  if (!isUuid(lead.id)) {
    console.error('Lead com id inválido para o Supabase:', lead.id);
    return false;
  }
  const { error } = await sb.from('leads').upsert([leadToRow(lead)]);
  if (error) console.error('Erro ao salvar lead no Supabase:', error.message);
  return !error;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingLead?: any;
  message?: string;
}

export async function checkLeadDuplicateInDb(
  param1: string | { clinicId?: string; email?: string; phone?: string; whatsapp?: string },
  param2?: string
): Promise<DuplicateCheckResult> {
  let phone = '';
  let email = '';
  let clinicId = param2;

  if (typeof param1 === 'object' && param1 !== null) {
    phone = (param1.phone || param1.whatsapp || '').replace(/\D/g, '');
    email = (param1.email || '').trim().toLowerCase();
    clinicId = param1.clinicId || clinicId;
  } else if (typeof param1 === 'string') {
    phone = param1.replace(/\D/g, '');
  }

  if (!phone && !email) {
    return { isDuplicate: false };
  }

  const sb = getSupabase();

  // Sem Supabase: confere o cache local
  if (!sb) {
    const match = readLocalLeads().find((l: any) => {
      if (clinicId && clinicId !== 'all' && l.clinicId && l.clinicId !== clinicId) return false;
      const lPhone = (l.phone || l.whatsapp || '').replace(/\D/g, '');
      const lEmail = (l.email || '').trim().toLowerCase();
      return Boolean((phone && lPhone && phone === lPhone) || (email && lEmail && email === lEmail));
    });
    return match
      ? { isDuplicate: true, existingLead: match, message: `Já existe um lead com este contato nesta unidade: ${match.name}` }
      : { isDuplicate: false };
  }

  try {
    let q = sb.from('leads').select('id,name,phone,whatsapp,email,clinic_id');
    if (clinicId && clinicId !== 'all') q = q.eq('clinic_id', clinicId);
    const filters: string[] = [];
    if (phone) filters.push(`phone.eq.${phone}`, `whatsapp.eq.${phone}`);
    if (email) filters.push(`email.eq.${email}`);
    const { data } = await q.or(filters.join(',')).limit(1);
    if (data && data.length > 0) {
      return { isDuplicate: true, existingLead: data[0], message: `Lead já registrado no sistema: ${data[0].name}` };
    }
  } catch {}

  return { isDuplicate: false };
}

export function useSupabaseLeads(clinicId?: string) {
  const [leads, setLeads] = useState<Lead[]>(() => {
    const local = readLocalLeads();
    return clinicId && clinicId !== 'all' ? local.filter(l => l.clinicId === clinicId) : local;
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const fromDb = await loadLeadsFromDb(clinicId);
    if (fromDb) {
      setLeads(fromDb);
      // O cache completo (usado por outros componentes) só é gravado quando não há filtro
      if (!clinicId || clinicId === 'all') writeLocalLeads(fromDb);
    } else {
      const local = readLocalLeads();
      setLeads(clinicId && clinicId !== 'all' ? local.filter(l => l.clinicId === clinicId) : local);
    }
    setLoading(false);
  }, [clinicId]);

  const updateLeadStatus = useCallback(async (leadId: string, newStatus: LeadStatus) => {
    setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, status: newStatus } : l)));
    const all = readLocalLeads().map(l => (l.id === leadId ? { ...l, status: newStatus } : l));
    writeLocalLeads(all);

    const ok = await updateLeadInDb(leadId, { status: newStatus });
    if (!ok) {
      // Não deixa a UI mentir: recarrega o estado real do banco
      refresh();
      return;
    }
    if (!isSupabaseConfigured()) {
      try {
        fetch(`/api/leads/${leadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        }).catch(() => {});
      } catch {}
    }
    window.dispatchEvent(new CustomEvent('crm_leads_updated'));
  }, [refresh]);

  useEffect(() => {
    refresh();

    const handleUpdate = () => refresh();
    window.addEventListener('crm_leads_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('crm_leads_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refresh]);

  return { leads, loading, refresh, updateLeadStatus };
}

// ---------------------------------------------------------------------
// Conversas / histórico do lead (gravados pelo agente do n8n)
// ---------------------------------------------------------------------

export interface LeadTimelineItem {
  id: string;
  kind: 'client' | 'team' | 'event';
  title: string;
  text: string;
  channel: string;
  date: string;
}

const INTERACTION_LABEL: Record<string, string> = {
  mensagem_cliente: 'Mensagem do paciente',
  mensagem_responsavel: 'Resposta do atendimento',
  message: 'Mensagem'
};

/** Junta lead_interactions (por lead_id) e interacoes (por telefone) em uma linha do tempo. */
export async function fetchLeadTimelineFromDb(lead: Pick<Lead, 'id' | 'phone' | 'whatsapp'>): Promise<LeadTimelineItem[]> {
  const sb = getSupabase();
  if (!sb || !isUuid(lead.id)) return [];

  const phones = new Set<string>();
  [lead.phone, lead.whatsapp].forEach(raw => {
    if (!raw) return;
    const digits = raw.replace(/\D/g, '');
    phones.add(raw);
    if (digits) { phones.add(digits); phones.add(`+${digits}`); }
  });

  const [events, chat] = await Promise.all([
    sb.from('lead_interactions').select('id,channel,message,interaction_type,created_at').eq('lead_id', lead.id),
    phones.size > 0
      ? sb.from('interacoes').select('id,telefone,direcao,texto,criado_em').in('telefone', Array.from(phones))
      : Promise.resolve({ data: [] as any[], error: null })
  ]);
  if (events.error) console.error('Erro ao carregar lead_interactions:', events.error.message);
  if (chat.error) console.error('Erro ao carregar interacoes:', chat.error.message);

  const items: LeadTimelineItem[] = [];
  (chat.data || []).forEach((r: any) => {
    const fromClient = /cliente|inbound|paciente/i.test(r.direcao || '');
    items.push({
      id: `i_${r.id}`,
      kind: fromClient ? 'client' : 'team',
      title: fromClient ? 'Mensagem do paciente' : 'Resposta do atendimento',
      text: r.texto || '',
      channel: 'whatsapp',
      date: r.criado_em
    });
  });
  (events.data || []).forEach((r: any) => {
    items.push({
      id: `e_${r.id}`,
      kind: /cliente/.test(r.interaction_type) ? 'client' : /responsavel/.test(r.interaction_type) ? 'team' : 'event',
      title: INTERACTION_LABEL[r.interaction_type] || r.interaction_type || 'Interação',
      text: r.message || '',
      channel: r.channel || 'whatsapp',
      date: r.created_at
    });
  });

  // lead_interactions e interacoes registram a mesma conversa: só mostra o evento vazio
  // quando não há texto real correspondente, e nunca duplica mensagem com texto.
  const withText = items.filter(i => i.text.trim());
  const emptyEvents = items.filter(i => !i.text.trim() && i.id.startsWith('e_'));
  const hasChatText = withText.length > 0;
  return [...withText, ...(hasChatText ? [] : emptyEvents)].sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

// ---------------------------------------------------------------------
// Agendamentos / métricas
// ---------------------------------------------------------------------

async function loadAppointments(clinicId?: string): Promise<any[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from('appointments').select('id,status,appointment_date,clinic_id');
    if (clinicId && clinicId !== 'all') q = q.eq('clinic_id', clinicId);
    const { data, error } = await q;
    if (!error && data) return data;
    if (error) console.error('Erro ao carregar agendamentos do Supabase:', error.message);
    return [];
  }
  try {
    const raw = localStorage.getItem('crm_appointments_data');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const APPOINTED = new Set([LeadStatus.APPOINTMENT, LeadStatus.ATTENDED, LeadStatus.MISSED, LeadStatus.SOLD]);
const ATTENDED = new Set([LeadStatus.ATTENDED, LeadStatus.SOLD]);

export interface ChannelConversionMetric {
  channel: string;
  subTitle: string;
  totalLeads: number;
  appointments: number;
  appointmentRate: number;
  attended: number;
  convertedCount: number;
  conversionRate: number;
  revenue: number;
}

const pct = (a: number, b: number) => (b > 0 ? Number(((a / b) * 100).toFixed(1)) : 0);

export async function fetchChannelConversionRatesFromDb(clinicId?: string): Promise<ChannelConversionMetric[]> {
  const leads = await fetchLeadsFromDb(clinicId);
  const map: Record<string, ChannelConversionMetric> = {};
  leads.forEach(l => {
    const ch = l.sourceId || 'Outros';
    const m = (map[ch] ||= {
      channel: ch, subTitle: 'Canal de origem', totalLeads: 0, appointments: 0, appointmentRate: 0,
      attended: 0, convertedCount: 0, conversionRate: 0, revenue: 0
    });
    m.totalLeads++;
    if (APPOINTED.has(l.status)) m.appointments++;
    if (ATTENDED.has(l.status)) m.attended++;
    if (l.status === LeadStatus.SOLD) {
      m.convertedCount++;
      m.revenue += Number(l.estimatedValue || 0);
    }
  });
  return Object.values(map).map(m => ({
    ...m,
    appointmentRate: pct(m.appointments, m.totalLeads),
    conversionRate: pct(m.convertedCount, m.totalLeads)
  }));
}

const CHANNEL_SUB: Record<string, string> = {
  'Meta Ads': 'Instagram / Facebook',
  'Instagram': 'Instagram',
  'Facebook': 'Facebook',
  'Google Ads': 'Rede de Pesquisa & Maps',
  'WhatsApp': 'Captação Direta / Chatbot',
  'Site': 'Formulários do site',
  'Indicação': 'Boca a boca & Parceiros',
  'Manual / CRM': 'Cadastro manual'
};

const dayKey = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const EMPTY_STATS = {
  leads: 0,
  appointments: 0,
  confirmations: 0,
  followups: 0,
  todayPendingConfirmations: 0,
  todayConfirmedAppointments: 0,
  tomorrowPendingConfirmations: 0,
  tomorrowConfirmedAppointments: 0,
  yesterdayNoShows: 0,
  yesterdayAttendance: 0,
  yesterdayClosings: 0,
  channelsPerformance: [] as any[],
  channelHighlights: [] as any[]
};

export function useSupabaseDashboardStats(clinicId?: string, range?: string) {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [health, setHealth] = useState({
    integrationStatus: isSupabaseConfigured() ? 'Conectado (Supabase)' : 'Modo local (sem Supabase)',
    syncLatencyMs: 0,
    activeWebhooks: 0,
    summaryText: 'Carregando indicadores...',
    recommendation: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const started = performance.now();
        const sb = getSupabase();
        const [leads, apts] = await Promise.all([fetchLeadsFromDb(clinicId), loadAppointments(clinicId)]);

        let followups = 0;
        let activeWebhooks = 0;
        if (sb) {
          let fq = sb.from('follow_ups').select('id', { count: 'exact', head: true }).not('status', 'in', '(done,completed,cancelled)');
          if (clinicId && clinicId !== 'all') fq = fq.eq('clinic_id', clinicId);
          followups = (await fq).count || 0;
          activeWebhooks = (await sb.from('webhooks').select('id', { count: 'exact', head: true }).eq('status', 'active')).count || 0;
        }
        const latency = Math.round(performance.now() - started);

        const today = dayKey(0), tomorrow = dayKey(1), yesterday = dayKey(-1);
        const on = (day: string, statuses: string[]) =>
          apts.filter(a => String(a.appointment_date || a.date || '').slice(0, 10) === day && statuses.includes(String(a.status))).length;

        const sold = leads.filter(l => l.status === LeadStatus.SOLD).length;

        const byChannel: Record<string, any> = {};
        const byCampaign: Record<string, any> = {};
        leads.forEach(l => {
          const ch = l.sourceId || 'Outros';
          const c = (byChannel[ch] ||= { name: ch, sub: CHANNEL_SUB[ch] || 'Origem', leads: 0, appointments: 0, attendance: 0, misses: 0, sales: 0 });
          c.leads++;
          if (APPOINTED.has(l.status)) c.appointments++;
          if (ATTENDED.has(l.status)) c.attendance++;
          if (l.status === LeadStatus.MISSED) c.misses++;
          if (l.status === LeadStatus.SOLD) c.sales++;

          const camp = l.utmCampaign || 'Sem campanha';
          const k = `${ch}|${camp}`;
          const h = (byCampaign[k] ||= {
            channel: ch, tag: /meta|insta|face/i.test(ch) ? 'Meta' : /google/i.test(ch) ? 'Google' : 'Direto',
            ad: camp, leads: 0, appointments: 0, attendance: 0
          });
          h.leads++;
          if (APPOINTED.has(l.status)) h.appointments++;
          if (ATTENDED.has(l.status)) h.attendance++;
        });

        const total = leads.length;
        const highlights = Object.values(byCampaign)
          .sort((a: any, b: any) => b.leads - a.leads)
          .slice(0, 4)
          .map((h: any) => ({ ...h, percentage: `${Math.round((h.leads / Math.max(total, 1)) * 100)}%` }));

        const confirmations = apts.filter(a => ['confirmed', 'attended'].includes(String(a.status)) || /confirm|realiz|compare/i.test(String(a.status))).length;

        if (cancelled) return;
        setStats({
          leads: total,
          appointments: apts.length,
          confirmations,
          followups,
          todayPendingConfirmations: on(today, ['pending']),
          todayConfirmedAppointments: on(today, ['confirmed']),
          tomorrowPendingConfirmations: on(tomorrow, ['pending']),
          tomorrowConfirmedAppointments: on(tomorrow, ['confirmed']),
          yesterdayNoShows: on(yesterday, ['missed']),
          yesterdayAttendance: on(yesterday, ['attended']),
          yesterdayClosings: sold,
          channelsPerformance: Object.values(byChannel).sort((a: any, b: any) => b.leads - a.leads),
          channelHighlights: highlights
        });
        setHealth({
          integrationStatus: sb ? 'Conectado (Supabase)' : 'Modo local (sem Supabase)',
          syncLatencyMs: latency,
          activeWebhooks,
          summaryText: total > 0
            ? `${total} leads, ${sold} vendas e ${apts.length} agendamentos registrados.`
            : 'Ainda não há leads registrados nesta visão.',
          recommendation: total > 0 && sold === 0
            ? 'Nenhuma venda registrada ainda: priorize o follow-up dos leads agendados.'
            : 'Mantenha as confirmações via WhatsApp com 24h de antecedência.'
        });
      } catch (e) {
        console.error('Erro ao montar indicadores do dashboard:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    window.addEventListener('crm_leads_updated', load);
    return () => {
      cancelled = true;
      window.removeEventListener('crm_leads_updated', load);
    };
  }, [clinicId, range]);

  return { stats, health, loading };
}
