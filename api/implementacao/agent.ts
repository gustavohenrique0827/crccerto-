/**
 * Implantação do agente de WhatsApp de uma clínica nova (Rodrigo Avulso -> n8n).
 * O token do n8n e a chave do WAHA ficam só no servidor; a chave da OpenAI passa por aqui apenas para
 * ser repassada ao n8n e NÃO é gravada em lugar nenhum.
 *
 * Variáveis de ambiente (Vercel):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   IMPLEMENTACAO_TOKEN        token do webhook do n8n (enviado separadamente pela equipe do n8n)
 *   IMPLEMENTACAO_URL          opcional; padrão https://n8n.spycrm.com.br/webhook/rodrigo-implementacao
 *   WAHA_URL, WAHA_API_KEY     para ver o estado da sessão e o QR code
 *
 * POST /api/implementacao/agent  { action, clinicId, ... }
 *   provision: { openaiApiKey, openaiOrganizationId?, telefoneAdmin }   (só super_admin)
 *   status:    {}                                                      -> estado da sessão no WAHA
 *   start:     {}                                                      -> inicia a sessão (gera o QR)
 *   qr:        {}                                                      -> QR code em imagem
 */
import { createClient } from '@supabase/supabase-js';

interface Req { method?: string; headers: Record<string, string | string[] | undefined>; body?: any }
interface Res { status: (c: number) => Res; json: (b: unknown) => void }

const env = (k: string) => (process.env[k] || '').trim();
const fail = (res: Res, code: number, message: string) => res.status(code).json({ ok: false, message });
const digits = (v: unknown) => String(v || '').replace(/\D/g, '');

