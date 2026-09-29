import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useState, useEffect, useCallback } from 'react';
import { Lead, LeadStatus, Clinic } from '../types';
import { INITIAL_LEADS, seedLocalStorageIfEmpty } from './mockData';

const getEnvVar = (key: string): string => {
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
  const procEnv = (typeof process !== 'undefined' && process.env) || {};
  
  return metaEnv[key] || metaEnv[`VITE_${key}`] || procEnv[key] || procEnv[`VITE_${key}`] || '';
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = supabaseUrl || getEnvVar('SUPABASE_URL');
  const key = supabaseAnonKey || getEnvVar('SUPABASE_ANON_KEY');

  if (!url || !key) {
    return null;
  }

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: typeof window !== 'undefined'
      }
    });
    return supabaseInstance;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  const url = supabaseUrl || getEnvVar('SUPABASE_URL');
  const key = supabaseAnonKey || getEnvVar('SUPABASE_ANON_KEY');
  return Boolean(url && key);
}

export interface ChannelConversionMetric {
  channel: string;
  totalLeads: number;
  convertedCount: number;
  conversionRate: number;
  revenue: number;
}

export async function fetchChannelConversionRatesFromDb(clinicId?: string): Promise<ChannelConversionMetric[]> {
  const sb = getSupabase();
  if (!sb) {
    return [
      { channel: 'Meta Ads', totalLeads: 45, convertedCount: 18, conversionRate: 40.0, revenue: 22500 },
      { channel: 'Google Ads', totalLeads: 30, convertedCount: 10, conversionRate: 33.3, revenue: 15000 },
      { channel: 'Instagram Direct', totalLeads: 25, convertedCount: 8, conversionRate: 32.0, revenue: 9600 },
      { channel: 'WhatsApp / Indicação', totalLeads: 20, convertedCount: 12, conversionRate: 60.0, revenue: 18000 }
    ];
  }
  try {
    let query = sb.from('leads').select('*');
    if (clinicId && clinicId !== 'all') {
      query = query.eq('clinic_id', clinicId);
    }
    const { data, error } = await query;
    if (error || !data) throw error;

    const map: Record<string, { total: number; converted: number; revenue: number }> = {};
    data.forEach((row: any) => {
      const ch = row.source || row.origin || 'Outros';
      if (!map[ch]) map[ch] = { total: 0, converted: 0, revenue: 0 };
      map[ch].total++;
      if (['vendido', 'comprou', 'compareceu'].includes(row.status)) {
        map[ch].converted++;
        map[ch].revenue += Number(row.estimated_value || 0);
      }
    });

    return Object.keys(map).map(ch => ({
      channel: ch,
      totalLeads: map[ch].total,
      convertedCount: map[ch].converted,
      conversionRate: map[ch].total > 0 ? Number(((map[ch].converted / map[ch].total) * 100).toFixed(1)) : 0,
      revenue: map[ch].revenue
    }));
  } catch (e) {
    console.error('Error fetching channel conversion rates:', e);
    return [];
  }
}

export async function fetchLeadsFromDb(clinicId?: string): Promise<Lead[]> {
  const sb = getSupabase();
  if (!sb) {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('crm_leads_data') : null;
    if (raw) return JSON.parse(raw);
    return INITIAL_LEADS as Lead[];
  }
  try {
    let query = sb.from('leads').select('*').order('created_at', { ascending: false });
    if (clinicId && clinicId !== 'all') {
      query = query.eq('clinic_id', clinicId);
    }
    const { data, error } = await query;
    if (error || !data) throw error;
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email || '',
      clinicId: row.clinic_id,
      source: row.source || 'Meta Ads',
      status: row.status,
      estimatedValue: Number(row.estimated_value || 0),
      notes: row.notes || '',
      createdAt: row.created_at
    }));
  } catch (e) {
    console.error('Error fetching leads from Supabase:', e);
    return [];
  }
}

export async function updateLeadInDb(id: string, updates: Partial<Lead>): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return true;
  try {
    const { error } = await sb.from('leads').update({
      status: updates.status,
      notes: updates.notes,
      estimated_value: updates.estimatedValue
    }).eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
}

export async function deleteLeadFromDb(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return true;
  try {
    const { error } = await sb.from('leads').delete().eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
}

export async function saveLeadToDb(lead: Lead): Promise<boolean> {
  // 1. Always persist to localStorage for instant UI response and local offline capability
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('crm_leads_data');
      const currentList: Lead[] = raw ? JSON.parse(raw) : (INITIAL_LEADS as Lead[]);
      const updatedList = [lead, ...currentList.filter(l => l.id !== lead.id)];
      localStorage.setItem('crm_leads_data', JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('crm_leads_updated', { detail: lead }));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Error saving lead to localStorage:', e);
    }
  }

  // 2. Persist to local server store (/api/leads)
  try {
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    }).catch(() => {});
  } catch (e) {}

  // 3. Persist to Supabase if connected
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('leads').upsert([{
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email || null,
        clinic_id: lead.clinicId,
        source: lead.source || 'Meta Ads',
        status: lead.status,
        estimated_value: lead.estimatedValue || 0,
        notes: lead.notes || '',
        created_at: lead.createdAt || new Date().toISOString()
      }]);
    } catch (e) {
      console.warn('Supabase lead upsert error (saved locally):', e);
    }
  }

  return true;
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

  // If no identifiable information is provided, no duplicate found
  if (!phone && !email) {
    return { isDuplicate: false };
  }

  // 1. Check local storage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('crm_leads_data');
      if (raw) {
        const localLeads = JSON.parse(raw);
        if (Array.isArray(localLeads)) {
          const match = localLeads.find((l: any) => {
            if (clinicId && clinicId !== 'all' && l.clinicId && l.clinicId !== clinicId) return false;
            const lPhone = (l.phone || l.whatsapp || '').replace(/\D/g, '');
            const lEmail = (l.email || '').trim().toLowerCase();
            if (phone && lPhone && phone === lPhone) return true;
            if (email && lEmail && email === lEmail) return true;
            return false;
          });
          if (match) {
            return {
              isDuplicate: true,
              existingLead: match,
              message: `Já existe um lead com este contato nesta unidade: ${match.name}`
            };
          }
        }
      }
    } catch (e) {}
  }

  // 2. Check Supabase if configured
  const sb = getSupabase();
  if (sb) {
    try {
      let q = sb.from('leads').select('*');
      if (clinicId && clinicId !== 'all') q = q.eq('clinic_id', clinicId);
      if (phone) q = q.eq('phone', phone);
      else if (email) q = q.eq('email', email);
      const { data } = await q.limit(1);
      if (data && data.length > 0) {
        return {
          isDuplicate: true,
          existingLead: data[0],
          message: `Lead já registrado no sistema: ${data[0].name}`
        };
      }
    } catch (e) {}
  }

  return { isDuplicate: false };
}

