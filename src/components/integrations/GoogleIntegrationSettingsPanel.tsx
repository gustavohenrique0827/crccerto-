import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Clock, 
  ShieldCheck, 
  User as UserIcon, 
  LogOut, 
  Settings, 
  ExternalLink, 
  Bell, 
  Sparkles, 
  Check, 
  AlertTriangle, 
  Zap, 
  Info,
  Sliders,
  Building2,
  Lock,
  ArrowRightLeft,
  CalendarCheck,
  Cloud,
  Loader2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  googleSignIn, 
  googleLogout, 
  getAccessToken, 
  isAccessTokenValid,
  initAuth,
  auth
} from '../../lib/googleAuth';
import { 
  getGoogleSyncSettings, 
  saveGoogleSyncSettings, 
  DEFAULT_SYNC_INTERVALS, 
  GoogleSyncSettings,
  formatIntervalLabel
} from '../../lib/googleSyncSettings';
import { 
  saveClinicSyncIntervalToFirestore, 
  fetchClinicSyncSettingsFromFirestore 
} from '../../lib/firestoreClinicSettings';
import { listCalendarEvents, performBidirectionalSync } from '../../lib/googleCalendar';
import { cn } from '../../lib/utils';
import { User } from 'firebase/auth';

interface GoogleIntegrationSettingsPanelProps {
  onNavigateToMapping?: () => void;
  onNavigateToHistory?: () => void;
}

