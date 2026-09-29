import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  HeartPulse,
  Target,
  Zap
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ClinicHealthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string;
}

export default function ClinicHealthDrawer({ isOpen, onClose, clinicId }: ClinicHealthDrawerProps) {
  // Mock data for clinic health
  const healthData = {
    name: clinicId === '1' ? 'Odonto Premium' : clinicId === '2' ? 'Estética Viver' : 'Todas as Unidades',
    score: 88,
    status: 'Excellent',
    metrics: [
      { label: 'Volume de Leads Ativos', value: '42', change: '+12%', trend: 'up', icon: Users },
      { label: 'Taxa de Conclusão de Tarefas', value: '94%', change: '+5%', trend: 'up', icon: CheckCircle2 },
      { label: 'Tempo Médio de Resposta', value: '14 min', change: '-2 min', trend: 'up', icon: Zap },
    ],
    topProcedures: [
      { name: 'Implante Dentário', performance: 92, conversion: 34 },
      { name: 'Ortodontia (Invisalign)', performance: 88, conversion: 28 },
      { name: 'Clareamento Express', performance: 76, conversion: 42 },
    ]
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-950 shadow-2xl z-[70] flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-none">
                  <HeartPulse size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Saúde da Unidade</h2>
                  <p className="text-xs text-slate-500 font-medium">{healthData.name}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* Overall Score */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Activity size={120} />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-1">Score de Saúde</p>
                    <h3 className="text-4xl font-bold">{healthData.score}/100</h3>
                    <p className="text-sm text-slate-300 mt-2 font-medium flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      Operação em {healthData.status}
                    </p>
                  </div>
                  <div className="w-20 h-20 rounded-full border-4 border-emerald-500/30 flex items-center justify-center relative">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        className="text-emerald-500"
                        strokeDasharray={213.6}
                        strokeDashoffset={213.6 * (1 - healthData.score / 100)}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                      {healthData.score}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-1 gap-4">
                {healthData.metrics.map((metric, i) => (
                  <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-blue-500 shadow-sm">
                        <metric.icon size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{metric.label}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{metric.value}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold",
                      metric.trend === 'up' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" : "bg-red-50 text-red-600 dark:bg-red-900/20"
                    )}>
                      {metric.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {metric.change}
                    </div>
                  </div>
                ))}
              </div>

              {/* Top Procedures Performance */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Target size={14} className="text-emerald-500" />
                  Performance por Procedimento
                </h3>
                <div className="space-y-3">
                  {healthData.topProcedures.map((proc, i) => (
                    <div key={i} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-emerald-200 dark:hover:border-emerald-900 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{proc.name}</p>
                        <span className="text-xs font-bold text-emerald-500">{proc.performance}% Health</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${proc.performance}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className="h-full bg-emerald-500 rounded-full"
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] font-medium text-slate-400">Conversão: {proc.conversion}%</p>
                        <p className="text-[10px] font-bold text-slate-500">Benchmark: +4%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex gap-4">
              <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-emerald-200 dark:shadow-none active:scale-[0.98]">
                Otimizar Operação
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
