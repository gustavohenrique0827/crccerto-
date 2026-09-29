import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Badge } from '@/src/components/ui/Badge';

export interface ModuleToggleProps {
  key?: React.Key;
  id: string;
  name: string;
  category?: string;
  description: string;
  icon?: React.ReactNode;
  enabled: boolean;
  onToggle: (id: string, nextState: boolean) => void;
  isAdministrative?: boolean;
  disabled?: boolean;
  badgeText?: string;
}

export default function ModuleToggle({
  id,
  name,
  category,
  description,
  icon,
  enabled,
  onToggle,
  isAdministrative,
  disabled = false,
  badgeText
}: ModuleToggleProps) {
  const handleToggle = () => {
    if (disabled) return;
    onToggle(id, !enabled);
  };

  return (
    <div
      className={cn(
        "p-4 sm:p-5 rounded-[var(--radius-panel)] border transition-all duration-200 flex flex-col justify-between space-y-3.5 relative overflow-hidden group",
        isAdministrative
          ? (enabled
              ? "bg-[var(--color-warning)]/5 border-[var(--color-warning)]/30 shadow-[var(--shadow-control)]"
              : "bg-[var(--color-surface-sunken)]/60 border-[var(--color-border-default)] opacity-75")
          : (enabled
              ? "bg-[var(--color-surface-elevated)] border-[var(--color-border-default)] shadow-[var(--shadow-control)] hover:border-[var(--color-primary-blue)]/40"
              : "bg-[var(--color-surface-sunken)]/40 border-[var(--color-border-subtle)] opacity-75")
      )}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div
              className={cn(
                "w-10 h-10 rounded-[var(--radius-control)] flex items-center justify-center shrink-0 border transition-all",
                enabled
                  ? (isAdministrative
                      ? "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/25 text-[var(--color-warning)]"
                      : "bg-[var(--color-primary-blue)]/10 border-[var(--color-primary-blue)]/25 text-[var(--color-primary-blue)]")
                  : "bg-[var(--color-surface-sunken)] border-[var(--color-border-default)] text-[var(--color-text-faint)]"
              )}
            >
              {icon}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {category && (
                <Badge variant={isAdministrative ? "warning" : "info"}>
                  {category}
                </Badge>
              )}
              {badgeText && (
                <Badge variant="cyan">
                  {badgeText}
                </Badge>
              )}
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] mt-1.5 leading-snug">
              {name}
            </h4>
          </div>
        </div>

        {/* Polished Switch Button */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={disabled}
          onClick={handleToggle}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)]/40",
            enabled
              ? "bg-[var(--color-success)]"
              : "bg-[var(--color-text-faint)]/30",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="sr-only">Ativar ou desativar módulo</span>
          <span
            className={cn(
              "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center",
              enabled ? "translate-x-5" : "translate-x-0"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                enabled ? "bg-[var(--color-success)]" : "bg-[var(--color-text-faint)]"
              )}
            />
          </span>
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-normal">
        {description}
      </p>

      {/* Footer Status */}
      <div className="pt-2.5 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-semibold">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              enabled ? "bg-[var(--color-success)] animate-pulse" : "bg-[var(--color-text-faint)]"
            )}
          />
          <span className={enabled ? "text-[var(--color-success)] font-bold" : "text-[var(--color-text-faint)]"}>
            {enabled ? "Módulo Ativo" : "Desativado"}
          </span>
        </div>

        {isAdministrative && (
          <span className="text-[10px] font-bold text-[var(--color-warning)] flex items-center gap-1 uppercase tracking-wider">
            <Lock size={12} />
            Administrador
          </span>
        )}
      </div>
    </div>
  );
}
