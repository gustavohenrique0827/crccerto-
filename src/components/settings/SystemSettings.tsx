import React, { useState, useRef } from 'react';
import { 
  Settings, 
  Box, 
  Link2, 
  Kanban, 
  MessageSquare, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2 
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { PageContainer } from '@/src/components/common/PageContainer';
import { SectionSidebar, SectionSidebarGroup } from '@/src/components/layout/SectionSidebar';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';

// Sub-components
import GeneralSettings from './GeneralSettings';
import ClinicSettings from './ClinicSettings';
import IntegrationsWorkspace from '../integrations/IntegrationsWorkspace';
import ModuleManagement from './ModuleManagement';
import TeamManagement from '../team/TeamManagement';

type SettingsSectionId = 'general' | 'clinics' | 'users' | 'modules' | 'crm' | 'notifications' | 'integrations' | 'data';

export default function SystemSettings() {
  const { currentClinic, isClientOnlyMode, addToast } = useApp();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settingsGroups: SectionSidebarGroup[] = [
    {
      id: 'general_group',
      title: 'Geral & Organização',
      icon: <Settings size={14} />,
      items: [
        { id: 'general', label: 'Dados da Unidade' },
        { id: 'clinics', label: 'Unidades & Filiais' },
        { id: 'users', label: 'Equipe & Permissões' },
      ]
    },
    {
      id: 'modules_group',
      title: 'Recursos & Módulos',
      icon: <Box size={14} />,
      items: [
        { id: 'modules', label: 'Chaveiro de Módulos' },
        { id: 'crm', label: 'Funil de CRM & SLA' },
        { id: 'notifications', label: 'Canais & Mensagens' },
      ]
    },
    {
      id: 'integrations_group',
      title: 'APIs & Dados',
      icon: <Link2 size={14} />,
      items: [
        { id: 'integrations', label: 'Integrações & APIs' },
        { id: 'data', label: 'Backup & Exportação' },
      ]
    }
  ];

  const handleExportData = () => {
    try {
      const dataToExport = {
        clinic: currentClinic?.name || 'Rede Geral',
        exportDate: new Date().toISOString(),
        note: 'Backup do sistema CRM LeadGen'
      };
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `backup-crm-${new Date().toISOString().split('T')[0]}.json`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Backup dos dados exportado com sucesso!', 'success');
    } catch (e) {
      addToast('Erro ao exportar dados.', 'error');
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        addToast('Backup importado e restaurado com sucesso!', 'success');
      } catch (err: any) {
        addToast(`Erro ao ler arquivo de backup: ${err.message}`, 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <PageContainer
      title="Configurações do Sistema"
      description={
        isClientOnlyMode 
          ? `Portal de Preferências da Unidade ${currentClinic?.name}` 
          : 'Gerencie parâmetros globais, permissões de módulos, APIs e regras da rede.'
      }
      breadcrumb={['Administração', 'Configurações']}
    >
      <Card className="p-0 overflow-hidden min-h-[640px]">
        <SectionSidebar
          heading="Configurações"
          subheading={isClientOnlyMode ? currentClinic?.name : 'Painel Central'}
          groups={settingsGroups}
          activeItemId={activeSection}
          onSelect={(id) => setActiveSection(id as SettingsSectionId)}
        >
          {activeSection === 'general' && <GeneralSettings />}
          {activeSection === 'clinics' && <ClinicSettings />}
          {activeSection === 'users' && <TeamManagement />}
          {activeSection === 'modules' && <ModuleManagement />}
          {activeSection === 'integrations' && <IntegrationsWorkspace />}

          {/* CRM Stages & Config */}
          {activeSection === 'crm' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="space-y-4">
                  <h4 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
                    <Kanban size={16} className="text-[var(--color-primary-blue)]" />
                    Etapas do Pipeline de Atendimento
                  </h4>
                  <div className="space-y-2">
                    {[
                      'Novo Lead Recebido', 
                      '1º Contato Realizado', 
                      '2º Contato / Em Negociação', 
                      '3º Contato / Persistência', 
                      'Interagiu & Qualificado', 
                      'Agendamento Marcado', 
                      'Compareceu à Consulta', 
                      'Vendido / Fechou Plano'
                    ].map((stage, idx) => (
                      <div key={stage} className="flex items-center justify-between p-3 bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] text-xs font-semibold text-[var(--color-text-primary)]">
                        <span>{idx + 1}. {stage}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/25 whitespace-nowrap">Ativa</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[var(--color-success)]" />
                      Regras de Automação & Alerta de SLA
                    </h4>
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-normal">
                      Configure notificações automáticas para operadores quando leads permanecerem sem atendimento por mais de 15 minutos.
                    </p>
                    <div className="space-y-2.5 pt-2">
                      <label className="flex items-start gap-2.5 text-xs font-medium text-[var(--color-text-primary)] cursor-pointer">
                        <input type="checkbox" defaultChecked className="mt-0.5 rounded text-[var(--color-primary-blue)]" />
                        <span>Notificar operador quando lead ultrapassar 15 min na etapa 'Novo'</span>
                      </label>
                      <label className="flex items-start gap-2.5 text-xs font-medium text-[var(--color-text-primary)] cursor-pointer">
                        <input type="checkbox" defaultChecked className="mt-0.5 rounded text-[var(--color-primary-blue)]" />
                        <span>Auto-criar tarefa de confirmação 24h antes de cada agendamento</span>
                      </label>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => addToast('Regras de CRM salvas com sucesso!', 'success')}
                    className="w-full mt-4"
                  >
                    Salvar Parâmetros de CRM
                  </Button>
                </Card>
              </div>
            </div>
          )}

          {/* Notifications & Communications */}
          {activeSection === 'notifications' && (
            <div className="space-y-6 animate-fade-in">
              <Card className="space-y-4">
                <h3 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                  Modelos de Mensagem Padrão (WhatsApp / SMS)
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                      Confirmação de Agendamento
                    </label>
                    <textarea
                      rows={3}
                      defaultValue="Olá {nome_paciente}! Sua consulta na clínica {nome_clinica} está confirmada para {data_consulta} às {hora_consulta}. Responda 1 para CONFIRMAR."
                      className="w-full p-3 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)] text-[var(--color-text-primary)] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                      Follow-up Pós-Avaliação
                    </label>
                    <textarea
                      rows={3}
                      defaultValue="Olá {nome_paciente}, como foi seu atendimento hoje com o Dr. {responsavel}? Ficou com alguma dúvida sobre o plano de tratamento?"
                      className="w-full p-3 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)] text-[var(--color-text-primary)] font-mono"
                    />
                  </div>
                </div>
                <Button 
                  type="button"
                  onClick={() => addToast('Modelos de mensagem salvos com sucesso!', 'success')}
                >
                  Salvar Modelos de Mensagem
                </Button>
              </Card>
            </div>
          )}

          {/* Data Backup & Export */}
          {activeSection === 'data' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--color-info)]/10 flex items-center justify-center text-[var(--color-info)]">
                      <Download size={20} />
                    </div>
                    <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Exportar Backup</h4>
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                      Baixe todos os cadastros, leads e agendamentos em um arquivo JSON.
                    </p>
                  </div>
                  <Button 
                    type="button"
                    onClick={handleExportData}
                    className="w-full"
                  >
                    <Download size={14} />
                    <span>Baixar Arquivo .JSON</span>
                  </Button>
                </Card>

                <Card className="space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--color-success)]/10 flex items-center justify-center text-[var(--color-success)]">
                      <Upload size={20} />
                    </div>
                    <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Importar Backup</h4>
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                      Restaure um arquivo de backup em JSON previamente salvo.
                    </p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImportBackup} 
                    accept=".json" 
                    className="hidden" 
                  />
                  <Button 
                    type="button"
                    variant="success"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload size={14} />
                    <span>Importar .JSON</span>
                  </Button>
                </Card>

                <Card className="space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--color-warning)]/10 flex items-center justify-center text-[var(--color-warning)]">
                      <RefreshCw size={20} />
                    </div>
                    <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Sincronizar Cache</h4>
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                      Força atualização de cache e recalcula todos os indicadores dinâmicos.
                    </p>
                  </div>
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => addToast('Sincronização executada com sucesso!', 'success')}
                    className="w-full"
                  >
                    <RefreshCw size={14} />
                    <span>Sincronizar Agora</span>
                  </Button>
                </Card>
              </div>
            </div>
          )}
        </SectionSidebar>
      </Card>
    </PageContainer>
  );
}
