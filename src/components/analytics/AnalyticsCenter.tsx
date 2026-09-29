import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Funnel,
  FunnelChart,
  LabelList
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  Download, 
  Activity, 
  UserCheck, 
  UserPlus, 
  Clock, 
  Building2, 
  ChevronRight, 
  MapPin, 
  PieChart as PieIcon, 
  Zap 
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { exportToCSV } from '@/src/lib/exportUtils';

export default function AnalyticsCenter() {
  const { leads, addToast } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'appointments' | 'crm'>('overview');

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e'];

  // Read actual patients from storage
  const patientsList = useMemo(() => {
    try {
      const raw = localStorage.getItem('crm_patients_data');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }, []);

  // Read actual appointments from storage
  const appointmentsList = useMemo(() => {
    try {
      const raw = localStorage.getItem('crm_appointments_data');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }, []);

  const totalLeads = leads?.length || 0;
  const totalPatients = patientsList.length;
  const totalAppointments = appointmentsList.length;

  // Monthly patient growth computed from created dates
  const patientGrowthData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentMonthIdx = new Date().getMonth();
    const result: { name: string; value: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const mIdx = (currentMonthIdx - i + 12) % 12;
      result.push({ name: months[mIdx], value: 0 });
    }

    patientsList.forEach((p: any) => {
      const d = p.createdAt ? new Date(p.createdAt) : new Date();
      const mName = months[d.getMonth()];
      const match = result.find(r => r.name === mName);
      if (match) match.value += 1;
    });

    return result;
  }, [patientsList]);

  // Appointment status breakdown
  const appointmentStatusData = useMemo(() => {
    let confirmed = 0;
    let canceled = 0;
    let noShow = 0;
    let completed = 0;

    appointmentsList.forEach((a: any) => {
      const s = String(a.status || '').toLowerCase();
      if (s.includes('confirm')) confirmed++;
      else if (s.includes('cancel')) canceled++;
      else if (s.includes('falt') || s.includes('noshow')) noShow++;
      else completed++;
    });

    const total = appointmentsList.length;
    if (total === 0) {
      return [
        { name: 'Confirmados', value: 0 },
        { name: 'Cancelados', value: 0 },
        { name: 'Faltas', value: 0 },
        { name: 'Realizados', value: 0 },
      ];
    }

    return [
      { name: 'Confirmados', value: Math.round((confirmed / total) * 100) },
      { name: 'Cancelados', value: Math.round((canceled / total) * 100) },
      { name: 'Faltas', value: Math.round((noShow / total) * 100) },
      { name: 'Realizados', value: Math.round((completed / total) * 100) },
    ];
  }, [appointmentsList]);

  // Real channel breakdown
  const channelBreakdown = useMemo(() => {
    const map: Record<string, { leads: number; closed: number }> = {
      'WhatsApp Direto': { leads: 0, closed: 0 },
      'Instagram Ads': { leads: 0, closed: 0 },
      'Google Search': { leads: 0, closed: 0 },
      'Indicação': { leads: 0, closed: 0 },
      'Site / Orgânico': { leads: 0, closed: 0 },
    };

    leads?.forEach(l => {
      const s = (l.sourceId || '').toLowerCase();
      let key = 'Site / Orgânico';
      if (s.includes('whats') || s.includes('direto')) key = 'WhatsApp Direto';
      else if (s.includes('insta') || s.includes('meta')) key = 'Instagram Ads';
      else if (s.includes('google')) key = 'Google Search';
      else if (s.includes('indic') || s.includes('ref')) key = 'Indicação';

      if (!map[key]) map[key] = { leads: 0, closed: 0 };
      map[key].leads += 1;
      if (l.status === 'vendido' || (l.status as any) === 'sold') {
        map[key].closed += 1;
      }
    });

    return Object.keys(map).map(ch => {
      const d = map[ch];
      const conv = d.leads > 0 ? Math.round((d.closed / d.leads) * 100) : 0;
      return {
        channel: ch,
        leads: d.leads,
        conv: `${conv}%`,
        trend: conv >= 20 ? 'up' : 'down'
      };
    });
  }, [leads]);

  // Funnel data computed from actual leads
  const funnelData = useMemo(() => {
    const total = leads?.length || 0;
    const contacted = leads?.filter(l => l.status !== 'novo' && (l.status as any) !== 'new').length || 0;
    const scheduled = appointmentsList.length;
    const attended = appointmentsList.filter((a: any) => String(a.status).toLowerCase().includes('realiz')).length;
    const closed = leads?.filter(l => l.status === 'vendido' || (l.status as any) === 'sold').length || 0;

    return [
      { name: 'Leads Capturados', value: total, fill: '#3b82f6' },
      { name: 'Contatados', value: contacted, fill: '#60a5fa' },
      { name: 'Agendamentos', value: scheduled, fill: '#8b5cf6' },
      { name: 'Comparecimento', value: attended, fill: '#a78bfa' },
      { name: 'Venda Concluída', value: closed, fill: '#10b981' },
    ];
  }, [leads, appointmentsList]);

  const handleExportPDF = () => {
    exportToCSV(channelBreakdown, 'metricas-canais-analytics');
    addToast('Dados de canais exportados com sucesso!', 'success');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Analytics & Inteligência</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Análise detalhada de performance clínica e operacional.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Download size={18} className="text-slate-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
        {[
          { id: 'overview', label: 'Visão Geral', icon: Activity },
          { id: 'patients', label: 'Pacientes', icon: Users },
          { id: 'appointments', label: 'Agendamentos', icon: Calendar },
          { id: 'crm', label: 'CRM & Funil', icon: Target },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeTab === tab.id 
                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Main KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Pacientes Cadastrados', value: String(totalPatients), trend: `${totalPatients} total`, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30' },
              { label: 'Agendamentos Totais', value: String(totalAppointments), trend: `${totalAppointments} total`, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
              { label: 'Leads na Base', value: String(totalLeads), trend: `${totalLeads} total`, icon: Target, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30' },
              { label: 'Canais Monitorados', value: String(channelBreakdown.length), trend: 'Ativo', icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-blue-200 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", kpi.bg)}>
                    <kpi.icon size={20} className={kpi.color} />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{kpi.value}</h4>
                <p className="text-[10px] text-slate-400 mt-2">Status: {kpi.trend}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Patient Growth Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Crescimento de Pacientes</h3>
                  <p className="text-xs text-slate-500 mt-1">Evolução de novos cadastros de pacientes.</p>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={patientGrowthData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Appointment Status Pie */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Status de Agendamentos</h3>
                  <p className="text-xs text-slate-500 mt-1">Distribuição percentual de desfechos na agenda.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={appointmentStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(appointmentStatusData || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {(appointmentStatusData || []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                       <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                       </div>
                       <span className="text-xs font-black text-slate-900 dark:text-white">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Drill-down Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Análise de Canal de Aquisição</h3>
               <p className="text-xs text-slate-500 mt-1">Volume de leads e taxa de conversão calculados a partir da sua base real.</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
               {(channelBreakdown || []).map((item, i) => (
                 <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                          <Target size={20} />
                       </div>
                       <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.channel}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">{item.leads} lead(s) registrados</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-12">
                       <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Taxa de Conversão</p>
                          <div className="flex items-center justify-end gap-1.5">
                             <span className="text-sm font-bold text-slate-900 dark:text-white">{item.conv}</span>
                          </div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Base de Pacientes Cadastrados</h3>
            <p className="text-xs text-slate-500 mb-6">Total de {totalPatients} paciente(s) ativos na sua clínica.</p>
            
            {totalPatients === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum paciente cadastrado ainda</p>
                <p className="text-xs text-slate-400 mt-1">Cadastre novos pacientes através da aba Pacientes.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(patientsList || []).slice(0, 10).map((p: any, idx: number) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.phone || p.email || 'Sem contato'}</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded">
                      {p.city || p.clinic || 'Cadastrado'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Histórico de Agendamentos</h3>
            <p className="text-xs text-slate-500 mb-6">Total de {totalAppointments} agendamento(s) registrados.</p>
            
            {totalAppointments === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum agendamento registrado ainda</p>
                <p className="text-xs text-slate-400 mt-1">Agende novas consultas através da Agenda.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {appointmentsList.slice(0, 10).map((a: any, idx: number) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{a.patientName || a.leadName || 'Paciente'}</p>
                      <p className="text-xs text-slate-400">{a.date} às {a.time} • {a.procedure || 'Consulta'}</p>
                    </div>
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950 px-2 py-1 rounded">
                      {a.status || 'Agendado'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'crm' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-8">Funil de Conversão (Lead to Sale)</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip />
                    <Funnel
                      dataKey="value"
                      data={funnelData}
                      isAnimationActive
                    >
                      <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" style={{ fontSize: 11, fontWeight: 600 }} />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">Resumo do Funil</h3>
                <div className="space-y-3">
                  {funnelData.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{f.name}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  {totalLeads > 0 ? `Taxa global de fechamento: ${Math.round(((leads?.filter(l => l.status === 'vendido' || (l.status as any) === 'sold').length || 0) / totalLeads) * 100)}%` : 'Aguardando primeiros leads para cálculo de conversão.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
