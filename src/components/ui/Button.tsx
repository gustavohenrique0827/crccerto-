import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  key?: React.Key;
  variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'success' | 'danger' | 'warning' | 'info' | 'secondary';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  icon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
}

export function Button({
  variant = 'default',
  size = 'md',
  loading = false,
  icon,
  type = 'button',
  children,
  className,
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-bold tracking-tight rounded-[var(--radius-control)] transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)]/40 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none";

  const sizeStyles = {
    xs: "h-7 px-2.5 text-[11px] gap-1",
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-9.5 px-4 text-xs sm:text-sm gap-2",
    lg: "h-11 px-5 text-sm gap-2.5",
    icon: "h-9.5 w-9.5 p-0 text-xs shrink-0"
  };

  const activeVariant = variant === 'primary' ? 'default' : variant;

  const variantStyles = {
    default: "bg-[var(--color-primary-blue)] !text-white hover:brightness-110 shadow-sm shadow-[var(--color-primary-blue)]/20 border border-transparent",
    primary: "bg-[var(--color-primary-blue)] !text-white hover:brightness-110 shadow-sm shadow-[var(--color-primary-blue)]/20 border border-transparent",
    outline: "border border-[var(--color-border-default)] bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]",
    ghost: "bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:bg-[var(--color-border-default)]/60",
    success: "bg-[var(--color-success)]/10 border border-[var(--color-success)]/25 text-[var(--color-success)] hover:bg-[var(--color-success)]/20",
    danger: "bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/25 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20",
    warning: "bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/25 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/20",
    info: "bg-[var(--color-info)]/10 border border-[var(--color-info)]/25 text-[var(--color-info)] hover:bg-[var(--color-info)]/20",
    secondary: "bg-[var(--color-tech-cyan)]/10 border border-[var(--color-tech-cyan)]/25 text-[var(--color-tech-cyan)] hover:bg-[var(--color-tech-cyan)]/20"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(baseStyles, sizeStyles[size], variantStyles[activeVariant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

export default Button;
