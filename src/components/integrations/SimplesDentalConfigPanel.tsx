import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Settings, 
  Key, 
  Globe, 
  CheckSquare, 
  Cpu, 
  ListTodo, 
  History, 
  Play, 
  ArrowLeft, 
  Save, 
  Trash2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Terminal, 
  ExternalLink, 
  Clock, 
  Check, 
  X, 
  AlertTriangle, 
  RotateCcw, 
  FileText, 
  Image as ImageIcon, 
  Search, 
  Filter, 
  ChevronRight, 
  Sliders, 
  Activity, 
  Lock, 
  Laptop, 
  Copy, 
  Zap, 
  Database,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApp } from '../../context/AppContext';

export type IntegrationStatus = 
  | 'Não configurado'
  | 'Configuração pendente'
  | 'Aguardando agente'
  | 'Agente offline'
  | 'Agente conectado'
  | 'Agente executando tarefa'
  | 'Conectado'
  | 'Sincronizando'
  | 'Sincronizado'
  | 'Atenção necessária'
  | 'Erro'
  | 'Pausado';

export type AgentStatus =
  | 'Agente não instalado'
  | 'Agente aguardando pareamento'
  | 'Agente conectado'
  | 'Agente executando tarefa'
  | 'Agente offline'
  | 'Agente com erro';

export type TaskStatus =
  | 'Pendente'
  | 'Em processamento'
  | 'Concluído'
  | 'Falhou'
  | 'Requer ação manual'
  | 'Cancelado';

export type StepStatus =
  | 'Pendente'
  | 'Em andamento'
  | 'Concluída'
  | 'Falhou'
  | 'Ignorada';

export interface MappedPage {
  id: string;
  name: string;
  path: string;
  description: string;
  active: boolean;
}

export interface TaskItem {
  task_id: string;
  agent_id: string;
  company_id: string;
  integration_id: string;
  action: string;
  related_record: string;
  patient_name: string;
  status: TaskStatus;
  current_step: string;
  attempts: number;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  error_message?: string;
  has_screenshot?: boolean;
  payload: Record<string, any>;
  result?: Record<string, any>;
}

export interface ExecutionStep {
  id: string;
  label: string;
  status: StepStatus;
  message?: string;
  timestamp?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  operation: string;
  record: string;
  result: 'sucesso' | 'falha' | 'alerta';
  execution_time_ms: number;
  agent_id: string;
  message: string;
  technical_details: string;
}

interface SimplesDentalConfigPanelProps {
  onBack: () => void;
}

