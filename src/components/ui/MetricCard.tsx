import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  iconBg?: string;
  badge?: string;
  className?: string;
  onClick?: () => void;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  change,
  trend = 'neutral',
  icon,
  iconBg = 'bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)]',
  badge,
  className,
  onClick
}: MetricCardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-5 rounded-[var(--radius-panel)] bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)] transition-all duration-200 hover:border-[var(--color-primary-blue)]/40 flex flex-col justify-between space-y-3",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-wider">
            {title}
          </span>
          {badge && (
            <span className="ml-2 px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-[var(--color-surface-sunken)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]">
              {badge}
            </span>
          )}
        </div>

        {icon && (
          <div className={cn("w-10 h-10 rounded-[var(--radius-control)] flex items-center justify-center shrink-0 border border-[var(--color-border-subtle)]", iconBg)}>
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)] tracking-tight tabular-nums font-mono">
          {value}
        </div>

        {(change || subtitle) && (
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {change && (
              <span className={cn(
                "font-bold flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md",
                trend === 'up' && "bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/25",
                trend === 'down' && "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/25",
                trend === 'neutral' && "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] border border-[var(--color-border-default)]"
              )}>
                {trend === 'up' && <TrendingUp size={12} />}
                {trend === 'down' && <TrendingDown size={12} />}
                {trend === 'neutral' && <Minus size={12} />}
                <span>{change}</span>
              </span>
            )}
            {subtitle && (
              <span className="text-[var(--color-text-muted)] text-[11px] font-medium">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