async function waha(path: string, init: RequestInit = {}, ms = 15000): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(`${env('WAHA_URL').replace(/\/$/, '')}${path}`, { ...init, headers: { 'X-Api-Key': env('WAHA_API_KEY'), ...(init.headers || {}) }, signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return fail(res, 405, 'Use POST.');
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(k => !env(k));
  if (missing.length) return fail(res, 500, `Variáveis ausentes no servidor: ${missing.join(', ')}`);

  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return fail(res, 401, 'Entre no sistema.');
  const { data: u, error: ue } = await sb.auth.getUser(token);
  if (ue || !u.user) return fail(res, 401, 'Sessão inválida. Entre novamente.');
  const { data: prof } = await sb.from('profiles').select('role,is_active,clinic_id,default_clinic_id,accessible_clinic_ids').eq('id', u.user.id).maybeSingle();
  if (!prof || prof.is_active === false) return fail(res, 403, 'Usuário sem acesso.');

  const body = req.body || {};
  const action = String(body.action || '');
  const clinicId = String(body.clinicId || '');
  if (!clinicId) return fail(res, 400, 'Informe a clínica (clinicId).');
  const isSuper = prof.role === 'super_admin';
  const mine = new Set([prof.clinic_id, prof.default_clinic_id, ...(prof.accessible_clinic_ids || [])].filter(Boolean));
  if (!isSuper && !mine.has(clinicId)) return fail(res, 403, 'Você não tem acesso a esta clínica.');

  const { data: clinic } = await sb.from('clinics').select('id,name,whatsapp,phone').eq('id', clinicId).maybeSingle();
  if (!clinic) return fail(res, 404, 'Clínica não encontrada.');
  const { data: setup } = await sb.from('clinic_integrations').select('subscriber_id,last_message,last_counts').eq('clinic_id', clinicId).eq('provider', 'agent').maybeSingle();

  try {
    if (action === 'provision') {
      if (!isSuper) return fail(res, 403, 'Só o administrador geral pode implantar um agente.');
      if (!env('IMPLEMENTACAO_TOKEN')) return fail(res, 500, 'IMPLEMENTACAO_TOKEN ainda não foi configurado na Vercel.');
      if (setup) return fail(res, 409, 'Esta clínica já tem um agente implantado.');
      const openaiApiKey = String(body.openaiApiKey || '').trim();
      const telefoneAdmin = digits(body.telefoneAdmin || clinic.whatsapp || clinic.phone);
      if (!/^sk-/.test(openaiApiKey)) return fail(res, 400, 'Informe a chave do projeto OpenAI da clínica (começa com sk-).');
      if (telefoneAdmin.length < 10) return fail(res, 400, 'Informe o telefone do administrador com DDD.');

      const r = await fetch(env('IMPLEMENTACAO_URL') || 'https://n8n.spycrm.com.br/webhook/rodrigo-implementacao', {
        method: 'POST',
        headers: { Authorization: env('IMPLEMENTACAO_TOKEN'), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_cliente: clinic.name,
          telefone_admin: telefoneAdmin,
          openai_api_key: openaiApiKey,
          clinic_id: clinic.id,
          ...(body.openaiOrganizationId ? { openai_organization_id: String(body.openaiOrganizationId).trim() } : {})
        })
      });
      const j: any = await r.json().catch(() => ({}));
      if (r.status === 403) return fail(res, 502, 'O n8n recusou o token da implantação. Confira o IMPLEMENTACAO_TOKEN.');
      if (r.status === 409) return fail(res, 409, 'O n8n informa que este cliente já foi implantado.');
      if (r.status === 400) return fail(res, 400, `Dados recusados pelo n8n: ${(j.erros || [j.erro]).filter(Boolean).join('; ') || 'verifique os campos'}`);
      if (!r.ok || j.ok === false) return fail(res, 502, `O n8n respondeu ${r.status}${j.erro ? `: ${j.erro}` : ''}.`);

      const info = { workflow_id: j.workflow_id || null, workflow_nome: j.workflow_nome || null, waha_session: j.waha_session || null, webhook_url: j.webhook_url || null, proximo_passo: j.proximo_passo || null };
      await sb.from('clinic_integrations').upsert(
        { clinic_id: clinicId, provider: 'agent', subscriber_id: info.waha_session, api_key: null, enabled: false, auto_sync: false, last_status: 'ok', last_message: info.workflow_nome, last_counts: info, last_sync_at: new Date().toISOString() },
        { onConflict: 'clinic_id,provider' }
      );
      return res.status(200).json({ ok: true, ...info });
    }

    // as demais ações precisam do agente já implantado e do WAHA configurado
    const session = setup?.subscriber_id as string | undefined;
    if (!session) return fail(res, 404, 'Esta clínica ainda não tem agente implantado.');
    if (!env('WAHA_URL') || !env('WAHA_API_KEY')) return fail(res, 500, 'WAHA_URL e WAHA_API_KEY ainda não foram configuradas na Vercel.');

    if (action === 'start') {
      const r = await waha(`/api/sessions/${encodeURIComponent(session)}/start`, { method: 'POST' });
      if (!r || (!r.ok && r.status !== 422)) return fail(res, 502, 'Não consegui iniciar a sessão no WAHA.');
      return res.status(200).json({ ok: true });
    }
    if (action === 'status') {
      const r = await waha(`/api/sessions/${encodeURIComponent(session)}`);
      if (!r) return fail(res, 502, 'O WAHA não respondeu.');
      if (r.status === 404) return res.status(200).json({ ok: true, session, status: 'NOT_FOUND', info: setup?.last_counts || null });
      const j: any = await r.json().catch(() => ({}));
      return res.status(200).json({ ok: true, session, status: j.status || 'UNKNOWN', me: j.me?.pushName || j.me?.id || null, info: setup?.last_counts || null });
    }
    if (action === 'qr') {
      const r = await waha(`/api/${encodeURIComponent(session)}/auth/qr?format=image`, { headers: { Accept: 'image/png' } });
      if (!r || !r.ok) return res.status(200).json({ ok: true, qr: null });
      const buf = Buffer.from(await r.arrayBuffer());
      return res.status(200).json({ ok: true, qr: `data:image/png;base64,${buf.toString('base64')}` });
    }
    return fail(res, 400, 'Ação desconhecida.');
  } catch (e: any) {
    return fail(res, 502, e?.message || 'Falha na implantação do agente.');
  }
}
