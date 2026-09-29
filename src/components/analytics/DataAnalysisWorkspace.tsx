import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  Target, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  Download,
  Share2,
  Globe,
  Facebook,
  Instagram,
  Search,
  CheckCircle2,
  XCircle,
  ShoppingBag
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { exportToCSV } from '@/src/lib/exportUtils';

export default function DataAnalysisWorkspace() {
  const { leads, addToast } = useApp();
  const [dateRange, setDateRange] = useState('30d');

  // Real appointments from local storage
  const appointmentsList = useMemo(() => {
    try {
      const raw = localStorage.getItem('crm_appointments_data');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }, []);

  // Real marketing campaigns from local storage
  const campaignsList = useMemo(() => {
    try {
      const raw = localStorage.getItem('crm_marketing_campaigns');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }, []);

  const totalLeads = leads?.length || 0;
  const totalAppointments = appointmentsList.length;
  const totalAttended = appointmentsList.filter((a: any) => String(a.status).toLowerCase().includes('realiz')).length;
  const totalNoShow = appointmentsList.filter((a: any) => String(a.status).toLowerCase().includes('falt') || String(a.status).toLowerCase().includes('cancel')).length;
  const totalSold = leads?.filter(l => l.status === 'vendido' || (l.status as any) === 'sold').length || 0;

  // Meta campaigns
  const metaCampaigns = useMemo(() => {
    return campaignsList.filter((c: any) => c.platform === 'meta' || c.platform === 'instagram' || c.platform === 'facebook');
  }, [campaignsList]);

  // Google campaigns
  const googleCampaigns = useMemo(() => {
    return campaignsList.filter((c: any) => c.platform === 'google');
  }, [campaignsList]);

  const metaSpend = metaCampaigns.reduce((acc: number, c: any) => acc + (Number(c.budget) || 0), 0);
  const googleSpend = googleCampaigns.reduce((acc: number, c: any) => acc + (Number(c.budget) || 0), 0);

  const metaLeadsCount = leads?.filter(l => (l.sourceId || '').toLowerCase().includes('meta') || (l.sourceId || '').toLowerCase().includes('insta') || (l.sourceId || '').toLowerCase().includes('face')).length || 0;
  const googleLeadsCount = leads?.filter(l => (l.sourceId || '').toLowerCase().includes('google')).length || 0;

  const handleExport = () => {
    const reportData = [
      { Metrica: 'Leads', Valor: totalLeads },
      { Metrica: 'Agendamentos', Valor: totalAppointments },
      { Metrica: 'Presenças', Valor: totalAttended },
      { Metrica: 'Faltas/Cancelamentos', Valor: totalNoShow },
      { Metrica: 'Vendas Concluídas', Valor: totalSold },
    ];
    exportToCSV(reportData, `analise-dados-trafego-${dateRange}`);
    addToast('Relatório de Análise de Dados exportado com sucesso!', 'success');
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Análise de Dados & Tráfego
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Central de inteligência operacional para tráfego pago, mídia orgânica e conversão.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download size={15} className="text-slate-400" />
            <span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
        {[
          { id: 'hoje', label: 'Hoje' },
          { id: 'ontem', label: 'Ontem' },
          { id: '7d', label: '7 dias' },
          { id: '30d', label: '30 dias' },
          { id: 'custom', label: 'Personalizado' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDateRange(tab.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
              dateRange === tab.id
                ? "bg-blue-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Seção 1: Visão Geral */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Visão Geral Consolidada</h3>
            <p className="text-xs text-slate-500 mt-0.5">Métricas operacionais calculadas em tempo real.</p>
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-full uppercase tracking-wider">
            Geral
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6">
          {[
            { label: 'Leads Totais', value: String(totalLeads), change: 'Base Real', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
            { label: 'Agendamentos', value: String(totalAppointments), change: 'Base Real', icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
            { label: 'Presenças', value: String(totalAttended), change: 'Concluídos', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
            { label: 'Faltas / Canc.', value: String(totalNoShow), change: 'Auditado', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/40' },
            { label: 'Vendas Concluídas', value: String(totalSold), change: 'Fechados', icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.bg)}>
                  <item.icon size={16} className={item.color} />
                </div>
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {item.change}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{item.label}</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">{item.value}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seção 2: Tráfego (Meta e Google) */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Tráfego Pago & Campanhas</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meta Ads */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Facebook size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Meta Ads (Facebook & Instagram)</h3>
                  <p className="text-xs text-slate-500">Mídia de aquisição de leads</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Investimento Total</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">R$ {metaSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Investimento</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">R$ {metaSpend}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Leads</p>
                <p className="text-xs font-bold text-blue-600 mt-1">{metaLeadsCount}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">CPL Médio</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                  {metaLeadsCount > 0 ? `R$ ${(metaSpend / metaLeadsCount).toFixed(2)}` : 'R$ 0,00'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Campanhas</p>
                <p className="text-xs font-bold text-emerald-600 mt-1">{metaCampaigns.length}</p>
              </div>
            </div>

            {/* Campanhas Meta */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Campanhas Ativas</p>
              {metaCampaigns.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500">Nenhuma campanha cadastrada na aba Marketing.</p>
                </div>
              ) : (
                metaCampaigns.map((camp: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div>
                      <p className="text-xs font-medium text-slate-900 dark:text-white">{camp.name}</p>
                      <p className="text-[10px] text-slate-500">Orçamento: R$ {camp.budget || '0'}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                      {camp.status || 'Ativa'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Google Ads */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Search size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Google Ads (Search & Display)</h3>
                  <p className="text-xs text-slate-500">Busca e intenção de alta conversão</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Investimento Total</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">R$ {googleSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Investimento</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">R$ {googleSpend}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Leads</p>
                <p className="text-xs font-bold text-blue-600 mt-1">{googleLeadsCount}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">CPL Médio</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                  {googleLeadsCount > 0 ? `R$ ${(googleSpend / googleLeadsCount).toFixed(2)}` : 'R$ 0,00'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Campanhas</p>
                <p className="text-xs font-bold text-emerald-600 mt-1">{googleCampaigns.length}</p>
              </div>
            </div>

            {/* Campanhas Google */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Campanhas Ativas</p>
              {googleCampaigns.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500">Nenhuma campanha Google cadastrada.</p>
                </div>
              ) : (
                googleCampaigns.map((camp: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div>
                      <p className="text-xs font-medium text-slate-900 dark:text-white">{camp.name}</p>
                      <p className="text-[10px] text-slate-500">Orçamento: R$ {camp.budget || '0'}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                      {camp.status || 'Ativa'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
