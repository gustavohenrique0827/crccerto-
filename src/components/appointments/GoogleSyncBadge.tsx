import React from 'react';
import { CheckCircle2, Clock, AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

export type GoogleSyncStatus = 'synced' | 'pending' | 'error';

interface GoogleSyncBadgeProps {
  status?: GoogleSyncStatus;
  errorMsg?: string;
  size?: 'xs' | 'sm' | 'md';
  compact?: boolean; // When true, renders just the icon with tooltip
  showLabel?: boolean;
  onRetry?: (e: React.MouseEvent) => void;
  className?: string;
}

export default function GoogleSyncBadge({
  status = 'pending',
  errorMsg,
  size = 'xs',
  compact = false,
  showLabel = true,
  onRetry,
  className
}: GoogleSyncBadgeProps) {
  const config = {
    synced: {
      label: 'Sincronizado',
      shortLabel: 'Sinc.',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      border: 'border-emerald-200 dark:border-emerald-800',
      tooltip: 'Sincronizado com o Google Calendar',
    },
    pending: {
      label: 'Pendente',
      shortLabel: 'Pend.',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      border: 'border-amber-200 dark:border-amber-800',
      tooltip: 'Pendente de sincronização (na fila local de reenvio)',
    },
    error: {
      label: 'Com Erro de API',
      shortLabel: 'Erro API',
      icon: AlertCircle,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      border: 'border-rose-200 dark:border-rose-800',
      tooltip: errorMsg ? `Erro de API Google: ${errorMsg}` : 'Falha na API do Google Calendar. Clique para tentar novamente.',
    },
  }[status] || {
    label: 'Pendente',
    shortLabel: 'Pend.',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    border: 'border-amber-200 dark:border-amber-800',
    tooltip: 'Aguardando sincronização',
  };

  const Icon = config.icon;
  const iconSize = size === 'xs' ? 10 : size === 'sm' ? 12 : 14;

  if (compact) {
    return (
      <span 
        className={cn(
          "inline-flex items-center justify-center p-0.5 rounded-full transition-transform hover:scale-110",
          config.color,
          status === 'error' && "animate-pulse cursor-pointer",
          className
        )}
        title={config.tooltip}
        onClick={status === 'error' && onRetry ? onRetry : undefined}
      >
        <Icon size={iconSize} className="shrink-0" />
      </span>
    );
  }

  return (
    <div
      title={config.tooltip}
      className={cn(
        "inline-flex items-center gap-1 font-bold rounded-md border shadow-2xs transition-all",
        size === 'xs' ? "px-1.5 py-0.5 text-[9px]" : size === 'sm' ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        config.bg,
        config.border,
        config.color,
        status === 'error' && "hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer",
        className
      )}
      onClick={status === 'error' && onRetry ? onRetry : undefined}
    >
      <Icon size={iconSize} className={cn("shrink-0", status === 'pending' && "animate-pulse")} />
      {showLabel && (
        <span className="truncate whitespace-nowrap">
          {size === 'xs' ? config.shortLabel : config.label}
        </span>
      )}
      {status === 'error' && onRetry && (
        <RotateCcw size={9} className="opacity-75 hover:opacity-100 hover:rotate-180 transition-transform ml-0.5" />
      )}
    </div>
  );
}
