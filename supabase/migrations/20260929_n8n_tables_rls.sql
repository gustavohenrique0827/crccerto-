-- As tabelas do agente n8n/WAHA têm RLS ligado e nenhuma política, então o usuário logado
-- no app enxerga 0 linhas (o n8n grava com a service_role, que ignora RLS).
-- Libera leitura para usuários autenticados. Idempotente.
ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waha_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_interacoes" ON public.interacoes;
CREATE POLICY "auth_read_interacoes" ON public.interacoes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_read_waha_tenants" ON public.waha_tenants;
CREATE POLICY "auth_read_waha_tenants" ON public.waha_tenants FOR SELECT TO authenticated USING (true);
