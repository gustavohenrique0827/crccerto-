import React from 'react';
import { cn } from '@/src/lib/utils';

export interface StatItem {
  id?: string;
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

interface StatCellRowProps {
  stats: StatItem[];
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

export function StatCellRow({ stats, cols = 4, className }: StatCellRowProps) {
  const colGrid = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  const toneColorMap = {
    neutral: 'text-[var(--color-text-muted)]',
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)]',
    danger: 'text-[var(--color-danger)]',
    info: 'text-[var(--color-info)]'
  };

  return (
    <div className={cn("grid gap-px bg-[var(--color-border-default)] rounded-[var(--radius-panel)] overflow-hidden border border-[var(--color-border-default)] shadow-[var(--shadow-panel)]", colGrid[cols], className)}>
      {stats.map((item, idx) => {
        const toneClass = toneColorMap[item.tone || 'neutral'];
        return (
          <div key={item.id || idx} className="p-4 sm:p-5 bg-[var(--color-surface-elevated)] space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] truncate">
                {item.label}
              </span>
              {item.icon && (
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-current/10", toneClass)}>
                  {item.icon}
                </div>
              )}
            </div>

            <div className="font-display text-4xl font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)] leading-none pt-1">
              {item.value}
            </div>

            {item.hint && (
              <p className="text-[11px] text-[var(--color-text-faint)] font-normal truncate pt-0.5">
                {item.hint}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
