import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Target, Mail, Lock, Eye, EyeOff, LogIn, Loader2, ShieldCheck, ChevronRight } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col items-center justify-center p-4 selection:bg-[var(--color-primary-blue)]/20 transition-colors duration-500">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--color-primary-blue)]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--color-tech-cyan)]/5 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        {/* Slot Identity Section */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex p-4 bg-[var(--color-surface-elevated)] rounded-[var(--radius-panel-lg)] shadow-[var(--shadow-panel)] mb-4 border border-[var(--color-border-default)]"
          >
            <div className="w-14 h-14 bg-[var(--color-primary-blue)] rounded-[var(--radius-panel)] flex items-center justify-center shadow-lg shadow-[var(--color-primary-blue)]/30">
              <Target className="w-8 h-8 text-white" />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-xs font-black text-[var(--color-text-faint)] uppercase tracking-widest">Painel do Gestor</p>
          </motion.div>
        </div>

        {/* Auth Card */}
        <div className="bg-[var(--color-surface-elevated)] p-8 rounded-[var(--radius-panel-lg)] shadow-[var(--shadow-panel)] border border-[var(--color-border-default)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Test Credentials Helper (só no modo demonstração, sem Supabase) */}
            {!isSupabaseConfigured() && <div className="bg-[var(--color-primary-blue)]/10 border border-[var(--color-primary-blue)]/25 p-4 rounded-[var(--radius-panel)] mb-2">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-primary-blue)]" />
                <span className="text-[10px] font-bold text-[var(--color-primary-blue)] uppercase tracking-widest">Acesso de Teste</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--color-text-muted)] font-medium">Email: <span className="text-[var(--color-text-primary)] font-bold select-all">admin@crm.com</span></span>
                <span className="text-[var(--color-text-muted)] font-medium">Senha: <span className="text-[var(--color-text-primary)] font-bold select-all">admin123</span></span>
              </div>
            </div>}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--color-text-muted)] block ml-0.5">Email de Acesso</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-faint)] group-focus-within:text-[var(--color-text-primary)] transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] hover:border-[var(--color-primary-blue)]/50 focus:border-[var(--color-primary-blue)] rounded-[var(--radius-control)] outline-none transition-all text-[var(--color-text-primary)] placeholder:text-[var(--color-text-faint)] text-xs font-medium"
                  placeholder="admin@exemplo.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-0.5">
                <label className="text-xs font-semibold text-[var(--color-text-muted)]">Senha de Segurança</label>
                <button type="button" className="text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">Esqueceu?</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-faint)] group-focus-within:text-[var(--color-text-primary)] transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] hover:border-[var(--color-primary-blue)]/50 focus:border-[var(--color-primary-blue)] rounded-[var(--radius-control)] outline-none transition-all text-[var(--color-text-primary)] placeholder:text-[var(--color-text-faint)] text-xs font-medium"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-5 h-5 bg-[var(--color-surface-sunken)] rounded border border-[var(--color-border-default)] peer-checked:bg-[var(--color-primary-blue)] peer-checked:border-[var(--color-primary-blue)] transition-all" />
                  <ShieldCheck className="absolute inset-0 w-3 h-3 text-white m-auto opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider group-hover:text-[var(--color-text-primary)] transition-colors">Manter conectado</span>
              </label>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--color-primary-blue)] hover:brightness-110 !text-white py-3.5 rounded-[var(--radius-control)] font-bold text-sm shadow-[var(--shadow-control)] transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group overflow-hidden relative cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <div className="bg-white/20 p-1.5 rounded-md group-hover:translate-x-1 transition-transform">
                    <LogIn size={16} />
                  </div>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-6">
            <a href="#" className="text-xs font-bold text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] uppercase tracking-widest transition-colors">Suporte</a>
            <div className="w-1 h-1 rounded-full bg-[var(--color-border-default)]" />
            <a href="#" className="text-xs font-bold text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] uppercase tracking-widest transition-colors">Privacidade</a>
            <div className="w-1 h-1 rounded-full bg-[var(--color-border-default)]" />
            <a href="#" className="text-xs font-bold text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] uppercase tracking-widest transition-colors">Status</a>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
