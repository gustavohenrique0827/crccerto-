import { 
  Cloud, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Clock, 
  Settings2, 
  Link2,
  Database,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useApp } from '../../context/AppContext';

export default function IntegrationsManager() {
  const { currentClinic, addToast } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);

  const systems = [
    { 
      id: 'simples_dental', 
      name: 'Simples Dental', 
      desc: 'Sincronização completa de pacientes e agenda.', 
      logo: 'https://api.dicebear.com/7.x/initials/svg?seed=SD&backgroundColor=0033ad' 
    },
    { 
      id: 'clinicorp', 
      name: 'Clinicorp', 
      desc: 'Integração de prontuários e agendamentos.', 
      logo: 'https://api.dicebear.com/7.x/initials/svg?seed=CC&backgroundColor=00ad33' 
    }
  ];

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      addToast('Sincronização concluída com sucesso!', 'success');
    }, 2000);
  };

  const activeSystem = systems.find(s => s.id === currentClinic?.system);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Connection Status Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600">
                  <Cloud size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Status da Integração</h3>
                  <p className="text-sm text-slate-500">Conexão com o sistema de gestão da clínica.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                <CheckCircle2 size={12} />
                Conectado
              </div>
            </div>

            {activeSystem ? (
              <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <img src={activeSystem.logo} alt={activeSystem.name} className="w-12 h-12 rounded-xl shadow-sm" />
                   <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{activeSystem.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Última sincronização: Hoje às 10:45</p>
                   </div>
                </div>
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                    isSyncing 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                  )}
                >
                  <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                </button>
              </div>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                 <Link2 size={40} className="mx-auto text-slate-300 mb-4" />
                 <h4 className="text-sm font-bold text-slate-800 dark:text-white">Nenhum sistema conectado</h4>
                 <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                   Escolha um dos sistemas abaixo para importar seus pacientes e agendamentos automaticamente.
                 </p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
             <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest">Sistemas Disponíveis</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systems.map((sys) => (
                  <div key={sys.id} className={cn(
                    "p-5 rounded-2xl border transition-all cursor-pointer group",
                    currentClinic?.system === sys.id 
                      ? "border-blue-500 bg-blue-50/10" 
                      : "border-slate-100 dark:border-slate-800 hover:border-blue-200"
                  )}>
                    <div className="flex items-start justify-between mb-4">
                       <img src={sys.logo} alt={sys.name} className="w-10 h-10 rounded-lg" />
                       {currentClinic?.system === sys.id && (
                         <CheckCircle2 size={16} className="text-blue-500" />
                       )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">{sys.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{sys.desc}</p>
                    <div className="mt-4 flex items-center justify-between">
                       <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest group-hover:underline">
                         {currentClinic?.system === sys.id ? 'Configurar' : 'Conectar'}
                       </span>
                       <ArrowRight size={14} className="text-blue-600 translate-x-0 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Sync Logs */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
               <Clock size={16} className="text-slate-400" />
               Logs de Sincronização
            </h3>
            <div className="space-y-4">
               {[
                 { action: 'Pacientes Importados', count: 12, time: '10:45', status: 'success' },
                 { action: 'Agenda Atualizada', count: 8, time: '10:45', status: 'success' },
                 { action: 'Falha na conexão', count: 0, time: '09:12', status: 'error' },
               ].map((log, i) => (
                 <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <div className="flex items-center gap-3">
                       <div className={cn(
                         "w-1.5 h-1.5 rounded-full",
                         log.status === 'success' ? "bg-emerald-500" : "bg-red-500"
                       )} />
                       <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{log.action}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{log.time} • {log.count} registros</p>
                       </div>
                    </div>
                    {log.status === 'error' && (
                      <Info size={14} className="text-red-400" />
                    )}
                 </div>
               ))}
            </div>
            <button className="w-full mt-6 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
               Ver Histórico Completo
            </button>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
             <div className="relative z-10">
                <Database className="w-10 h-10 mb-4 opacity-50" />
                <h3 className="text-lg font-bold mb-2">API Webhooks</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-6">
                  Configure webhooks para receber notificações em tempo real de novos leads e agendamentos no seu sistema externo.
                </p>
                <button className="w-full py-3 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
                   Documentação API
                   <ExternalLink size={14} />
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
