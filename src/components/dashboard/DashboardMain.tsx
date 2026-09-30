import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Sparkles, 
  Building2, 
  ArrowRight, 
  UserX, 
  DollarSign, 
  MousePointerClick,
  TrendingUp,
  MessageSquare,
  Instagram
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
import { cn } from '../../lib/utils';
import DashboardFilters from './DashboardFilters';
import DayTaskResolverModal, { TaskCategoryType } from './DayTaskResolverModal';
import TaskReminders from './TaskReminders';
import ChannelConversionChart from '../analytics/ChannelConversionChart';
import { useApp } from '../../context/AppContext';
import { useSupabaseDashboardStats } from '../../lib/supabase';
import { StatCellRow, StatItem } from '../ui/StatCellRow';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface DashboardMainProps {
  selectedClinicId: string;
}

function MetaIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 13c-2-3-4-5-6.5-5A4.5 4.5 0 0 0 1 12.5 4.5 4.5 0 0 0 5.5 17c2.5 0 4.5-2 6.5-5Z" />
      <path d="M12 13c2-3 4-5 6.5-5a4.5 4.5 0 0 1 4.5 4.5 4.5 4.5 0 0 1-4.5 4.5c-2.5 0-4.5-2-6.5-5Z" />
    </svg>
  );
}

function GoogleIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

function renderChannelIcon(name: string) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('meta') || lower.includes('face')) {
    return <MetaIcon size={18} />;
  }
  if (lower.includes('google')) {
    return <GoogleIcon size={18} />;
  }
  if (lower.includes('insta')) {
    return <Instagram size={18} />;
  }
  return <MessageSquare size={18} />;
}

