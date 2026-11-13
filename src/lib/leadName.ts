/** Nome sem valor para a equipe: vazio, só número/telefone ou rótulo genérico do WhatsApp. */
export const isPlaceholderName = (name?: string | null): boolean => {
  const n = String(name || '').trim();
  return !n || /^[\s+\d()\-.]+$/.test(n) || /^(lead whatsapp|contato whatsapp|cliente whatsapp|whatsapp|novo lead|lead|sem nome|desconhecido|unknown)$/i.test(n);
};

/**
 * Nome exibido do lead: o nome do paciente da agenda (a sincronização já grava ele no lead) ou o nome cadastrado;
 * sem nome nenhum, "NOVO LEAD".
 */
export const leadDisplayName = (lead: { name?: string | null }): string => (isPlaceholderName(lead.name) ? 'NOVO LEAD' : String(lead.name).trim());
