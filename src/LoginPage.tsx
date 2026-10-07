import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Target, Mail, Lock, Eye, EyeOff, LogIn, Loader2, ShieldCheck } from 'lucide-react';
import { useApp } from './context/AppContext';
import { cn } from './lib/utils';
import { isSupabaseConfigured } from './lib/supabase';

export default function LoginPage() {
  const { login, addToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Por favor, preencha todos os campos', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      addToast(error?.message || 'Erro ao realizar login. Verifique suas credenciais.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const RAMP = ['--stage-0', '--stage-1', '--stage-2', '--stage-3', '--stage-4', '--stage-5', '--stage-6', '--stage-7'];

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] bg-[var(--color-surface)]">
      {/* Painel de marca: o funil de leads, do primeiro contato à venda */}
      <aside className="hidden lg:flex flex-col justify-between bg-[var(--color-rail)] text-white p-12 xl:p-16 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--color-tech-cyan)] text-[#04222A] flex items-center justify-center">
            <Target size={22} />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">LeadGen CRM</span>
        </div>

        <div className="max-w-xl">
          <h1 className="font-display text-5xl xl:text-6xl font-semibold leading-[1.02] tracking-tight">
            Do primeiro contato<br />à cadeira do dentista.
          </h1>
          <p className="mt-5 text-base text-white/70 max-w-md leading-relaxed">
            Pipeline de leads, agenda das clínicas e follow-up da equipe, na mesma tela.
          </p>

          <div className="mt-12" aria-hidden="true">
            <div className="flex gap-1.5">
              {RAMP.map((v, i) => (
                <div key={v} className="h-2.5 flex-1 rounded-full" style={{ background: `var(${v})`, opacity: 0.55 + i * 0.065 }} />
              ))}
            </div>
            <div className="mt-2.5 flex justify-between text-[11px] font-medium uppercase tracking-widest text-white/50">
              <span>Novo lead</span>
              <span>Agendado</span>
              <span>Venda</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/40">Gestão de leads e agenda para redes de clínicas</p>
      </aside>

      {/* Formulário */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-[var(--radius-control)] bg-[var(--color-primary-blue)] text-white flex items-center justify-center">
              <Target size={20} />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">LeadGen CRM</span>
          </div>

          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">Entrar</h2>
          <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">Use o e-mail e a senha cadastrados para você.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {!isSupabaseConfigured() && (
              <div className="rounded-[var(--radius-control)] border border-[var(--color-primary-blue)]/25 bg-[var(--color-primary-blue)]/8 p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-primary-blue)]" />
                  <span className="text-[11px] font-bold text-[var(--color-primary-blue)] uppercase tracking-widest">Modo demonstração</span>
                </div>
                <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                  <span>E-mail: <span className="font-mono font-medium text-[var(--color-text-primary)] select-all">admin@crm.com</span></span>
                  <span>Senha: <span className="font-mono font-medium text-[var(--color-text-primary)] select-all">admin123</span></span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-semibold text-[var(--color-text-muted)] block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-faint)]" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] hover:border-[var(--color-primary-blue)]/50 focus:border-[var(--color-primary-blue)] rounded-[var(--radius-control)] outline-none transition-colors text-[var(--color-text-primary)] placeholder:text-[var(--color-text-faint)] text-sm"
                  placeholder="voce@clinica.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-semibold text-[var(--color-text-muted)] block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-faint)]" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] hover:border-[var(--color-primary-blue)]/50 focus:border-[var(--color-primary-blue)] rounded-[var(--radius-control)] outline-none transition-colors text-[var(--color-text-primary)] placeholder:text-[var(--color-text-faint)] text-sm"
                  placeholder="Sua senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--color-primary-blue)] hover:brightness-110 !text-white py-3 rounded-[var(--radius-control)] font-semibold text-sm transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Entrar</span>
                  <LogIn size={16} />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
