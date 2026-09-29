import React, { useState } from 'react';
import { 
  X, 
  RotateCcw, 
  Trash2, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Wifi, 
  WifiOff, 
  Calendar, 
  User,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SyncQueueItem, 
  removeSyncQueueItem, 
  clearSyncQueue, 
  processSyncQueue 
} from '../../lib/syncQueue';
import { cn } from '../../lib/utils';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: SyncQueueItem[];
  accessToken: string | null;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onQueueUpdated: () => void;
}

export default function SyncQueueModal({
  isOpen,
  onClose,
  queue,
  accessToken,
  onToast,
  onQueueUpdated,
}: SyncQueueModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOpen) return null;

  const handleProcessAll = async () => {
    if (!accessToken) {
      onToast('Conecte sua conta do Google Agenda para reenviar os eventos da fila.', 'info');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await processSyncQueue(accessToken, true);
      onQueueUpdated();
      if (res.successCount > 0) {
        onToast(`${res.successCount} agendamento(s) sincronizado(s) com sucesso com o Google Agenda!`, 'success');
      }
      if (res.failCount > 0) {
        onToast(`${res.failCount} item(ns) falharam ao reenviar. Verifique a conexão.`, 'error');
      }
      if (res.remainingCount === 0) {
        onClose();
      }
    } catch (err: any) {
      onToast(`Erro ao processar fila: ${err?.message || 'Falha desconhecida'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = (id: string, patient: string) => {
    removeSyncQueueItem(id);
    onQueueUpdated();
    onToast(`Agendamento de "${patient}" removido da fila de reenvio.`, 'info');
  };

  const handleClearAll = () => {
    if (window.confirm('Tem certeza que deseja limpar toda a fila de sincronização?')) {
      clearSyncQueue();
      onQueueUpdated();
      onToast('Fila de sincronização limpa.', 'info');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Fila de Sincronização Google Agenda
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    {queue.length} pendente{queue.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Agendamentos capturados durante desconexão ou falhas de API para reenvio automático
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Connection Status Bar */}
          <div className="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi size={14} className="text-emerald-500" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Internet Conectada</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} className="text-rose-500" />
                  <span className="font-semibold text-rose-700 dark:text-rose-400">Sem Conexão (Offline)</span>
                </>
              )}
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 dark:text-slate-400">
                {accessToken ? 'Google Calendar autenticado' : 'Google Calendar não autenticado'}
              </span>
            </div>

            {queue.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
              >
                <Trash2 size={11} />
                <span>Limpar Fila</span>
              </button>
            )}
          </div>

          {/* Queue Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            {queue.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 size={28} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Fila Vazia</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Todos os agendamentos do CRM foram sincronizados com sucesso com o Google Calendar!
                </p>
              </div>
            ) : (
              queue.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-2xs hover:border-amber-300 dark:hover:border-amber-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {item.patient}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {item.action === 'create' ? 'Criação' : item.action === 'update' ? 'Atualização' : 'Exclusão'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.attempts} {item.attempts === 1 ? 'tentativa' : 'tentativas'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                        <Calendar size={12} />
                        {item.date} às {item.time}
                      </span>
                      <span>•</span>
                      <span className="truncate">{item.procedure}</span>
                    </div>

                    {item.lastError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1 bg-rose-50/60 dark:bg-rose-950/30 px-2 py-1 rounded-md border border-rose-200/60 dark:border-rose-900/40">
                        <AlertCircle size={12} className="shrink-0" />
                        <span className="truncate">{item.lastError}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleRemove(item.id, item.patient)}
                      title="Descartar da fila"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
              O sistema reenvia automaticamente os itens da fila assim que detectar o restabelecimento da conexão.
            </p>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Fechar
              </button>

              {queue.length > 0 && (
                <button
                  onClick={handleProcessAll}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw size={14} className={isProcessing ? "animate-spin" : ""} />
                  <span>{isProcessing ? 'Reenviando...' : 'Reenviar Fila Agora'}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