export function useSupabaseLeads(clinicId?: string) {
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('crm_leads_data');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_LEADS as Lead[];
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetchLeadsFromDb(clinicId);
    if (res && res.length > 0) {
      setLeads(res);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('crm_leads_data', JSON.stringify(res));
        } catch (e) {}
      }
    } else if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('crm_leads_data');
        if (raw) setLeads(JSON.parse(raw));
      } catch (e) {}
    }
    setLoading(false);
  }, [clinicId]);

  const updateLeadStatus = useCallback(async (leadId: string, newStatus: LeadStatus) => {
    setLeads(prev => {
      const updated = prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('crm_leads_data', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('crm_leads_updated'));
        } catch (e) {}
      }
      return updated;
    });

    // Update in DB / server
    updateLeadInDb(leadId, { status: newStatus });
    try {
      fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      }).catch(() => {});
    } catch (e) {}
  }, []);

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

export function useSupabaseDashboardStats(clinicId?: string, range?: string) {
  const [stats, setStats] = useState({
    leads: 125,
    appointments: 42,
    confirmations: 38,
    followups: 16,
    todayPendingConfirmations: 3,
    todayConfirmedAppointments: 8,
    tomorrowPendingConfirmations: 5,
    tomorrowConfirmedAppointments: 10,
    yesterdayNoShows: 2,
    yesterdayAttendance: 9,
    yesterdayClosings: 4,
    channelsPerformance: [
      { name: 'Meta Ads', sub: 'Instagram / Facebook', leads: 64, appointments: 22, attendance: 20, misses: 2, sales: 12 },
      { name: 'Google Ads', sub: 'Rede de Pesquisa & Maps', leads: 38, appointments: 14, attendance: 13, misses: 1, sales: 8 },
      { name: 'WhatsApp', sub: 'Captação Direta / Site', leads: 15, appointments: 4, attendance: 3, misses: 1, sales: 2 },
      { name: 'Indicações', sub: 'Boca a boca & Parceiros', leads: 8, appointments: 2, attendance: 2, misses: 0, sales: 2 }
    ],
    channelHighlights: [
      { channel: 'Instagram Ads', tag: 'Meta', ad: 'Campanha Clareamento & Implantes', leads: 42, appointments: 15, attendance: 14, percentage: '45%' },
      { channel: 'Google Search', tag: 'Google', ad: 'Palavras-Chave Dentista Urgência', leads: 26, appointments: 10, attendance: 9, percentage: '28%' },
      { channel: 'Facebook Feed', tag: 'Meta', ad: 'Próteses & Alinhadores Invisíveis', leads: 22, appointments: 7, attendance: 6, percentage: '18%' },
      { channel: 'WhatsApp Link', tag: 'Direto', ad: 'Botão Flutuante do Site Oficial', leads: 15, appointments: 4, attendance: 3, percentage: '9%' }
    ]
  });

  const [health, setHealth] = useState({
    integrationStatus: 'Conectado (Supabase)',
    syncLatencyMs: 45,
    activeWebhooks: 4,
    summaryText: 'Desempenho operacional consistente com boa taxa de presença.',
    recommendation: 'Reforce as confirmações via WhatsApp com 24h de antecedência.'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchLeadsFromDb(clinicId).then(leads => {
      let appointmentsCount = 0;
      let confirmationsCount = 0;
      let salesCount = 0;

      if (typeof window !== 'undefined') {
        try {
          const rawApts = localStorage.getItem('crm_appointments_data');
          if (rawApts) {
            const apts = JSON.parse(rawApts);
            if (Array.isArray(apts)) {
              appointmentsCount = apts.length;
              confirmationsCount = apts.filter((a: any) => String(a.status).toLowerCase().includes('confirm') || String(a.status).toLowerCase().includes('realiz')).length;
            }
          }
        } catch (e) {}
      }

      salesCount = leads.filter(l => l.status === 'vendido' || (l.status as any) === 'sold' || l.status === 'comprou').length;

      const leadsTotal = leads.length > 0 ? leads.length : 125;
      const aptsTotal = appointmentsCount > 0 ? appointmentsCount : 42;
      const confTotal = confirmationsCount > 0 ? confirmationsCount : Math.round(aptsTotal * 0.85);

      setStats(prev => ({
        ...prev,
        leads: leadsTotal,
        appointments: aptsTotal,
        confirmations: confTotal,
        followups: Math.max(1, Math.round(leadsTotal * 0.15)),
        yesterdayClosings: salesCount > 0 ? salesCount : 4
      }));
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [clinicId, range]);

  return { stats, health, loading };
}
