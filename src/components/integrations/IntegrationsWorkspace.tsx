import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  MoreVertical,
  MessageSquare,
  Globe,
  Database,
  Calendar,
  Lock,
  ExternalLink,
  ChevronRight,
  Settings,
  Webhook,
  Copy,
  Plus,
  Terminal,
  Check,
  Sliders,
  History,
  ArrowRight,
  Clock,
  Cloud,
  Loader2,
  ShieldCheck,
  PhoneCall,
  Sparkles,
  Layers,
  Filter
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import { getGoogleUser, isAccessTokenValid } from '../../lib/googleAuth';
import { getGoogleSyncSettings, formatIntervalLabel, GoogleSyncSettings } from '../../lib/googleSyncSettings';
import { saveClinicSyncIntervalToFirestore, fetchClinicSyncSettingsFromFirestore } from '../../lib/firestoreClinicSettings';
import GoogleIntegrationSettingsPanel from './GoogleIntegrationSettingsPanel';
import GoogleCalendarMappingPanel from './GoogleCalendarMappingPanel';
import SyncHistoryTab from './SyncHistoryTab';
import SimplesDentalConfigPanel from './SimplesDentalConfigPanel';
import ClinicorpConfigPanel from './ClinicorpConfigPanel';
import SupabaseConfigPanel from './SupabaseConfigPanel';

import { crmApiClient, WebhookLog } from '../../lib/apiClient';

export type IntegrationSegment = 'ceop' | 'odontologia' | 'all';

interface Integration {
  id: string;
  name: string;
  segment: 'ceop' | 'odontologia' | 'both';
  category: 'healthcare' | 'communication' | 'calendar' | 'marketing' | 'webhooks' | 'telephony';
  description: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync?: string;
  logo: React.ReactNode;
}

interface WebhookItem {
  id: string;
  name: string;
  segment: 'ceop' | 'odontologia' | 'both';
  url: string;
  source: string;
  status: 'active' | 'inactive';
  lastTriggered?: string;
  secretToken: string;
}

