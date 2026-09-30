import React from 'react';
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

  // Áreas: uma coluna de ícones + painel só com os itens da área aberta
  const areas = [
    { id: 'inicio', label: 'Início', icon: LayoutDashboard, items: [{ id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard }] },
    {
      id: 'comercial', label: 'Comercial', icon: Target,
      items: [
        { id: 'leads', label: 'Pipeline', icon: Target },
        { id: 'pacientes', label: 'Pacientes', icon: UserCircle },
        { id: 'followups', label: 'Follow-ups', icon: Activity }
      ]
    },
    {
      id: 'agenda', label: 'Agenda', icon: Calendar,
      items: [
        { id: 'agenda', label: 'Agenda', icon: Calendar },
        { id: 'tarefas', label: 'Tarefas', icon: CheckSquare }
      ]
    },
    {
      id: 'analises', label: 'Análises', icon: BarChart3,
      items: [
        { id: 'analise-dados', label: 'Análise de dados', icon: BarChart3 },
        { id: 'relatorios', label: 'Relatórios', icon: BarChart3 }
      ]
    },
    {
      id: 'admin', label: 'Administração', icon: Settings,
      items: [
        { id: 'clinicas', label: 'Clínicas', icon: Building2 },
        { id: 'equipe', label: 'Equipe', icon: Users },
        { id: 'integracoes', label: 'Integrações', icon: Link2 },
        { id: 'configuracoes', label: 'Configurações', icon: Settings }
      ]
    }
  ].map(area => ({
    ...area,
    items: area.items.filter(item => {
      if (!isModuleEnabled(item.id)) return false;
      if (isCeopUser && ['clinicas', 'equipe', 'integracoes', 'configuracoes'].includes(item.id)) return false;
      return true;
    })
  })).filter(area => area.items.length > 0);

  // 'settings', 'analytics' e 'manual' são apelidos de abas que já existem no App
  const tabAlias: Record<string, string> = { settings: 'configuracoes', analytics: 'relatorios', manual: 'guia' };
  const currentTab = tabAlias[activeTab] || activeTab;
  const activeArea = areas.find(a => a.items.some(i => i.id === currentTab)) || areas[0];
  const panelArea = currentTab === 'guia' ? null : activeArea;

  const goTo = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
        />
      )}

      <aside
        className={cn(
          "flex select-none transition-all duration-300 z-50 shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border-default)]",
          "fixed lg:relative inset-y-0 left-0 h-screen",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Coluna de ícones (áreas) */}
        <div className="w-14 flex flex-col items-center py-3 gap-1 border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]/40">
          <button
            type="button"
            title="Início"
            onClick={() => goTo('dashboard')}
            className="w-9 h-9 mb-2 rounded-[var(--radius-control)] bg-[var(--color-primary-blue)] flex items-center justify-center text-white shadow-sm cursor-pointer"
          >
            <Boxes size={18} />
          </button>

          {areas.map(area => {
            const Icon = area.icon;
            const isActive = panelArea?.id === area.id;
            return (
              <button
                key={area.id}
                type="button"
                title={area.label}
                onClick={() => goTo(isActive ? currentTab : area.items[0].id)}
                className={cn(
                  "w-9 h-9 rounded-[var(--radius-control)] flex items-center justify-center transition-colors cursor-pointer",
                  isActive
                    ? "bg-[var(--color-primary-blue)]/12 text-[var(--color-primary-blue)]"
                    : "text-[var(--color-text-faint)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]"
                )}
              >
                <Icon size={18} />
              </button>
            );
          })}

          <div className="flex-1" />

          <button
            type="button"
            title="Guia do Sistema"
            onClick={() => goTo('guia')}
            className={cn(
              "w-9 h-9 rounded-[var(--radius-control)] flex items-center justify-center transition-colors cursor-pointer",
              currentTab === 'guia'
                ? "bg-[var(--color-primary-blue)]/12 text-[var(--color-primary-blue)]"
                : "text-[var(--color-text-faint)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <BookOpen size={18} />
          </button>
        </div>

        {/* Painel contextual da área */}
        {!isCollapsed && (
          <div className="w-52 flex flex-col">
            {/* Seletor de clínica (único ponto para trocar de unidade) */}
            <div className="p-3 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)]">
                <Building2 size={15} className="text-[var(--color-primary-blue)] shrink-0" />
                <select
                  value={currentClinicId}
                  onChange={(e) => setCurrentClinicId(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-[var(--color-text-primary)] outline-none cursor-pointer border-none truncate"
                >
                  <option value="all">Rede consolidada</option>
                  {clinics.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
              {panelArea && (
                <>
                  <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-faint)]">
                    {panelArea.label}
                  </p>
                  {panelArea.items.map(item => {
                    const isActive = currentTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => goTo(item.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-[var(--radius-control)] transition-colors cursor-pointer text-left",
                          isActive
                            ? "bg-[var(--color-primary-blue)]/12 text-[var(--color-primary-blue)]"
                            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </nav>
          </div>
        )}
      </aside>
    </>
  );
}
