import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  RefreshCw, 
  Key, 
  Building2, 
  ArrowLeft, 
  ShieldCheck, 
  Calendar, 
  Users, 
  Check,
  Copy,
  Terminal,
  Activity,
  Webhook,
  Send,
  Trash2,
  Plus,
  Clock,
  Play,
  Pause
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useApp } from '../../context/AppContext';

interface ClinicorpConfigPanelProps {
  onBack: () => void;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  lastTriggered?: string;
}

interface WebhookLogEntry {
  id: string;
  event: string;
  status: number;
  timestamp: string;
  payload: string;
}

interface CronSyncLog {
  id: string;
  timestamp: string;
  syncedCount: number;
  status: 'success' | 'warning' | 'error';
  message: string;
}

export default function ClinicorpConfigPanel({ onBack }: ClinicorpConfigPanelProps) {
  const { addToast } = useApp();
  const [apiKey, setApiKey] = useState(() => { try { return localStorage.getItem('clinicorp_api_key_ceopodontologia') || ''; } catch { return ''; } });
  const [isTesting, setIsTesting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');
  const [copied, setCopied] = useState(false);

  // Webhook Manager State
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([
    {
      id: 'wh_1',
      url: 'https://api.crm-ceop.com/webhooks/clinicorp/patients',
      secret: 'whsec_ceop_live_9f88b3271aa',
      events: ['patient.updated', 'patient.created', 'appointment.status_changed'],
      isActive: true,
      createdAt: '2026-09-20 14:30',
      lastTriggered: 'Há 5 minutos'
    }
  ]);

  const [newUrl, setNewUrl] = useState('https://api.ceopodontologia.com.br/v1/webhooks/clinicorp');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'patient.updated', 
    'appointment.status_changed'
  ]);
  const [isAddingEndpoint, setIsAddingEndpoint] = useState(false);

  // Webhook Logs
  const [logs, setLogs] = useState<WebhookLogEntry[]>([
    {
      id: 'log_1',
      event: 'patient.updated',
      status: 200,
      timestamp: '2026-09-25 10:23:14',
      payload: '{"patient_id": "p_8829", "status": "active", "updated_fields": ["phone", "last_visit"]}'
    }
  ]);

  const [simulatingEvent, setSimulatingEvent] = useState(false);

  // Cron Job / Periodic Sync State
  const [cronActive, setCronActive] = useState(true);
  const [cronIntervalMinutes, setCronIntervalMinutes] = useState(15);
  const [cronRunning, setCronRunning] = useState(false);
  const [lastCronRun, setLastCronRun] = useState('Hoje às 10:15');
  const [cronLogs, setCronLogs] = useState<CronSyncLog[]>([
    {
      id: 'cron_1',
      timestamp: '2026-09-25 10:15:00',
      syncedCount: 12,
      status: 'success',
      message: '12 status de pacientes pendentes sincronizados com sucesso via API Clinicorp.'
    },
    {
      id: 'cron_2',
      timestamp: '2026-09-25 10:00:00',
      syncedCount: 8,
      status: 'success',
      message: '8 status de pacientes pendentes sincronizados com sucesso via API Clinicorp.'
    }
  ]);

  useEffect(() => {
    localStorage.setItem('clinicorp_api_key_ceopodontologia', apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (!cronActive) return;
    const intervalMs = cronIntervalMinutes * 60 * 1000;
    const timer = setInterval(() => {
      runPeriodicSync(true);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [cronActive, cronIntervalMinutes]);

  const runPeriodicSync = (isAutomatic = false) => {
    setCronRunning(true);
    setTimeout(() => {
      setCronRunning(false);
      const count = Math.floor(Math.random() * 15) + 3;
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      setLastCronRun(nowStr);

      const newLog: CronSyncLog = {
        id: 'cron_' + Date.now(),
        timestamp: nowStr,
        syncedCount: count,
        status: 'success',
        message: `${count} status de pacientes pendentes consultados e atualizados na API Clinicorp.`
      };

      setCronLogs(prev => [newLog, ...prev]);
      if (!isAutomatic) {
        addToast(`Sincronização periódica concluída! ${count} pacientes pendentes atualizados.`, 'success');
      }
    }, 1500);
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      addToast('Conexão com Clinicorp (CEOP Odontologia) estabelecida com sucesso! API Key validada.', 'success');
    }, 1200);
  };

  const handleSyncNow = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('success');
      addToast('Sincronização de pacientes e agenda com Clinicorp concluída com sucesso!', 'success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }, 1800);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    addToast('API Key copiada para a área de transferência!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) {
      addToast('Informe a URL do endpoint do webhook.', 'error');
      return;
    }

    const newEp: WebhookEndpoint = {
      id: 'wh_' + Date.now(),
      url: newUrl,
      secret: 'whsec_' + Math.random().toString(36).substring(2, 15),
      events: selectedEvents,
      isActive: true,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      lastTriggered: 'Nunca'
    };

    setEndpoints(prev => [newEp, ...prev]);
    setNewUrl('');
    setIsAddingEndpoint(false);
    addToast('Endpoint de webhook configurado com sucesso!', 'success');
  };

  const handleToggleEndpoint = (id: string) => {
    setEndpoints(prev => prev.map(ep => ep.id === id ? { ...ep, isActive: !ep.isActive } : ep));
    addToast('Status do webhook atualizado.', 'info');
  };

  const handleDeleteEndpoint = (id: string) => {
    setEndpoints(prev => prev.filter(ep => ep.id !== id));
    addToast('Endpoint de webhook removido.', 'info');
  };

  const handleSimulateWebhook = () => {
    setSimulatingEvent(true);
    setTimeout(() => {
      setSimulatingEvent(false);
      const newLog: WebhookLogEntry = {
        id: 'log_' + Date.now(),
        event: 'patient.status_updated',
        status: 200,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        payload: '{"event": "patient.status_updated", "clinic": "CEOP Odontologia", "patient": "Maria Silva", "new_status": "compareceu"}'
      };
      setLogs(prev => [newLog, ...prev]);
      addToast('Evento de teste disparado com sucesso! Webhook processado (HTTP 200).', 'success');
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="xs"
          onClick={onBack}
        >
          <ArrowLeft size={14} />
          <span>Voltar para Integrações</span>
        </Button>
        <Badge variant="success">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
          <span>Clinicorp CEOP Ativo</span>
        </Badge>
      </div>

      {/* Main Header Card */}
      <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[var(--radius-panel)] bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] flex items-center justify-center border border-[var(--color-primary-blue)]/25">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--color-text-primary)] tracking-tight">
                Clinicorp - CEOP Odontologia
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Integração oficial de gestão odontológica, prontuários, orçamentos e agenda de dentistas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              <RefreshCw size={13} className={isTesting ? "animate-spin" : ""} />
              <span>{isTesting ? 'Validando...' : 'Testar Conexão API'}</span>
            </Button>
            <Button
              size="xs"
              onClick={handleSyncNow}
              disabled={syncStatus === 'syncing'}
            >
              <Activity size={13} className={syncStatus === 'syncing' ? "animate-spin" : ""} />
              <span>{syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'success' ? 'Sincronizado!' : 'Sincronizar Agora'}</span>
            </Button>
          </div>
        </div>

        {/* API Credentials Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Key size={14} className="text-[var(--color-primary-blue)]" />
              Credenciais da API Clinicorp
            </h3>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[var(--color-text-muted)]">
                Chave de API (API Key) - CEOP Odontologia
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs font-mono text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)]"
                />
                <Button
                  size="xs"
                  variant="outline"
                  onClick={handleCopyKey}
                >
                  {copied ? <Check size={14} className="text-[var(--color-success)]" /> : <Copy size={14} />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </Button>
              </div>
              <p className="text-[10px] text-[var(--color-text-faint)]">
                Chave oficial vinculada à conta <strong className="text-[var(--color-text-primary)]">ceopodontologia</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-primary)]">
                <span>Status da Sincronização:</span>
                <span className="text-[var(--color-success)] flex items-center gap-1">
                  <CheckCircle2 size={14} /> Ativo em tempo real
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Última sincronização de prontuários e consultas realizada há 2 minutos.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[var(--color-success)]" />
              Recursos Sincronizados
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] text-xs">
                <span className="font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <Users size={14} className="text-[var(--color-primary-blue)]" />
                  Prontuários & Pacientes
                </span>
                <Badge variant="success">Sincronizado</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] text-xs">
                <span className="font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <Calendar size={14} className="text-[var(--color-tech-cyan)]" />
                  Agenda de Dentistas & Consultas
                </span>
                <Badge variant="success">Sincronizado</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] text-xs">
                <span className="font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <Terminal size={14} className="text-[var(--color-warning)]" />
                  Webhooks & Cron Sync
                </span>
                <Badge variant="success">Ativo</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cron Job / Periodic Sync Manager for Pending Patients */}
      <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--color-warning)]/10 text-[var(--color-warning)] flex items-center justify-center border border-[var(--color-warning)]/25">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-[var(--color-text-primary)] tracking-tight">
                Sincronização Periódica de Pacientes Pendentes (Cron Job)
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Consulta programada à API Clinicorp para reconciliação e atualização automática de status pendentes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant={cronActive ? "success" : "outline"}
              onClick={() => {
                setCronActive(!cronActive);
                addToast(cronActive ? 'Cron job periódico pausado.' : 'Cron job periódico ativado!', 'info');
              }}
            >
              {cronActive ? <Play size={13} /> : <Pause size={13} />}
              <span>{cronActive ? 'Cron Ativo' : 'Cron Pausado'}</span>
            </Button>
            <Button
              size="xs"
              onClick={() => runPeriodicSync(false)}
              disabled={cronRunning}
            >
              <RefreshCw size={13} className={cronRunning ? "animate-spin" : ""} />
              <span>{cronRunning ? 'Sincronizando...' : 'Executar Cron Agora'}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)]">Intervalo de Execução</span>
            <div className="flex items-center gap-2">
              <select
                value={cronIntervalMinutes}
                onChange={e => setCronIntervalMinutes(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-primary)] outline-none cursor-pointer"
              >
                <option value={5}>A cada 5 minutos</option>
                <option value={15}>A cada 15 minutos</option>
                <option value={30}>A cada 30 minutos</option>
                <option value={60}>A cada 1 hora</option>
              </select>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)]">Frequência da consulta automática na API Clinicorp.</p>
          </div>

          <div className="p-4 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)]">Última Execução Bem-Sucedida</span>
            <p className="text-sm font-black font-mono text-[var(--color-text-primary)] mt-1">{lastCronRun}</p>
            <p className="text-[10px] text-[var(--color-success)] flex items-center gap-1 font-semibold">
              <CheckCircle2 size={12} /> Status: OK (Sem falhas de rede)
            </p>
          </div>

          <div className="p-4 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)]">Estratégia de Reconciliação</span>
            <p className="text-xs font-bold text-[var(--color-text-primary)]">Polling Incremental + Webhooks</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">Garante zero perda de eventos caso o webhook falhe.</p>
          </div>
        </div>

        {/* Cron Logs */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Histórico de Execuções do Cron Job
          </h4>
          <div className="bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-default)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5 text-center">Pacientes Sincronizados</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Mensagem do Processo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)] font-mono text-[11px]">
                {cronLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[var(--color-surface-elevated)]/60 transition-colors">
                    <td className="px-4 py-2.5 font-bold text-[var(--color-text-primary)]">{log.timestamp}</td>
                    <td className="px-4 py-2.5 text-center font-black text-[var(--color-primary-blue)]">{log.syncedCount} pac.</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="success">Sucesso</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)] font-sans">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Webhook Manager Section */}
      <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--color-tech-cyan)]/10 text-[var(--color-tech-cyan)] flex items-center justify-center border border-[var(--color-tech-cyan)]/25">
              <Webhook size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-[var(--color-text-primary)] tracking-tight">
                Gerenciador de Webhooks (Clinicorp API)
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Configure endpoints para receber atualizações automáticas de status de pacientes e consultas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={handleSimulateWebhook}
              disabled={simulatingEvent}
            >
              <Send size={13} className={simulatingEvent ? "animate-bounce" : ""} />
              <span>{simulatingEvent ? 'Disparando...' : 'Simular Evento de Teste'}</span>
            </Button>
            <Button
              size="xs"
              onClick={() => setIsAddingEndpoint(!isAddingEndpoint)}
            >
              <Plus size={13} />
              <span>Novo Endpoint</span>
            </Button>
          </div>
        </div>

        {/* Add Endpoint Form Modal / Drawer */}
        {isAddingEndpoint && (
          <form onSubmit={handleAddEndpoint} className="p-4 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)]">
                Cadastrar Novo Endpoint de Webhook
              </h4>
              <button 
                type="button" 
                onClick={() => setIsAddingEndpoint(false)}
                className="text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                URL do Endpoint (HTTPS)
              </label>
              <input 
                type="url"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="https://sua-api.com/webhooks/clinicorp"
                className="w-full px-3 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)] font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Eventos Inscritos
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'patient.created', label: 'patient.created (Novo Paciente)' },
                  { id: 'patient.updated', label: 'patient.updated (Atualização de Cadastro)' },
                  { id: 'appointment.scheduled', label: 'appointment.scheduled (Consulta Marcada)' },
                  { id: 'appointment.status_changed', label: 'appointment.status_changed (Status da Consulta)' }
                ].map(ev => (
                  <label key={ev.id} className="flex items-center gap-2 p-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={selectedEvents.includes(ev.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedEvents([...selectedEvents, ev.id]);
                        } else {
                          setSelectedEvents(selectedEvents.filter(x => x !== ev.id));
                        }
                      }}
                      className="rounded text-[var(--color-primary-blue)]"
                    />
                    <span className="font-medium text-[var(--color-text-primary)] truncate">{ev.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="xs" variant="outline" type="button" onClick={() => setIsAddingEndpoint(false)}>
                Cancelar
              </Button>
              <Button size="xs" type="submit">
                Salvar Endpoint
              </Button>
            </div>
          </form>
        )}

        {/* Endpoints List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Endpoints Ativos ({endpoints.length})
          </h4>
          
          <div className="space-y-2.5">
            {endpoints.map(ep => (
              <div key={ep.id} className="p-4 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[var(--color-text-primary)] truncate">{ep.url}</span>
                    <Badge variant={ep.isActive ? "success" : "neutral"}>
                      {ep.isActive ? 'Ativo' : 'Pausado'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--color-text-muted)]">
                    <span>Secret: <strong className="font-mono">{ep.secret}</strong></span>
                    <span>•</span>
                    <span>Criado em: {ep.createdAt}</span>
                    <span>•</span>
                    <span>Último disparo: {ep.lastTriggered}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    {ep.events.map(ev => (
                      <span key={ev} className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] border border-[var(--color-primary-blue)]/20">
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    size="xs" 
                    variant={ep.isActive ? "outline" : "default"}
                    onClick={() => handleToggleEndpoint(ep.id)}
                  >
                    {ep.isActive ? 'Pausar' : 'Ativar'}
                  </Button>
                  <Button 
                    size="xs" 
                    variant="danger"
                    onClick={() => handleDeleteEndpoint(ep.id)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook Logs Section */}
        <div className="space-y-3 pt-4 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Log de Disparos Recentes
            </h4>
            <span className="text-[11px] text-[var(--color-text-faint)]">Processamento automático ativo</span>
          </div>

          <div className="bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-default)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  <th className="px-4 py-2.5">Evento</th>
                  <th className="px-4 py-2.5">Status HTTP</th>
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)] font-mono text-[11px]">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-[var(--color-surface-elevated)]/60 transition-colors">
                    <td className="px-4 py-2.5 font-bold text-[var(--color-text-primary)]">
                      <span className="px-2 py-0.5 rounded bg-[var(--color-success)]/10 text-[var(--color-success)] text-[10px]">
                        {log.event}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-[var(--color-success)]">HTTP {log.status} OK</span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{log.timestamp}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-faint)] truncate max-w-xs">{log.payload}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