export default function DashboardMain({ selectedClinicId }: DashboardMainProps) {
  const { clinics, setActiveTab, addToast } = useApp();
  const [selectedRange, setSelectedRange] = useState('30d');
  
  const { stats, health, loading } = useSupabaseDashboardStats(selectedClinicId, selectedRange);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskCategory, setTaskCategory] = useState<TaskCategoryType>('today_pending');

  const openTaskModal = (category: TaskCategoryType) => {
    setTaskCategory(category);
    setIsTaskModalOpen(true);
  };

  const handleChannelClick = () => {
    setActiveTab('analise-dados');
  };

  const isConsolidated = selectedClinicId === 'all';
  const currentClinicObj = clinics.find(c => c.id === selectedClinicId);

  if (loading || !stats) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary-blue)]" />
        <p className="text-xs font-bold text-[var(--color-text-faint)] animate-pulse">
          Sincronizando métricas operacionais...
        </p>
      </div>
    );
  }

  // Health / Main KPI Stats array for StatCellRow (grid 1/2/4)
  const healthStatItems: StatItem[] = [
    {
      id: 'kpi-leads',
      label: 'CAPTAÇÃO DE LEADS',
      value: stats.leads,
      hint: '+18.5% no período selec.',
      icon: <Users size={18} />,
      tone: 'info'
    },
    {
      id: 'kpi-appointments',
      label: 'CONSULTAS AGENDADAS',
      value: stats.appointments,
      hint: '+12.0% em relação ao mês ant.',
      icon: <Calendar size={18} />,
      tone: 'neutral'
    },
    {
      id: 'kpi-confirmations',
      label: 'CONFIRMAÇÕES DE PRESENÇA',
      value: stats.confirmations,
      hint: stats.appointments > 0 ? `${Math.round((stats.confirmations / stats.appointments) * 100)}% de taxa de presença` : '92% de presença',
      icon: <CheckCircle2 size={18} />,
      tone: 'success'
    },
    {
      id: 'kpi-followups',
      label: 'RÉGUA DE FOLLOW-UPS',
      value: stats.followups,
      hint: `${stats.followups} interações pendentes`,
      icon: <Activity size={18} />,
      tone: 'warning'
    }
  ];

  return (
    <div className="max-w-[1600px] mx-auto pb-12 space-y-8 animate-fade-in">
      {/* 1. TOP HEADER & FILTER BAR */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--color-border-default)]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
                {isConsolidated ? 'Visão Geral da Rede Consolidada' : currentClinicObj?.name || 'Visão da Unidade'}
              </h1>
              <Badge variant="success">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                <span>Em Tempo Real</span>
              </Badge>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 font-medium">
              Acompanhamento integrado de leads, agendamentos, confirmações e taxa de conversão comercial.
            </p>
          </div>

          <DashboardFilters 
            selectedRange={selectedRange} 
            onRangeChange={(range) => setSelectedRange(range)} 
          />
        </div>

        {/* 2. OVERVIEW METRICS VIA StatCellRow (GRID 1/2/4) */}
        <StatCellRow stats={healthStatItems} cols={4} />
      </div>

      {/* 2.5 LEMBRETES DE TAREFAS PERTO DO VENCIMENTO */}
      <TaskReminders />

      {/* 3. VISÃO DO DIA & TAREFAS OPERACIONAIS */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--color-primary-blue)]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)]">
              Painel Operacional do Dia & Fechamentos
            </h2>
          </div>
          <span className="text-xs text-[var(--color-text-faint)] flex items-center gap-1 font-medium">
            <MousePointerClick size={14} className="text-[var(--color-primary-blue)]" />
            Clique em qualquer bloco para resolver agendamentos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* HOJE */}
          <div 
            onClick={() => openTaskModal('today_pending')}
            className="p-4 rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] hover:border-[var(--color-warning)] transition-all cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Calendar size={14} className="text-[var(--color-warning)]" />
                Hoje (Consultas)
              </span>
              {stats.todayPendingConfirmations > 0 ? (
                <Badge variant="warning">
                  {stats.todayPendingConfirmations} Pendentes
                </Badge>
              ) : (
                <Badge variant="success">
                  Em dia
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                  {stats.todayConfirmedAppointments}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] font-medium">Confirmados hoje</p>
              </div>
              <Button size="xs" variant="warning">
                Resolver ({stats.todayPendingConfirmations})
              </Button>
            </div>
          </div>

          {/* AMANHÃ */}
          <div 
            onClick={() => openTaskModal('tomorrow_pending')}
            className="p-4 rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] hover:border-[var(--color-primary-blue)] transition-all cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Clock size={14} className="text-[var(--color-primary-blue)]" />
                Amanhã (Agendamentos)
              </span>
              <Badge variant="info">
                {stats.tomorrowPendingConfirmations} a Confirmar
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                  {stats.tomorrowConfirmedAppointments}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] font-medium">Confirmados amanhã</p>
              </div>
              <Button size="xs" variant="info">
                Confirmar
              </Button>
            </div>
          </div>

          {/* ONTEM (RECUPERAÇÃO) */}
          <div 
            onClick={() => openTaskModal('yesterday_missed')}
            className="p-4 rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] hover:border-[var(--color-danger)] transition-all cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <UserX size={14} className="text-[var(--color-danger)]" />
                Ontem (Recuperação)
              </span>
              <Badge variant="danger">
                {stats.yesterdayNoShows} Faltas
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                  {stats.yesterdayAttendance}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] font-medium">Compareceram ontem</p>
              </div>
              <Button size="xs" variant="danger">
                Recuperar ({stats.yesterdayNoShows})
              </Button>
            </div>
          </div>

          {/* VENDAS */}
          <div 
            onClick={() => openTaskModal('yesterday_closed')}
            className="p-4 rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] hover:border-[var(--color-success)] transition-all cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <DollarSign size={14} className="text-[var(--color-success)]" />
                Vendas Realizadas
              </span>
              <Badge variant="success">
                Fechamentos
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                  {stats.yesterdayClosings}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] font-medium">Contratos fechados</p>
              </div>
              <Button size="xs" variant="success">
                Ver Vendas
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. CANAIS DE CAPTAÇÃO */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black tracking-tight text-[var(--color-text-primary)]">Canais de Captação</h2>
            <p className="text-xs text-[var(--color-text-muted)]">Desempenho detalhado por origem de tráfego e plataforma.</p>
          </div>
          <Button variant="ghost" size="xs" onClick={handleChannelClick}>
            <span>Análise Detalhada de Canais</span>
            <ArrowRight size={13} />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(stats.channelsPerformance || []).map((channel: any, i: number) => (
            <Card
              key={i} 
              onClick={handleChannelClick}
              className="hover:border-[var(--color-primary-blue)]/50 transition-all cursor-pointer group space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] flex items-center justify-center text-[var(--color-text-primary)] font-bold border border-[var(--color-border-default)]">
                    {renderChannelIcon(channel.name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--color-text-primary)] text-xs sm:text-sm group-hover:text-[var(--color-primary-blue)] transition-colors">
                      {channel.name}
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-faint)] font-medium">{channel.sub}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1 pt-3 border-t border-[var(--color-border-subtle)] text-center">
                <div className="py-0.5">
                  <p className="text-[9px] font-bold text-[var(--color-text-faint)] uppercase">Leads</p>
                  <p className="text-xs font-bold text-[var(--color-text-primary)] mt-0.5 tabular-nums">{channel.leads}</p>
                </div>
                <div className="py-0.5">
                  <p className="text-[9px] font-bold text-[var(--color-text-faint)] uppercase">Agend.</p>
                  <p className="text-xs font-bold text-[var(--color-text-primary)] mt-0.5 tabular-nums">{channel.appointments}</p>
                </div>
                <div className="py-0.5">
                  <p className="text-[9px] font-bold text-[var(--color-text-faint)] uppercase">Pres.</p>
                  <p className="text-xs font-bold text-[var(--color-success)] mt-0.5 tabular-nums">{channel.attendance}</p>
                </div>
                <div className="py-0.5">
                  <p className="text-[9px] font-bold text-[var(--color-text-faint)] uppercase">Faltas</p>
                  <p className="text-xs font-bold text-[var(--color-danger)] mt-0.5 tabular-nums">{channel.misses}</p>
                </div>
                <div className="py-0.5">
                  <p className="text-[9px] font-bold text-[var(--color-text-faint)] uppercase">Vendas</p>
                  <p className="text-xs font-bold text-[var(--color-warning)] mt-0.5 tabular-nums">{channel.sales}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 5. GRÁFICOS & INSIGHTS CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ChannelConversionChart selectedClinicId={selectedClinicId} />

          {/* Destaques dos Anúncios */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                Desempenho por Anúncio e Campanha
              </h2>
              <Button variant="ghost" size="xs" onClick={handleChannelClick}>
                <span>Ver Todos</span>
                <ArrowRight size={13} />
              </Button>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-default)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    <th className="px-4 py-2.5 font-bold">Canal / Anúncio</th>
                    <th className="px-4 py-2.5 text-center font-bold">Leads</th>
                    <th className="px-4 py-2.5 text-center font-bold">Agendamentos</th>
                    <th className="px-4 py-2.5 text-center font-bold">Presença</th>
                    <th className="px-4 py-2.5 text-right font-bold">Participação %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {stats.channelHighlights && stats.channelHighlights.length > 0 ? (
                    (stats.channelHighlights || []).map((item: any, idx: number) => (
                      <tr 
                        key={idx} 
                        onClick={handleChannelClick}
                        className="hover:bg-[var(--color-surface-sunken)]/60 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[var(--color-primary-blue)] shrink-0" />
                            <div>
                              <p className="group-hover:text-[var(--color-primary-blue)] transition-colors font-bold flex items-center gap-2">
                                {item.channel}
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] font-medium">
                                  {item.tag}
                                </span>
                              </p>
                              <p className="text-[11px] font-normal text-[var(--color-text-faint)]">{item.ad}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-medium tabular-nums text-[var(--color-text-primary)]">{item.leads}</td>
                        <td className="px-4 py-3 text-center font-medium tabular-nums text-[var(--color-text-primary)]">{item.appointments}</td>
                        <td className="px-4 py-3 text-center font-bold tabular-nums text-[var(--color-success)]">{item.attendance}</td>
                        <td className="px-4 py-3 text-right font-black tabular-nums text-[var(--color-primary-blue)]">{item.percentage}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[var(--color-text-faint)] font-medium">
                        Nenhum anúncio ou campanha registrada no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Insight Card Theme-Aware */}
        <div className="space-y-6">
          <Card className="bg-[var(--color-surface-sunken)] border-[var(--color-border-default)] space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-[var(--radius-control)] bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] border border-[var(--color-primary-blue)]/20 shrink-0">
                <Sparkles size={18} />
              </div>
              <h3 className="text-xs font-bold tracking-wide uppercase text-[var(--color-text-primary)]">
                Análise de Desempenho
              </h3>
            </div>
            
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-normal">
              {isConsolidated 
                ? 'Sua rede apresenta acompanhamento contínuo de conversão. O tempo médio de resposta aos leads captados via Meta e Google Ads influencia diretamente na taxa de agendamento.'
                : `Unidade ${currentClinicObj?.name}: ${health.summaryText} ${health.recommendation}`
              }
            </p>

            <div className="pt-2">
              <Button 
                onClick={handleChannelClick}
                className="w-full"
              >
                <span>Ver Relatório de Tráfego</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </Card>

          {/* Volume Semanal */}
          <Card className="space-y-4">
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
              Volume Semanal
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { day: 'Seg', agendamentos: Math.round(stats.appointments * 0.18), comparecimentos: Math.round(stats.confirmations * 0.16) },
                    { day: 'Ter', agendamentos: Math.round(stats.appointments * 0.22), comparecimentos: Math.round(stats.confirmations * 0.20) },
                    { day: 'Qua', agendamentos: Math.round(stats.appointments * 0.20), comparecimentos: Math.round(stats.confirmations * 0.18) },
                    { day: 'Qui', agendamentos: Math.round(stats.appointments * 0.25), comparecimentos: Math.round(stats.confirmations * 0.24) },
                    { day: 'Sex', agendamentos: Math.round(stats.appointments * 0.15), comparecimentos: Math.round(stats.confirmations * 0.14) },
                    { day: 'Sáb', agendamentos: 0, comparecimentos: 0 },
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-default)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 500, fill: 'var(--color-text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-elevated)', borderRadius: '8px', border: '1px solid var(--color-border-default)', fontSize: '12px', color: 'var(--color-text-primary)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }} />
                  <Bar dataKey="agendamentos" name="Agendamentos" fill="var(--color-primary-blue)" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="comparecimentos" name="Comparecimentos" fill="var(--color-success)" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Task Resolver Modal */}
      <DayTaskResolverModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        initialCategory={taskCategory}
      />
    </div>
  );
}
