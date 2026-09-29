import React, { useState } from 'react';
import { 
  Building2, 
  Shield, 
  Settings2, 
  CheckCircle2, 
  Plus, 
  Layers, 
  Check, 
  Save, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { cn } from '@/src/lib/utils';
import { ModuleType } from '@/src/types';
import NewClinicModal from '../clinics/NewClinicModal';

export default function ClinicSettings() {
  const { clinics, currentClinic, currentClinicId, setCurrentClinicId, updateClinic, isClientOnlyMode } = useApp();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const availableModules: { id: ModuleType; label: string; desc: string }[] = [
    { id: 'dashboard', label: 'Dashboard Operacional', desc: 'Visão geral de KPIs e métricas de desempenho em tempo real.' },
    { id: 'crm', label: 'Gestão de Leads (CRM)', desc: 'Pipeline de vendas, funil de conversão e acompanhamento.' },
    { id: 'patients', label: 'Prontuário de Pacientes', desc: 'Histórico clínico, linha do tempo e documentos médicos.' },
    { id: 'appointments', label: 'Agenda & Calendário', desc: 'Gestão de horários, confirmações e salas de atendimento.' },
    { id: 'followups', label: 'Follow-ups & Régua', desc: 'Relacionamento ativo, pós-consulta e mensagens automáticas.' },
    { id: 'tasks', label: 'Tarefas Operacionais', desc: 'Controle de pendências diárias e fluxos da equipe.' },
    { id: 'analise-dados', label: 'Análise de Dados', desc: 'Métricas de tráfego, campanhas e investimento.' },
    { id: 'reports', label: 'Relatórios Avançados', desc: 'Exportação de dados e inteligência de negócios.' },
    { id: 'integrations', label: 'Integrações Externas', desc: 'Conexão com Simples Dental, Clinicorp e Google Calendar.' },
  ];

  const activeClinic = currentClinic || clinics[0];

  const handleToggleModule = (modId: ModuleType) => {
    if (!activeClinic) return;
    const currentList = activeClinic.enabledModules || [];
    const updated = currentList.includes(modId)
      ? currentList.filter(m => m !== modId)
      : [...currentList, modId];

    updateClinic(activeClinic.id, { enabledModules: updated });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Gestão de Unidades & Módulos
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Controle de permissões e módulos ativos por clínica / cliente.
          </p>
        </div>

        {!isClientOnlyMode && (
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Cadastrar Nova Unidade</span>
          </button>
        )}
      </div>

      {/* Clinic Selector Pills */}
      {!isClientOnlyMode && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Unidade Selecionada:
          </span>
          {clinics.map(c => (
            <button
              key={c.id}
              onClick={() => setCurrentClinicId(c.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border cursor-pointer",
                currentClinicId === c.id 
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
              )}
            >
              <Building2 size={13} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected Clinic Details Card */}
      {activeClinic ? (
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 border border-blue-100 dark:border-blue-800/50">
                <Building2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{activeClinic.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeClinic.city ? `${activeClinic.city}, ${activeClinic.state} • ` : ''}Responsável: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeClinic.responsible || 'Direção Clínica'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Sistema: {(activeClinic.system || 'Personalizado').replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Module Toggles */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Shield size={14} className="text-blue-500" />
              Módulos Habilitados para {activeClinic.name}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {availableModules.map((mod) => {
                const isEnabled = activeClinic.enabledModules?.includes(mod.id);
                return (
                  <div 
                    key={mod.id} 
                    onClick={() => handleToggleModule(mod.id)}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group select-none",
                      isEnabled 
                        ? "border-blue-200 dark:border-blue-800/80 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs" 
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 opacity-70 hover:opacity-100"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h5 className={cn(
                        "text-xs sm:text-sm font-bold transition-colors",
                        isEnabled ? "text-blue-950 dark:text-blue-200" : "text-slate-700 dark:text-slate-300"
                      )}>
                        {mod.label}
                      </h5>
                      <div className={cn(
                        "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                        isEnabled ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                      )}>
                        {isEnabled && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
            <Building2 size={28} />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Nenhuma Unidade / Cliente Cadastrado</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Cadastre sua primeira clínica parceira ou cliente para configurar o isolamento de dados e permissões modulares.
            </p>
          </div>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Cadastrar Primeira Unidade</span>
          </button>
        </div>
      )}

      {/* New Clinic Modal */}
      <NewClinicModal 
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
      />
    </div>
  );
}
