import { useEffect, useState } from 'react';
import { LeadStatus } from '../types';
import { getSupabase, isUuid } from './supabase';
import { useApp } from '../context/AppContext';

/** Etapas do funil, na ordem do Pipeline. A cor padrão vem das variáveis do tema; a escolhida na configuração é um hex. */
export const DEFAULT_STAGES: { id: LeadStatus; label: string; cssVar: string }[] = [
  { id: LeadStatus.NEW, label: 'Novo lead', cssVar: '--stage-0' },
  { id: LeadStatus.FIRST_CONTACT, label: '1° contato', cssVar: '--stage-1' },
  { id: LeadStatus.SECOND_CONTACT, label: 'Follow-up', cssVar: '--stage-2' },
  { id: LeadStatus.INTERACTED, label: 'Interagiu', cssVar: '--stage-4' },
  { id: LeadStatus.APPOINTMENT, label: 'Agendado', cssVar: '--stage-5' },
  { id: LeadStatus.ATTENDED, label: 'Compareceu', cssVar: '--stage-6' },
  { id: LeadStatus.SOLD, label: 'Comprou', cssVar: '--stage-7' },
  { id: LeadStatus.MISSED, label: 'Faltou', cssVar: '--stage-lost' },
  { id: LeadStatus.DISQUALIFIED, label: 'Desqualificado', cssVar: '--stage-void' }
];

export type FunnelOverrides = Partial<Record<LeadStatus, { label?: string; color?: string }>>;

let overrides: FunnelOverrides = {};
let loadedFor: string | null = null;
const EVENT = 'crm_funnel_updated';
const storageKey = (clinicId: string) => `crm_funnel_v1:${clinicId}`;

const setOverrides = (next: FunnelOverrides) => {
  overrides = next;
  window.dispatchEvent(new Event(EVENT));
};

/** Nome exibido da etapa (o 3º contato antigo aparece como Follow-up). */
export const stageLabel = (id: LeadStatus | string): string => {
  const key = (id === LeadStatus.THIRD_CONTACT ? LeadStatus.SECOND_CONTACT : id) as LeadStatus;
  return overrides[key]?.label?.trim() || DEFAULT_STAGES.find(s => s.id === key)?.label || String(id);
};

/** Cor CSS da etapa: hex escolhido ou a variável do tema. */
export const stageColor = (id: LeadStatus | string): string => {
  const key = (id === LeadStatus.THIRD_CONTACT ? LeadStatus.SECOND_CONTACT : id) as LeadStatus;
  return overrides[key]?.color || `var(${DEFAULT_STAGES.find(s => s.id === key)?.cssVar || '--stage-0'})`;
};

export const stageList = () => DEFAULT_STAGES.map(s => ({ id: s.id, label: stageLabel(s.id), colorValue: stageColor(s.id) }));
export const getOverrides = () => overrides;

/** Carrega o funil da clínica (cache local primeiro, depois o banco) e re-renderiza quem usa o hook. */
export function useFunnel(): number {
  const { currentClinic, clinics } = useApp();
  const clinicId = currentClinic?.id || clinics[0]?.id || '';
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    window.addEventListener(EVENT, bump);
    return () => window.removeEventListener(EVENT, bump);
  }, []);

  useEffect(() => {
    if (!clinicId || loadedFor === clinicId) return;
    loadedFor = clinicId;
    try { const raw = localStorage.getItem(storageKey(clinicId)); if (raw) setOverrides(JSON.parse(raw)); else setOverrides({}); } catch { setOverrides({}); }
    const sb = getSupabase();
    if (!sb || !isUuid(clinicId)) return;
    sb.from('clinics').select('metadata').eq('id', clinicId).maybeSingle().then(({ data }: any) => {
      const fromDb = data?.metadata?.funnel;
      if (fromDb && loadedFor === clinicId) {
        setOverrides(fromDb);
        try { localStorage.setItem(storageKey(clinicId), JSON.stringify(fromDb)); } catch { /* */ }
      }
    });
  }, [clinicId]);

  return version;
}

export async function saveFunnel(clinicId: string, next: FunnelOverrides): Promise<boolean> {
  try { localStorage.setItem(storageKey(clinicId), JSON.stringify(next)); } catch { /* */ }
  loadedFor = clinicId;
  setOverrides(next);
  const sb = getSupabase();
  if (!sb || !isUuid(clinicId)) return true;
  const { data } = await sb.from('clinics').select('metadata').eq('id', clinicId).maybeSingle();
  const { error } = await sb.from('clinics').update({ metadata: { ...(data?.metadata || {}), funnel: next } }).eq('id', clinicId);
  if (error) console.error('Erro ao salvar o funil:', error.message);
  return !error;
}
