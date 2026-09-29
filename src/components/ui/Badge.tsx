import React from 'react';
import { cn } from '@/src/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  key?: React.Key;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'cyan' | 'neutral';
  isTableStatus?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Badge({
  variant = 'neutral',
  isTableStatus = false,
  children,
  className,
  ...props
}: BadgeProps) {
  const variantStyles = {
    success: "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/25",
    warning: "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/25",
    danger: "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/25",
    info: "bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/25",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
    cyan: "bg-[var(--color-tech-cyan)]/10 text-[var(--color-tech-cyan)] border-[var(--color-tech-cyan)]/25",
    neutral: "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] border-[var(--color-border-default)]"
  };

  const shapeStyles = isTableStatus
    ? "rounded-lg px-2.5 py-1 text-[10px] font-bold border tracking-wide uppercase whitespace-nowrap inline-flex items-center gap-1"
    : "rounded-full px-2.5 py-0.5 text-xs font-semibold border whitespace-nowrap inline-flex items-center gap-1";

  return (
    <span
      className={cn(shapeStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}
