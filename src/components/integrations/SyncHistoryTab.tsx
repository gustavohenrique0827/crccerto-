import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Terminal, 
  X, 
  Clock, 
  Calendar,
  Layers,
  Code,
  ShieldCheck,
  Webhook
} from 'lucide-react';
import { 
  SyncLogEntry, 
  getSyncLogs, 
  clearSyncLogs, 
  exportSyncLogsToCSV, 
  addSyncLog 
} from '../../lib/syncHistory';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function SyncHistoryTab() {
  const { addToast } = useApp();
  const [logs, setLogs] = useState<SyncLogEntry[]>(getSyncLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error' | 'warning'>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<SyncLogEntry | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshLogs = () => {
    setIsRefreshing(true);
    setLogs(getSyncLogs());
    setTimeout(() => {
      setIsRefreshing(false);
      addToast('Histórico de sincronização atualizado!', 'info');
    }, 400);
  };

  useEffect(() => {
    const handleLogAdded = () => {
      setLogs(getSyncLogs());
    };
    window.addEventListener('crm_sync_log_added', handleLogAdded);
    return () => window.removeEventListener('crm_sync_log_added', handleLogAdded);
  }, []);

  const handleClear = () => {
    if (confirm('Deseja realmente limpar todo o histórico de logs de sincronização?')) {
      clearSyncLogs();
      setLogs([]);
      addToast('Histórico de sincronização limpo.', 'info');
    }
  };

  const handleExport = () => {
    exportSyncLogsToCSV();
    addToast('Histórico exportado com sucesso em CSV!', 'success');
  };

  // Metrics calculations
  const totalLogs = logs.length;
  const successCount = logs.filter(l => l.status === 'success').length;
  const errorCount = logs.filter(l => l.status === 'error').length;
  const warningCount = logs.filter(l => l.status === 'warning').length;
  const successRate = totalLogs > 0 ? Math.round((successCount / totalLogs) * 100) : 100;

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.affectedItem && log.affectedItem.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.apiStatusCode && String(log.apiStatusCode).includes(searchTerm));

      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
      const matchesDirection = directionFilter === 'all' || log.direction === directionFilter;

      return matchesSearch && matchesStatus && matchesDirection;
    });
  }, [logs, searchTerm, statusFilter, directionFilter]);

  return (
    <div className="space-y-8">
      {/* Top Header & Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total de Eventos</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalLogs}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Auditoria contínua de API</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
            <Layers size={24} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Taxa de Sucesso</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{successRate}%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{successCount} envios confirmados (HTTP 200)</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Erros de API</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{errorCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {errorCount === 0 ? 'Nenhum erro recente' : 'Falhas de requisição / Quota'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Conflitos / Alertas</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{warningCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Colisões de horário mapeadas</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por paciente, status HTTP ou erro..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={refreshLogs}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
              title="Atualizar Logs"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={handleExport}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
              title="Exportar em Planilha CSV"
            >
              <Download size={14} />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleClear}
              className="px-3 py-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              title="Limpar Histórico"
            >
              <Trash2 size={14} />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-bold uppercase text-[10px] mr-1 flex items-center gap-1">
              <Filter size={11} />
              Status:
            </span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'success', label: 'Sucesso (200 OK)' },
              { id: 'error', label: 'Erros de API' },
              { id: 'warning', label: 'Conflitos / Alertas' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as any)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                  statusFilter === st.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                )}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Origem:</span>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <option value="all">Todas as Origens</option>
              <option value="crm_to_google">CRM ➔ Google Calendar</option>
              <option value="google_to_crm">Google Calendar ➔ CRM (Bidirecional)</option>
              <option value="webhook_to_crm">Webhooks (Facebook/Site)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table / Cards List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLogs.map((log) => {
              const isError = log.status === 'error';
              const isSuccess = log.status === 'success';
              const isWarning = log.status === 'warning';

              return (
                <div 
                  key={log.id} 
                  className={cn(
                    "p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4",
                    isError && "bg-rose-50/20 dark:bg-rose-950/10"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                      isSuccess && "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600",
                      isError && "bg-rose-50 dark:bg-rose-900/30 text-rose-600",
                      isWarning && "bg-amber-50 dark:bg-amber-900/30 text-amber-600"
                    )}>
                      {isSuccess && <CheckCircle2 size={20} />}
                      {isError && <AlertCircle size={20} />}
                      {isWarning && <AlertTriangle size={20} />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Direction Badge */}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          {log.direction === 'crm_to_google' && (
                            <>
                              <ArrowUpRight size={12} className="text-blue-500" />
                              <span>CRM ➔ Google</span>
                            </>
                          )}
                          {log.direction === 'google_to_crm' && (
                            <>
                              <ArrowDownLeft size={12} className="text-purple-500" />
                              <span>Google ➔ CRM</span>
                            </>
                          )}
                          {log.direction === 'webhook_to_crm' && (
                            <>
                              <Webhook size={12} className="text-emerald-500" />
                              <span>Webhook</span>
                            </>
                          )}
                        </span>

                        {/* HTTP Status Badge */}
                        {log.apiStatusCode && (
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-mono font-bold",
                            log.apiStatusCode >= 200 && log.apiStatusCode < 300 && "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
                            log.apiStatusCode === 409 && "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
                            log.apiStatusCode >= 400 && log.apiStatusCode !== 409 && "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                          )}>
                            HTTP {log.apiStatusCode}
                          </span>
                        )}

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {log.title}
                        </h4>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                        {log.details}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock size={11} />
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </span>
                        {log.affectedItem && (
                          <span>• Paciente: <strong className="text-slate-600 dark:text-slate-300">{log.affectedItem}</strong></span>
                        )}
                        {log.clinicName && (
                          <span>• {log.clinicName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Inspect JSON Payload */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => setSelectedLogForDetail(log)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Terminal size={13} className="text-blue-500" />
                      <span>Detalhes da API</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400">
            <CheckCircle2 size={36} className="mx-auto mb-2 opacity-30 text-emerald-500" />
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Nenhum registro encontrado</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Nenhuma sincronização corresponde aos filtros selecionados.
            </p>
          </div>
        )}
      </div>

      {/* JSON Payload & API Inspection Modal */}
      <AnimatePresence>
        {selectedLogForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                    <Code size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Inspeção de Payload da API
                    </h3>
                    <p className="text-xs text-slate-400">ID do Log: {selectedLogForDetail.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLogForDetail(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Ação / Título</label>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedLogForDetail.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Status HTTP</span>
                    <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedLogForDetail.apiStatusCode ? `HTTP ${selectedLogForDetail.apiStatusCode}` : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Timestamp</span>
                    <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {new Date(selectedLogForDetail.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                {selectedLogForDetail.apiEndpoint && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Endpoint Chamado</label>
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[11px] text-blue-600 dark:text-blue-400 break-all mt-0.5">
                      {selectedLogForDetail.apiEndpoint}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Mensagem / Diagnóstico</label>
                  <p className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {selectedLogForDetail.details}
                  </p>
                </div>

                {selectedLogForDetail.apiResponse && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Resposta JSON da API</label>
                    <pre className="p-3.5 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[10.5px] overflow-x-auto custom-scrollbar mt-0.5 leading-relaxed">
                      {selectedLogForDetail.apiResponse}
                    </pre>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedLogForDetail(null)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
