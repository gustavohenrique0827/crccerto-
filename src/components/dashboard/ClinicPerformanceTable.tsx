import React, { useMemo } from 'react';
import { 
  Building2, 
  Users, 
  Calendar, 
  Target, 
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Plus
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';

export default function ClinicPerformanceTable() {
  const { clinics, setCurrentPage } = useApp();

  const clinicStats = useMemo(() => {
    let leadsList: any[] = [];
    let aptsList: any[] = [];
    try {
      const rawLeads = localStorage.getItem('crm_leads_data');
      if (rawLeads) leadsList = JSON.parse(rawLeads);
      const rawApts = localStorage.getItem('crm_appointments_data');
      if (rawApts) aptsList = JSON.parse(rawApts);
    } catch (e) {
      console.error(e);
    }

    return clinics.map(c => {
      const cLeads = leadsList.filter((l: any) => l.clinicId === c.id);
      const cApts = aptsList.filter((a: any) => a.clinicId === c.id);
      const confirmedApts = cApts.filter((a: any) => a.status === 'confirmed' || a.status === 'attended');
      const noShows = cApts.filter((a: any) => a.status === 'no_show').length;
      const converted = cLeads.filter((l: any) => l.status === 'comprou' || l.status === 'won').length;
      const conversionRate = cLeads.length > 0 ? ((converted / cLeads.length) * 100).toFixed(1) : '0.0';

      return {
        id: c.id,
        name: c.name,
        leads: cLeads.length,
        patients: Math.round(cLeads.length * 0.8),
        appointments: cApts.length,
        confirmed: confirmedApts.length,
        noShows,
        conversion: conversionRate,
        trend: Number(conversionRate) >= 10 ? 'up' : 'down'
      };
    });
  }, [clinics]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Performance por Unidade</h3>
          <p className="text-xs text-slate-500 mt-1">Comparativo de indicadores operacionais entre clínicas.</p>
        </div>
        <button 
          onClick={() => setCurrentPage('reports')}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
        >
          Ver Relatório Completo
        </button>
      </div>

      {clinicStats.length === 0 ? (
        <div className="p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Building2 size={24} />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Nenhuma unidade cadastrada para comparação</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">Cadastre suas clínicas parceiras para visualizar o comparativo de performance em tempo real.</p>
          <button 
            onClick={() => setCurrentPage('clinics')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Cadastrar Unidade</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidade</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Leads</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Pacientes</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Agendamentos</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Confirmação</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Faltas</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Conversão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:border-slate-800">
              {clinicStats.map((clinic) => (
                <tr 
                  key={clinic.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 shrink-0">
                        <Building2 size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">
                        {clinic.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{clinic.leads}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{clinic.patients}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{clinic.appointments}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <span className="text-xs font-bold text-emerald-600">
                        {clinic.appointments > 0 ? Math.round((clinic.confirmed / clinic.appointments) * 100) : 0}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-xs font-bold",
                      clinic.noShows > 5 ? "text-rose-500" : "text-slate-400"
                    )}>
                      {clinic.noShows}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{clinic.conversion}%</span>
                      {clinic.trend === 'up' ? (
                        <ArrowUpRight size={14} className="text-emerald-500" />
                      ) : (
                        <ArrowDownRight size={14} className="text-rose-500" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
