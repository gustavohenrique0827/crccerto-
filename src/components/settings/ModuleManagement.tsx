import React, { useState, useEffect } from 'react';
import { 
  Box, 
  ShieldAlert, 
  Users, 
  Link2, 
  Layers, 
  UserCircle, 
  Calendar, 
  CheckCircle2, 
  BarChart3, 
  Building2, 
  Sliders, 
  Check, 
  X 
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { ModuleType } from '@/src/types';
import ModuleToggle from './ModuleToggle';
import { StatCellRow, StatItem } from '@/src/components/ui/StatCellRow';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';

interface ModuleDef {
  id: string;
  name: string;
  category: 'Administrativo' | 'Operacional' | 'Inteligência';
  description: string;
  isAdministrative?: boolean;
  icon: React.ReactNode;
}

export default function ModuleManagement() {
  const { currentClinic, updateClinic, isAllClinicsView, addToast } = useApp();

  const moduleDefinitions: ModuleDef[] = [
    // Administrativo
    {
      id: 'administration',
      name: 'Parte de Administração (Clientes, Equipe, Configurações)',
      category: 'Administrativo',
      isAdministrative: true,
      description: 'Módulo master de administração. Quando DESLIGADO, oculta e bloqueia do menu lateral todas as rotas administrativas para esta clínica (Clientes, Equipes, Integrações e Configurações).',
      icon: <ShieldAlert size={18} />
    },
    {
      id: 'team',
      name: 'Gestão de Equipe & Usuários',
      category: 'Administrativo',
      isAdministrative: true,
      description: 'Cadastro de operadores, dentistas e gerenciamento de permissões de acesso ao sistema.',
      icon: <Users size={18} />
    },
    {
      id: 'integrations',
      name: 'Integrações de API & Webhooks',
      category: 'Administrativo',
      isAdministrative: true,
      description: 'Conexão com Clinicorp, Simples Dental, Webhooks HMAC e Telefonia IP.',
      icon: <Link2 size={18} />
    },

    // Operacional
    {
      id: 'crm',
      name: 'CRM & Funil de Leads (Pipeline)',
      category: 'Operacional',
      description: 'Kanban do funil de vendas, acompanhamento de negociações e gestão comercial de leads.',
      icon: <Layers size={18} />
    },
    {
      id: 'patients',
      name: 'Gestão de Pacientes & Prontuários',
      category: 'Operacional',
      description: 'Cadastro unificado de pacientes, arquivos, histórico de consultas e fichas clínicas.',
      icon: <UserCircle size={18} />
    },
    {
      id: 'appointments',
      name: 'Agenda & Agendamentos',
      category: 'Operacional',
      description: 'Calendário de consultas, marcação de horários e confirmações de presença.',
      icon: <Calendar size={18} />
    },
    {
      id: 'followups',
      name: 'Follow-ups Operacionais',
      category: 'Operacional',
      description: 'Régua de relacionamento pós-atendimento e recuperação de contatos.',
      icon: <CheckCircle2 size={18} />
    },
    {
      id: 'tasks',
      name: 'Workspace de Tarefas',
      category: 'Operacional',
      description: 'Gerenciador de atividades e pendências operacionais diárias da equipe.',
      icon: <CheckCircle2 size={18} />
    },

    // Inteligência
    {
      id: 'analise-dados',
      name: 'Análise de Dados & Métricas',
      category: 'Inteligência',
      description: 'Gráficos comparativos de conversão, investimento e produtividade comercial.',
      icon: <BarChart3 size={18} />
    },
    {
      id: 'reports',
      name: 'Relatórios Gerenciais',
      category: 'Inteligência',
      description: 'Exportação e relatórios analíticos do desempenho operacional da unidade.',
      icon: <BarChart3 size={18} />
    }
  ];

  const [enabledModuleIds, setEnabledModuleIds] = useState<string[]>(() => {
    if (currentClinic?.enabledModules && currentClinic.enabledModules.length > 0) {
      return [...currentClinic.enabledModules];
    }
    return [
      'dashboard', 'crm', 'patients', 'appointments', 'followups', 'tasks', 
      'analise-dados', 'reports', 'integrations', 'team', 'settings', 'administration'
    ];
  });

  useEffect(() => {
    if (currentClinic?.enabledModules && currentClinic.enabledModules.length > 0) {
      setEnabledModuleIds([...currentClinic.enabledModules]);
    }
  }, [currentClinic]);

  const handleToggleModule = (id: string, nextState: boolean) => {
    let updated: string[];

    if (nextState) {
      updated = Array.from(new Set([...enabledModuleIds, id]));
      const modName = moduleDefinitions.find(m => m.id === id)?.name || id;
      addToast(`Módulo "${modName}" LIGADO para ${currentClinic?.name || 'a clínica'}!`, 'success');
    } else {
      updated = enabledModuleIds.filter(m => m !== id);
      const modName = moduleDefinitions.find(m => m.id === id)?.name || id;
      addToast(`Módulo "${modName}" DESLIGADO para ${currentClinic?.name || 'a clínica'}!`, 'warning');
    }

    setEnabledModuleIds(updated);

    if (currentClinic) {
      updateClinic(currentClinic.id, {
        enabledModules: updated as ModuleType[]
      });
    }

    window.dispatchEvent(new Event('crm_modules_updated'));
  };

  const handleEnableAllInCategory = (category: string) => {
    const categoryModuleIds = moduleDefinitions.filter(m => m.category === category).map(m => m.id);
    const updated = Array.from(new Set([...enabledModuleIds, ...categoryModuleIds]));
    setEnabledModuleIds(updated);
    if (currentClinic) {
      updateClinic(currentClinic.id, { enabledModules: updated as ModuleType[] });
    }
    window.dispatchEvent(new Event('crm_modules_updated'));
    addToast(`Todos os módulos de ${category} foram ATIVADOS!`, 'success');
  };

  const handleDisableAllInCategory = (category: string) => {
    const categoryModuleIds = new Set(moduleDefinitions.filter(m => m.category === category).map(m => m.id));
    const updated = enabledModuleIds.filter(id => !categoryModuleIds.has(id));
    setEnabledModuleIds(updated);
    if (currentClinic) {
      updateClinic(currentClinic.id, { enabledModules: updated as ModuleType[] });
    }
    window.dispatchEvent(new Event('crm_modules_updated'));
    addToast(`Módulos de ${category} foram DESATIVADOS.`, 'info');
  };

  const categories = [
    {
      id: 'Administrativo' as const,
      title: 'Módulos Administrativos & Gestão de Acessos',
      description: 'Controle de permissões master, gestão de operadores e configurações de integração.',
      variant: 'warning' as const
    },
    {
      id: 'Operacional' as const,
      title: 'Módulos Operacionais & CRM',
      description: 'Ferramentas do dia a dia da recepção, cirurgiões e equipe de atendimento.',
      variant: 'info' as const
    },
    {
      id: 'Inteligência' as const,
      title: 'Módulos de Inteligência & Relatórios',
      description: 'Dashboards analíticos, métricas de conversão e relatórios operacionais.',
      variant: 'success' as const
    }
  ];

  const totalModulesCount = moduleDefinitions.length;
  const activeModulesCount = moduleDefinitions.filter(m => enabledModuleIds.includes(m.id)).length;
  const disabledModulesCount = totalModulesCount - activeModulesCount;

  const statItems: StatItem[] = [
    {
      label: 'TOTAL DE MÓDULOS',
      value: totalModulesCount,
      hint: 'Módulos cadastrados na arquitetura',
      icon: <Box size={18} />,
      tone: 'neutral'
    },
    {
      label: 'ATIVOS PARA ESTA UNIDADE',
      value: activeModulesCount,
      hint: 'Habilitados no plano de acesso',
      icon: <Check size={18} />,
      tone: 'success'
    },
    {
      label: 'BLOQUEADOS / DESATIVADOS',
      value: disabledModulesCount,
      hint: 'Ocultados do menu de navegação',
      icon: <X size={18} />,
      tone: 'danger'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <Card className="bg-[var(--color-surface-sunken)] border-[var(--color-border-default)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1 max-w-xl min-w-0">
            <Badge variant="info">
              <Sliders size={12} />
              <span>CONTROLE DE MÓDULOS POR UNIDADE</span>
            </Badge>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
              Chaveiro Dinâmico de Módulos
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-normal">
              Ative ou desative permissões. Módulos desativados são ocultados imediatamente do menu lateral.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="p-3 px-4 rounded-[var(--radius-control)] bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] flex items-center gap-3">
              <Building2 className="w-5 h-5 text-[var(--color-primary-blue)] shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider">Unidade Atual</p>
                <p className="text-xs font-extrabold text-[var(--color-text-primary)] truncate max-w-[180px]">
                  {isAllClinicsView ? 'Rede Geral Consolidada' : (currentClinic?.name || 'Unidade')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stat KPI Row */}
      <StatCellRow stats={statItems} cols={3} />

      {/* Grouped Permission Cards */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const categoryModules = moduleDefinitions.filter(m => m.category === cat.id);
          const activeCatCount = categoryModules.filter(m => enabledModuleIds.includes(m.id)).length;

          return (
            <Card key={cat.id} className="space-y-4">
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Badge variant={cat.variant}>
                      {cat.id}
                    </Badge>
                    <span className="text-xs font-bold text-[var(--color-text-faint)] whitespace-nowrap">
                      ({activeCatCount} de {categoryModules.length} ativos)
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-primary)] leading-snug">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {cat.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => handleEnableAllInCategory(cat.id)}
                  >
                    Ativar Todos
                  </Button>
                  <span className="text-[var(--color-text-faint)]">|</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => handleDisableAllInCategory(cat.id)}
                  >
                    Desativar Todos
                  </Button>
                </div>
              </div>

              {/* Module Toggles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {categoryModules.map((mod) => (
                  <ModuleToggle
                    key={mod.id}
                    id={mod.id}
                    name={mod.name}
                    category={mod.category}
                    description={mod.description}
                    icon={mod.icon}
                    enabled={enabledModuleIds.includes(mod.id)}
                    onToggle={handleToggleModule}
                    isAdministrative={mod.isAdministrative}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
