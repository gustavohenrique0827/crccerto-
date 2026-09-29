import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  UserCircle, 
  Calendar, 
  Activity, 
  CheckSquare, 
  BarChart3, 
  BookOpen, 
  Building2, 
  Users, 
  Link2, 
  Settings, 
  ChevronDown, 
  X,
  Boxes
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { Role } from '@/src/types';

interface MainSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export function MainSidebar({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen
}: MainSidebarProps) {
  const { 
    activeTab, 
    setActiveTab, 
    clinics, 
    currentClinicId, 
    setCurrentClinicId, 
    currentClinic, 
    isAllClinicsView,
    user
  } = useApp();

  // Collapsible section state: starts ALL OPEN by default for clean overview
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    sales: true,
    operations: true,
    bi: true,
    admin: true
  });

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const isModuleEnabled = (moduleId: string) => {
    if (isAllClinicsView || user?.role === Role.SUPER_ADMIN) return true;
    const enabledList: string[] = currentClinic?.enabledModules || [];
    
    if (['clinicas', 'equipe', 'integracoes', 'configuracoes', 'settings'].includes(moduleId)) {
      if (enabledList.length > 0 && !enabledList.includes('administration')) return false;
    }

    const idToModule: Record<string, string> = {
      'dashboard': 'dashboard',
      'leads': 'crm',
      'analise-dados': 'analise-dados',
      'pacientes': 'patients',
      'agenda': 'appointments',
      'followups': 'followups',
      'tarefas': 'tasks',
      'relatorios': 'reports',
      'integracoes': 'integrations',
      'equipe': 'team',
      'configuracoes': 'settings'
    };

    const moduleKey = idToModule[moduleId];
    if (!moduleKey) return true;
    return enabledList.length === 0 || enabledList.includes(moduleKey);
  };

  const isCeopUser = !isAllClinicsView && user?.role !== Role.SUPER_ADMIN && (user?.role === Role.CEOP_OPERATOR || user?.role === Role.CEOP || user?.role === Role.CRC_OPERATOR);

  const sections = [
    {
      id: 'overview',
      title: 'VISÃO GERAL',
      items: [
        { id: 'dashboard', label: 'Dashboard Operacional', icon: LayoutDashboard }
      ]
    },
    {
      id: 'sales',
      title: 'VENDAS & CRM',
      items: [
        { id: 'leads', label: 'Funil de CRM / Pipeline', icon: Target },
        { id: 'pacientes', label: 'Gestão de Pacientes', icon: UserCircle }
      ]
    },
    {
      id: 'operations',
      title: 'AGENDA & OPERAÇÕES',
      items: [
        { id: 'agenda', label: 'Agenda & Reuniões', icon: Calendar },
        { id: 'followups', label: 'Régua de Follow-ups', icon: Activity },
        { id: 'tarefas', label: 'Workspace de Tarefas', icon: CheckSquare }
      ]
    },
    {
      id: 'bi',
      title: 'INTEL IÂNCIA & BI',
      items: [
        { id: 'analise-dados', label: 'Análise de Dados', icon: BarChart3 },
        { id: 'relatorios', label: 'Relatórios Gerenciais', icon: BarChart3 },
        { id: 'guia', label: 'Guia do Sistema', icon: BookOpen }
      ]
    },
    {
      id: 'admin',
      title: 'ADMINISTRAÇÃO',
      items: [
        { id: 'clinicas', label: 'Unidades & Filiais', icon: Building2 },
        { id: 'equipe', label: 'Gestão de Equipe', icon: Users },
        { id: 'integracoes', label: 'Integrações & APIs', icon: Link2 },
        { id: 'configuracoes', label: 'Configurações Central', icon: Settings }
      ]
    }
  ].map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (!isModuleEnabled(item.id)) return false;
      if (isCeopUser && ['clinicas', 'equipe', 'integracoes', 'configuracoes'].includes(item.id)) return false;
      return true;
    })
  })).filter(section => section.items.length > 0);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        className={cn(
          "border-r border-[var(--color-border-default)] bg-[var(--color-surface)] flex flex-col select-none transition-all duration-300 z-50 shrink-0",
          "fixed lg:relative inset-y-0 left-0 h-screen",
          isCollapsed ? "w-20" : "w-68",
          isMobileOpen ? "translate-x-0 w-68" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Top Header (h-20, subtle border) + IDENTITY SLOT */}
        <div className="h-20 px-4 border-b border-[var(--color-border-subtle)] flex flex-col justify-center shrink-0">
          
          {/* Vacant Configurable Identity Slot */}
          <div className="slot-identity w-full">
            <div className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--color-primary-blue)] flex items-center justify-center text-white shrink-0">
              <Boxes size={18} />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-faint)] leading-none">
                  SLOT DE IDENTIDADE
                </p>
                <p className="text-xs font-black tracking-tight text-[var(--color-text-primary)] truncate mt-0.5">
                  Painel Multimódulo
                </p>
              </div>
            )}
          </div>

          {/* Unit / Clinic Selector below Identity Slot */}
          {!isCollapsed && (
            <div className="mt-1 flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-control)] hover:bg-[var(--color-surface-sunken)] transition-colors cursor-pointer">
              <Building2 size={13} className="text-[var(--color-primary-blue)] shrink-0" />
              <select
                value={currentClinicId}
                onChange={(e) => setCurrentClinicId(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-[var(--color-text-primary)] outline-none cursor-pointer border-none"
              >
                <option value="all">Rede Geral Consolidada</option>
                {clinics.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Sidebar Body: Sections list */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar">
          {sections.map((sec) => {
            const isOpen = Boolean(openSections[sec.id]);

            return (
              <div key={sec.id} className="space-y-1">
                {/* Section Header */}
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(sec.id)}
                    className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[var(--color-text-faint)] px-2 py-1 hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                  >
                    <span>{sec.title}</span>
                    <ChevronDown
                      size={12}
                      className={cn(
                        "transition-transform duration-200 shrink-0",
                        !isOpen && "-rotate-90"
                      )}
                    />
                  </button>
                ) : (
                  <div className="h-2" />
                )}

                {/* Section Items */}
                {(isOpen || isCollapsed) && (
                  <div className="space-y-1">
                    {sec.items.map((item) => {
                      const isActive = activeTab === item.id;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          title={isCollapsed ? item.label : undefined}
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsMobileOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-[var(--radius-control)] transition-all cursor-pointer text-left",
                            isActive
                              ? "bg-[var(--color-primary-blue)] !text-white shadow-md shadow-[var(--color-primary-blue)]/25"
                              : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]",
                            isCollapsed && "justify-center px-0"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-4 h-4 shrink-0",
                              isActive ? "!text-white" : "text-[var(--color-text-faint)]"
                            )}
                          />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
