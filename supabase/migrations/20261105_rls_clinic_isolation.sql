-- Isolamento por clínica (multi-tenant) no banco.
--
-- Antes: as políticas "auth_full_access_*" usavam USING (true): qualquer usuário logado lia e
-- alterava os dados de TODAS as clínicas, e has_clinic_access() liberava quem não tinha clínica.
-- Agora: super_admin enxerga tudo; os demais só enxergam as clínicas do próprio perfil
-- (profiles.clinic_id, default_clinic_id e accessible_clinic_ids). Sem clínica = sem acesso.
--
-- Não afeta o n8n nem a sincronização do Clinicorp: ambos usam a service_role, que ignora RLS.
-- Idempotente: pode ser executado mais de uma vez.

-- 1) Funções auxiliares (SECURITY DEFINER para não entrar em recursão com a RLS de profiles)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT role::text = 'super_admin' FROM public.profiles WHERE id = auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION public.has_clinic_access(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin()
      OR (
        target_clinic_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.is_active IS NOT FALSE
            AND (
              target_clinic_id = p.clinic_id
              OR target_clinic_id = p.default_clinic_id
              OR target_clinic_id = ANY (COALESCE(p.accessible_clinic_ids, '{}'::uuid[]))
            )
        )
      );
$$;

-- 2) Tabelas com clinic_id: troca a política aberta pela política por clínica
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'professionals', 'patients', 'leads', 'appointments', 'google_calendar_integrations',
    'google_calendar_mappings', 'sync_history_logs', 'sync_queue', 'tasks', 'follow_ups',
    'marketing_campaigns', 'financial_transactions', 'webhooks', 'audit_logs'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_full_access_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "clinic_isolation_%s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "clinic_isolation_%s" ON public.%I FOR ALL TO authenticated USING (public.has_clinic_access(clinic_id)) WITH CHECK (public.has_clinic_access(clinic_id))',
      t, t
    );
  END LOOP;
END $$;

-- 3) lead_interactions não tem clinic_id: herda a clínica do lead
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_full_access_lead_interactions" ON public.lead_interactions;
DROP POLICY IF EXISTS "clinic_isolation_lead_interactions" ON public.lead_interactions;
CREATE POLICY "clinic_isolation_lead_interactions" ON public.lead_interactions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.has_clinic_access(l.clinic_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.has_clinic_access(l.clinic_id)));

-- 4) Clínicas: vê quem tem acesso; só super_admin cria/exclui; quem tem acesso edita
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_full_access_clinics" ON public.clinics;
DROP POLICY IF EXISTS "clinics_select" ON public.clinics;
DROP POLICY IF EXISTS "clinics_insert" ON public.clinics;
DROP POLICY IF EXISTS "clinics_update" ON public.clinics;
DROP POLICY IF EXISTS "clinics_delete" ON public.clinics;
CREATE POLICY "clinics_select" ON public.clinics FOR SELECT TO authenticated USING (public.has_clinic_access(id));
CREATE POLICY "clinics_insert" ON public.clinics FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "clinics_update" ON public.clinics FOR UPDATE TO authenticated USING (public.has_clinic_access(id)) WITH CHECK (public.has_clinic_access(id));
CREATE POLICY "clinics_delete" ON public.clinics FOR DELETE TO authenticated USING (public.is_super_admin());

-- 5) Perfis: cada um vê o próprio; super_admin vê todos; a equipe de uma clínica vê os colegas dela.
--    Só o próprio usuário (ou o super_admin) altera o perfil. O papel (role) só o super_admin muda.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_full_access_profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_super_admin() OR public.has_clinic_access(COALESCE(clinic_id, default_clinic_id)));
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin())
  WITH CHECK (public.is_super_admin() OR (id = auth.uid() AND role::text = (SELECT role::text FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (public.is_super_admin());

-- 6) Tabelas do agente de WhatsApp: leitura só da própria clínica
DROP POLICY IF EXISTS "auth_read_waha_tenants" ON public.waha_tenants;
CREATE POLICY "auth_read_waha_tenants" ON public.waha_tenants FOR SELECT TO authenticated USING (public.has_clinic_access(clinic_id));
-- interacoes.clinic_id é texto (legado do n8n): sem vínculo confiável com a clínica, só o super_admin lê.
DROP POLICY IF EXISTS "auth_read_interacoes" ON public.interacoes;
CREATE POLICY "auth_read_interacoes" ON public.interacoes FOR SELECT TO authenticated USING (public.is_super_admin());

-- Conferência rápida (rode depois): deve listar "clinic_isolation_*" e nenhuma "auth_full_access_*"
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;
