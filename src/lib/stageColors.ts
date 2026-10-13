import { LeadStatus } from '../types';

/**
 * Rampa do funil: do cinza-petróleo claro (lead novo) ao verde-escuro (venda).
 * Faltou e desqualificado saem da rampa: coral e cinza neutro.
 * As cores são variáveis CSS (index.css) para acompanhar o modo escuro.
 */
export const STAGE_VAR: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: 'var(--stage-0)',
  [LeadStatus.FIRST_CONTACT]: 'var(--stage-1)',
  [LeadStatus.SECOND_CONTACT]: 'var(--stage-2)',
  [LeadStatus.THIRD_CONTACT]: 'var(--stage-3)',
  [LeadStatus.INTERACTED]: 'var(--stage-4)',
  [LeadStatus.APPOINTMENT]: 'var(--stage-5)',
  [LeadStatus.ATTENDED]: 'var(--stage-6)',
  [LeadStatus.SOLD]: 'var(--stage-7)',
  [LeadStatus.MISSED]: 'var(--stage-lost)',
  [LeadStatus.DISQUALIFIED]: 'var(--stage-void)'
};

export const stageBgClass = (status: LeadStatus) => `bg-[${STAGE_VAR[status]}]`;
