import React from 'react';
import { cn } from '../../lib/utils';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'active' | 'pending';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function StatusBadge({
  label,
  variant = 'neutral',
  pulse = false,
  size = 'md',
  className
}: StatusBadgeProps) {
  const variantStyles: Record<StatusVariant, { bg: string; text: string; dot: string; border: string }> = {
    success: {
      bg: 'bg-[var(--color-success)]/10',
      text: 'text-[var(--color-success)]',
      dot: 'bg-[var(--color-success)]',
      border: 'border-[var(--color-success)]/25'
    },
    active: {
      bg: 'bg-[var(--color-success)]/10',
      text: 'text-[var(--color-success)]',
      dot: 'bg-[var(--color-success)]',
      border: 'border-[var(--color-success)]/25'
    },
    warning: {
      bg: 'bg-[var(--color-warning)]/10',
      text: 'text-[var(--color-warning)]',
      dot: 'bg-[var(--color-warning)]',
      border: 'border-[var(--color-warning)]/25'
    },
    pending: {
      bg: 'bg-[var(--color-warning)]/10',
      text: 'text-[var(--color-warning)]',
      dot: 'bg-[var(--color-warning)]',
      border: 'border-[var(--color-warning)]/25'
    },
    error: {
      bg: 'bg-[var(--color-danger)]/10',
      text: 'text-[var(--color-danger)]',
      dot: 'bg-[var(--color-danger)]',
      border: 'border-[var(--color-danger)]/25'
    },
    info: {
      bg: 'bg-[var(--color-info)]/10',
      text: 'text-[var(--color-info)]',
      dot: 'bg-[var(--color-info)]',
      border: 'border-[var(--color-info)]/25'
    },
    neutral: {
      bg: 'bg-[var(--color-surface-sunken)]',
      text: 'text-[var(--color-text-muted)]',
      dot: 'bg-[var(--color-text-faint)]',
      border: 'border-[var(--color-border-default)]'
    }
  };

  const style = variantStyles[variant] || variantStyles.neutral;

  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider rounded-lg border whitespace-nowrap",
        size === 'sm' ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        style.bg,
        style.text,
        style.border,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.dot, pulse && "animate-pulse")} />
      <span>{label}</span>
    </span>
  );
}
