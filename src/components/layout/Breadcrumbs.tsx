import { ChevronRight, Home } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/utils';

export default function Breadcrumbs() {
  const { activeTab, subPage, subPageData, setActiveTab, setSubPage } = useApp();

  const getLabel = (id: string) => {
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      leads: 'Leads & Pipeline',
      crm: 'CRM',
      pacientes: 'Pacientes',
      agenda: 'Agenda',
      followups: 'Follow-ups',
      tarefas: 'Tarefas',
      analytics: 'Analytics',
      relatorios: 'Relatórios',
      integracoes: 'Integrações',
      equipe: 'Equipe',
      clinicas: 'Clínicas',
      configuracoes: 'Configurações',
      settings: 'Configurações',
      guia: 'Guia do Sistema',
      'analise-dados': 'Análise de Dados',
      ia: 'Agente IA',
      'lead-detail': subPageData?.name || 'Detalhes do Lead',
      'patient-detail': subPageData?.name || 'Perfil do Paciente',
    };
    return labels[id] || id;
  };

  if (activeTab === 'dashboard' && !subPage) return null;

  return (
    <nav className="breadcrumbs-container flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 px-1">
      <button 
        onClick={() => setActiveTab('dashboard')}
        className="hover:text-blue-500 transition-colors flex items-center gap-1 group"
      >
        <Home size={12} className="group-hover:scale-110 transition-transform" />
        <span className={cn(activeTab === 'dashboard' && !subPage ? "text-slate-800 dark:text-white" : "")}>Dashboard</span>
      </button>
      
      <ChevronRight size={12} className="text-slate-300 dark:text-slate-700" />
      
      <button 
        onClick={() => {
          if (subPage) setSubPage(null);
        }}
        className={cn(
          "hover:text-blue-500 transition-colors",
          !subPage ? "text-slate-900 dark:text-white font-extrabold pointer-events-none" : "text-slate-400"
        )}
      >
        {getLabel(activeTab)}
      </button>

      {subPage && (
        <>
          <ChevronRight size={12} className="text-slate-300 dark:text-slate-700" />
          <span className="text-slate-900 dark:text-white font-extrabold">
            {getLabel(subPage)}
          </span>
        </>
      )}
    </nav>
  );
}
