import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  RefreshCw, 
  Key, 
  ArrowLeft, 
  ShieldCheck, 
  Check,
  Copy,
  Terminal,
  Activity,
  Cloud,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useApp } from '../../context/AppContext';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';

interface SupabaseConfigPanelProps {
  onBack: () => void;
}

export default function SupabaseConfigPanel({ onBack }: SupabaseConfigPanelProps) {
  const { addToast } = useApp();
  const [supabaseUrl, setSupabaseUrl] = useState(() => {
    return localStorage.getItem('crm_supabase_url') || (import.meta as any)?.env?.VITE_SUPABASE_URL || '';
  });
  const [supabaseKey, setSupabaseKey] = useState(() => {
    return localStorage.getItem('crm_supabase_key') || (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || '';
  });
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (supabaseUrl) localStorage.setItem('crm_supabase_url', supabaseUrl);
    if (supabaseKey) localStorage.setItem('crm_supabase_key', supabaseKey);
  }, [supabaseUrl, supabaseKey]);

  const handleTestConnection = async () => {
    if (!supabaseUrl || !supabaseKey) {
      addToast('Informe a URL e a Chave Anon do Supabase.', 'error');
      return;
    }

    setIsTesting(true);
    setConnectionStatus('idle');

    try {
      // Test direct connection by querying clinics table
      const client = getSupabase();
      if (!client) {
        throw new Error('Não foi possível inicializar o cliente Supabase com as credenciais informadas.');
      }

      const { data, error } = await client.from('clinics').select('id, name').limit(1);

      if (error) {
        // If table doesn't exist yet, test auth or general ping
        if (error.code === 'PGRST116' || error.message.includes('relation')) {
          setConnectionStatus('success');
          setStatusMessage('Conexão estabelecida com sucesso! (Atenção: Algumas tabelas ainda precisam ser criadas no SQL Editor).');
          addToast('Conectado ao Supabase com sucesso!', 'success');
        } else {
          throw error;
        }
      } else {
        setConnectionStatus('success');
        setStatusMessage(`Conexão bem-sucedida! ${data?.length || 0} clínica(s) encontrada(s) no banco PostgreSQL.`);
        addToast('Conexão com o Supabase validada com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error('Supabase test connection error:', err);
      setConnectionStatus('error');
      setStatusMessage(`Falha na conexão: ${err.message || 'Verifique se a URL e a Key estão corretas.'}`);
      addToast('Falha ao conectar com o Supabase.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const sqlMigrationCode = `
-- Cole este script no SQL Editor do seu Supabase (https://supabase.com/dashboard)

create table if not exists public.clinics (
    id uuid primary key default gen_random_uuid(),
    name varchar(255) not null,
    status varchar(50) default 'active',
    created_at timestamptz default now()
);

create table if not exists public.leads (
    id uuid primary key default gen_name_uuid(),
    clinic_id text not null,
    name varchar(255) not null,
    phone varchar(30) not null,
    email varchar(255),
    status varchar(50) default 'novo',
    created_at timestamptz default now()
);

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
  direcao text not null,
  texto text,
  message_id text,
  criado_em timestamptz not null default now()
);

insert into public.waha_tenants (nome, waha_session, clinic_id, ativo)
values ('Rodrigo', 'Secreto-Rodrigo', '1', true)
on conflict (waha_session) do nothing;
  `.trim();

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlMigrationCode);
    setCopied(true);
    addToast('Script SQL copiado para a área de transferência!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="xs"
          onClick={onBack}
        >
          <ArrowLeft size={14} />
          <span>Voltar para Integrações</span>
        </Button>
        <Badge variant={isSupabaseConfigured() ? "success" : "warning"}>
          <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured() ? 'bg-[var(--color-success)] animate-pulse' : 'bg-amber-500'}`} />
          <span>{isSupabaseConfigured() ? 'Supabase Conectado' : 'Configuração Pendente'}</span>
        </Badge>
      </div>

      {/* Main Card */}
      <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[var(--radius-panel)] bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/25">
              <Cloud size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--color-text-primary)] tracking-tight">
                Banco de Dados Supabase (PostgreSQL)
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Conecte o seu projeto Supabase para persistir leads, pacientes, agendamentos e instâncias WAHA em nuvem.
              </p>
            </div>
          </div>

          <Button
            size="xs"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            <RefreshCw size={13} className={isTesting ? "animate-spin" : ""} />
            <span>{isTesting ? 'Testando...' : 'Testar Conexão Supabase'}</span>
          </Button>
        </div>

        {/* Credentials Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Key size={14} className="text-emerald-500" />
              Credenciais do Supabase
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--color-text-muted)]">
                  Supabase Project URL
                </label>
                <input 
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://seu-projeto.supabase.co"
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs font-mono text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--color-text-muted)]">
                  Supabase Anon / Service Role Key
                </label>
                <input 
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs font-mono text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {connectionStatus !== 'idle' && (
              <div className={`p-3.5 rounded-[var(--radius-control)] border text-xs flex items-start gap-2.5 ${
                connectionStatus === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
                  : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
              }`}>
                {connectionStatus === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                <p className="font-medium leading-relaxed">{statusMessage}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Terminal size={14} className="text-emerald-500" />
              Migração SQL para o Supabase
            </h3>

            <div className="space-y-2">
              <p className="text-xs text-[var(--color-text-muted)]">
                Para habilitar o suporte completo no Supabase (incluindo as tabelas <code className="font-mono text-emerald-600">waha_tenants</code> e <code className="font-mono text-emerald-600">interacoes</code>), execute o script abaixo no SQL Editor do Supabase:
              </p>

              <div className="relative">
                <pre className="p-3 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-[11px] font-mono text-[var(--color-text-primary)] max-h-48 overflow-y-auto">
                  {sqlMigrationCode}
                </pre>
                <div className="absolute top-2 right-2">
                  <Button size="xs" variant="outline" onClick={handleCopySql}>
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copied ? 'Copiado' : 'Copiar SQL'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
