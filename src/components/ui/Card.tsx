import React from 'react';
import { cn } from '@/src/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  key?: React.Key;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-panel)] p-4 sm:p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
