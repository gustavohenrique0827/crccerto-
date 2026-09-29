import { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  X, 
  ExternalLink, 
  Clock, 
  Sparkles,
  Layers,
  ArrowRight,
  LogOut,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  googleSignIn, 
  googleLogout, 
  getAccessToken,
  initAuth,
  auth,
  isAccessTokenValid
} from '../../lib/googleAuth';
import { 
  listCalendarEvents, 
  syncAppointmentsToGoogle, 
  performBidirectionalSync,
  GoogleCalendarEvent 
} from '../../lib/googleCalendar';
import { getCalendarFieldMapping, saveCalendarFieldMapping } from '../../lib/googleCalendarMapping';
import { User } from 'firebase/auth';

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: any[];
  onImportAppointments?: (newApts: any[]) => void;
  onDisconnect?: () => void;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
  clinicId?: string;
  clinicName?: string;
}

export default function GoogleCalendarSyncModal({
  isOpen,
  onClose,
  appointments,
  onImportAppointments,
  onDisconnect,
  onToast,
  clinicId,
  clinicName
}: GoogleCalendarSyncModalProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBidirectionalSyncing, setIsBidirectionalSyncing] = useState(false);
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [recentGoogleEvents, setRecentGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    return localStorage.getItem('google_calendar_autosync') === 'true';
  });
  const [twoWayEnabled, setTwoWayEnabled] = useState(() => {
    return getCalendarFieldMapping().twoWaySyncEnabled;
  });
  const [syncStats, setSyncStats] = useState<{ lastSync: string | null; syncedCount: number }>({
    lastSync: localStorage.getItem('google_calendar_last_sync'),
    syncedCount: Number(localStorage.getItem('google_calendar_synced_count') || 0)
  });

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        fetchEvents(token);
      },
      () => {
        const currentUserInAuth = auth.currentUser;
        if (currentUserInAuth) {
          setCurrentUser(currentUserInAuth);
        } else {
          setCurrentUser(null);
        }
        setAccessToken(null);
      }
    );

    const onTokenExpired = () => {
      setAccessToken(null);
      setRecentGoogleEvents([]);
    };
    const onTokenUpdated = (e: any) => {
      if (e.detail) {
        setAccessToken(e.detail);
        fetchEvents(e.detail);
      }
    };

    window.addEventListener('crm_google_token_expired', onTokenExpired);
    window.addEventListener('crm_google_token_updated', onTokenUpdated);

    return () => {
      unsubscribe();
      window.removeEventListener('crm_google_token_expired', onTokenExpired);
      window.removeEventListener('crm_google_token_updated', onTokenUpdated);
    };
  }, []);

  const fetchEvents = async (token: string) => {
    if (!token) return;
    setIsFetchingEvents(true);
    try {
      const events = await listCalendarEvents(token);
      setRecentGoogleEvents(events.slice(0, 10));
    } catch (err: any) {
      console.warn('Google Calendar fetchEvents aviso:', err?.message);
      if (err?.message?.includes('expirou') || err?.message?.includes('inválida') || err?.message?.includes('401') || err?.message?.includes('credentials')) {
        setAccessToken(null);
        setRecentGoogleEvents([]);
      }
    } finally {
      setIsFetchingEvents(false);
    }
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
        onToast(`Conectado com sucesso como ${result.user.displayName || result.user.email}! Carregando seus eventos para a agenda...`, 'success');
        fetchEvents(result.accessToken);
        // Automatically sync & load Google Calendar events directly into CRM appointments!
        await handlePerformTwoWaySync(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      onToast('Falha na autenticação com o Google: ' + (err.message || 'Tente novamente'), 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await googleLogout();
      setCurrentUser(null);
      setAccessToken(null);
      setRecentGoogleEvents([]);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm_google_integration_disabled'));
      }
      if (onDisconnect) {
        onDisconnect();
      }
      onToast('Conta do Google desconectada e itens removidos do calendário.', 'info');
    } catch (err: any) {
      onToast('Erro ao desconectar: ' + err.message, 'error');
    }
  };

  const handleToggleAutoSync = (checked: boolean) => {
    setAutoSyncEnabled(checked);
    localStorage.setItem('google_calendar_autosync', String(checked));
    onToast(
      checked 
        ? 'Sincronização automática com Google Calendar ativada!' 
        : 'Sincronização automática desativada.', 
      'info'
    );
  };

  const handleToggleTwoWay = (checked: boolean) => {
    setTwoWayEnabled(checked);
    const m = getCalendarFieldMapping();
    saveCalendarFieldMapping({ ...m, twoWaySyncEnabled: checked });
    onToast(
      checked 
        ? 'Sincronização bidirecional ativada! Eventos do Google serão importados e atualizados no CRM.' 
        : 'Sincronização bidirecional desativada.',
      'info'
    );
  };

  const handleSyncAllAppointments = async () => {
    if (!accessToken) {
      onToast('Faça login com sua conta Google para sincronizar.', 'error');
      return;
    }

    if (appointments.length === 0) {
      onToast('Não há agendamentos cadastrados para sincronizar.', 'info');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncAppointmentsToGoogle(accessToken, appointments);
      const nowStr = new Date().toLocaleString('pt-BR');
      
      setSyncStats({
        lastSync: nowStr,
        syncedCount: syncStats.syncedCount + result.syncedCount
      });
      localStorage.setItem('google_calendar_last_sync', nowStr);
      localStorage.setItem('google_calendar_synced_count', String(syncStats.syncedCount + result.syncedCount));

      if (result.errors.length === 0) {
        onToast(`${result.syncedCount} agendamento(s) sincronizado(s) com sucesso no Google Calendar!`, 'success');
      } else {
        onToast(`${result.syncedCount} sincronizado(s), com ${result.errors.length} aviso(s).`, 'info');
      }
      
      fetchEvents(accessToken);
    } catch (err: any) {
      onToast('Erro durante a sincronização: ' + (err.message || 'Verifique as permissões'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Perform full Bidirectional Sync
  const handlePerformTwoWaySync = async (overrideToken?: string) => {
    const token = overrideToken || accessToken;
    if (!token) {
      onToast('Faça login com o Google para iniciar a sincronização.', 'error');
      return;
    }

    setIsBidirectionalSyncing(true);
    try {
      const result = await performBidirectionalSync(token, appointments, {
        defaultClinicId: clinicId || '1',
        defaultClinicName: clinicName || 'Odonto Premium',
      });

      if (onImportAppointments && result.updatedAppointments) {
        onImportAppointments(result.updatedAppointments);
      }

      const nowStr = new Date().toLocaleString('pt-BR');
      setSyncStats({
        lastSync: nowStr,
        syncedCount: syncStats.syncedCount + result.importedCount + result.updatedCount
      });
      localStorage.setItem('google_calendar_last_sync', nowStr);

      if (result.conflictsCount > 0) {
        onToast(
          `Sincronização concluída: +${result.importedCount} eventos importados do Google Agenda. Atenção: ${result.conflictsCount} conflito(s) detectado(s).`,
          'info'
        );
      } else {
        onToast(
          `Google Agenda sincronizado! ${result.importedCount} eventos importados e ${result.updatedCount} atualizados no calendário do CRM.`,
          'success'
        );
      }

      fetchEvents(token);
    } catch (err: any) {
      console.error(err);
      onToast('Erro na sincronização: ' + (err.message || 'Falha de conexão com o Google Agenda'), 'error');
    } finally {
      setIsBidirectionalSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-slate-800/40 dark:to-slate-800/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-center p-2 shrink-0">
                <svg className="w-full h-full" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M38 44H10c-3.3 0-6-2.7-6-6V10c0-3.3 2.7-6 6-6h28c3.3 0 6 2.7 6 6v28c0 3.3-2.7 6-6 6z"/>
                  <path fill="#FFF" d="M35 14H13c-1.1 0-2 .9-2 2v20c0 1.1.9 2 2 2h22c1.1 0 2-.9 2-2V16c0-1.1-.9-2-2-2zm-9 19h-8v-3h8v3zm8-6H14v-3h20v3zm0-6H14v-3h20v3z"/>
                  <path fill="#EA4335" d="M35 10V6c0-.6-.4-1-1-1s-1 .4-1 1v4h-6V6c0-.6-.4-1-1-1s-1 .4-1 1v4h-6V6c0-.6-.4-1-1-1s-1 .4-1 1v4h-5c-2.2 0-4 1.8-4 4v2h34v-2c0-2.2-1.8-4-4-4h-5z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center flex-wrap gap-1.5 sm:gap-2">
                  <span>Google Calendar</span>
                  {currentUser && accessToken && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      Conectado
                    </span>
                  )}
                  {currentUser && !accessToken && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      Sessão Expirada
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate sm:whitespace-normal">
                  Sincronize consultas bidirecionalmente, importe eventos e detecte conflitos
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
            {/* Account Status Card */}
            {!currentUser ? (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/40 dark:to-slate-800/20 border border-slate-200 dark:border-slate-800 text-center space-y-4">
                <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-md mx-auto flex items-center justify-center p-3 text-blue-600">
                  <Calendar size={28} />
                </div>
                <div className="max-w-md mx-auto">
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">Conecte sua conta Google</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Autorize a integração com permissão para criar, editar e importar agendamentos entre o CRM e sua agenda Google.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSignIn}
                    disabled={isAuthenticating}
                    className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {isAuthenticating ? (
                      <RefreshCw size={18} className="animate-spin text-blue-600" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                    )}
                    <span>{isAuthenticating ? 'Conectando ao Google...' : 'Entrar com o Google'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Connected Profile Bar */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentUser.photoURL ? (
                      <img 
                        src={currentUser.photoURL} 
                        alt={currentUser.displayName || 'User'} 
                        className="w-10 h-10 rounded-full border border-blue-400"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                        {currentUser.displayName?.[0] || currentUser.email?.[0] || 'G'}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {currentUser.displayName || 'Usuário Google'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5"
                  >
                    <LogOut size={14} />
                    <span>Desconectar</span>
                  </button>
                </div>

                {/* Expired Token Notice & Quick Reconnect */}
                {!accessToken && (
                  <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
                          Sessão do Google Agenda Expirada
                        </p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300">
                          O token temporário expirou. Clique em Reconectar para renovar a autorização.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleSignIn}
                      disabled={isAuthenticating}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={isAuthenticating ? "animate-spin" : ""} />
                      <span>{isAuthenticating ? 'Conectando...' : 'Reconectar ao Google'}</span>
                    </button>
                  </div>
                )}

                {/* Two-Way Sync Switch */}
                <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Layers size={14} className="text-blue-600" />
                      Sincronização Bidirecional (CRM ⇄ Google Calendar)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Eventos criados ou editados no Google Calendar são importados automaticamente para o CRM
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input 
                      type="checkbox" 
                      checked={twoWayEnabled} 
                      onChange={(e) => handleToggleTwoWay(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Stats & Last Sync */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-500" />
                        Envio Automático
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Ao criar nova consulta no CRM, envia direto ao Google
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={autoSyncEnabled} 
                        onChange={(e) => handleToggleAutoSync(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Última Sincronização</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                      <Clock size={13} className="text-blue-500" />
                      {syncStats.lastSync || 'Ainda não sincronizado'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {syncStats.syncedCount} evento(s) sincronizado(s) no total
                    </p>
                  </div>
                </div>

                {/* Main Sync Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Bidirectional Sync Button */}
                  <button
                    onClick={handlePerformTwoWaySync}
                    disabled={isBidirectionalSyncing || isSyncing}
                    className="py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={15} className={isBidirectionalSyncing ? "animate-spin" : ""} />
                    <span>{isBidirectionalSyncing ? 'Sincronizando Bidirecional...' : 'Sincronizar Bidirecional (CRM ⇄ Google)'}</span>
                  </button>

                  {/* Send CRM to Google Button */}
                  <button
                    onClick={handleSyncAllAppointments}
                    disabled={isSyncing || isBidirectionalSyncing}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Layers size={15} />
                    <span>{isSyncing ? 'Enviando...' : `Enviar ${appointments.length} Consultas ao Google`}</span>
                  </button>
                </div>

                {/* Recent Google Calendar Events Preview */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Eventos Atuais no Google Calendar
                    </h4>
                    <button 
                      onClick={() => accessToken && fetchEvents(accessToken)}
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw size={11} className={isFetchingEvents ? "animate-spin" : ""} />
                      Atualizar lista
                    </button>
                  </div>

                  {isFetchingEvents ? (
                    <div className="p-8 text-center text-slate-400">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                      <p className="text-xs">Carregando eventos do Google Calendar...</p>
                    </div>
                  ) : recentGoogleEvents.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {recentGoogleEvents.map((ev) => {
                        const dateStr = ev.start.dateTime 
                          ? new Date(ev.start.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                          : ev.start.date || 'Data não definida';

                        return (
                          <div 
                            key={ev.id}
                            className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white">{ev.summary || 'Evento sem título'}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{dateStr} {ev.location ? `• ${ev.location}` : ''}</p>
                            </div>
                            {ev.htmlLink && (
                              <a 
                                href={ev.htmlLink} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Abrir no Google Calendar"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <CheckCircle2 size={24} className="mx-auto mb-1 opacity-40 text-emerald-500" />
                      <p className="text-xs font-semibold">Nenhum evento pendente encontrado no Google Calendar.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <AlertCircle size={14} />
              <span>Sincronização bidirecional em tempo real com mapeamento de campos</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

