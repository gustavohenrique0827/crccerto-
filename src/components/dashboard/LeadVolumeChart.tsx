import { useMemo } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { useApp } from '@/src/context/AppContext';

export default function LeadVolumeChart() {
  const { leads } = useApp();

  const chartData = useMemo(() => {
    const days: { day: string; fullDate: string; leads: number }[] = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayFormatted = String(d.getDate()).padStart(2, '0');
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        day: dayFormatted,
        fullDate: dateStr,
        leads: 0
      });
    }

    // Populate from actual leads
    if (Array.isArray(leads) && leads.length > 0) {
      leads.forEach(lead => {
        if (!lead.createdAt) return;
        const leadDateStr = lead.createdAt.split('T')[0];
        const match = days.find(d => d.fullDate === leadDateStr);
        if (match) {
          match.leads += 1;
        }
      });
    }

    // Filter to 7 milestone days for clean label rendering
    return days.filter((_, idx) => idx % 4 === 0 || idx === 29);
  }, [leads]);

  const totalLeads = leads?.length || 0;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Volume de Leads (30 dias)</h3>
          <p className="text-xs text-slate-400 mt-0.5">{totalLeads} lead(s) registrados no período</p>
        </div>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
          Tempo Real
        </span>
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              allowDecimals={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: 'none', 
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
              itemStyle={{ color: '#fff' }}
              formatter={(val: any) => [`${val} lead(s)`, 'Captura']}
              labelFormatter={(label: any) => `Dia ${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="leads" 
              stroke="#2563eb" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorLeads)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
