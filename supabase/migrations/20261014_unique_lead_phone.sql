-- Impede dois leads com o mesmo telefone na mesma clínica (compara os 8 últimos dígitos,
-- então +5563999653869, 63999653869 e (63) 99965-3869 contam como o mesmo número).
-- RODE SÓ DEPOIS de mesclar as duplicatas existentes, senão o índice não é criado.
-- Depois disso o n8n passa a receber erro 409 ao tentar criar um lead repetido:
-- o fluxo deve buscar o lead pelo telefone e atualizar, em vez de criar.
CREATE OR REPLACE FUNCTION public.phone_key(p text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 8
         THEN right(regexp_replace(p, '\D', '', 'g'), 8) END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_clinic_phone
  ON public.leads (clinic_id, public.phone_key(coalesce(nullif(phone, ''), whatsapp)))
  WHERE public.phone_key(coalesce(nullif(phone, ''), whatsapp)) IS NOT NULL;
