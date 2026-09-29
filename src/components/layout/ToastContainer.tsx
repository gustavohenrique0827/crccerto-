import { useApp } from '@/src/context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className={cn(
              "flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 min-w-[300px]",
              "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:rounded-l-xl",
              toast.type === 'success' && "before:bg-emerald-500",
              toast.type === 'error' && "before:bg-red-500",
              toast.type === 'info' && "before:bg-blue-500"
            )}
          >
            {icons[toast.type]}
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">
              {toast.message}
            </p>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
