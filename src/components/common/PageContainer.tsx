import React from 'react';
import { Home, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface PageContainerProps {
  title: string;
  description?: string;
  breadcrumb?: (string | BreadcrumbItem)[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  isFormPage?: boolean;
}

export function PageContainer({
  title,
  description,
  breadcrumb = [],
  actions,
  children,
  isFormPage = false
}: PageContainerProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="space-y-2">
        {/* Breadcrumb Line 1 */}
        <nav className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-faint)] flex-wrap">
          <span className="flex items-center gap-1 text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
            <Home size={12} className="shrink-0" />
            <span>Início</span>
          </span>
          
          {breadcrumb.map((crumb, idx) => {
            const isLast = idx === breadcrumb.length - 1;
            const label = typeof crumb === 'string' ? crumb : crumb.label;
            const onClick = typeof crumb === 'string' ? undefined : crumb.onClick;

            return (
              <React.Fragment key={idx}>
                <ChevronRight size={10} className="shrink-0 text-[var(--color-text-faint)]" />
                {isLast ? (
                  <span className="text-[var(--color-primary-blue)] font-black">
                    {label}
                  </span>
                ) : (
                  <span
                    onClick={onClick}
                    className={cn(
                      "text-[var(--color-text-faint)] transition-colors",
                      onClick && "hover:text-[var(--color-text-primary)] cursor-pointer"
                    )}
                  >
                    {label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Title & Actions Line 2 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
                {title}
              </h1>
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary-blue)] animate-pulse shrink-0 hidden sm:inline-block" />
            </div>
            {description && (
              <p className="text-sm text-[var(--color-text-muted)] font-medium leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center flex-wrap gap-3 shrink-0 self-start sm:self-auto">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Wrapper */}
      <div className={cn("mx-auto pb-12", isFormPage ? "max-w-[1200px]" : "max-w-[1700px]")}>
        {children}
      </div>
    </div>
  );
}
