import React, { useState, useEffect } from 'react';
import { 
  Target, 
  LayoutGrid, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  LogOut, 
  Building2, 
  Link2, 
  X, 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  UserCircle, 
  BarChart3, 
  Activity, 
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import ClinicSwitcher from './ClinicSwitcher';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }: Omit<SidebarProps, 'activeTab' | 'setActiveTab'>) {
  const { currentClinic, isAllClinicsView, activeTab, setActiveTab, confirmLogout, user } = useApp();
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  // Group collapsible state: ALL START CLOSED BY DEFAULT
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Track screen size and module updates
  useEffect(() => {
    const checkScreen = () => {
      const isLg = window.innerWidth >= 1024;
      setIsLargeScreen(isLg);
      if (isLg) setIsMobileOpen(false);
    };

    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => {
      window.removeEventListener('resize', checkScreen);
    };
  }, [setIsMobileOpen]);

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  const isModuleEnabled = (moduleId: string) => {
    // Visão "Todas as Clínicas" / Administrador Geral: Acesso total a todas as partes
    if (isAllClinicsView || user?.role === Role.SUPER_ADMIN) {
      return true;
    }

    const enabledList: string[] = currentClinic?.enabledModules || [];

    // Check if administration module overall is turned off for single clinic view
    if (['clinicas', 'equipe', 'integracoes', 'configuracoes', 'settings'].includes(moduleId)) {
      if (enabledList.length > 0 && !enabledList.includes('administration')) {
        return false;
      }
    }

    const idToModule: Record<string, any> = {
      'dashboard': 'dashboard',
      'leads': 'crm',
      'analise-dados': 'analise-dados',
      'pacientes': 'patients',
      'records': 'records',
      'agenda': 'appointments',
      'followups': 'followups',
      'tarefas': 'tasks',
      'conversas': 'communication',
      'relatorios': 'reports',
      'analytics': 'analytics',
      'integracoes': 'integrations',
      'equipe': 'team',
      'configuracoes': 'settings',
      'settings': 'settings'
    };

    const moduleKey = idToModule[moduleId];
    if (!moduleKey) return true;
    
    if (enabledList.length > 0) {
      return enabledList.includes(moduleKey);
    }
    
    return true;
  };

  const isCeopUser = !isAllClinicsView && user?.role !== Role.SUPER_ADMIN && (user?.role === Role.CEOP_OPERATOR || user?.role === Role.CEOP || user?.role === Role.CRC_OPERATOR);

  const menuGroups = [
    {
      label: 'WORKSPACE',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'leads', label: 'Pipeline', icon: Target },
        { id: 'analise-dados', label: 'Análise de dados', icon: BarChart3 },
        { id: 'pacientes', label: 'Pacientes', icon: UserCircle },
        { id: 'agenda', label: 'Agenda', icon: Calendar },
        { id: 'followups', label: 'Follow-ups', icon: Activity },
        { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
      ]
    },
    {
      label: 'INSIGHTS & AJUDA',
      items: [
        { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
        { id: 'guia', label: 'Guia do Sistema', icon: BookOpen },
      ]
    },
    {
      label: 'ADMINISTRAÇÃO',
      items: [
        { id: 'clinicas', label: 'Clientes / Clínicas', icon: Building2 },
        { id: 'equipe', label: 'Equipe', icon: Users },
        { id: 'integracoes', label: 'Integrações', icon: Link2 },
        { id: 'configuracoes', label: 'Configurações', icon: Settings },
      ]
    }
  ].map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (!isModuleEnabled(item.id)) return false;
      if (isCeopUser && ['clinicas', 'equipe', 'integracoes', 'configuracoes', 'settings'].includes(item.id)) {
        return false;
      }
      return true;
    })
  })).filter(group => group.items.length > 0);

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          width: isCollapsed ? 80 : 272,
          x: isLargeScreen ? 0 : (isMobileOpen ? 0 : -272)
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "bg-[var(--color-surface)] border-r border-[var(--color-border-default)] h-screen flex flex-col overflow-hidden z-[80] select-none",
          "fixed lg:relative"
        )}
      >
        {/* Top Header Identity Slot (Configurable Empty Slot per spec) */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-[var(--color-border-subtle)] shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Identity Slot */}
            <div className="w-9 h-9 rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] flex items-center justify-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary-blue)]" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black tracking-widest uppercase text-[var(--color-text-primary)] truncate">
                  [ Identity Slot ]
                </span>
                <span className="text-[10px] uppercase font-bold text-[var(--color-text-faint)] tracking-wider truncate">
                  Gestão Multi-Módulo
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {isMobileOpen && (
              <button 
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 hover:bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:hidden cursor-pointer"
              >
                <X size={18} />
              </button>
            )}
            {!isCollapsed && !isMobileOpen && (
              <button 
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 hover:bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] transition-colors hidden lg:block cursor-pointer"
                title="Recolher menu"
              >
                <ChevronLeft size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Toggle Expand (when collapsed) */}
        {isCollapsed && (
          <div className="flex justify-center py-3 border-b border-[var(--color-border-subtle)]">
            <button 
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2 border border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-primary-blue)] rounded-[var(--radius-control)] transition-all cursor-pointer"
              title="Expandir menu"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Discrete Clinic / Unit Switcher */}
        {!isCollapsed ? (
          <div className="pt-4 px-1">
            <ClinicSwitcher />
          </div>
        ) : (
          <div className="py-4 px-2 flex flex-col items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] flex items-center justify-center text-[var(--color-primary-blue)] border border-[var(--color-border-default)]" title={isAllClinicsView ? "Todas as Clínicas" : currentClinic?.name}>
              {isAllClinicsView ? <LayoutGrid size={18} /> : <Building2 size={18} />}
            </div>
          </div>
        )}

        {/* Menu Groups */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4 custom-scrollbar">
          {menuGroups.map((group) => {
            const isOpen = Boolean(expandedGroups[group.label]);
            const containsActive = group.items.some(item => item.id === activeTab);

            return (
              <div key={group.label} className="space-y-1">
                {/* Clickable Group Header (Starts CLOSED) */}
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer select-none"
                  >
                    <span>{group.label}</span>
                    <ChevronDown 
                      size={13} 
                      className={cn(
                        "transition-transform duration-200 shrink-0",
                        !isOpen && "-rotate-90"
                      )} 
                    />
                  </button>
                ) : (
                  <div className="h-2" />
                )}

                {/* Items render when open OR when collapsed */}
                {(isOpen || isCollapsed) && (
                  <div className="space-y-1 pt-0.5">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                              setIsMobileOpen(false);
                            }
                          }}
                          title={isCollapsed ? item.label : undefined}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-[var(--radius-control)] transition-all cursor-pointer text-left",
                            isCollapsed ? "justify-center" : "",
                            isActive 
                              ? "bg-[var(--color-primary-blue)] !text-white shadow-md shadow-[var(--color-primary-blue)]/25"
                              : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]"
                          )}
                        >
                          <item.icon className={cn(
                            "w-4 h-4 shrink-0",
                            isActive ? "!text-white" : "text-[var(--color-text-faint)]"
                          )} />
                          {!isCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Footer Navigation */}
        <div className="p-3 border-t border-[var(--color-border-default)] space-y-2 shrink-0">
          {!isCollapsed && user && (
            <div className="px-3 py-2 flex items-center gap-2.5 bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] border border-[var(--color-border-default)]">
              <div className="w-7 h-7 rounded-[var(--radius-control)] bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] font-extrabold text-[10px] flex items-center justify-center shrink-0">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{user.name}</p>
                <p className="text-[10px] text-[var(--color-text-faint)] font-medium truncate uppercase">{user.role.replace('_', ' ')}</p>
              </div>
              <button 
                type="button"
                onClick={confirmLogout}
                className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded-[var(--radius-control)] transition-all cursor-pointer"
                title="Sair do Sistema"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}
