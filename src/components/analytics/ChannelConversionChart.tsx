import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Filter, 
  BarChart3, 
  Layers, 
  Sparkles, 
  ArrowUpRight, 
  Radio, 
  RefreshCw,
  Zap
} from 'lucide-react';
import { fetchChannelConversionRatesFromDb, ChannelConversionMetric } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

interface ChannelConversionChartProps {
  selectedClinicId: string;
  title?: string;
  compact?: boolean;
}

export default function ChannelConversionChart({
  selectedClinicId,
  title = "Taxa de Conversão por Canal de Origem",
  compact = false
}: ChannelConversionChartProps) {
  const { clinics } = useApp();
  const [data, setData] = useState<ChannelConversionMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricView, setMetricView] = useState<'conversion' | 'appointment' | 'volume'>('conversion');

  const currentClinic = useMemo(() => {
    if (selectedClinicId === 'all') return { name: 'Todas as Clínicas (Rede)' };
    return clinics.find(c => c.id === selectedClinicId) || { name: 'Unidade' };
  }, [clinics, selectedClinicId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchChannelConversionRatesFromDb(selectedClinicId);
      setData(res);
    } catch (e) {
      console.warn('Erro ao carregar dados de conversão por canal:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('crm_leads_updated', handleUpdate);
    window.addEventListener('crm_appointments_updated', handleUpdate);
    window.addEventListener('crm_sales_updated', handleUpdate);

    return () => {
      window.removeEventListener('crm_leads_updated', handleUpdate);
      window.removeEventListener('crm_appointments_updated', handleUpdate);
      window.removeEventListener('crm_sales_updated', handleUpdate);
    };
  }, [selectedClinicId]);

  // Find top converting channel
  const topChannel = useMemo(() => {
    if (!data.length) return null;
    return [...data].sort((a, b) => b.conversionRate - a.conversionRate)[0];
  }, [data]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item: ChannelConversionMetric = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[200px] z-50">
          <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-800">
            <span className="font-bold text-sm text-white">{item.channel}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
              {item.subTitle}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span>Total de Leads:</span>
              <span className="font-bold text-white">{item.totalLeads}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Agendamentos:</span>
              <span className="font-bold text-indigo-300">{item.appointments} ({item.appointmentRate}%)</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Comparecimentos:</span>
              <span className="font-bold text-emerald-300">{item.attended}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-400 font-bold pt-1 border-t border-slate-800">
              <span>Taxa de Conversão:</span>
              <span className="text-sm">{item.conversionRate}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
              <BarChart3 size={18} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {currentClinic.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparativo de eficiência comercial e taxa de fechamento por fonte de aquisição no Supabase.
          </p>
        </div>

        {/* Metric Switcher Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setMetricView('conversion')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              metricView === 'conversion'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Conversão (%)
          </button>
          <button
            onClick={() => setMetricView('appointment')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              metricView === 'appointment'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Agendamentos (%)
          </button>
          <button
            onClick={() => setMetricView('volume')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              metricView === 'volume'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Volume Bruto
          </button>
        </div>
      </div>

      {/* Highlights & Top Channel Badge */}
      {topChannel && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent rounded-xl border border-blue-100 dark:border-blue-900/40">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles size={16} className="text-amber-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Canal Líder em Eficiência: <strong className="text-slate-900 dark:text-white">{topChannel.channel}</strong> com <strong className="text-blue-600 dark:text-blue-400">{topChannel.conversionRate}%</strong> de conversão em vendas.
            </span>
          </div>
          <button 
            onClick={loadData}
            title="Atualizar dados do Supabase"
            className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            <span>Sincronizado via Supabase</span>
          </button>
        </div>
      )}

      {/* Main Bar Chart */}
      <div className="h-64 sm:h-72 w-full pt-2">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
            <p className="text-xs text-slate-400 font-medium">Calculando taxas de conversão...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {metricView === 'volume' ? (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                <XAxis dataKey="channel" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="totalLeads" name="Total Leads" fill="#94A3B8" radius={[6, 6, 0, 0]} barSize={18} />
                <Bar dataKey="appointments" name="Agendados" fill="#6366F1" radius={[6, 6, 0, 0]} barSize={18} />
                <Bar dataKey="attended" name="Presenças" fill="#10B981" radius={[6, 6, 0, 0]} barSize={18} />
              </BarChart>
            ) : (
              <BarChart 
                data={data} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                <XAxis 
                  dataKey="channel" 
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  unit="%" 
                  domain={[0, 100]} 
                  tick={{ fontSize: 11, fill: '#64748B' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey={metricView === 'conversion' ? 'conversionRate' : 'appointmentRate'} 
                  name={metricView === 'conversion' ? 'Taxa de Conversão' : 'Taxa de Agendamento'} 
                  radius={[8, 8, 0, 0]} 
                  barSize={36}
                >
                  {(data || []).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.barFill || '#3B82F6'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Mini Channel Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        {(data || []).map((item, idx) => (
          <div 
            key={idx} 
            className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800/80 text-center hover:bg-slate-100/80 transition-colors"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.barFill }}></span>
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[90px]">{item.channel}</p>
            </div>
            <p className="text-base font-black text-slate-900 dark:text-white">
              {item.conversionRate}%
            </p>
            <span className="text-[9px] text-slate-400 font-medium">
              {item.appointments} agend. de {item.totalLeads}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
