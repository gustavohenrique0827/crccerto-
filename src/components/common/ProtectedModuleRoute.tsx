import React from 'react';
import { ShieldAlert, Building2, ArrowLeft, Sliders, ShieldX, Home } from 'lucide-react';
import { motion } from 'motion/react';
import { useModuleAccess } from '@/src/hooks/useModuleAccess';
import { useApp } from '@/src/context/AppContext';
import { Role } from '@/src/types';

interface ProtectedModuleRouteProps {
  moduleId: string;
  children: React.ReactNode;
}

export default function ProtectedModuleRoute({ moduleId, children }: ProtectedModuleRouteProps) {
  const { hasAccess, reason, clinicName } = useModuleAccess(moduleId);
  const { setActiveTab, user, switchUserRole } = useApp();

  if (hasAccess) {
    return <>{children}</>;
  }

  const isSuperAdmin = user?.role === Role.SUPER_ADMIN;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="max-w-2xl mx-auto my-8 sm:my-12 p-6 sm:p-8 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel-lg)] shadow-[var(--shadow-panel)] text-center space-y-6"
    >
      {/* Icon Shield */}
      <div className="w-16 h-16 rounded-[var(--radius-panel)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/25 flex items-center justify-center text-[var(--color-danger)] mx-auto shadow-inner">
        <ShieldX className="w-8 h-8" />
      </div>

      {/* Title and Reason */}
      <div className="space-y-2">
        <span className="px-3 py-1 bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/25 text-[10px] font-bold uppercase tracking-widest rounded-full inline-block">
          Acesso Restrito / Módulo Indisponível
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
          Acesso Negado
        </h2>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed font-medium">
          {reason || `O módulo "${moduleId.toUpperCase()}" encontra-se bloqueado para esta unidade ou seu perfil.`}
        </p>
      </div>

      {/* Clinic Badge */}
      {clinicName && (
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-primary)]">
          <Building2 size={14} className="text-[var(--color-primary-blue)]" />
          <span>Unidade: {clinicName}</span>
        </div>
      )}

      {/* Operational Help Box */}
      <div className="p-4 bg-[var(--color-surface-sunken)] rounded-[var(--radius-panel)] border border-[var(--color-border-default)] text-left text-xs space-y-2 text-[var(--color-text-muted)]">
        <p className="font-bold text-[var(--color-text-primary)] uppercase tracking-wider text-[10px]">
          O que você pode fazer?
        </p>
        <ul className="space-y-1.5 text-[11px] list-disc list-inside">
          <li>Ativar o módulo no painel de <strong>Configurações &gt; Módulos</strong> se você for gestor.</li>
          <li>Alternar para a visão de outra clínica autorizada no menu lateral.</li>
          <li>Contatar o administrador geral do sistema para conceder a permissão.</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="w-full sm:w-auto px-5 py-2.5 bg-[var(--color-primary-blue)] hover:brightness-110 !text-white font-bold rounded-[var(--radius-control)] text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home size={15} />
          <span>Voltar ao Dashboard</span>
        </button>

        {isSuperAdmin ? (
          <button
            type="button"
            onClick={() => setActiveTab('configuracoes')}
            className="w-full sm:w-auto px-5 py-2.5 bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border-default)] text-[var(--color-text-primary)] font-bold rounded-[var(--radius-control)] text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-[var(--color-border-default)]"
          >
            <Sliders size={15} />
            <span>Gerenciar Módulos</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchUserRole(Role.SUPER_ADMIN)}
            className="w-full sm:w-auto px-5 py-2.5 bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border-default)] text-[var(--color-text-primary)] font-bold rounded-[var(--radius-control)] text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-[var(--color-border-default)]"
          >
            <span>Simular como Admin</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
