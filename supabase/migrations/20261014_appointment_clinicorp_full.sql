-- Guarda no banco tudo que o Clinicorp informa de cada compromisso da agenda:
-- etiquetas (tags), categoria e cor, tipo (consulta ou horário bloqueado) e os demais dados.
-- Rode ANTES da próxima sincronização. Idempotente.
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS category_color TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'appointment';  -- 'appointment' | 'blocked'
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS clinicorp_raw JSONB;
CREATE INDEX IF NOT EXISTS idx_appointments_kind ON public.appointments (clinic_id, kind, appointment_date);
