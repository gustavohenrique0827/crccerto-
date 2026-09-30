-- Campos da ficha do lead que o app edita e o schema original não tinha.
-- Idempotente. Enquanto não rodar, o app salva os demais campos normalmente.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS cep VARCHAR(12);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address TEXT;
