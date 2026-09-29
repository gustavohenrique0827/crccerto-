import { useMemo } from 'react';

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

export default function LeadFunnel({ stats }: { stats?: any }) {
  const steps: FunnelStep[] = useMemo(() => {
    const totalLeads = stats?.leads ?? 0;
    const contacted = stats?.contacted ?? stats?.followups ?? (totalLeads > 0 ? totalLeads : 0);
    const scheduled = stats?.appointments ?? 0;
    const confirmed = stats?.confirmations ?? stats?.todayConfirmedAppointments ?? 0;
    const attended = stats?.attended ?? stats?.yesterdayAttendance ?? 0;
    const sales = stats?.sales ?? stats?.yesterdayClosings ?? 0;

    return [
      { label: 'Leads Capturados', value: totalLeads, color: 'bg-blue-600' },
      { label: 'Atendidos / Contatados', value: Math.min(totalLeads, contacted), color: 'bg-blue-500' },
      { label: 'Agendados', value: scheduled, color: 'bg-indigo-500' },
      { label: 'Confirmados', value: confirmed, color: 'bg-purple-500' },
      { label: 'Compareceram', value: attended, color: 'bg-emerald-500' },
      { label: 'Vendas Fechadas', value: sales, color: 'bg-emerald-600' },
    ];
  }, [stats]);

  const topValue = Math.max(steps[0].value, 1);
  const hasData = steps.some(s => s.value > 0);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Funil de Conversão</h3>
        {!hasData && (
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            Sem dados no período
          </span>
        )}
      </div>
      <div className="space-y-4">
        {steps.map((step, idx) => {
          const prevValue = idx > 0 ? Math.max(steps[idx - 1].value, 1) : topValue;
          const percentage = hasData ? Math.round((step.value / topValue) * 100) : 0;
          const conversion = idx > 0 ? (steps[idx - 1].value > 0 ? Math.round((step.value / prevValue) * 100) : 0) : 100;
          
          return (
            <div key={idx} className="relative">
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">{step.label}</span>
                <div className="flex gap-3">
                  <span className="text-slate-400 dark:text-slate-500">{percentage}% do topo</span>
                  <span className="font-bold text-slate-800 dark:text-white">{step.value}</span>
                </div>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${step.color} transition-all duration-500`}
                  style={{ width: `${Math.max(percentage, step.value > 0 ? 4 : 0)}%` }}
                />
              </div>
              {idx > 0 && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-1">
                  {conversion}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
