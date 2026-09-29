import { 
  Users, 
  UserPlus,
  CalendarDays,
  CalendarCheck,
  PhoneCall,
  Target
} from 'lucide-react';

interface Stats {
  totalPatients: number;
  newPatients: number;
  appointmentsToday: number;
  confirmedToday: number;
  newLeads: number;
  pendingFollowups: number;
  cancellations: number;
  noShows: number;
}

export default function StatCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Total Pacientes', value: stats.totalPatients, icon: Users },
    { label: 'Novos Pacientes', value: stats.newPatients, icon: UserPlus },
    { label: 'Agendas Hoje', value: stats.appointmentsToday, icon: CalendarDays },
    { label: 'Confirmados', value: stats.confirmedToday, icon: CalendarCheck },
    { label: 'Novos Leads', value: stats.newLeads, icon: Target },
    { label: 'Follow-ups Pend.', value: stats.pendingFollowups, icon: PhoneCall },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-tight">{card.label}</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <card.icon className="w-3.5 h-3.5" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{card.value}</h2>
        </div>
      ))}
    </div>
  );
}