export default function GoogleIntegrationSettingsPanel({
  onNavigateToMapping,
  onNavigateToHistory
}: GoogleIntegrationSettingsPanelProps) {
  const { currentClinic, clinics, addToast, user } = useApp();
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    eventsCount?: number;
    latencyMs?: number;
    message?: string;
  } | null>(null);

  // Sync settings state
  const [settings, setSettings] = useState<GoogleSyncSettings>(() => 
    getGoogleSyncSettings(currentClinic?.id)
  );
  const [isCustomInterval, setIsCustomInterval] = useState(false);
  const [customMinutes, setCustomMinutes] = useState<number>(15);
  const [isSaved, setIsSaved] = useState(false);
  const [isSavingFirestore, setIsSavingFirestore] = useState(false);
  const [firestoreSavedAt, setFirestoreSavedAt] = useState<string | null>(() => {
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

  // Update settings when clinic changes
  useEffect(() => {
    if (currentClinic) {
      const loaded = getGoogleSyncSettings(currentClinic.id);
      setSettings(loaded);
      const isPreset = DEFAULT_SYNC_INTERVALS.some(p => p.value === loaded.syncIntervalMinutes);
      setIsCustomInterval(!isPreset);
      setCustomMinutes(loaded.syncIntervalMinutes);

      // Also check Firestore for the clinic's persisted settings
      const loadFirestore = async () => {
        try {
          const fsSettings = await fetchClinicSyncSettingsFromFirestore(currentClinic.id);
          if (fsSettings) {
            setSettings(fsSettings);
            const isPresetFs = DEFAULT_SYNC_INTERVALS.some(p => p.value === fsSettings.syncIntervalMinutes);
            setIsCustomInterval(!isPresetFs);
            setCustomMinutes(fsSettings.syncIntervalMinutes);
          }
        } catch (e) {
          console.error('Erro ao buscar configurações no Firestore:', e);
        }
      };
      loadFirestore();
    }
  }, [currentClinic?.id]);

  // Auth observer
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        setCurrentUser(auth.currentUser);
        setAccessToken(null);
      }
    );

    const onTokenExpired = () => {
      setAccessToken(null);
    };

    const onTokenUpdated = (e: any) => {
      if (e.detail) {
        setAccessToken(e.detail);
      }
    };

    window.addEventListener('crm_google_token_expired', onTokenExpired);
    window.addEventListener('crm_google_token_updated', onTokenUpdated);

    // Check token immediately
    getAccessToken().then(token => {
      if (token && isAccessTokenValid()) {
        setAccessToken(token);
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener('crm_google_token_expired', onTokenExpired);
      window.removeEventListener('crm_google_token_updated', onTokenUpdated);
    };
  }, []);

  // Handle Google Sign In
  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setConnectionTestResult(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
        addToast(`Conta Google conectada com sucesso (${result.user.displayName || result.user.email})!`, 'success');
        
        // Quick auto test
        testGoogleConnection(result.accessToken);
      }
    } catch (err: any) {
      console.error('Falha na autenticação Google:', err);
      addToast('Não foi possível concluir a autenticação com o Google: ' + (err.message || 'Tente novamente'), 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Google Sign Out
  const handleSignOut = async () => {
    try {
      await googleLogout();
      setCurrentUser(null);
      setAccessToken(null);
      setConnectionTestResult(null);
      addToast('Conta do Google Calendar desconectada com sucesso.', 'info');
    } catch (err: any) {
      console.error('Erro ao desconectar Google:', err);
      addToast('Erro ao desconectar: ' + err.message, 'error');
    }
  };

  // Test live connection to Google Calendar API
  const testGoogleConnection = async (tokenOverride?: string) => {
    const token = tokenOverride || accessToken;
    if (!token) {
      addToast('Autentique sua conta Google antes de testar a conexão.', 'error');
      return;
    }

    setIsTestingConnection(true);
    setConnectionTestResult(null);
    const start = performance.now();

    try {
      const events = await listCalendarEvents(token);
      const latency = Math.round(performance.now() - start);
      setConnectionTestResult({
        success: true,
        eventsCount: events.length,
        latencyMs: latency,
        message: `Comunicação estabelecida com sucesso! ${events.length} compromissos encontrados na agenda Google (${latency}ms).`
      });
      addToast(`Conexão com Google Calendar verificada com sucesso (${latency}ms)!`, 'success');
    } catch (err: any) {
      console.error('Erro no teste de conexão Google Calendar:', err);
      setConnectionTestResult({
        success: false,
        message: err.message || 'Falha ao comunicar com a API do Google Calendar.'
      });
      addToast('Falha no teste de conexão: ' + (err.message || 'Verifique as permissões'), 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Trigger immediate synchronization
  const handleSyncNow = async () => {
    if (!accessToken) {
      addToast('Autentique sua conta Google antes de sincronizar.', 'error');
      return;
    }

    setIsSyncingNow(true);
    try {
      // Load current appointments from localStorage
      let localAppointments: any[] = [];
      try {
        const raw = localStorage.getItem('crm_appointments_data');
        if (raw) localAppointments = JSON.parse(raw);
      } catch (e) {}

      const result = await performBidirectionalSync(accessToken, localAppointments, {
        defaultClinicId: currentClinic?.id || '1',
        defaultClinicName: currentClinic?.name || 'Clínica Principal'
      });

      // Update last sync time
      const now = new Date();
      const updated = {
        ...settings,
        lastSyncAt: now.toISOString(),
        nextScheduledSyncAt: settings.autoSyncEnabled ? new Date(now.getTime() + settings.syncIntervalMinutes * 60000).toISOString() : null
      };
      setSettings(updated);
      saveGoogleSyncSettings(updated);

      addToast(
        `Sincronização concluída! ${result.updatedCount} evento(s) sincronizado(s) e ${result.importedCount} importado(s) para a clínica.`,
        'success'
      );
    } catch (err: any) {
      console.error('Erro na sincronização imediata:', err);
      addToast('Erro na sincronização: ' + (err.message || 'Tente novamente'), 'error');
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Save changes
  const handleSaveSettings = async () => {
    setIsSavingFirestore(true);
    const intervalMinutes = isCustomInterval ? Math.max(1, Math.min(1440, customMinutes)) : settings.syncIntervalMinutes;
    
    const updated: GoogleSyncSettings = {
      ...settings,
      syncIntervalMinutes: intervalMinutes,
      clinicId: currentClinic?.id || '1',
      clinicName: currentClinic?.name || 'Clínica Principal',
    };

    setSettings(updated);
    saveGoogleSyncSettings(updated);

    try {
      const res = await saveClinicSyncIntervalToFirestore(
        currentClinic?.id || '1',
        currentClinic?.name || 'Clínica Principal',
        intervalMinutes,
        settings.autoSyncEnabled,
        user?.email || user?.name || 'Administrador'
      );
      if (res.success) {
        const timeStr = new Date(res.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setFirestoreSavedAt(timeStr);
        addToast('Configurações salvas e gravadas no Firestore da clínica com sucesso!', 'success');
      } else {
        addToast('Configurações salvas localmente. Aviso: ' + (res.error || 'Aguardando Firestore'), 'info');
      }
    } catch (err: any) {
      console.error('Erro ao gravar no Firestore:', err);
      addToast('Erro ao gravar no Firestore: ' + (err.message || 'Falha de comunicação'), 'error');
    } finally {
      setIsSavingFirestore(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  // Preset interval change
  const handleSelectPreset = (value: number) => {
    setIsCustomInterval(false);
    setSettings(prev => ({ ...prev, syncIntervalMinutes: value }));
  };

  const isConnected = Boolean(currentUser && accessToken && isAccessTokenValid());

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Actions Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/40">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Configurações da Integração Google Calendar
                {isConnected && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    AUTENTICADO
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Autentique a conta Google e estabeleça o intervalo de sincronização automática para a agenda da sua clínica.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          {isSavingFirestore ? (
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1.5 animate-pulse">
              <Loader2 size={13} className="animate-spin" />
              Gravando no Firestore...
            </span>
          ) : firestoreSavedAt ? (
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5" title="Preferência gravada nas configurações da clínica no Firestore">
              <Cloud size={14} />
              Firestore ({firestoreSavedAt})
            </span>
          ) : null}

          <button
            onClick={handleSyncNow}
            disabled={!isConnected || isSyncingNow}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs",
              isConnected 
                ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
            )}
            title={!isConnected ? "Conecte sua conta Google primeiro" : "Disparar sincronização bidirecional agora"}
          >
            <RefreshCw size={14} className={cn(isSyncingNow && "animate-spin text-blue-600")} />
            <span>{isSyncingNow ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={isSavingFirestore}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {isSavingFirestore ? (
              <Loader2 size={15} className="animate-spin" />
            ) : isSaved ? (
              <Check size={15} />
            ) : (
              <Settings size={15} />
            )}
            <span>{isSavingFirestore ? 'Salvando...' : isSaved ? 'Salvo no Firestore!' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: 1. Authentication & Account Management (1 col) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Card: Autenticação Google OAuth */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <ShieldCheck size={18} className="text-blue-600" />
                <span>Autenticação de Conta</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OAuth 2.0</span>
            </div>

            {isConnected && currentUser ? (
              <div className="space-y-4">
                {/* User Info Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/60 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center gap-3">
                    {currentUser.photoURL ? (
                      <img 
                        src={currentUser.photoURL} 
                        alt={currentUser.displayName || 'Google User'} 
                        className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-sm object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                        {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'G'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.displayName || 'Usuário Google'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">Status da Permissão:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      calendar.events (Ativo)
                    </span>
                  </div>
                </div>

                {/* Connection Test Results */}
                {connectionTestResult && (
                  <div className={cn(
                    "p-3.5 rounded-xl text-xs flex items-start gap-2.5 border",
                    connectionTestResult.success 
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                  )}>
                    {connectionTestResult.success ? (
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                    )}
                    <div className="space-y-0.5 leading-relaxed">
                      <span className="font-bold block">
                        {connectionTestResult.success ? 'Conexão Operacional' : 'Erro de Comunicação'}
                      </span>
                      <span>{connectionTestResult.message}</span>
                    </div>
                  </div>
                )}

                {/* Auth Actions */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => testGoogleConnection()}
                    disabled={isTestingConnection}
                    className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-blue-200 dark:border-blue-900/60"
                  >
                    <RefreshCw size={13} className={cn(isTestingConnection && "animate-spin")} />
                    <span>{isTestingConnection ? 'Verificando API...' : 'Testar Conexão com Google'}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleSignIn}
                      disabled={isAuthenticating}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold transition-all text-center"
                    >
                      Trocar Conta
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <LogOut size={12} />
                      <span>Desconectar</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center py-2">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto shadow-inner border border-blue-100 dark:border-blue-900/50">
                  <svg className="w-8 h-8" viewBox="0 0 48 48">
                    <path fill="#4285F4" d="M38 44H10c-3.3 0-6-2.7-6-6V10c0-3.3 2.7-6 6-6h28c3.3 0 6 2.7 6 6v28c0 3.3-2.7 6-6 6z"/>
                    <path fill="#FFF" d="M35 14H13c-1.1 0-2 .9-2 2v20c0 1.1.9 2 2 2h22c1.1 0 2-.9 2-2V16c0-1.1-.9-2-2-2zm-9 19h-8v-3h8v3zm8-6H14v-3h20v3zm0-6H14v-3h20v3z"/>
                  </svg>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Nenhuma conta vinculada</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                    Conecte a conta do Google da clínica ou do profissional responsável para ativar a sincronização em tempo real.
                  </p>
                </div>

                <button
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                >
                  {isAuthenticating ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Abrindo autenticação Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Autenticar Conta Google</span>
                    </>
                  )}
                </button>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 text-left flex gap-2">
                  <Lock size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <span>Acesso restrito apenas aos eventos do calendário. Não temos acesso aos seus e-mails ou arquivos.</span>
                </div>
              </div>
            )}
          </div>

          {/* Clinic Information Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm pb-3 border-b border-slate-100 dark:border-slate-800">
              <Building2 size={18} className="text-blue-600" />
              <span>Clínica Vinculada</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {currentClinic?.name || 'Clínica Principal'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  {currentClinic?.code || 'UNIDADE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentClinic?.address || 'Endereço não configurado'}
              </p>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={settings.applyToAllClinics}
                  onChange={(e) => setSettings(prev => ({ ...prev, applyToAllClinics: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Aplicar este intervalo para todas as clínicas da rede
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Replica as regras de sincronização para todas as unidades autorizadas.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: 2. Automatic Sync Interval & Direction Settings (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card: Intervalo de Sincronização Automática */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                  <Clock size={20} className="text-blue-600" />
                  <span>Intervalo de Sincronização Automática</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Defina a frequência com que o CRM consulta o Google Agenda e atualiza consultas da clínica.
                </p>
              </div>

              {/* Master AutoSync Toggle */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  checked={settings.autoSyncEnabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoSyncEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.autoSyncEnabled ? (
              <div className="space-y-6">
                {/* Quick Dropdown Selector for Sync Interval */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="settings-interval-dropdown" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-600" />
                      <span>Seletor de Frequência de Sincronização (Dropdown)</span>
                    </label>
                    {firestoreSavedAt ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1" title="Persistido no Firestore">
                        <Cloud size={11} />
                        Firestore ({firestoreSavedAt})
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Cloud size={11} />
                        Persistência Firestore
                      </span>
                    )}
                  </div>
                  <select
                    id="settings-interval-dropdown"
                    value={isCustomInterval ? -1 : settings.syncIntervalMinutes}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val === -1) {
                        setIsCustomInterval(true);
                      } else {
                        setIsCustomInterval(false);
                        setSettings(prev => ({ ...prev, syncIntervalMinutes: val }));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value={5}>⚡ 5 minutos - Alto fluxo / Tempo real</option>
                    <option value={10}>⏱️ 10 minutos - Frequente</option>
                    <option value={15}>⭐ 15 minutos - Padrão Recomendado</option>
                    <option value={30}>🌱 30 minutos - Moderado / Economia de recursos</option>
                    <option value={60}>🕒 60 minutos (1 hora) - Baixo fluxo</option>
                    <option value={120}>⏳ 120 minutos (2 horas)</option>
                    <option value={-1}>✏️ Personalizado (Digitar minutos)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Você pode escolher pelo menu suspenso ou pelos cartões ilustrativos abaixo.
                  </p>
                </div>

                {/* Interval Presets */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Ou selecione um dos cartões rápidos
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {DEFAULT_SYNC_INTERVALS.map((preset) => {
                      const isSelected = !isCustomInterval && settings.syncIntervalMinutes === preset.value;
                      return (
                        <div
                          key={preset.value}
                          onClick={() => handleSelectPreset(preset.value)}
                          className={cn(
                            "p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between",
                            isSelected
                              ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {preset.label}
                            </span>
                            <div className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center border transition-all",
                              isSelected 
                                ? "bg-blue-600 border-blue-600 text-white" 
                                : "border-slate-300 dark:border-slate-600"
                            )}>
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                            {preset.description}
                          </p>
                        </div>
                      );
                    })}

                    {/* Custom Interval Card */}
                    <div
                      onClick={() => setIsCustomInterval(true)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between",
                        isCustomInterval
                          ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          Personalizado
                        </span>
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center border transition-all",
                          isCustomInterval 
                            ? "bg-blue-600 border-blue-600 text-white" 
                            : "border-slate-300 dark:border-slate-600"
                        )}>
                          {isCustomInterval && <Check size={10} strokeWidth={3} />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Digite um intervalo em minutos (1 a 1440 min).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Custom Input Field */}
                {isCustomInterval && (
                  <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div>
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                        Intervalo Customizado em Minutos:
                      </span>
                      <span className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                        O CRM agendará checagens automáticas com o Google Calendar periodicamente.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="1"
                        max="1440"
                        value={customMinutes}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setCustomMinutes(val);
                          setSettings(prev => ({ ...prev, syncIntervalMinutes: val }));
                        }}
                        className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white text-center focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-200">minutos</span>
                    </div>
                  </div>
                )}

                {/* Live Status and Next Sync Calculation Banner */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Intervalo Ativo
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-600" />
                      {formatIntervalLabel(isCustomInterval ? customMinutes : settings.syncIntervalMinutes)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Última Sincronização
                    </span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {settings.lastSyncAt ? new Date(settings.lastSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Nenhum registro ainda'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Próxima Execução
                    </span>
                    <p className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <Sparkles size={13} />
                      {settings.nextScheduledSyncAt 
                        ? new Date(settings.nextScheduledSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
                        : `Em aprox. ${isCustomInterval ? customMinutes : settings.syncIntervalMinutes} min`}
                    </p>
                  </div>
                </div>

                {/* Instant Sync Option on Creation */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-500" />
                      Sincronização Instantânea ao Salvar Consultas
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Quando um recepcionista ou dentista agendar ou alterar uma consulta no CRM, sincronizar imediatamente sem aguardar o próximo ciclo do intervalo.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={settings.autoSyncOnCreate}
                      onChange={(e) => setSettings(prev => ({ ...prev, autoSyncOnCreate: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Sincronização Automática Desativada
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300/80 max-w-md mx-auto">
                  A agenda do Google não será atualizada em segundo plano. As sincronizações deverão ser acionadas manualmente através do botão &ldquo;Sincronizar Agora&rdquo;.
                </p>
              </div>
            )}
          </div>

          {/* Card: Direção e Tratamento de Conflitos */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                  <ArrowRightLeft size={20} className="text-blue-600" />
                  <span>Direção e Políticas da Sincronização</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure como os dados trafegam entre o CRM da clínica e a nuvem do Google.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { 
                  id: 'bidirectional', 
                  title: 'Bidirecional', 
                  subtitle: 'CRM ↔ Google Agenda', 
                  desc: 'Recomendado. Cria, edita e cancela consultas em ambas as plataformas.' 
                },
                { 
                  id: 'crm_to_google', 
                  title: 'Apenas Envio', 
                  subtitle: 'CRM → Google Agenda', 
                  desc: 'Exporta as consultas do CRM para o Google, mas ignora alterações feitas no Google.' 
                },
                { 
                  id: 'google_to_crm', 
                  title: 'Apenas Importação', 
                  subtitle: 'Google Agenda → CRM', 
                  desc: 'Puxa eventos do Google para o CRM como agendamentos da clínica.' 
                }
              ].map((dir) => {
                const isSelected = settings.syncDirection === dir.id;
                return (
                  <div
                    key={dir.id}
                    onClick={() => setSettings(prev => ({ ...prev, syncDirection: dir.id as any }))}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between",
                      isSelected
                        ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{dir.title}</span>
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center border",
                          isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"
                        )}>
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mb-1">
                        {dir.subtitle}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {dir.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Conflict Strategy and External Events */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Política de Resolução de Conflitos
                </label>
                <select
                  value={settings.conflictResolution}
                  onChange={(e) => setSettings(prev => ({ ...prev, conflictResolution: e.target.value as any }))}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="prefer_crm">Priorizar CRM (Autoridade médica/recepção)</option>
                  <option value="prefer_google">Priorizar Google Agenda (Última alteração do médico)</option>
                  <option value="notify_both">Sinalizar conflito para resolução manual</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  Determina qual dado prevalece caso o mesmo horário seja editado simultaneamente.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Agenda Alvo do Google
                </label>
                <select
                  value={settings.targetCalendarId}
                  onChange={(e) => setSettings(prev => ({ ...prev, targetCalendarId: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="primary">Agenda Principal da Conta (Primary)</option>
                  <option value="clinic_dedicated">Agenda Dedicada ({currentClinic?.name || 'Clínica'})</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  Destino padrão onde as consultas da clínica serão criadas.
                </p>
              </div>
            </div>

            {/* Quick Links to Mapping and History */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Precisa personalizar os campos dos eventos ou auditar logs?
              </span>
              <div className="flex items-center gap-2">
                {onNavigateToMapping && (
                  <button
                    onClick={onNavigateToMapping}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <Sliders size={12} />
                    Mapeamento de Campos
                  </button>
                )}
                {onNavigateToHistory && (
                  <button
                    onClick={onNavigateToHistory}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <Clock size={12} />
                    Auditoria & Histórico
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
