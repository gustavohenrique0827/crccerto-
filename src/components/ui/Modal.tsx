import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  children: React.ReactNode;
  footerActions?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  maxWidth = 'lg',
  children,
  footerActions
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel-lg)] shadow-[var(--shadow-panel)] overflow-hidden z-10 animate-fade-in my-auto flex flex-col max-h-[90vh]",
          widthClasses[maxWidth]
        )}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border-default)] flex items-start justify-between gap-4 shrink-0 bg-[var(--color-surface-sunken)]/40">
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-[var(--color-text-primary)]">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 font-medium">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-control)] text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {children}
        </div>

        {/* Sticky Footer */}
        {footerActions && (
          <div className="px-6 py-3.5 border-t border-[var(--color-border-default)] bg-[var(--color-surface-sunken)]/60 flex items-center justify-end gap-3 shrink-0">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
}