export default function IntegrationsWorkspace() {
  const { currentClinic, addToast, user } = useApp();
  
  // Detect default segment based on role / current clinic
  const isCeopRole = user?.role === Role.CEOP_OPERATOR || user?.role === Role.CEOP || user?.role === Role.CRC_OPERATOR;
  
  const [selectedSegment, setSelectedSegment] = useState<IntegrationSegment>(() => {
    if (isCeopRole) return 'ceop';
    return 'odontologia';
  });

  const [activeTab, setActiveTab] = useState<'integrations' | 'settings' | 'history' | 'mapping' | 'webhooks' | 'simples_dental' | 'clinicorp' | 'supabase'>('integrations');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState(getGoogleUser());
  const [isTokenValid, setIsTokenValid] = useState(() => isAccessTokenValid());
  const [syncSettings, setSyncSettings] = useState<GoogleSyncSettings>(() => 
    getGoogleSyncSettings(currentClinic?.id)
  );
  const [isSavingFirestore, setIsSavingFirestore] = useState(false);
  const [firestoreLastSaved, setFirestoreLastSaved] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(`crm_gcal_firestore_sync_${currentClinic?.id || '1'}`);
      if (raw) {
        try {
          const p = JSON.parse(raw);
          return p.savedAt ? new Date(p.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
        } catch (e) {}
      }
    }
    return null;
  });

  useEffect(() => {
    setGoogleUser(getGoogleUser());
    setIsTokenValid(isAccessTokenValid());
    setSyncSettings(getGoogleSyncSettings(currentClinic?.id));

    const loadClinicFirestoreSettings = async () => {
      if (currentClinic?.id) {
        const firestoreSettings = await fetchClinicSyncSettingsFromFirestore(currentClinic.id);
        if (firestoreSettings) {
          setSyncSettings(firestoreSettings);
        }
      }
    };
    loadClinicFirestoreSettings();

    const onTokenExpired = () => setIsTokenValid(false);
    const onTokenUpdated = () => {
      setGoogleUser(getGoogleUser());
      setIsTokenValid(isAccessTokenValid());
    };
    const onLoggedOut = () => {
      setGoogleUser(null);
      setIsTokenValid(false);
    };
    const onSettingsChanged = (e: any) => {
      if (e.detail) setSyncSettings(e.detail);
      else setSyncSettings(getGoogleSyncSettings(currentClinic?.id));
    };
    const onFirestoreStatus = (e: any) => {
      if (e.detail?.savedAt) {
        setFirestoreLastSaved(new Date(e.detail.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      }
    };

    window.addEventListener('crm_google_token_expired', onTokenExpired);
    window.addEventListener('crm_google_token_updated', onTokenUpdated);
    window.addEventListener('crm_google_logged_out', onLoggedOut);
    window.addEventListener('crm_google_sync_settings_changed', onSettingsChanged);
    window.addEventListener('crm_firestore_sync_status_changed', onFirestoreStatus);

    return () => {
      window.removeEventListener('crm_google_token_expired', onTokenExpired);
      window.removeEventListener('crm_google_token_updated', onTokenUpdated);
      window.removeEventListener('crm_google_logged_out', onLoggedOut);
      window.removeEventListener('crm_google_sync_settings_changed', onSettingsChanged);
      window.removeEventListener('crm_firestore_sync_status_changed', onFirestoreStatus);
    };
  }, [currentClinic?.id]);

  const handleSyncIntervalChange = async (newInterval: number) => {
    setIsSavingFirestore(true);
    const clinicId = currentClinic?.id || '1';
    const clinicName = currentClinic?.name || 'Clínica Principal';
    const autoSync = newInterval > 0;
    const intervalMinutes = autoSync ? newInterval : syncSettings.syncIntervalMinutes;

    try {
      const result = await saveClinicSyncIntervalToFirestore(
        clinicId,
        clinicName,
        intervalMinutes,
        autoSync,
        user?.email || user?.name || 'Administrador'
      );

      if (result.success) {
        const timeStr = new Date(result.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setFirestoreLastSaved(timeStr);
        setSyncSettings(prev => ({
          ...prev,
          syncIntervalMinutes: intervalMinutes,
          autoSyncEnabled: autoSync
        }));
        addToast(
          autoSync 
            ? `Frequência de sincronização configurada para ${formatIntervalLabel(intervalMinutes)}!` 
            : 'Sincronização manual ativada!',
          'success'
        );
      } else {
        addToast('Salvo em cache local.', 'info');
      }
    } catch (err: any) {
      console.error('Erro ao atualizar no Firestore:', err);
      addToast('Erro ao salvar no Firestore.', 'error');
    } finally {
      setIsSavingFirestore(false);
    }
  };

  // Webhooks state
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [apiInfo, setApiInfo] = useState<any>(null);

  const [webhooks, setWebhooks] = useState<WebhookItem[]>([
    {
      id: 'wh_ceop_1',
      name: 'Webhook Lead Master HMAC (CEOP)',
      segment: 'ceop',
      url: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/ceop/master`,
      source: 'CEOP Central',
      status: 'active',
      lastTriggered: 'Ativo (Pronto para receber)',
      secretToken: 'whsec_ceop_master_98765'
    },
    {
      id: 'wh_ceop_2',
      name: 'Meta Ads CEOP (Facebook & Insta Central)',
      segment: 'ceop',
      url: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/ceop/meta`,
      source: 'Meta Ads CEOP',
      status: 'active',
      lastTriggered: 'Ativo (Conectado)',
      secretToken: 'whsec_ceop_meta_ads'
    },
    {
      id: 'wh_ceop_3',
      name: 'Google Lead Forms CEOP',
      segment: 'ceop',
      url: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/ceop/google`,
      source: 'Google Ads CEOP',
      status: 'active',
      lastTriggered: 'Ativo (Conectado)',
      secretToken: 'whsec_ceop_gads'
    },
    {
      id: 'wh_odonto_1',
      name: 'Webhook Confirmação Dental (Clinicorp)',
      segment: 'odontologia',
      url: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/odonto/clinicorp`,
      source: 'Clinicorp Dental',
      status: 'active',
      lastTriggered: 'Ativo (Pronto para receber)',
      secretToken: 'whsec_clinicorp_sync'
    },
    {
      id: 'wh_odonto_2',
      name: 'Simples Dental Webhook (Prontuário & Agenda)',
      segment: 'odontologia',
      url: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/odonto/simplesdental`,
      source: 'Simples Dental',
      status: 'active',
      lastTriggered: 'Ativo (Pronto para receber)',
      secretToken: 'whsec_simples_dental'
    }
  ]);

  const loadWebhookLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await crmApiClient.getWebhookLogs();
      setWebhookLogs(logs);
      const info = await crmApiClient.getApiInfo();
      setApiInfo(info);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'webhooks') {
      loadWebhookLogs();
    }
  }, [activeTab]);

  const handleTestWebhook = async (wh: WebhookItem) => {
    addToast(`Disparando webhook de teste para ${wh.name}...`, 'info');
    const result = await crmApiClient.sendTestWebhook(wh.source, {
      nome: 'Lead Teste Conectividade',
      telefone: '(11) 99888-7766',
      email: 'lead.teste@sistema.com.br',
      procedimento: wh.segment === 'ceop' ? 'Atendimento CEOP' : 'Avaliação Odontológica',
      origem: `Webhook Teste (${wh.name})`,
      observacao: 'Lead gerado pelo testador de Webhook'
    });

    if (result.success) {
      addToast(`Webhook processado com sucesso! Lead "${result.lead?.name}" cadastrado!`, 'success');
      loadWebhookLogs();
    } else {
      addToast(`Erro ao testar webhook: ${result.message || 'Falha no servidor'}`, 'error');
    }
  };

  const handleClearLogs = async () => {
    await crmApiClient.clearWebhookLogs();
    setWebhookLogs([]);
    addToast('Logs de webhooks limpos.', 'success');
  };

  const [isNewWebhookModal, setIsNewWebhookModal] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookSource, setNewWebhookSource] = useState('Central CEOP');

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    addToast('URL do Webhook copiada!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookName.trim()) return;
    const token = 'sec_' + Math.random().toString(36).substring(2, 10);
    const newWh: WebhookItem = {
      id: 'wh_' + Date.now(),
      name: newWebhookName,
      segment: selectedSegment === 'ceop' ? 'ceop' : 'odontologia',
      url: `https://api.crm.com/v1/webhook?token=${token}`,
      source: newWebhookSource,
      status: 'active',
      lastTriggered: 'Nunca',
      secretToken: token
    };
    const updated = [newWh, ...webhooks];
    setWebhooks(updated);
    setNewWebhookName('');
    setIsNewWebhookModal(false);
    addToast('Webhook criado com sucesso!', 'success');
  };

  const isGoogleConnected = Boolean(googleUser && isTokenValid);

  // All Master Integrations with Context Segment Tagging
  const allIntegrations: Integration[] = [
    // CEOP Context Integrations
    {
      id: 'ceop_whatsapp_bot',
      name: 'WhatsApp Bot & Disparos (CEOP Central)',
      segment: 'ceop',
      category: 'communication',
      description: 'Centralização de mensagens, distribuição de leads para operadores e atendimento automatizado CEOP.',
      status: 'connected',
      lastSync: 'Em tempo real (CEOP)',
      logo: <MessageSquare className="text-emerald-500" size={24} />
    },
    {
      id: 'ceop_webhook_hmac',
      name: 'Master Webhook HMAC (CEOP CRM)',
      segment: 'ceop',
      category: 'webhooks',
      description: 'Endpoint HMAC criptografado para recepção unificada de leads e eventos comerciais da Central CEOP.',
      status: 'connected',
      lastSync: 'Pronto para receber',
      logo: <Webhook className="text-purple-500" size={24} />
    },
    {
      id: 'ceop_voip_pabx',
      name: 'Central Telefônica VoIP & Gravador (CEOP)',
      segment: 'ceop',
      category: 'telephony',
      description: 'Integração PABX IP com registro de chamadas receptivas/ativas e métricas de tempo de atendimento.',
      status: 'connected',
      lastSync: 'Conectado (Central CEOP)',
      logo: <PhoneCall className="text-amber-500" size={24} />
    },
    {
      id: 'ceop_meta_ads',
      name: 'Meta Ads Central (Facebook & Insta CEOP)',
      segment: 'ceop',
      category: 'marketing',
      description: 'Captação direta de anúncios da Central CEOP e distribuição inteligente para a equipe de atendimento.',
      status: 'connected',
      lastSync: 'Há 4 minutos',
      logo: <Globe className="text-blue-500" size={24} />
    },
    {
      id: 'ceop_sms_email',
      name: 'Disparador SMS & E-mail Marketing CEOP',
      segment: 'ceop',
      category: 'communication',
      description: 'Régua de mensagens para nutrição de leads, pesquisas de satisfação e avisos operacionais.',
      status: 'connected',
      lastSync: 'Há 15 minutos',
      logo: <Cloud className="text-sky-500" size={24} />
    },

    // Odontologia / Clinic Context Integrations
    {
      id: 'clinicorp',
      name: 'Clinicorp Dental',
      segment: 'odontologia',
      category: 'healthcare',
      description: 'Gestão odontológica completa com sincronização de prontuários eletrônicos, orçamentos e agenda de dentistas.',
      status: 'connected',
      lastSync: 'Há 3 minutos (Unidade Dental)',
      logo: <Database className="text-blue-600" size={24} />
    },
    {
      id: 'simples_dental',
      name: 'Simples Dental',
      segment: 'odontologia',
      category: 'healthcare',
      description: 'Sincronização de fichas clínicas, anamneses, agendamentos e orçamentos do Simples Dental.',
      status: 'connected',
      lastSync: 'Agente Dental Conectado (Há 5s)',
      logo: <Database className="text-emerald-600" size={24} />
    },
    {
      id: 'google_calendar',
      name: 'Google Calendar (Agenda Odontológica)',
      segment: 'odontologia',
      category: 'calendar',
      description: 'Sincronização bidirecional em tempo real com consultórios, cadeiras e calendários de odontólogos.',
      status: isGoogleConnected ? 'connected' : 'disconnected',
      lastSync: syncSettings.lastSyncAt 
        ? `Hoje às ${new Date(syncSettings.lastSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` 
        : 'Aguardando sincronização',
      logo: <Calendar className="text-blue-500" size={24} />
    },
    {
      id: 'whatsapp_clinic_local',
      name: 'WhatsApp da Clínica Dental (Local)',
      segment: 'odontologia',
      category: 'communication',
      description: 'Notificações diretas da clínica para confirmação presencial de consultas e lembretes de retorno.',
      status: 'connected',
      lastSync: 'Em tempo real',
      logo: <MessageSquare className="text-emerald-500" size={24} />
    },
    {
      id: 'pacs_radiology',
      name: 'Radiologia & PACS Odontológico',
      segment: 'odontologia',
      category: 'healthcare',
      description: 'Anexo e visualização de panorâmicas, tomografias e laudos odontológicos direto no cadastro do paciente.',
      status: 'connected',
      lastSync: 'Conectado PACS',
      logo: <Database className="text-indigo-500" size={24} />
    }
  ];

  // Filtered Integrations based on Segment Scope
  const filteredIntegrations = allIntegrations.filter(i => {
    if (selectedSegment === 'all') return true;
    return i.segment === selectedSegment || i.segment === 'both';
  });

  // Filtered Webhooks based on Segment Scope
  const filteredWebhooks = webhooks.filter(w => {
    if (selectedSegment === 'all') return true;
    return w.segment === selectedSegment || w.segment === 'both';
  });

  const handleSync = (id: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
      addToast('Sincronização concluída com sucesso!', 'success');
    }, 1200);
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Isolamento de Contexto & Conectividade
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Centro de Integrações
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie as conexões de API, webhooks e sincronizações filtradas exclusivamente pelo contexto ativo.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl flex-wrap">
          <button 
            onClick={() => setActiveTab('integrations')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer", 
              activeTab === 'integrations' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            <Database size={13} />
            <span>Integrações</span>
          </button>

          <button 
            onClick={() => setActiveTab('webhooks')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer", 
              activeTab === 'webhooks' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            <Webhook size={13} />
            <span>Webhooks</span>
          </button>

          <button 
            onClick={() => setActiveTab('simples_dental')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer", 
              activeTab === 'simples_dental' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            <Database size={13} className="text-emerald-500" />
            <span>Simples Dental</span>
          </button>

          <button 
            onClick={() => setActiveTab('clinicorp')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer", 
              activeTab === 'clinicorp' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            <Database size={13} className="text-blue-500" />
            <span>Clinicorp (CEOP)</span>
          </button>

          <button 
            onClick={() => setActiveTab('supabase')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer", 
              activeTab === 'supabase' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            <Cloud size={13} className="text-emerald-500" />
            <span>Supabase DB</span>
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer", 
              activeTab === 'settings' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            <Settings size={13} />
            <span>Google Agenda</span>
          </button>

          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer", 
              activeTab === 'history' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            <History size={13} />
            <span>Logs & Histórico</span>
          </button>
        </div>
      </div>

      {/* Segment Isolation Switcher Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
            <Filter size={18} />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Isolamento por Segmento & Contexto</span>
              <span className="text-[10px] font-normal text-slate-400 lowercase">(Apenas o que pertence ao contexto ativo é carregado)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedSegment === 'ceop' && 'Exibindo unicamente as integrações e webhooks da Central Operacional CEOP.'}
              {selectedSegment === 'odontologia' && 'Exibindo unicamente as integrações de Odontologia, Clinicorp e sistemas dentais.'}
              {selectedSegment === 'all' && 'Exibindo visão consolidada de todas as integrações cadastradas.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl self-stretch md:self-auto shrink-0">
          <button
            onClick={() => setSelectedSegment('ceop')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer flex-1 md:flex-none justify-center",
              selectedSegment === 'ceop' 
                ? "bg-amber-500 text-slate-950 shadow-sm" 
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
            )}
          >
            <PhoneCall size={14} />
            <span>🏢 Contexto CEOP</span>
          </button>

          <button
            onClick={() => setSelectedSegment('odontologia')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer flex-1 md:flex-none justify-center",
              selectedSegment === 'odontologia' 
                ? "bg-blue-600 text-white shadow-sm" 
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
            )}
          >
            <Database size={14} />
            <span>🦷 Odontologia & Clínicas</span>
          </button>

          <button
            onClick={() => setSelectedSegment('all')}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-1 md:flex-none justify-center",
              selectedSegment === 'all' 
                ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <span>Todas</span>
          </button>
        </div>
      </div>

      {/* 1. TAB: INTEGRAÇÕES */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Quick Info Box */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>Garantia de Isolamento:</strong> Se você está no segmento <strong>{selectedSegment === 'ceop' ? 'CEOP' : selectedSegment === 'odontologia' ? 'Odontologia' : 'Geral'}</strong>, os tokens, webhooks e sincronizações operam exclusivamente para essa camada.
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 shrink-0">
              {filteredIntegrations.length} Conexão(ões)
            </span>
          </div>

          {/* Integration Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((item) => (
              <div 
                key={item.id} 
                onClick={() => {
                  if (item.id === 'clinicorp') setActiveTab('clinicorp');
                  if (item.id === 'simples_dental') setActiveTab('simples_dental');
                }}
                className={cn(
                  "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 transition-all",
                  (item.id === 'clinicorp' || item.id === 'simples_dental') && "cursor-pointer hover:border-blue-400 dark:hover:border-blue-700"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                      {item.logo}
                    </div>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                      item.segment === 'ceop' 
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    )}>
                      {item.segment === 'ceop' ? 'CEOP' : 'Odontologia'}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Status:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Ativo
                    </span>
                  </div>

                  <button
                    onClick={() => handleSync(item.id)}
                    disabled={syncingId === item.id}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw size={14} className={syncingId === item.id ? "animate-spin text-blue-600" : ""} />
                    <span>{syncingId === item.id ? 'Sincronizando...' : 'Testar Conexão'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. TAB: WEBHOOKS */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Webhooks de Entrada ({selectedSegment === 'ceop' ? 'CEOP Central' : selectedSegment === 'odontologia' ? 'Odontologia' : 'Geral'})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Endpoints de recebimento imediato de leads e agendamentos via POST JSON.
              </p>
            </div>
            <button
              onClick={() => setIsNewWebhookModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-200 dark:shadow-none flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>Criar Webhook</span>
            </button>
          </div>

          <div className="space-y-4">
            {filteredWebhooks.map((wh) => (
              <div key={wh.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider",
                      wh.segment === 'ceop' ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    )}>
                      {wh.segment === 'ceop' ? 'CEOP' : 'Odontologia'}
                    </span>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{wh.name}</h4>
                  </div>
                  <button
                    onClick={() => handleTestWebhook(wh)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <Terminal size={13} />
                    <span>Disparar Teste</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate flex-1">{wh.url}</span>
                  <button
                    onClick={() => handleCopyUrl(wh.url, wh.id)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedId === wh.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedId === wh.id ? 'Copiado!' : 'Copiar URL'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. TAB: SIMPLES DENTAL */}
      {activeTab === 'simples_dental' && <SimplesDentalConfigPanel onBack={() => setActiveTab('integrations')} />}

      {/* CLINICORP PANEL */}
      {activeTab === 'clinicorp' && <ClinicorpConfigPanel onBack={() => setActiveTab('integrations')} />}

      {/* SUPABASE PANEL */}
      {activeTab === 'supabase' && <SupabaseConfigPanel onBack={() => setActiveTab('integrations')} />}

      {/* 4. TAB: GOOGLE SETTINGS */}
      {activeTab === 'settings' && <GoogleIntegrationSettingsPanel />}

      {/* 5. TAB: MAPEMENTO GOOGLE */}
      {activeTab === 'mapping' && <GoogleCalendarMappingPanel />}

      {/* 6. TAB: HISTORICO DE SYNC */}
      {activeTab === 'history' && <SyncHistoryTab />}
    </div>
  );
}
