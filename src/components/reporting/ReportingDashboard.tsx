import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Filter, 
  BarChart, 
  LineChart, 
  PieChart as PieChartIcon,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { exportToCSV } from '@/src/lib/exportUtils';

export default function ReportingDashboard() {
  const { leads, addToast } = useApp();

  const [appointmentsCount] = useState(() => {
    try {
      const raw = localStorage.getItem('crm_appointments_data');
      if (raw) {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.length : 0;
      }
    } catch {
      // ignore
    }
    return 0;
  });

  const [revenueTotal] = useState(() => {
    try {
      const raw = localStorage.getItem('crm_transactions_data');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          return arr.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
        }
      }
    } catch {
      // ignore
    }
    return 0;
  });

  const totalLeads = leads?.length || 0;
  const soldLeads = leads?.filter(l => l.status === 'vendido' || (l.status as any) === 'sold').length || 0;
  const retentionRate = totalLeads > 0 ? Math.round((soldLeads / totalLeads) * 100) : 0;

  const handleExportLeads = () => {
    if (totalLeads === 0) {
      addToast('Não há leads para exportar no momento.', 'info');
      return;
    }
    exportToCSV(leads, 'relatorio-leads-crm');
    addToast('Relatório de leads exportado com sucesso!', 'success');
  };

  const handleExportOperational = () => {
    try {
      const raw = localStorage.getItem('crm_appointments_data');
      const appts = raw ? JSON.parse(raw) : [];
      if (appts.length === 0) {
        addToast('Não há agendamentos para exportar no momento.', 'info');
        return;
      }
      exportToCSV(appts, 'relatorio-agendamentos-operacional');
      addToast('Relatório operacional exportado com sucesso!', 'success');
    } catch {
      addToast('Erro ao exportar dados operacionais.', 'error');
    }
  };

  const handleExportFinancial = () => {
    try {
      const raw = localStorage.getItem('crm_transactions_data');
      const txs = raw ? JSON.parse(raw) : [];
      if (txs.length === 0) {
        addToast('Não há transações financeiras registradas.', 'info');
        return;
      }
      exportToCSV(txs, 'relatorio-financeiro-vendas');
      addToast('Relatório financeiro exportado com sucesso!', 'success');
    } catch {
      addToast('Erro ao exportar relatório financeiro.', 'error');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[var(--color-primary-blue)]" />
            Relatórios & BI
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Extraia insights consolidados e exporte relatórios operacionais em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportLeads}
            className="bg-[var(--color-primary-blue)] text-white px-4 py-2 rounded-[var(--radius-control)] text-xs font-bold hover:opacity-95 transition-colors flex items-center gap-2 cursor-pointer shadow-[var(--shadow-control)]"
          >
            <Download size={15} />
            Exportar Leads (CSV)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Leads Registrados', value: String(totalLeads), icon: FileText },
          { label: 'Agendamentos', value: String(appointmentsCount), icon: Calendar },
          { label: 'Receita Faturada', value: `R$ ${revenueTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: BarChart },
          { label: 'Taxa de Conversão', value: `${retentionRate}%`, icon: PieChartIcon },
        ].map((item, i) => (
          <div key={i} className="bg-[var(--color-surface-elevated)] p-5 rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider">{item.label}</span>
              <div className="p-1.5 rounded-lg bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]">
                <item.icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--color-surface-elevated)] rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)] overflow-hidden">
        <div className="p-5 border-b border-[var(--color-border-default)]">
          <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Exportações Disponíveis</h3>
        </div>
        <div className="divide-y divide-[var(--color-border-subtle)]">
          <div className="p-5 flex items-center justify-between hover:bg-[var(--color-surface-sunken)] transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] rounded-lg">
                <FileText size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--color-text-primary)]">Relatório Completo de Leads & Canais</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 rounded border border-[var(--color-border-default)]">CRM</span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">Total: {totalLeads} registro(s)</span>
                </div>
              </div>
            </div>
            <button 
              onClick={handleExportLeads}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] transition-colors border border-[var(--color-border-default)] cursor-pointer"
            >
              <Download size={14} />
              Baixar CSV
            </button>
          </div>

          <div className="p-5 flex items-center justify-between hover:bg-[var(--color-surface-sunken)] transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] rounded-lg">
                <Calendar size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--color-text-primary)]">Relatório Operacional de Agendamentos</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 rounded border border-[var(--color-border-default)]">Operacional</span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">Total: {appointmentsCount} consulta(s)</span>
                </div>
              </div>
            </div>
            <button 
              onClick={handleExportOperational}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] transition-colors border border-[var(--color-border-default)] cursor-pointer"
            >
              <Download size={14} />
              Baixar CSV
            </button>
          </div>

          <div className="p-5 flex items-center justify-between hover:bg-[var(--color-surface-sunken)] transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] rounded-lg">
                <BarChart size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--color-text-primary)]">Relatório Financeiro de Vendas & Contratos</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 rounded border border-[var(--color-border-default)]">Financeiro</span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">Total: R$ {revenueTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={handleExportFinancial}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] transition-colors border border-[var(--color-border-default)] cursor-pointer"
            >
              <Download size={14} />
              Baixar CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
