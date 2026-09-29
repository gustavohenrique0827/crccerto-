import React from 'react';
import { 
  Target, 
  Search, 
  Users, 
  Instagram, 
  Globe,
  MoreHorizontal,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function MarketingPerformance() {
  const campaigns = [
    { name: 'Implantes Verão 2024', source: 'Meta Ads', channel: 'Instagram', leads: 245, conversion: 12.4, cpl: 14.50, status: 'Ativa' },
    { name: 'Invisalign Day - Matriz', source: 'Google Ads', channel: 'Search', leads: 182, conversion: 8.7, cpl: 22.10, status: 'Ativa' },
    { name: 'Clareamento Express', source: 'Meta Ads', channel: 'Facebook', leads: 94, conversion: 15.2, cpl: 8.90, status: 'Pausada' },
    { name: 'Checkup Preventivo', source: 'Orgânico', channel: 'Site', leads: 42, conversion: 22.1, cpl: 0, status: 'Ativa' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Análise de Campanhas</h3>
          <p className="text-xs text-slate-500 mt-1">Comparativo de performance por canal e origem.</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Leads (Ads)', value: '521', trend: '+12%', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'CPL Médio', value: 'R$ 15,20', trend: '-5%', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Conv. Campanhas', value: '11.8%', trend: '+2%', color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Melhor Canal', value: 'Instagram', trend: 'Meta Ads', color: 'text-pink-600', bg: 'bg-pink-50' },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <div className="flex items-baseline justify-between">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</h4>
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-700 shadow-sm", stat.color)}>
                  {stat.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {campaigns.map((camp, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-50 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                  {camp.channel === 'Instagram' ? <Instagram size={20} /> : camp.channel === 'Search' ? <Search size={20} /> : <Globe size={20} />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{camp.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500">{camp.source}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className={cn(
                      "text-[10px] font-bold",
                      camp.status === 'Ativa' ? "text-emerald-500" : "text-slate-400"
                    )}>{camp.status}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Leads</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{camp.leads}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPL</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{camp.cpl > 0 ? `R$ ${camp.cpl.toFixed(2)}` : '--'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conversão</p>
                  <div className="flex items-center justify-end gap-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{camp.conversion}%</p>
                    <ArrowUpRight size={12} className="text-emerald-500" />
                  </div>
                </div>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 transition-colors">
                  <TrendingUp size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
