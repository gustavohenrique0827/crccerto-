import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

export default function BackButton() {
  const { navigationHistory, goBack, activeTab, subPage } = useApp();

  // Don't show on Dashboard root
  if (activeTab === 'dashboard' && !subPage) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        onClick={goBack}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Voltar
      </motion.button>
    </AnimatePresence>
  );
}
