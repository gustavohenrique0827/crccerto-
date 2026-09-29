import React from 'react';
import { cn } from '@/src/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  key?: React.Key;
  label?: string;
  isNumeric?: boolean;
  error?: string;
  className?: string;
}

export function Input({
  label,
  isNumeric = false,
  error,
  className,
  ...props
}: InputProps) {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-primary-blue)]/50 focus:border-[var(--color-primary-blue)] text-[var(--color-text-primary)] outline-none transition-all duration-150 placeholder:text-[var(--color-text-faint)]",
          isNumeric && "text-right tabular-nums font-mono",
          error && "border-[var(--color-danger)] focus:ring-[var(--color-danger)]/50",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-[10px] font-bold text-[var(--color-danger)] mt-0.5">{error}</p>
      )}
    </div>
  );
}
