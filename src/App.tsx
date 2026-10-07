import React, { useState, useEffect } from 'react';
import { MainSidebar } from './components/layout/MainSidebar';
import { Topbar } from './components/layout/Topbar';
import { 
  LayoutDashboard, 
  Target, 
  UserCircle, 
  Calendar, 
  Settings, 
  Shield, 
  ArrowRight,
  Plus,
  Boxes
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { useApp } from './context/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Role } from './types';

// Workspaces and Views
import DashboardMain from './components/dashboard/DashboardMain';
import Pipeline from './components/leads/Pipeline';
import LeadDetail from './components/leads/LeadDetail';
import PatientsList from './components/patients/PatientsList';
import AppointmentsCalendar from './components/appointments/AppointmentsCalendar';
import FollowUpWorkspace from './components/followups/FollowUpWorkspace';
import TaskWorkspace from './components/tasks/TaskWorkspace';
import DataAnalysisWorkspace from './components/analytics/DataAnalysisWorkspace';
import AnalyticsCenter from './components/analytics/AnalyticsCenter';
import IntegrationsWorkspace from './components/integrations/IntegrationsWorkspace';
import TeamManagement from './components/team/TeamManagement';
import ClinicList from './components/clinics/ClinicList';
import SystemSettings from './components/settings/SystemSettings';
import SystemWalkthroughGuide from './components/guide/SystemWalkthroughGuide';
import AIAssistant from './components/ai/AIAssistant';

// Modals & Protection
import TaskModal from './components/dashboard/TaskModal';
import NewLeadModal from './components/leads/NewLeadModal';
import NewClinicModal from './components/clinics/NewClinicModal';
import ClinicHealthDrawer from './components/clinics/ClinicHealthDrawer';
import ToastContainer from './components/layout/ToastContainer';
import LoginPage from './LoginPage';
import LogoutConfirmationModal from './components/auth/LogoutConfirmationModal';
import ProtectedModuleRoute from './components/common/ProtectedModuleRoute';
import { useAuthGuard } from './hooks/useAuthGuard';
import { useBrowserNotifications } from './hooks/useBrowserNotifications';

export default function App() {
  const { 
    currentClinicId, 
    currentClinic, 
    isAllClinicsView, 
    user, 
    logout, 
    switchUserRole, 
    isClientOnlyMode,
    isLogoutModalOpen, 
    setIsLogoutModalOpen, 
    activeTab, 
    setActiveTab, 
    subPage, 
    setSubPage, 
    subPageData,
    addToast,
    addLead
  } = useApp();

  useBrowserNotifications();
  const { isAuthenticated } = useAuthGuard();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isNewClinicModalOpen, setIsNewClinicModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedLeadForTask, setSelectedLeadForTask] = useState<{id: string, name: string} | undefined>(undefined);
  const [isHealthDrawerOpen, setIsHealthDrawerOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  const handleAddLead = async (lead: any) => {
    try {
      const ok = await addLead(lead);
      if (ok) {
        addToast(`Lead "${lead.name}" cadastrado com sucesso!`, 'success');
        setIsNewLeadModalOpen(false);
      }
    } catch (err: any) {
      addToast(`Erro ao cadastrar lead: ${err.message || 'Tente novamente'}`, 'error');
    }
  };

  useKeyboardShortcuts([
    { key: 'n', ctrl: true, action: () => { setIsNewLeadModalOpen(true); addToast('Atalho: Novo Lead', 'info'); } },
    { key: 'd', ctrl: true, action: () => setActiveTab('dashboard') },
    { key: 'l', ctrl: true, action: () => setActiveTab('leads') },
    { key: 'p', ctrl: true, action: () => setActiveTab('pacientes') },
    { key: 'i', ctrl: true, action: () => setActiveTab('ia') },
  ]);

  const handleOpenLeadDetail = (lead: any) => {
    setSubPage('lead-detail', lead);
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[var(--color-surface)] text-[var(--color-text-primary)] font-sans antialiased">
      {/* Main Sidebar (Left) */}
      <MainSidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area (Right) */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Subtle decorative blue glow in top-right corner */}
        <div className="w-[800px] h-[800px] absolute -top-40 -right-40 bg-[var(--color-primary-blue)]/5 blur-[150px] pointer-events-none rounded-full z-0" />

        {/* Topbar */}
        <Topbar
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* Client Exclusive Banner */}
        {isClientOnlyMode && (
          <div className="bg-[var(--color-success)]/10 border-b border-[var(--color-success)]/25 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--color-success)] shrink-0 z-10">
            <div className="flex items-center gap-2">
              <Shield size={16} className="shrink-0" />
              <span>
                <strong>Portal Exclusivo do Cliente:</strong> Exibindo exclusivamente os dados da unidade <strong>{currentClinic?.name}</strong>.
              </span>
            </div>
            <button
              onClick={() => switchUserRole(Role.SUPER_ADMIN)}
              className="px-3 py-1 rounded-[var(--radius-control)] bg-[var(--color-success)] text-white font-bold text-[11px] hover:brightness-110 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Voltar para Visão Geral</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* Dynamic Content Workspace */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 pb-24 sm:pb-8 relative z-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.18 }}
              >
                <DashboardMain selectedClinicId={currentClinicId} />
              </motion.div>
            ) : activeTab === 'leads' ? (
              <motion.div
                key="leads"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.18 }}
                className="h-full flex flex-col space-y-4"
              >
                {/* O funil continua montado com a ficha aberta por cima: ao fechar, ele está
                    exatamente onde você deixou (rolagem, coluna, filtros). */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
                      Funil de CRM & Pipeline
                    </h1>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Gestão de etapas comerciais, qualificação de oportunidades e negociações em tempo real.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsNewLeadModalOpen(true)}
                    className="bg-[var(--color-primary-blue)] !text-white px-4 py-2 rounded-[var(--radius-control)] text-xs font-bold shadow-md shadow-[var(--color-primary-blue)]/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 uppercase tracking-wider self-stretch sm:self-auto cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Novo Lead</span>
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <Pipeline
                    globalSearchTerm={globalSearchTerm}
                    selectedClinicId={currentClinicId}
                    onLeadClick={handleOpenLeadDetail}
                  />
                </div>

                {subPage === 'lead-detail' && (
                  <LeadDetail
                    isOpen={true}
                    onClose={() => setSubPage(null)}
                    lead={subPageData}
                  />
                )}
              </motion.div>
            ) : activeTab === 'pacientes' ? (
              <ProtectedModuleRoute moduleId="pacientes">
                <motion.div
                  key="pacientes"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                >
                  <PatientsList />
                </motion.div>
              </ProtectedModuleRoute>
            ) : activeTab === 'agenda' ? (
              <ProtectedModuleRoute moduleId="agenda">
                <motion.div
                  key="agenda"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                >
                  <AppointmentsCalendar />
                </motion.div>
              </ProtectedModuleRoute>
            ) : activeTab === 'followups' ? (
              <ProtectedModuleRoute moduleId="followups">
                <motion.div
                  key="followups"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                >
                  <FollowUpWorkspace />
                </motion.div>
              </ProtectedModuleRoute>
            ) : activeTab === 'tarefas' ? (
              <ProtectedModuleRoute moduleId="tarefas">
                <motion.div
                  key="tarefas"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                >
                  <TaskWorkspace />
                </motion.div>
              </ProtectedModuleRoute>
            ) : activeTab === 'analise-dados' ? (
              <ProtectedModuleRoute moduleId="analise-dados">
                <motion.div
                  key="analise-dados"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                >
                  <DataAnalysisWorkspace />
                </motion.div>
              </ProtectedModuleRoute>
            ) : activeTab === 'relatorios' || activeTab === 'analytics' ? (
              <ProtectedModuleRoute moduleId="relatorios">
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                >
                  <AnalyticsCenter />
                </motion.div>
              </ProtectedModuleRoute>
            ) : activeTab === 'integracoes' ? (
              <ProtectedModuleRoute moduleId="integracoes">
                <motion.div
                  key="integrations"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                >
                  <IntegrationsWorkspace />
                </motion.div>
              </ProtectedModuleRoute>
            ) : activeTab === 'equipe' ? (
              <ProtectedModuleRoute moduleId="equipe">
                <motion.div
                  key="equipe"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                >
                  <TeamManagement />
                </motion.div>
              </ProtectedModuleRoute>
            ) : activeTab === 'clinicas' ? (
              <ProtectedModuleRoute moduleId="clinicas">
                <motion.div
                  key="clinicas"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                >
                  <ClinicList />
                </motion.div>
              </ProtectedModuleRoute>
            ) : activeTab === 'configuracoes' || activeTab === 'settings' ? (
              <ProtectedModuleRoute moduleId="configuracoes">
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                >
                  <SystemSettings />
                </motion.div>
              </ProtectedModuleRoute>
            ) : activeTab === 'guia' || activeTab === 'manual' ? (
              <motion.div
                key="guia"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.18 }}
              >
                <SystemWalkthroughGuide />
              </motion.div>
            ) : activeTab === 'ia' ? (
              <motion.div
                key="ia"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.18 }}
                className="h-full flex flex-col"
              >
                <AIAssistant />
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)] space-y-3 text-center">
                <div className="w-16 h-16 rounded-[var(--radius-panel)] bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] flex items-center justify-center text-[var(--color-text-faint)]">
                  <Boxes size={32} />
                </div>
                <h2 className="text-lg font-black tracking-tight text-[var(--color-text-primary)]">
                  Módulo Selecionado em Preparação
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] max-w-sm">
                  A rota <code className="px-1.5 py-0.5 rounded bg-[var(--color-surface-sunken)] font-mono">{activeTab}</code> está pronta para carregamento do seu schema.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="px-4 py-2 bg-[var(--color-primary-blue)] !text-white rounded-[var(--radius-control)] text-xs font-bold hover:brightness-110 cursor-pointer"
                >
                  Voltar ao Dashboard
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Fixed Bottom Navigation Bar */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--color-surface-elevated)]/90 backdrop-blur-md border-t border-[var(--color-border-default)] z-40 flex items-center justify-around px-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex flex-col items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer",
              activeTab === 'dashboard' ? "text-[var(--color-primary-blue)]" : "text-[var(--color-text-muted)]"
            )}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={cn(
              "flex flex-col items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer",
              activeTab === 'leads' ? "text-[var(--color-primary-blue)]" : "text-[var(--color-text-muted)]"
            )}
          >
            <Target size={18} />
            <span>Pipeline</span>
          </button>

          <button
            onClick={() => setActiveTab('pacientes')}
            className={cn(
              "flex flex-col items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer",
              activeTab === 'pacientes' ? "text-[var(--color-primary-blue)]" : "text-[var(--color-text-muted)]"
            )}
          >
            <UserCircle size={18} />
            <span>Pacientes</span>
          </button>

          <button
            onClick={() => setActiveTab('agenda')}
            className={cn(
              "flex flex-col items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer",
              activeTab === 'agenda' ? "text-[var(--color-primary-blue)]" : "text-[var(--color-text-muted)]"
            )}
          >
            <Calendar size={18} />
            <span>Agenda</span>
          </button>

          <button
            onClick={() => setActiveTab('configuracoes')}
            className={cn(
              "flex flex-col items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer",
              activeTab === 'configuracoes' ? "text-[var(--color-primary-blue)]" : "text-[var(--color-text-muted)]"
            )}
          >
            <Settings size={18} />
            <span>Ajustes</span>
          </button>
        </div>
      </main>

      {/* Global Modals & Toast */}
      <ToastContainer />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        leadId={selectedLeadForTask?.id}
        leadName={selectedLeadForTask?.name}
      />

      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        onAddLead={handleAddLead}
      />

      <NewClinicModal
        isOpen={isNewClinicModalOpen}
        onClose={() => setIsNewClinicModalOpen(false)}
      />

      <ClinicHealthDrawer
        isOpen={isHealthDrawerOpen}
        onClose={() => setIsHealthDrawerOpen(false)}
        clinicId={currentClinicId}
      />

      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
      />
    </div>
  );
}
