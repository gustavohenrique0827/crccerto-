import React, { useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Plus, 
  ArrowUpRight, 
  BarChart3, 
  Receipt,
  Trash2,
  X,
  Check
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { exportToCSV } from '@/src/lib/exportUtils';

interface Transaction {
  id: string;
  patientName: string;
  service: string;
  amount: number;
  date: string;
  paymentMethod: string;
  clinic: string;
}

export default function SalesPerformance() {
  const { clinics, addToast } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('crm_transactions_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [newTx, setNewTx] = useState({
    patientName: '',
    service: 'Consulta Avaliação',
    amount: '',
    paymentMethod: 'PIX',
    clinic: clinics[0]?.name || 'Unidade Principal'
  });

  const saveTransactions = (list: Transaction[]) => {
    setTransactions(list);
    try {
      localStorage.setItem('crm_transactions_data', JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.patientName.trim()) {
      addToast('Informe o nome do paciente', 'error');
      return;
    }
    const val = parseFloat(newTx.amount.replace(/[^0-9.]/g, '')) || 0;
    if (val <= 0) {
      addToast('Informe um valor válido maior que zero', 'error');
      return;
    }

    const tx: Transaction = {
      id: String(Date.now()),
      patientName: newTx.patientName.trim(),
      service: newTx.service,
      amount: val,
      date: new Date().toISOString(),
      paymentMethod: newTx.paymentMethod,
      clinic: newTx.clinic
    };

    saveTransactions([tx, ...transactions]);
    setIsModalOpen(false);
    setNewTx({
      patientName: '',
      service: 'Consulta Avaliação',
      amount: '',
      paymentMethod: 'PIX',
      clinic: clinics[0]?.name || 'Unidade Principal'
    });
    addToast(`Receita de R$ ${val.toFixed(2)} registrada!`, 'success');
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    saveTransactions(updated);
    addToast('Transação removida.', 'info');
  };

  const totalRevenue = transactions.reduce((acc, t) => acc + t.amount, 0);
  const avgTicket = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  const stats = [
    { label: 'Receita Total Realizada', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { label: 'Ticket Médio', value: `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { label: 'Total de Vendas / Contratos', value: String(transactions.length) },
    { label: 'Unidades com Movimento', value: String(new Set(transactions.map(t => t.clinic)).size) },
  ];

  const handleExportSales = () => {
    if (transactions.length === 0) {
      addToast('Não há transações para exportar.', 'info');
      return;
    }
    const dataToExport = transactions.map(t => ({
      Paciente: t.patientName,
      Servico: t.service,
      Valor: t.amount,
      Data: t.date,
      FormaPagamento: t.paymentMethod,
      Clinica: t.clinic
    }));
    exportToCSV(dataToExport, 'desempenho_vendas_crm');
    addToast('Histórico de vendas exportado com sucesso!', 'success');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Desempenho Comercial & Vendas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe receitas faturadas, ticket médio e contratos fechados em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportSales}
            className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] px-3.5 py-2 rounded-[var(--radius-control)] text-sm font-bold shadow-[var(--shadow-control)] hover:bg-[var(--color-surface-sunken)] transition-all cursor-pointer"
            title="Exportar vendas para CSV"
          >
            <span>Exportar Dados</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[var(--color-primary-blue)] !text-white px-4 py-2 rounded-[var(--radius-control)] text-sm font-bold shadow-sm hover:brightness-110 transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus size={18} />
            Registrar Venda / Receita
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-[var(--color-surface-elevated)] p-6 rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] rounded-[var(--radius-control)]">
                <DollarSign size={20} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--color-surface-elevated)] rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Histórico de Transações</h3>
          <span className="text-xs font-semibold text-[var(--color-text-faint)]">{transactions.length} registro(s)</span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-[var(--radius-panel)] bg-[var(--color-surface-sunken)] text-[var(--color-text-faint)] mx-auto flex items-center justify-center mb-3">
              <Receipt size={24} />
            </div>
            <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Nenhuma venda registrada</h4>
            <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto mt-1 mb-4">
              Seu histórico financeiro de vendas está limpo. Registre a primeira venda ou integração de pagamento.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-[var(--color-primary-blue)] hover:brightness-110 !text-white rounded-[var(--radius-control)] text-xs font-bold transition-colors shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} />
              Registrar Primeira Venda
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[var(--color-surface-sunken)]">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Paciente</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Procedimento / Serviço</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Unidade</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Forma</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Valor</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest text-right">Data</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)] text-sm">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-[var(--color-surface-sunken)]/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-[var(--color-text-primary)]">{t.patientName}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)] text-xs font-medium">{t.service}</td>
                    <td className="px-6 py-4 text-[var(--color-text-faint)] text-xs">{t.clinic}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                        {t.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-[var(--color-success)]">
                      R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-[var(--color-text-faint)]">
                      {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-danger)] rounded-[var(--radius-control)] transition-colors cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Venda */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] w-full max-w-md rounded-[var(--radius-panel-lg)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
              <h3 className="font-bold text-[var(--color-text-primary)] text-base flex items-center gap-2">
                <DollarSign size={18} className="text-[var(--color-success)]" />
                Registrar Venda / Receita
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] rounded-[var(--radius-control)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-muted)]">Paciente</label>
                <input 
                  type="text" 
                  placeholder="Nome completo do paciente"
                  value={newTx.patientName}
                  onChange={e => setNewTx({ ...newTx, patientName: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none text-[var(--color-text-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-muted)]">Procedimento / Tratamento</label>
                <input 
                  type="text" 
                  placeholder="Ex: Implante Unitário, Clareamento, Harmonização..."
                  value={newTx.service}
                  onChange={e => setNewTx({ ...newTx, service: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none text-[var(--color-text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--color-text-muted)]">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Ex: 2500.00"
                    value={newTx.amount}
                    onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none text-[var(--color-text-primary)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--color-text-muted)]">Forma de Pagamento</label>
                  <select 
                    value={newTx.paymentMethod}
                    onChange={e => setNewTx({ ...newTx, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none text-[var(--color-text-primary)]"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-muted)]">Unidade</label>
                <select 
                  value={newTx.clinic}
                  onChange={e => setNewTx({ ...newTx, clinic: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none text-[var(--color-text-primary)]"
                >
                  {clinics.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[var(--color-primary-blue)] hover:brightness-110 !text-white text-xs font-bold rounded-[var(--radius-control)] shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Salvar Venda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
