import React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  kicker,
  actions,
  children,
  className
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 space-y-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          {kicker && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-primary-blue)] bg-[var(--color-primary-blue)]/10 px-2.5 py-0.5 rounded-full border border-[var(--color-primary-blue)]/25">
                {kicker}
              </span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-3xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {children && (
        <div className="pt-2">
          {children}
        </div>
      )}
    </div>
  );
}
