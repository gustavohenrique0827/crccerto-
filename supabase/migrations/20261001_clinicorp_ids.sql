-- Ids do Clinicorp nas tabelas que a sincronização preenche (api/clinicorp/sync.ts).
-- Idempotente. Rode no SQL Editor do Supabase antes de sincronizar.
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS clinicorp_id TEXT;
ALTER TABLE public.patients      ADD COLUMN IF NOT EXISTS clinicorp_id TEXT;
ALTER TABLE public.appointments  ADD COLUMN IF NOT EXISTS clinicorp_id TEXT;

-- Índices únicos simples (sem WHERE) para o upsert por (clinic_id, clinicorp_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_professionals_clinic_clinicorp ON public.professionals (clinic_id, clinicorp_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_clinic_clinicorp      ON public.patients (clinic_id, clinicorp_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_clinic_clinicorp  ON public.appointments (clinic_id, clinicorp_id);
