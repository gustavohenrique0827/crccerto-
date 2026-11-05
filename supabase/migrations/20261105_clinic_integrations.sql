-- Integrações por clínica (várias clínicas podem usar o Clinicorp, cada uma com a própria chave).
--
-- clinic_integrations guarda a chave da API: NINGUÉM no navegador consegue ler esta tabela
-- (só a função do servidor, com a service_role). O app lê a view clinic_integrations_public,
-- que mostra o estado da conexão sem a chave e só das clínicas que o usuário pode ver.
-- Depende da função has_clinic_access() (migration 20261105_rls_clinic_isolation.sql). Idempotente.

CREATE TABLE IF NOT EXISTS public.clinic_integrations (
  clinic_id     uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  provider      text NOT NULL DEFAULT 'clinicorp',
  subscriber_id text,
  api_key       text,
  enabled       boolean NOT NULL DEFAULT true,
  auto_sync     boolean NOT NULL DEFAULT true,
  last_sync_at  timestamptz,
  last_status   text,
  last_message  text,
  last_counts   jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, provider)
);

ALTER TABLE public.clinic_integrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clinic_integrations FROM anon, authenticated;
-- (sem políticas para anon/authenticated: só a service_role acessa)

CREATE OR REPLACE VIEW public.clinic_integrations_public AS
  SELECT clinic_id, provider, subscriber_id, (api_key IS NOT NULL AND api_key <> '') AS has_key,
         enabled, auto_sync, last_sync_at, last_status, last_message, last_counts, updated_at
  FROM public.clinic_integrations
  WHERE public.has_clinic_access(clinic_id);
GRANT SELECT ON public.clinic_integrations_public TO authenticated;

-- Carrega a clínica que já usa o Clinicorp hoje (CEOP): o usuário/chave continuam nas variáveis de
-- ambiente da Vercel enquanto você não conectar pela tela Integrações > Clinicorp.
-- Depois de conectar pela tela, as variáveis CLINICORP_* podem ser removidas.
