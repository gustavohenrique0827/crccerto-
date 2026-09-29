import React, { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface SectionSidebarItem {
  id: string;
  label: string;
  isUpcoming?: boolean;
}

export interface SectionSidebarGroup {
  id: string;
  title: string;
  icon?: React.ReactNode;
  items: SectionSidebarItem[];
}

interface SectionSidebarProps {
  heading: string;
  subheading?: string;
  groups: SectionSidebarGroup[];
  activeItemId: string;
  onSelect: (itemId: string) => void;
  children: React.ReactNode;
}

export function SectionSidebar({
  heading,
  subheading,
  groups,
  activeItemId,
  onSelect,
  children
}: SectionSidebarProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Group collapsible state: ALL START OPEN BY DEFAULT per user spec
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    groups.forEach(g => {
      initial[g.id] = true;
    });
    return initial;
  });

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <div className="flex flex-col lg:flex-row h-full -m-4 md:-m-8 overflow-hidden relative">
      {/* Mobile Top Fixed Header */}
      <div className="lg:hidden bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-default)] p-3 px-4 flex items-center justify-between shrink-0 z-20">
        <div>
          <h2 className="text-sm font-black tracking-tight text-[var(--color-text-primary)]">
            {heading}
          </h2>
          {subheading && (
            <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-faint)]">
              {subheading}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
        >
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-14 left-0 right-0 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-default)] shadow-[var(--shadow-panel)] z-30 max-h-[75vh] overflow-y-auto p-4 space-y-4 animate-fade-in">
          {groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)] flex items-center gap-1.5">
                {group.icon}
                <span>{group.title}</span>
              </div>
              <div className="space-y-1 pl-2">
                {group.items.map((item) => {
                  const isActive = activeItemId === item.id;
                  if (item.isUpcoming) {
                    return (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 text-xs font-medium rounded-[var(--radius-control)] opacity-60 cursor-not-allowed">
                        <span>{item.label}</span>
                        <span className="text-[8px] uppercase font-bold tracking-widest border border-[var(--color-border-default)] px-1.5 py-0.5 rounded">Em breve</span>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelect(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs font-medium rounded-[var(--radius-control)] border transition-all cursor-pointer",
                        isActive
                          ? "bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] border-[var(--color-primary-blue)]/20 font-bold"
                          : "text-[var(--color-text-muted)] border-transparent hover:bg-[var(--color-surface-sunken)]"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Left Sidebar Panel (256px) */}
      <aside
        className={cn(
          "hidden lg:flex flex-col w-64 shrink-0 bg-[var(--color-surface-sunken)] border-r border-[var(--color-border-default)] transition-all duration-300 relative select-none",
          !isPanelOpen && "w-0 overflow-hidden border-r-0"
        )}
      >
        {/* Panel Header */}
        <div className="p-5 border-b border-[var(--color-border-default)] flex items-center justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-lg font-black tracking-tight text-[var(--color-text-primary)]">
              {heading}
            </h2>
            {subheading && (
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-faint)] mt-0.5">
                {subheading}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsPanelOpen(false)}
            title="Recolher painel"
            className="p-1.5 rounded-[var(--radius-control)] text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] transition-colors cursor-pointer"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
          {groups.map((group) => {
            const isOpen = Boolean(openGroups[group.id]);

            return (
              <div key={group.id} className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer py-1"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {group.icon}
                    <span className="truncate">{group.title}</span>
                  </div>
                  <ChevronDown
                    size={13}
                    className={cn(
                      "shrink-0 transition-transform duration-200",
                      !isOpen && "-rotate-90"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="space-y-1 pl-1 pt-1 animate-fade-in">
                    {group.items.map((item) => {
                      const isActive = activeItemId === item.id;

                      if (item.isUpcoming) {
                        return (
                          <div
                            key={item.id}
                            className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium rounded-[var(--radius-control)] border border-transparent opacity-60 cursor-not-allowed select-none"
                          >
                            <span className="truncate text-[var(--color-text-muted)]">{item.label}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--color-border-default)] text-[var(--color-text-faint)] shrink-0">
                              Em breve
                            </span>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelect(item.id)}
                          className={cn(
                            "w-full text-left px-3.5 py-2 text-xs font-medium rounded-[var(--radius-control)] border transition-all cursor-pointer block truncate",
                            isActive
                              ? "bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] border-[var(--color-primary-blue)]/20 font-bold"
                              : "text-[var(--color-text-muted)] border-transparent hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]"
                          )}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Handle when desktop sidebar panel is collapsed */}
      {!isPanelOpen && (
        <button
          type="button"
          onClick={() => setIsPanelOpen(true)}
          title="Expandir painel"
          className="hidden lg:flex items-center justify-center h-10 w-6 rounded-r-[var(--radius-control)] bg-[var(--color-surface-sunken)] border-y border-r border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer absolute top-4 left-0 z-20 shadow-sm"
        >
          <PanelLeftOpen size={14} />
        </button>
      )}

      {/* Main Right Content Workspace */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 min-w-0 custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
