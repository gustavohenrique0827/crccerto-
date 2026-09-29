import React from 'react';
import { cn } from '../../lib/utils';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  icon,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn("p-8 sm:p-12 text-center bg-[var(--color-surface-elevated)] rounded-[var(--radius-panel-lg)] border border-[var(--color-border-default)] space-y-4 max-w-md mx-auto my-6 shadow-[var(--shadow-panel)]", className)}>
      <div className="w-14 h-14 bg-[var(--color-surface-sunken)] rounded-[var(--radius-panel)] flex items-center justify-center text-[var(--color-text-faint)] mx-auto border border-[var(--color-border-default)]">
        {icon || <Inbox size={26} />}
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-extrabold text-[var(--color-text-primary)] tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="pt-2 flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}
