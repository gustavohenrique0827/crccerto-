-- =====================================================================
-- SCHEMA COMPLETO DO BANCO DE DADOS SUPABASE (POSTGRESQL)
-- SISTEMA CRM CLÍNICO & GESTÃO ODONTOLÓGICA / MÉDICA MULTI-UNIDADES
-- =====================================================================
-- Para executar: Copie todo o conteúdo deste arquivo e cole no 
-- SQL Editor do seu projeto Supabase (https://supabase.com/dashboard)
-- =====================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 2. ENUMS & TIPOS CUSTOMIZADOS
-- =====================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'super_admin',
        'admin',
        'professional',
        'receptionist',
        'marketing',
        'user'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE clinic_status AS ENUM (
        'active',
        'inactive',
        'trial',
        'blocked'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM (
        'novo',
        'contatado',
        'agendou',
        'compareceu',
        'faltou',
        'vendido',
        'comprou',
        'perdido'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM (
        'pending',
        'confirmed',
        'attended',
        'missed',
        'cancelled',
        'rescheduled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM (
        'low',
        'medium',
        'high',
        'urgent'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM (
        'todo',
        'in_progress',
        'waiting',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sync_direction AS ENUM (
        'bidirectional',
        'gcal_to_crm',
        'crm_to_gcal'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sync_status AS ENUM (
        'success',
        'error',
        'warning',
        'pending',
        'in_progress'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE channel_type AS ENUM (
        'meta',
        'google',
        'instagram',
        'facebook',
        'whatsapp',
        'website',
        'referral',
        'manual'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'income',
        'expense'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM (
        'pending',
        'completed',
        'cancelled',
        'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================================
-- 3. TABELAS CENTRAIS DO SISTEMA
-- =====================================================================

-- 3.1 CLÍNICAS (MULTI-TENANT ROOTS)
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    corporate_name VARCHAR(255),
    cnpj VARCHAR(20),
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    responsible_name VARCHAR(255),
    status clinic_status NOT NULL DEFAULT 'active',
    system VARCHAR(100) DEFAULT 'LeadGen CRM',
    logo_url TEXT,
    google_sync_enabled BOOLEAN NOT NULL DEFAULT false,
    google_sync_interval_minutes INT NOT NULL DEFAULT 15,
    enabled_modules JSONB NOT NULL DEFAULT '{"agenda": true, "leads": true, "patients": true, "marketing": true, "financial": true, "tasks": true}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.2 PERFIS DE USUÁRIOS (LIGADO AO AUTH.USERS DO SUPABASE)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'user',
    avatar_url TEXT,
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT true,
    accessible_clinic_ids UUID[] DEFAULT '{}',
    default_clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.3 PROFISSIONAIS / DENTISTAS / MÉDICOS
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30),
    cro_crm VARCHAR(50),
    specialty VARCHAR(100) NOT NULL DEFAULT 'Clínica Geral',
    color_hex VARCHAR(10) DEFAULT '#3B82F6',
    google_calendar_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.4 PACIENTES
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30) NOT NULL,
    cpf VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(20),
    address JSONB DEFAULT '{}'::jsonb,
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    medical_alerts TEXT[] DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    last_visit_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.5 LEADS (PIPELINE COMERCIAL & CRM)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30) NOT NULL,
    status lead_status NOT NULL DEFAULT 'novo',
    origin channel_type NOT NULL DEFAULT 'meta',
    campaign_name VARCHAR(255),
    procedure_interest VARCHAR(255),
    estimated_value NUMERIC(12, 2) DEFAULT 0.00,
    priority priority_level NOT NULL DEFAULT 'medium',
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    responsible_name VARCHAR(255),
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    lost_reason TEXT,
    first_contact_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.6 INTERAÇÕES DE LEADS (TIMELINE / HISTÓRICO DE CONTATO)
CREATE TABLE IF NOT EXISTS public.lead_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
    message TEXT NOT NULL,
    interaction_type VARCHAR(50) NOT NULL DEFAULT 'message',
    scheduled_for TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.7 AGENDAMENTOS (AGENDA CLÍNICA & GOOGLE CALENDAR)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(30) NOT NULL,
    procedure_name VARCHAR(255) NOT NULL DEFAULT 'Consulta Inicial',
    professional_name VARCHAR(255),
    clinic_name VARCHAR(255),
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 45,
    end_time TIME,
    status appointment_status NOT NULL DEFAULT 'confirmed',
    notes TEXT,
    estimated_value NUMERIC(12, 2) DEFAULT 0.00,
    -- Campos de integração com Google Calendar
    google_event_id TEXT,
    google_calendar_id TEXT,
    google_etag TEXT,
    google_sync_status VARCHAR(50) DEFAULT 'synced',
    google_sync_error TEXT,
    last_synced_at TIMESTAMPTZ,
    source VARCHAR(50) NOT NULL DEFAULT 'crm',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.8 CONFIGURAÇÃO DE INTEGRAÇÃO GOOGLE CALENDAR POR CLÍNICA
CREATE TABLE IF NOT EXISTS public.google_calendar_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL UNIQUE REFERENCES public.clinics(id) ON DELETE CASCADE,
    google_user_email VARCHAR(255),
    primary_calendar_id TEXT,
    selected_calendar_id TEXT,
    calendar_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
    sync_interval_minutes INT NOT NULL DEFAULT 15,
    sync_direction sync_direction NOT NULL DEFAULT 'bidirectional',
    channel_token TEXT,
    channel_id TEXT,
    channel_expiration_time TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    last_sync_status sync_status DEFAULT 'success',
    last_sync_message TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.9 MAPEAMENTOS DE PROFISSIONAIS PARA CALENDÁRIOS DO GOOGLE
CREATE TABLE IF NOT EXISTS public.google_calendar_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
    doctor_name VARCHAR(255) NOT NULL,
    google_calendar_id TEXT NOT NULL,
    google_calendar_name VARCHAR(255),
    default_procedure VARCHAR(255) DEFAULT 'Consulta',
    default_duration_minutes INT DEFAULT 45,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.10 HISTÓRICO DE SINCRONIZAÇÃO (LOGS OPERACIONAIS)
CREATE TABLE IF NOT EXISTS public.sync_history_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'manual',
    direction sync_direction NOT NULL DEFAULT 'bidirectional',
    status sync_status NOT NULL DEFAULT 'success',
    appointments_pulled INT NOT NULL DEFAULT 0,
    appointments_pushed INT NOT NULL DEFAULT 0,
    conflicts_found INT NOT NULL DEFAULT 0,
    errors_count INT NOT NULL DEFAULT 0,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    duration_ms INT NOT NULL DEFAULT 0,
    user_email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.11 FILA DE RETENTATIVA RESILIENTE (SYNC QUEUE)
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL DEFAULT 'upsert',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.12 TAREFAS OPERACIONAIS
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    responsible_name VARCHAR(255),
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    patient_name VARCHAR(255),
    priority priority_level NOT NULL DEFAULT 'medium',
    status task_status NOT NULL DEFAULT 'todo',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.13 FOLLOW-UPS (RETENÇÃO E RECUPERAÇÃO DE PACIENTES)
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(30),
    channel VARCHAR(50) NOT NULL DEFAULT 'WhatsApp',
    reason VARCHAR(255) NOT NULL,
    responsible_name VARCHAR(255),
    last_interaction TIMESTAMPTZ,
    next_action VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    priority priority_level NOT NULL DEFAULT 'medium',
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.14 CAMPANHAS DE MARKETING (ADS, META, GOOGLE)
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(100) NOT NULL DEFAULT 'Meta Ads',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    budget NUMERIC(12, 2) DEFAULT 0.00,
    spent NUMERIC(12, 2) DEFAULT 0.00,
    reach INT DEFAULT 0,
    clicks INT DEFAULT 0,
    leads_generated INT DEFAULT 0,
    conversion_rate NUMERIC(5, 2) DEFAULT 0.00,
    cost_per_lead NUMERIC(10, 2) DEFAULT 0.00,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.15 TRANSAÇÕES FINANCEIRAS (VENDAS, RECEITAS E DESPESAS)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    type transaction_type NOT NULL DEFAULT 'income',
    status transaction_status NOT NULL DEFAULT 'completed',
    payment_method VARCHAR(50) DEFAULT 'pix',
    category VARCHAR(100) DEFAULT 'Tratamento Odontológico',
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.16 WEBHOOKS (ENDPOINTS DE ENTRADA META ADS / GOOGLE ADS)
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    service_name VARCHAR(100) NOT NULL DEFAULT 'Meta Ads',
    webhook_url TEXT NOT NULL,
    secret_token VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    events TEXT[] DEFAULT '{lead_received}',
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.17 AUDIT LOGS (CONFORMIDADE E SEGURANÇA)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id TEXT,
    changes JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =====================================================================
-- 4. ÍNDICES DE ALTA PERFORMANCE
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_clinics_status ON public.clinics(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_professionals_clinic ON public.professionals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON public.patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON public.patients(cpf);
CREATE INDEX IF NOT EXISTS idx_leads_clinic_status ON public.leads(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON public.appointments(clinic_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_google_id ON public.appointments(google_event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_clinic_status ON public.tasks(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_clinic_due ON public.follow_ups(clinic_id, due_date);
CREATE INDEX IF NOT EXISTS idx_financial_clinic_date ON public.financial_transactions(clinic_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_clinic_created ON public.sync_history_logs(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue(status, attempts);

-- =====================================================================
-- 5. TRIGGERS AUTOMÁTICOS (UPDATED_AT & AUTH USER PROVISIONING)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_updated_at_%I ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER tr_updated_at_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at()', t, t);
    END LOOP;
END $$;

-- TRIGGER SUPABASE AUTH: CRIAÇÃO AUTOMÁTICA DE PERFIL QUANDO O USUÁRIO REGISTRA
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'admin'),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Verifica se o usuário autenticado tem acesso à clínica
CREATE OR REPLACE FUNCTION public.has_clinic_access(target_clinic_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
    accessible_clinics UUID[];
BEGIN
    SELECT role, accessible_clinic_ids INTO user_role_val, accessible_clinics
    FROM public.profiles
    WHERE id = auth.uid();

    IF user_role_val = 'super_admin' THEN
        RETURN true;
    END IF;

    IF accessible_clinics IS NULL OR array_length(accessible_clinics, 1) IS NULL THEN
        RETURN true;
    END IF;

    RETURN target_clinic_id = ANY(accessible_clinics);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLÍTICAS GERAIS (Permite acesso por usuários autenticados da clínica)
DO $$
DECLARE
    table_rec record;
BEGIN
    FOR table_rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'clinics', 'profiles', 'professionals', 'patients', 'leads', 
            'lead_interactions', 'appointments', 'google_calendar_integrations',
            'google_calendar_mappings', 'sync_history_logs', 'sync_queue',
            'tasks', 'follow_ups', 'marketing_campaigns', 'financial_transactions',
            'webhooks', 'audit_logs'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "auth_full_access_%I" ON public.%I', table_rec.tablename, table_rec.tablename);
        EXECUTE format('CREATE POLICY "auth_full_access_%I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', table_rec.tablename, table_rec.tablename);
    END LOOP;
END $$;

-- =====================================================================
-- 7. FUNÇÕES & VIEWS DE INTELIGÊNCIA OPERACIONAL
-- =====================================================================

-- 7.1 DETECÇÃO DE CONFLITOS DE HORÁRIO NA AGENDA
CREATE OR REPLACE FUNCTION public.check_appointment_conflicts(
    p_clinic_id UUID,
    p_appointment_date DATE,
    p_start_time TIME,
    p_duration_minutes INT,
    p_professional_id UUID DEFAULT NULL,
    p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS TABLE (
    conflict_id UUID,
    conflict_patient_name VARCHAR,
    conflict_start_time TIME,
    conflict_duration_minutes INT
) AS $$
DECLARE
    v_end_time TIME;
BEGIN
    v_end_time := (p_start_time + (p_duration_minutes || ' minutes')::interval)::time;

    RETURN QUERY
    SELECT 
        a.id,
        a.patient_name,
        a.start_time,
        a.duration_minutes
    FROM public.appointments a
    WHERE a.clinic_id = p_clinic_id
      AND a.appointment_date = p_appointment_date
      AND a.status NOT IN ('cancelled')
      AND (p_exclude_appointment_id IS NULL OR a.id <> p_exclude_appointment_id)
      AND (p_professional_id IS NULL OR a.professional_id IS NULL OR a.professional_id = p_professional_id)
      AND (
          (a.start_time, (a.start_time + (a.duration_minutes || ' minutes')::interval)::time) 
          OVERLAPS 
          (p_start_time, v_end_time)
      );
END;
$$ LANGUAGE plpgsql STABLE;

-- 7.2 VIEW ANALÍTICA DE KPIS DA CLÍNICA
CREATE OR REPLACE VIEW public.vw_clinic_dashboard_kpis AS
SELECT
    c.id AS clinic_id,
    c.name AS clinic_name,
    COUNT(DISTINCT l.id) AS total_leads,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'novo') AS new_leads,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status IN ('vendido', 'comprou')) AS converted_sales,
    COALESCE(SUM(l.estimated_value) FILTER (WHERE l.status IN ('vendido', 'comprou')), 0) AS total_sales_revenue,
    COUNT(DISTINCT a.id) AS total_appointments,
    COUNT(DISTINCT a.id) FILTER (WHERE a.appointment_date = CURRENT_DATE) AS today_appointments,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'confirmed') AS confirmed_appointments,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'attended') AS attended_appointments,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'missed') AS missed_appointments,
    COUNT(DISTINCT p.id) AS total_patients
FROM public.clinics c
LEFT JOIN public.leads l ON l.clinic_id = c.id
LEFT JOIN public.appointments a ON a.clinic_id = c.id
LEFT JOIN public.patients p ON p.clinic_id = c.id
GROUP BY c.id, c.name;

-- =====================================================================
-- 8. TRIGGER DE AUDITORIA AUTOMÁTICA EM LEADS (AUDIT LOGS TRIGGER)
-- =====================================================================
-- Captura todas as alterações em leads (criação, mudança de status, exclusão)
-- registrando na tabela audit_logs com user_id e timestamp

CREATE OR REPLACE FUNCTION public.fn_audit_leads_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_clinic_id UUID;
    v_action VARCHAR(50);
    v_changes JSONB;
BEGIN
    -- Captura o user_id autenticado no Supabase Auth ou do contexto
    v_user_id := auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE';
        v_clinic_id := NEW.clinic_id;
        v_changes := jsonb_build_object(
            'created_lead', row_to_json(NEW),
            'source_medium', NEW.source_medium,
            'campaign_id', NEW.campaign_id,
            'referral_url', NEW.referral_url
        );
        INSERT INTO public.audit_logs (
            clinic_id,
            user_id,
            action,
            entity,
            entity_id,
            changes,
            created_at
        ) VALUES (
            v_clinic_id,
            v_user_id,
            v_action,
            'lead',
            NEW.id,
            v_changes,
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_clinic_id := NEW.clinic_id;
        IF OLD.status <> NEW.status THEN
            v_action := 'STATUS_CHANGE';
        END IF;
        
        v_changes := jsonb_build_object(
            'old_status', OLD.status,
            'new_status', NEW.status,
            'old_value', OLD.estimated_value,
            'new_value', NEW.estimated_value,
            'source_medium', NEW.source_medium,
            'campaign_id', NEW.campaign_id
        );

        INSERT INTO public.audit_logs (
            clinic_id,
            user_id,
            action,
            entity,
            entity_id,
            changes,
            created_at
        ) VALUES (
            v_clinic_id,
            v_user_id,
            v_action,
            'lead',
            NEW.id,
            v_changes,
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_clinic_id := OLD.clinic_id;
        v_changes := jsonb_build_object(
            'deleted_name', OLD.name,
            'deleted_phone', OLD.phone,
            'deleted_status', OLD.status
        );
        INSERT INTO public.audit_logs (
            clinic_id,
            user_id,
            action,
            entity,
            entity_id,
            changes,
            created_at
        ) VALUES (
            v_clinic_id,
            v_user_id,
            v_action,
            'lead',
            OLD.id,
            v_changes,
            NOW()
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 9. WAHA MULTI-TENANCY & INTERAÇÕES (WHATSAPP API)
-- =====================================================================

create table if not exists public.waha_tenants (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  waha_session text not null unique,
  clinic_id text not null,
  telefone_admin text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.interacoes (
  id uuid primary key default gen_random_uuid(),
  clinic_id text not null,
  telefone text not null,
  direcao text not null, -- 'inbound' | 'outbound'
  texto text,
  message_id text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_interacoes_clinic_telefone on public.interacoes (clinic_id, telefone);

insert into public.waha_tenants (nome, waha_session, clinic_id, telefone_admin, ativo)
values ('Rodrigo', 'Secreto-Rodrigo', '1', null, true)
on conflict (waha_session) do nothing;


