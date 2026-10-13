/**
 * Regra do número "Agendamentos" do dashboard: agendamentos FEITOS no período (não consultas marcadas
 * para o período), na agenda do profissional abaixo, criados pelo atendimento.
 * Para mudar a regra, edite só este arquivo.
 */
export const BOOKING_PROFESSIONAL = 'bruno';          // trecho do nome do profissional (sem acento/maiúscula)
export const BOOKING_CREATED_BY = ['ainoa', 'aino'];  // trechos do nome de quem criou (vazio = qualquer pessoa)

const norm = (v?: string | null) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function matchesBookingRule(a: { professional_name?: string | null; booked_by?: string | null; status?: string | null; kind?: string | null }): boolean {
  if (a.status === 'cancelled' || a.kind === 'blocked') return false;
  if (!norm(a.professional_name).includes(BOOKING_PROFESSIONAL)) return false;
  if (BOOKING_CREATED_BY.length === 0) return true;
  const by = norm(a.booked_by);
  return BOOKING_CREATED_BY.some(n => by.includes(n));
}