export default function SimplesDentalConfigPanel({ onBack }: SimplesDentalConfigPanelProps) {
  const { currentClinic, addToast } = useApp();
  const clinicId = currentClinic?.id || '1';
  const clinicName = currentClinic?.name || 'Clínica Principal';

  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'credenciais' | 'mapeamento' | 'agente' | 'fila'>('geral');

  // 1. SEÇÃO 1: Configurações Gerais
  const [integrationName, setIntegrationName] = useState(`Simples Dental - ${clinicName}`);
  const [status, setStatus] = useState<IntegrationStatus>('Agente conectado');
  const [isEnabled, setIsEnabled] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [executionMode, setExecutionMode] = useState<'automatic' | 'manual' | 'approval'>('automatic');

  // 2. SEÇÃO 2: Credenciais do Sistema Externo
  const [loginUrl, setLoginUrl] = useState('https://app.simplesdental.com/login');
  const [accessEmail, setAccessEmail] = useState('atendimento@clinicadental.com.br');
  const [accessPassword, setAccessPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [clinicCode, setClinicCode] = useState('SD-88421');
  const [branchName, setBranchName] = useState('Unidade Central');
  const [accessNotes, setAccessNotes] = useState('Acesso do usuário recepcionista com permissão de agendamento e cadastro.');
  const [isTestingCredentials, setIsTestingCredentials] = useState(false);

  // 3. SEÇÃO 3: Rotas / Páginas do Sistema Externo
  const [mappedPages, setMappedPages] = useState<MappedPage[]>([
    { id: '1', name: 'URL principal do sistema', path: 'https://app.simplesdental.com/dashboard', description: 'Painel inicial', active: true },
    { id: '2', name: 'Página de login', path: 'https://app.simplesdental.com/login', description: 'Autenticação', active: true },
    { id: '3', name: 'Página de pacientes', path: 'https://app.simplesdental.com/pacientes', description: 'Listagem de pacientes', active: true },
    { id: '4', name: 'Página de novo paciente', path: 'https://app.simplesdental.com/pacientes/novo', description: 'Formulário de cadastro', active: true },
    { id: '5', name: 'Página de edição de paciente', path: 'https://app.simplesdental.com/pacientes/editar', description: 'Edição de cadastro', active: true },
    { id: '6', name: 'Página de agenda', path: 'https://app.simplesdental.com/agenda', description: 'Calendário de consultas', active: true },
    { id: '7', name: 'Página de novo agendamento', path: 'https://app.simplesdental.com/agenda/novo', description: 'Abertura de horário', active: true },
    { id: '8', name: 'Página de profissionais', path: 'https://app.simplesdental.com/profissionais', description: 'Doutores e dentistas', active: true },
    { id: '9', name: 'Página de orçamentos', path: 'https://app.simplesdental.com/orcamentos', description: 'Lista de planos de tratamento', active: true },
    { id: '10', name: 'Página de novo orçamento', path: 'https://app.simplesdental.com/orcamentos/novo', description: 'Criação de orçamento', active: true },
    { id: '11', name: 'Página de tratamentos', path: 'https://app.simplesdental.com/tratamentos', description: 'Procedimentos executados', active: true },
    { id: '12', name: 'Página financeira', path: 'https://app.simplesdental.com/financeiro', description: 'Fluxo financeiro', active: false },
    { id: '13', name: 'Página de débitos', path: 'https://app.simplesdental.com/debitos', description: 'Pendências de pagamentos', active: false },
    { id: '14', name: 'Página de documentos', path: 'https://app.simplesdental.com/documentos', description: 'Atestados e prontuários', active: true },
    { id: '15', name: 'Página de configurações', path: 'https://app.simplesdental.com/configuracoes', description: 'Preferências do sistema', active: false },
  ]);

  // 4. SEÇÃO 4: Operações Disponíveis
  const [operations, setOperations] = useState<Record<string, boolean>>({
    create_patient: true,
    update_patient: true,
    get_patient: true,
    avoid_duplicate_patient: true,
    create_appointment: true,
    update_appointment: true,
    cancel_appointment: true,
    create_budget: true,
    update_budget: false,
    create_treatment: false,
    update_treatment: false,
    register_debit: false,
    get_debits: false,
    send_documents: true,
    sync_info: true,
    auto_execute_tasks: true
  });

  // 5. SEÇÃO 5: Configuração do Agente Local
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('Agente conectado');
  const [agentId, setAgentId] = useState('agent_sd_9921b');
  const [computerName, setComputerName] = useState('DESKTOP-RECEP-ODONTO');
  const [osInfo, setOsInfo] = useState('Windows 11 Pro 64-bit (v10.0.22631)');
  const [lastContact, setLastContact] = useState('Há 8 segundos');
  const [agentVersion, setAgentVersion] = useState('v1.4.8-stable');
  const [pairingToken, setPairingToken] = useState('PROPEX-SD-9981-2026-X4');
  const [pairingDate, setPairingDate] = useState('16/09/2026 09:12');
  const [lastSyncTime, setLastSyncTime] = useState('Há 1 minuto');
  const [technicalIp, setTechnicalIp] = useState('192.168.1.105 (MAC: 3C:52:82:11:AB:90)');

  // 6. SEÇÃO 6: Fila de Automações & Tasks
  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      task_id: 'task_88301',
      agent_id: 'agent_sd_9921b',
      company_id: clinicId,
      integration_id: 'simples_dental',
      action: 'Criar agendamento',
      related_record: 'AG-9021',
      patient_name: 'Dra. Camilla Siqueira',
      status: 'Concluído',
      current_step: 'Confirmação validada',
      attempts: 1,
      created_at: '16/09/2026 10:14:02',
      started_at: '16/09/2026 10:14:03',
      finished_at: '16/09/2026 10:14:18',
      payload: { appointment_id: 'AG-9021', patient: 'Camilla Siqueira', date: '2026-09-17 14:30', doctor: 'Dr. Lucas' },
      result: { external_appointment_id: 'SD-APP-44912', status: 'created' }
    },
    {
      task_id: 'task_88302',
      agent_id: 'agent_sd_9921b',
      company_id: clinicId,
      integration_id: 'simples_dental',
      action: 'Criar paciente',
      related_record: 'PAC-4410',
      patient_name: 'Roberto Carlos Prado',
      status: 'Em processamento',
      current_step: 'Preenchendo formulário no Simples Dental',
      attempts: 1,
      created_at: '16/09/2026 10:20:15',
      started_at: '16/09/2026 10:20:16',
      payload: { patient_id: 'PAC-4410', name: 'Roberto Carlos Prado', cpf: '123.456.789-00', phone: '(11) 98877-6655' }
    },
    {
      task_id: 'task_88303',
      agent_id: 'agent_sd_9921b',
      company_id: clinicId,
      integration_id: 'simples_dental',
      action: 'Criar orçamento',
      related_record: 'ORC-1092',
      patient_name: 'Juliana Paes de Oliveira',
      status: 'Falhou',
      current_step: 'Seleção do profissional',
      attempts: 2,
      created_at: '16/09/2026 09:45:00',
      started_at: '16/09/2026 09:45:02',
      finished_at: '16/09/2026 09:45:22',
      error_message: 'Profissional "Dr. Fernando Costa" não encontrado na lista do Simples Dental.',
      has_screenshot: true,
      payload: { budget_id: 'ORC-1092', doctor: 'Dr. Fernando Costa', items: ['Invisalign Express', 'Profilaxia'] }
    },
    {
      task_id: 'task_88304',
      agent_id: 'agent_sd_9921b',
      company_id: clinicId,
      integration_id: 'simples_dental',
      action: 'Evitar paciente duplicado',
      related_record: 'PAC-4409',
      patient_name: 'Mariana Rios Santos',
      status: 'Pendente',
      current_step: 'Aguardando agente local',
      attempts: 0,
      created_at: '16/09/2026 10:22:00',
      payload: { cpf: '987.654.321-11', phone: '(11) 97766-5544' }
    }
  ]);

  // Selected task for execution detail modal
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);

  // 8. SEÇÃO 8: Logs e Histórico
  const [logs, setLogs] = useState<AuditLog[]>([
    {
      id: 'log_1',
      timestamp: '16/09/2026 10:14:18',
      operation: 'Criar agendamento',
      record: 'AG-9021 (Dra. Camilla Siqueira)',
      result: 'sucesso',
      execution_time_ms: 15200,
      agent_id: 'agent_sd_9921b',
      message: 'Agendamento sincronizado com sucesso no Simples Dental (ID: SD-APP-44912).',
      technical_details: 'HTTP 200 OK | Payload validado | Navegação concluída sem captcha'
    },
    {
      id: 'log_2',
      timestamp: '16/09/2026 09:45:22',
      operation: 'Criar orçamento',
      record: 'ORC-1092 (Juliana Paes)',
      result: 'falhou',
      execution_time_ms: 20100,
      agent_id: 'agent_sd_9921b',
      message: 'Falha ao localizar profissional na página de orçamentos do Simples Dental.',
      technical_details: 'ElementNotFoundException: #select-doctor option[value="Dr. Fernando Costa"]'
    },
    {
      id: 'log_3',
      timestamp: '16/09/2026 09:12:00',
      operation: 'Pareamento de Agente',
      record: 'DESKTOP-RECEP-ODONTO',
      result: 'sucesso',
      execution_time_ms: 850,
      agent_id: 'agent_sd_9921b',
      message: 'Token de pareamento validado com sucesso. Agente conectado em modo seguro.',
      technical_details: 'Token HMAC-SHA256 validado | IP: 192.168.1.105'
    }
  ]);

  // 9. SEÇÃO 9: Testes Visual States
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'failure' | 'waiting' | 'incomplete' | 'idle'>>({
    credentials: 'idle',
    login_url: 'idle',
    agent_conn: 'idle',
    patients_route: 'idle',
    agenda_route: 'idle',
    create_patient_test: 'idle',
    create_appointment_test: 'idle'
  });

  // Persistence on mount
  useEffect(() => {
    const saved = localStorage.getItem(`crm_simples_dental_config_${clinicId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.integrationName) setIntegrationName(parsed.integrationName);
        if (parsed.status) setStatus(parsed.status);
        if (parsed.accessEmail) setAccessEmail(parsed.accessEmail);
        if (parsed.clinicCode) setClinicCode(parsed.clinicCode);
        if (parsed.mappedPages) setMappedPages(parsed.mappedPages);
        if (parsed.operations) setOperations(parsed.operations);
      } catch (e) {
        console.error('Error loading Simples Dental config:', e);
      }
    }
  }, [clinicId]);

  // Save Settings
  const handleSaveAll = () => {
    const dataToSave = {
      integrationName,
      status,
      isEnabled,
      autoSyncEnabled,
      executionMode,
      loginUrl,
      accessEmail,
      clinicCode,
      branchName,
      mappedPages,
      operations,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`crm_simples_dental_config_${clinicId}`, JSON.stringify(dataToSave));
    addToast('Configurações do Simples Dental salvas com sucesso!', 'success');
  };

  // Test credential action
  const handleTestCredentials = () => {
    setIsTestingCredentials(true);
    setTestResults(prev => ({ ...prev, credentials: 'waiting' }));
    setTimeout(() => {
      setIsTestingCredentials(false);
      setTestResults(prev => ({ ...prev, credentials: 'success' }));
      addToast('Acesso ao Simples Dental validado com sucesso pelo Agente!', 'success');
    }, 1200);
  };

  // Run specific test
  const handleRunTest = (testKey: string, label: string) => {
    setTestResults(prev => ({ ...prev, [testKey]: 'waiting' }));
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, [testKey]: 'success' }));
      addToast(`Teste "${label}" executado com sucesso!`, 'success');
    }, 1100);
  };

  // Generate pairing token
  const handleGeneratePairingToken = () => {
    const newToken = 'PROPEX-SD-' + Math.floor(1000 + Math.random() * 9000) + '-2026-X' + Math.floor(1 + Math.random() * 9);
    setPairingToken(newToken);
    addToast('Novo código de pareamento gerado! Insira este código no aplicativo local do agente.', 'info');
  };

  // Re-run task
  const handleRerunTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status: 'Em processamento', attempts: t.attempts + 1, started_at: new Date().toLocaleTimeString('pt-BR') } : t));
    addToast(`Tarefa ${taskId} reenviada para a fila do Agente!`, 'info');
  };

  // Cancel task
  const handleCancelTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status: 'Cancelado' } : t));
    addToast(`Tarefa ${taskId} cancelada.`, 'info');
  };

  // Mark resolved manually
  const handleMarkResolved = (taskId: string) => {
    setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status: 'Concluído', current_step: 'Resolvido manualmente pelo operador' } : t));
    addToast(`Tarefa ${taskId} marcada como resolvida manualmente!`, 'success');
  };

  const getStatusBadge = (st: IntegrationStatus) => {
    switch (st) {
      case 'Conectado':
      case 'Sincronizado':
      case 'Agente conectado':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 font-semibold';
      case 'Sincronizando':
      case 'Agente executando tarefa':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 animate-pulse';
      case 'Aguardando agente':
      case 'Configuração pendente':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      case 'Erro':
      case 'Agente offline':
      case 'Atenção necessária':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700';
      case 'Pausado':
      case 'Não configurado':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  // Standard execution checklist steps generator for modal
  const getExecutionChecklist = (task: TaskItem): ExecutionStep[] => {
    if (task.status === 'Concluído') {
      return [
        { id: '1', label: 'Dados recebidos do CRM', status: 'Concluída', timestamp: '10:14:02' },
        { id: '2', label: 'Paciente localizado', status: 'Concluída', timestamp: '10:14:04' },
        { id: '3', label: 'Paciente criado ou já existente', status: 'Concluída', timestamp: '10:14:05' },
        { id: '4', label: 'Cadastro salvo', status: 'Concluída', timestamp: '10:14:07' },
        { id: '5', label: 'Agenda aberta', status: 'Concluída', timestamp: '10:14:09' },
        { id: '6', label: 'Profissional selecionado', status: 'Concluída', timestamp: '10:14:11' },
        { id: '7', label: 'Data selecionada', status: 'Concluída', timestamp: '10:14:13' },
        { id: '8', label: 'Horário selecionado', status: 'Concluída', timestamp: '10:14:15' },
        { id: '9', label: 'Agendamento criado', status: 'Concluída', timestamp: '10:14:16' },
        { id: '10', label: 'Confirmação validada', status: 'Concluída', timestamp: '10:14:17' },
        { id: '11', label: 'Tarefa concluída', status: 'Concluída', timestamp: '10:14:18' },
      ];
    } else if (task.status === 'Falhou') {
      return [
        { id: '1', label: 'Dados recebidos do CRM', status: 'Concluída', timestamp: '09:45:02' },
        { id: '2', label: 'Paciente localizado', status: 'Concluída', timestamp: '09:45:05' },
        { id: '3', label: 'Paciente criado ou já existente', status: 'Concluída', timestamp: '09:45:08' },
        { id: '4', label: 'Cadastro salvo', status: 'Concluída', timestamp: '09:45:10' },
        { id: '5', label: 'Agenda aberta', status: 'Concluída', timestamp: '09:45:15' },
        { id: '6', label: 'Profissional selecionado', status: 'Falhou', message: task.error_message, timestamp: '09:45:22' },
        { id: '7', label: 'Data selecionada', status: 'Pendente' },
        { id: '8', label: 'Horário selecionado', status: 'Pendente' },
        { id: '9', label: 'Agendamento criado', status: 'Pendente' },
        { id: '10', label: 'Confirmação validada', status: 'Pendente' },
        { id: '11', label: 'Tarefa concluída', status: 'Pendente' },
      ];
    } else if (task.status === 'Em processamento') {
      return [
        { id: '1', label: 'Dados recebidos do CRM', status: 'Concluída', timestamp: '10:20:16' },
        { id: '2', label: 'Paciente localizado', status: 'Concluída', timestamp: '10:20:18' },
        { id: '3', label: 'Paciente criado ou já existente', status: 'Em andamento' },
        { id: '4', label: 'Cadastro salvo', status: 'Pendente' },
        { id: '5', label: 'Agenda aberta', status: 'Pendente' },
        { id: '6', label: 'Profissional selecionado', status: 'Pendente' },
        { id: '7', label: 'Data selecionada', status: 'Pendente' },
        { id: '8', label: 'Horário selecionado', status: 'Pendente' },
        { id: '9', label: 'Agendamento criado', status: 'Pendente' },
        { id: '10', label: 'Confirmação validada', status: 'Pendente' },
        { id: '11', label: 'Tarefa concluída', status: 'Pendente' },
      ];
    } else {
      return [
        { id: '1', label: 'Dados recebidos do CRM', status: 'Concluída' },
        { id: '2', label: 'Paciente localizado', status: 'Pendente' },
        { id: '3', label: 'Paciente criado ou já existente', status: 'Pendente' },
        { id: '4', label: 'Cadastro salvo', status: 'Pendente' },
        { id: '5', label: 'Agenda aberta', status: 'Pendente' },
        { id: '6', label: 'Profissional selecionado', status: 'Pendente' },
        { id: '7', label: 'Data selecionada', status: 'Pendente' },
        { id: '8', label: 'Horário selecionado', status: 'Pendente' },
        { id: '9', label: 'Agendamento criado', status: 'Pendente' },
        { id: '10', label: 'Confirmação validada', status: 'Pendente' },
        { id: '11', label: 'Tarefa concluída', status: 'Pendente' },
      ];
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* MINIMALIST TOP HEADER */}
      {/* TOP HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Voltar para Integrações"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
            <Database size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Simples Dental
              </h1>
              <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-semibold border tracking-wide", getStatusBadge(status))}>
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Empresa: <strong className="text-slate-700 dark:text-slate-300">{clinicName}</strong> (ID: {clinicId})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAll}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
          >
            <Save size={14} />
            Salvar
          </button>
        </div>
      </div>

      {/* MINIMALIST SUB-TAB NAVIGATION */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('geral')}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
            activeSubTab === 'geral' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          <Settings size={14} />
          <span>Gerais</span>
        </button>

        <button
          onClick={() => setActiveSubTab('credenciais')}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
            activeSubTab === 'credenciais' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          <Key size={14} />
          <span>Credenciais</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mapeamento')}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
            activeSubTab === 'mapeamento' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          <Globe size={14} />
          <span>Mapeamento ({mappedPages.filter(p => p.active).length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('agente')}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
            activeSubTab === 'agente' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          <Cpu size={14} />
          <span>Agente</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fila')}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
            activeSubTab === 'fila' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          <ListTodo size={14} />
          <span>Fila ({tasks.length})</span>
        </button>
      </div>

      {/* ------------------- SUB-TAB 1: GERAIS (SEÇÃO 1 & 4) ------------------- */}
      {activeSubTab === 'geral' && (
        <div className="space-y-6">
          {/* SEÇÃO 1: CONFIGURAÇÕES GERAIS */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Sliders size={16} className="text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Configurações Gerais da Integração
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Nome da Integração</label>
                <input
                  type="text"
                  value={integrationName}
                  onChange={e => setIntegrationName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Status da Integração</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as IntegrationStatus)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Não configurado">Não configurado</option>
                  <option value="Configuração pendente">Configuração pendente</option>
                  <option value="Aguardando agente">Aguardando agente</option>
                  <option value="Agente offline">Agente offline</option>
                  <option value="Agente conectado">Agente conectado</option>
                  <option value="Conectado">Conectado</option>
                  <option value="Sincronizando">Sincronizando</option>
                  <option value="Sincronizado">Sincronizado</option>
                  <option value="Atenção necessária">Atenção necessária</option>
                  <option value="Erro">Erro</option>
                  <option value="Pausado">Pausado</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Empresa / Tenant Vinculado</label>
                <input
                  type="text"
                  value={clinicName}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Identificador da Empresa</label>
                <input
                  type="text"
                  value={clinicId}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-500 dark:text-slate-400"
                />
              </div>
            </div>

            <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Ativar integração</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Permite a troca de dados com o agente local</p>
                </div>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={e => setIsEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Sincronização automática</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Envia tarefas imediatamente ao criar dados</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={e => setAutoSyncEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1.5">Modo de Execução</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExecutionMode('automatic')}
                  className={cn(
                    "py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer",
                    executionMode === 'automatic'
                      ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  )}
                >
                  Automático
                </button>
                <button
                  type="button"
                  onClick={() => setExecutionMode('manual')}
                  className={cn(
                    "py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer",
                    executionMode === 'manual'
                      ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  )}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => setExecutionMode('approval')}
                  className={cn(
                    "py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer",
                    executionMode === 'approval'
                      ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  )}
                >
                  Requer Aprovação
                </button>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: OPERAÇÕES DISPONÍVEIS */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <CheckSquare size={16} className="text-slate-500" />
                Operações Permitidas para o Agente Local
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ative ou desative individualmente os tipos de ação que o robô/agente tem autorização para executar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {[
                { key: 'create_patient', label: 'Criar paciente' },
                { key: 'update_patient', label: 'Atualizar paciente' },
                { key: 'get_patient', label: 'Consultar paciente' },
                { key: 'avoid_duplicate_patient', label: 'Evitar paciente duplicado' },
                { key: 'create_appointment', label: 'Criar agendamento' },
                { key: 'update_appointment', label: 'Atualizar agendamento' },
                { key: 'cancel_appointment', label: 'Cancelar agendamento' },
                { key: 'create_budget', label: 'Criar orçamento' },
                { key: 'update_budget', label: 'Atualizar orçamento' },
                { key: 'create_treatment', label: 'Criar tratamento' },
                { key: 'update_treatment', label: 'Atualizar tratamento' },
                { key: 'register_debit', label: 'Registrar débito' },
                { key: 'get_debits', label: 'Consultar débitos' },
                { key: 'send_documents', label: 'Enviar documentos' },
                { key: 'sync_info', label: 'Sincronizar informações' },
                { key: 'auto_execute_tasks', label: 'Executar tarefas automaticamente' },
              ].map((op) => (
                <div 
                  key={op.key}
                  onClick={() => setOperations(prev => ({ ...prev, [op.key]: !prev[op.key] }))}
                  className={cn(
                    "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                    operations[op.key]
                      ? "bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                      : "bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
                  )}
                >
                  <span className="text-xs font-bold">{op.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(operations[op.key])}
                    onChange={() => {}}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------- SUB-TAB 2: CREDENCIAIS (SEÇÃO 2) ------------------- */}
      {activeSubTab === 'credenciais' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-xs max-w-2xl mx-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-slate-400" />
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Credenciais do Sistema Externo
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Simples Dental</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                URL de Login
              </label>
              <input
                type="text"
                value={loginUrl}
                onChange={e => setLoginUrl(e.target.value)}
                placeholder="https://app.simplesdental.com/login"
                className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800/90 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  E-mail / Usuário
                </label>
                <input
                  type="email"
                  value={accessEmail}
                  onChange={e => setAccessEmail(e.target.value)}
                  placeholder="usuario@clinica.com.br"
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800/90 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 transition-all outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={accessPassword}
                    onChange={e => setAccessPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50/80 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800/90 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    title={showPassword ? "Ocultar senha" : "Exibir senha"}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Código da Clínica <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={clinicCode}
                  onChange={e => setClinicCode(e.target.value)}
                  placeholder="Ex: SD-88421"
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800/90 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 transition-all outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Unidade / Filial
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  placeholder="Ex: Unidade Central"
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800/90 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Observações
              </label>
              <textarea
                rows={2}
                value={accessNotes}
                onChange={e => setAccessNotes(e.target.value)}
                placeholder="Observações de acesso para o agente local..."
                className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800/90 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 transition-all outline-none resize-none"
              />
            </div>

            {/* ACTION BUTTONS CREDENCIAIS */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSaveAll}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Salvar Credenciais
              </button>
              <button
                type="button"
                onClick={handleTestCredentials}
                disabled={isTestingCredentials}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {isTestingCredentials ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                <span>Testar Acesso</span>
              </button>
              <button
                type="button"
                onClick={() => addToast('Credenciais redefinidas. Preencha os novos dados e salve.', 'info')}
                className="px-3.5 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl text-xs font-medium transition-all"
              >
                Atualizar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccessEmail('');
                  setAccessPassword('');
                  addToast('Credenciais removidas.', 'info');
                }}
                className="px-3.5 py-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 rounded-xl text-xs font-medium transition-all ml-auto"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------- SUB-TAB 3: MAPEAMENTO DE PÁGINAS (SEÇÃO 3) ------------------- */}
      {activeSubTab === 'mapeamento' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Globe size={16} className="text-slate-500" />
                Seção 3 — Mapeamento de Páginas do Sistema Externo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Informe as URLs ou caminhos exatos que o agente local deve acessar no Simples Dental.
              </p>
            </div>
            <button
              onClick={() => {
                const newPage: MappedPage = {
                  id: 'page_' + Date.now(),
                  name: 'Página personalizada',
                  path: 'https://app.simplesdental.com/custom',
                  description: 'Nova rota configurada',
                  active: true
                };
                setMappedPages([...mappedPages, newPage]);
              }}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all self-start sm:self-auto"
            >
              + Adicionar Rota
            </button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {mappedPages.map((page, idx) => (
              <div 
                key={page.id} 
                className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={page.name}
                      onChange={e => {
                        const updated = [...mappedPages];
                        updated[idx].name = e.target.value;
                        setMappedPages(updated);
                      }}
                      className="text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:outline-none focus:border-emerald-500 px-1"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                      <span>Ativo</span>
                      <input
                        type="checkbox"
                        checked={page.active}
                        onChange={e => {
                          const updated = [...mappedPages];
                          updated[idx].active = e.target.checked;
                          setMappedPages(updated);
                        }}
                        className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRunTest(`route_${page.id}`, page.name)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-100 flex items-center gap-1 transition-colors"
                    >
                      <Play size={10} />
                      Testar Rota
                    </button>

                    <button
                      type="button"
                      onClick={() => setMappedPages(mappedPages.filter(p => p.id !== page.id))}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Excluir rota"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={page.path}
                      onChange={e => {
                        const updated = [...mappedPages];
                        updated[idx].path = e.target.value;
                        setMappedPages(updated);
                      }}
                      placeholder="https://app.simplesdental.com/caminho"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={page.description}
                      onChange={e => {
                        const updated = [...mappedPages];
                        updated[idx].description = e.target.value;
                        setMappedPages(updated);
                      }}
                      placeholder="Descrição opcional"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------- SUB-TAB 3: OPERAÇÕES DISPONÍVEIS (SEÇÃO 4) ------------------- */}
      {activeSubTab === 'operacoes' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <CheckSquare size={16} className="text-slate-500" />
              Seção 4 — Operações Disponíveis para o Agente Local
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ative ou desative individualmente os tipos de ação que o robô/agente tem autorização para executar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { key: 'create_patient', label: 'Criar paciente' },
              { key: 'update_patient', label: 'Atualizar paciente' },
              { key: 'get_patient', label: 'Consultar paciente' },
              { key: 'avoid_duplicate_patient', label: 'Evitar paciente duplicado' },
              { key: 'create_appointment', label: 'Criar agendamento' },
              { key: 'update_appointment', label: 'Atualizar agendamento' },
              { key: 'cancel_appointment', label: 'Cancelar agendamento' },
              { key: 'create_budget', label: 'Criar orçamento' },
              { key: 'update_budget', label: 'Atualizar orçamento' },
              { key: 'create_treatment', label: 'Criar tratamento' },
              { key: 'update_treatment', label: 'Atualizar tratamento' },
              { key: 'register_debit', label: 'Registrar débito' },
              { key: 'get_debits', label: 'Consultar débitos' },
              { key: 'send_documents', label: 'Enviar documentos' },
              { key: 'sync_info', label: 'Sincronizar informações' },
              { key: 'auto_execute_tasks', label: 'Executar tarefas automaticamente' },
            ].map((op) => (
              <div 
                key={op.key}
                onClick={() => setOperations(prev => ({ ...prev, [op.key]: !prev[op.key] }))}
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                  operations[op.key]
                    ? "bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                    : "bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
                )}
              >
                <span className="text-xs font-bold">{op.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(operations[op.key])}
                  onChange={() => {}}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------- SUB-TAB 4: AGENTE LOCAL & TESTES (SEÇÕES 5 E 9) ------------------- */}
      {activeSubTab === 'agente' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SEÇÃO 5: CONFIGURAÇÃO DO AGENTE LOCAL */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Seção 5 — Pareamento do Agente Local
                </h2>
              </div>
              <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider", getStatusBadge(agentStatus))}>
                {agentStatus}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 font-medium">ID do Agente:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-right">{agentId}</span>

                <span className="text-slate-500 font-medium">Computador:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-right">{computerName}</span>

                <span className="text-slate-500 font-medium">Sistema Operacional:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-right truncate" title={osInfo}>{osInfo}</span>

                <span className="text-slate-500 font-medium">Último Contato:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-right">{lastContact}</span>

                <span className="text-slate-500 font-medium">Versão do Agente:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-right">{agentVersion}</span>

                <span className="text-slate-500 font-medium">Data do Pareamento:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-right">{pairingDate}</span>

                <span className="text-slate-500 font-medium">Última Sincronização:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-right">{lastSyncTime}</span>

                <span className="text-slate-500 font-medium">Endereço IP / MAC:</span>
                <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 text-right truncate" title={technicalIp}>{technicalIp}</span>
              </div>

              {/* PAIRING TOKEN DISPLAY */}
              <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Token de Pareamento da Empresa</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(pairingToken);
                      addToast('Token copiado!', 'success');
                    }}
                    className="text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Copy size={11} /> Copiar
                  </button>
                </div>
                <p className="font-mono text-sm font-bold tracking-wider text-emerald-400">{pairingToken}</p>
              </div>

              {/* ACTION BUTTONS SEÇÃO 5 */}
              <div className="pt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePairingToken}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  Gerar Código de Pareamento
                </button>

                <button
                  type="button"
                  onClick={() => handleRunTest('agent_conn', 'Comunicação do Agente')}
                  className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Activity size={13} />
                  <span>Testar Comunicação</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAgentStatus('Agente não instalado');
                    addToast('Agente desconectado.', 'info');
                  }}
                  className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold transition-all ml-auto"
                >
                  Desconectar
                </button>
              </div>
            </div>
          </div>

          {/* SEÇÃO 9: CENTRAL DE TESTES DA INTEGRAÇÃO */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal size={16} className="text-slate-500" />
                Seção 9 — Diagnósticos e Testes do Agente
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Execute rotinas de teste para validar credenciais, rotas de navegação e simuladores de tarefas.
              </p>
            </div>

            <div className="space-y-2">
              {[
                { key: 'credentials', label: 'Testar credenciais', action: handleTestCredentials },
                { key: 'login_url', label: 'Testar URL de login', action: () => handleRunTest('login_url', 'URL de Login') },
                { key: 'agent_conn', label: 'Testar conexão com agente', action: () => handleRunTest('agent_conn', 'Conexão com Agente') },
                { key: 'patients_route', label: 'Testar rota de pacientes', action: () => handleRunTest('patients_route', 'Rota de Pacientes') },
                { key: 'agenda_route', label: 'Testar rota de agenda', action: () => handleRunTest('agenda_route', 'Rota de Agenda') },
                { key: 'create_patient_test', label: 'Executar teste de cadastro', action: () => handleRunTest('create_patient_test', 'Teste de Cadastro') },
                { key: 'create_appointment_test', label: 'Executar teste de agendamento', action: () => handleRunTest('create_appointment_test', 'Teste de Agendamento') },
              ].map((t) => {
                const res = testResults[t.key] || 'idle';
                return (
                  <div key={t.key} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.label}</span>
                    <div className="flex items-center gap-2">
                      {res === 'waiting' && <span className="text-[10px] font-bold text-blue-600 animate-pulse flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> Aguardando agente</span>}
                      {res === 'success' && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Sucesso</span>}
                      {res === 'failure' && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Falha</span>}
                      {res === 'incomplete' && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Incompleto</span>}
                      
                      <button
                        type="button"
                        onClick={t.action}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Executar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------- SUB-TAB 5: FILA DE AUTOMAÇÕES (SEÇÃO 6 E SEÇÃO 7) ------------------- */}
      {activeSubTab === 'fila' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ListTodo size={16} className="text-slate-500" />
                Seção 6 — Fila de Automações & Tarefas do Agente
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Acompanhe em tempo real o status de cada requisição enviada ao robô local.
              </p>
            </div>
            <button
              onClick={() => {
                const newTask: TaskItem = {
                  task_id: 'task_' + Math.floor(10000 + Math.random() * 90000),
                  agent_id: agentId,
                  company_id: clinicId,
                  integration_id: 'simples_dental',
                  action: 'Criar agendamento',
                  related_record: 'AG-' + Math.floor(1000 + Math.random() * 9000),
                  patient_name: 'Novo Paciente Teste',
                  status: 'Pendente',
                  current_step: 'Enviado para a fila',
                  attempts: 0,
                  created_at: new Date().toLocaleTimeString('pt-BR'),
                  payload: { test: true }
                };
                setTasks([newTask, ...tasks]);
                addToast('Nova tarefa enviada para a fila!', 'info');
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              + Disparar Nova Tarefa
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold">
                  <th className="p-3">ID / Operação</th>
                  <th className="p-3">Registro / Paciente</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Etapa Atual</th>
                  <th className="p-3">Tentativas</th>
                  <th className="p-3">Datas</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasks.map((t) => (
                  <tr key={t.task_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono">
                      <p className="font-bold text-slate-900 dark:text-white">{t.task_id}</p>
                      <p className="text-[10px] text-slate-400">{t.action}</p>
                    </td>

                    <td className="p-3">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{t.patient_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Ref: {t.related_record}</p>
                    </td>

                    <td className="p-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                        t.status === 'Concluído' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        t.status === 'Em processamento' ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse" :
                        t.status === 'Falhou' ? "bg-rose-50 text-rose-700 border-rose-200" :
                        "bg-slate-100 text-slate-600 border-slate-200"
                      )}>
                        {t.status}
                      </span>
                    </td>

                    <td className="p-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={t.current_step}>
                      {t.current_step}
                    </td>

                    <td className="p-3 text-slate-600 dark:text-slate-400 font-bold">
                      {t.attempts}
                    </td>

                    <td className="p-3 text-[10px] text-slate-500">
                      <p>Criado: {t.created_at}</p>
                      {t.finished_at && <p>Fim: {t.finished_at}</p>}
                    </td>

                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTask(t)}
                        className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold"
                        title="Ver checklist e detalhes de execução"
                      >
                        Checklist
                      </button>

                      {t.status === 'Falhou' && (
                        <button
                          onClick={() => handleRerunTask(t.task_id)}
                          className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] font-bold"
                          title="Reexecutar tarefa"
                        >
                          Reexecutar
                        </button>
                      )}

                      {t.status === 'Falhou' && t.has_screenshot && (
                        <button
                          onClick={() => setShowScreenshotModal(true)}
                          className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-[10px] font-bold"
                          title="Ver Screenshot do Erro"
                        >
                          Screenshot
                        </button>
                      )}

                      <button
                        onClick={() => handleMarkResolved(t.task_id)}
                        className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[10px] font-bold"
                        title="Marcar como resolvido manualmente"
                      >
                        Resolver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------- HISTÓRICO E LOGS DE AUDITORIA (SEÇÃO 8) ------------------- */}
      {activeSubTab === 'fila' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <History size={16} className="text-slate-500" />
              Seção 8 — Histórico e Logs da Integração Simples Dental
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Auditoria técnica sanitizada (senhas e tokens mascarados por segurança).
            </p>
          </div>

          <div className="space-y-2.5">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] uppercase tracking-wider",
                      log.result === 'sucesso' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    )}>
                      {log.result}
                    </span>
                    <span className="text-slate-900 dark:text-white">{log.operation}</span>
                    <span className="text-slate-400 font-normal">({log.record})</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">{log.timestamp} • {log.execution_time_ms}ms</span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300">{log.message}</p>
                <div className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-900 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800">
                  {log.technical_details}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CHECKLIST VISUAL DA EXECUÇÃO (SEÇÃO 7) */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Seção 7 — Detalhes da Execução (Checklist Visual)
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Tarefa: {selectedTask.task_id} ({selectedTask.action})</p>
              </div>
              <button 
                onClick={() => setSelectedTask(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {getExecutionChecklist(selectedTask).map((step) => (
                <div 
                  key={step.id} 
                  className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {step.status === 'Concluída' && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                    {step.status === 'Em andamento' && <RefreshCw size={16} className="text-blue-500 animate-spin shrink-0" />}
                    {step.status === 'Falhou' && <AlertCircle size={16} className="text-rose-500 shrink-0" />}
                    {step.status === 'Pendente' && <Clock size={16} className="text-slate-300 shrink-0" />}

                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{step.label}</p>
                      {step.message && <p className="text-[10px] text-rose-500">{step.message}</p>}
                    </div>
                  </div>

                  <span className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                    step.status === 'Concluída' ? "bg-emerald-100 text-emerald-700" :
                    step.status === 'Falhou' ? "bg-rose-100 text-rose-700" :
                    step.status === 'Em andamento' ? "bg-blue-100 text-blue-700" :
                    "bg-slate-200 text-slate-600"
                  )}>
                    {step.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SCREENSHOT DO ERRO */}
      {showScreenshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon size={18} className="text-amber-500" />
                Screenshot Capturada pelo Agente no Momento da Falha
              </h3>
              <button onClick={() => setShowScreenshotModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-slate-300 font-mono text-xs space-y-2">
              <div className="p-8 border border-dashed border-slate-700 rounded-lg text-center text-slate-500 space-y-2">
                <ImageIcon size={32} className="mx-auto text-slate-600" />
                <p className="text-xs font-bold text-slate-400">[Simulação de Captura da Tela do Simples Dental]</p>
                <p className="text-[10px] text-slate-500">
                  Erro visual: Dropdown de dentistas aberto sem a opção "Dr. Fernando Costa".
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowScreenshotModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
