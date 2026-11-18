-- Etapa "Paciente" do funil: contatos que já são pacientes da clínica (etiqueta do WhatsApp).
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'paciente';
