-- Alinha o enum lead_status com as etapas do funil usadas pelo app (Pipeline).
-- Rode UMA vez no SQL Editor do Supabase. É idempotente.
-- Valores antigos (contatado, agendou, comprou, perdido) continuam válidos e são
-- lidos pelo app como 1_contato, agendamento, vendido e desqualificado.
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS '1_contato';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS '2_contato';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS '3_contato';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'interagiu';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'agendamento';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'desqualificado';

-- Coluna usada pelo n8n/WAHA e pelo app (já existe no seu banco; garante em instalações novas)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30);

-- Corrige o trigger de criação de perfil: no contexto do Supabase Auth o search_path não
-- inclui "public", então o cast para user_role falhava e TODO cadastro de usuário dava
-- "Database error creating new user".
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'admin'::public.user_role),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
