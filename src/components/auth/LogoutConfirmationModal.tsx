import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, AlertTriangle, X } from 'lucide-react';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmationModal({ isOpen, onClose, onConfirm }: LogoutConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
          >
            {/* Header Decor */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-orange-500" />
            
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 shadow-inner">
                  <LogOut size={24} />
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                Encerrar Sessão?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Você será desconectado do sistema. Certifique-se de que salvou seu progresso antes de sair.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-red-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  <span>Sim, desejo sair</span>
                </button>
                
                <button
                  onClick={onClose}
                  className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
                >
                  Continuar Trabalhando
                </button>
              </div>
            </div>

            {/* Warning Footer */}
            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                <AlertTriangle size={14} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Ação de segurança necessária
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
