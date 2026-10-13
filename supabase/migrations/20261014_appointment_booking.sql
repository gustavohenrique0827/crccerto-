-- Guarda QUANDO e POR QUEM cada agendamento foi criado no Clinicorp
-- (hoje o banco só tem a data da consulta). Rode antes da próxima sincronização.
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS booked_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS booked_by TEXT;
CREATE INDEX IF NOT EXISTS idx_appointments_booked_at ON public.appointments (clinic_id, booked_at);
