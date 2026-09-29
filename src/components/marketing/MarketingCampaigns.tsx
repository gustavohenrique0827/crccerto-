import React, { useState } from 'react';
import { 
  Megaphone, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Trash2, 
  X, 
  Check, 
  BarChart3 
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { exportToCSV } from '@/src/lib/exportUtils';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: 'active' | 'paused' | 'completed';
  reach: number;
  clicks: number;
  leads: number;
  cost: number;
}

export default function MarketingCampaigns() {
  const { leads, addToast } = useApp();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const saved = localStorage.getItem('crm_marketing_campaigns');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    platform: 'Meta Ads',
    cost: '',
    status: 'active' as const
  });

  const saveCampaigns = (updated: Campaign[]) => {
    setCampaigns(updated);
    try {
      localStorage.setItem('crm_marketing_campaigns', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name.trim()) {
      addToast('Informe o nome da campanha', 'error');
      return;
    }

    const costNum = parseFloat(newCampaign.cost.replace(/[^0-9.]/g, '')) || 0;
    const leadsFromCampaign = leads.filter(l => 
      l.campaign?.toLowerCase().includes(newCampaign.name.toLowerCase()) || 
      (newCampaign.platform.toLowerCase().includes(l.source?.toLowerCase() || ''))
    ).length;

    const item: Campaign = {
      id: String(Date.now()),
      name: newCampaign.name.trim(),
      platform: newCampaign.platform,
      status: newCampaign.status,
      reach: 0,
      clicks: 0,
      leads: leadsFromCampaign,
      cost: costNum
    };

    saveCampaigns([item, ...campaigns]);
    setIsNewModalOpen(false);
    setNewCampaign({ name: '', platform: 'Meta Ads', cost: '', status: 'active' });
    addToast(`Campanha "${item.name}" registrada com sucesso!`, 'success');
  };

  const handleDeleteCampaign = (id: string) => {
    const updated = campaigns.filter(c => c.id !== id);
    saveCampaigns(updated);
    addToast('Campanha removida.', 'info');
  };

  const totalCost = campaigns.reduce((acc, c) => acc + c.cost, 0);
  const totalLeads = campaigns.reduce((acc, c) => acc + c.leads, leads.length);
  const cpl = totalLeads > 0 ? (totalCost / totalLeads) : 0;

  const handleExportCampaigns = () => {
    if (campaigns.length === 0) {
      addToast('Não há campanhas para exportar.', 'info');
      return;
    }
    const dataToExport = campaigns.map(c => ({
      Nome: c.name,
      Plataforma: c.platform,
      Status: c.status === 'active' ? 'Ativa' : c.status === 'paused' ? 'Pausada' : 'Finalizada',
      Alcance: c.reach,
      Cliques: c.clicks,
      LeadsGerados: c.leads,
      InvestimentoTotal: c.cost,
      CustoPorLead: c.leads > 0 ? (c.cost / c.leads).toFixed(2) : '0.00'
    }));
    exportToCSV(dataToExport, 'campanhas_marketing_crm');
    addToast('Campanhas exportadas com sucesso!', 'success');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Marketing & Aquisição</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Acompanhe a origem de leads por campanhas de Meta Ads, Google Ads e mídias pagas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCampaigns}
            className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] px-3.5 py-2 rounded-[var(--radius-control)] text-sm font-bold shadow-[var(--shadow-control)] hover:bg-[var(--color-surface-sunken)] transition-all cursor-pointer"
            title="Exportar campanhas para CSV"
          >
            <span>Exportar Dados</span>
          </button>
          <button 
            onClick={() => setIsNewModalOpen(true)}
            className="bg-[var(--color-primary-blue)] text-white px-4 py-2 rounded-[var(--radius-control)] text-sm font-bold shadow-[var(--shadow-control)] hover:opacity-90 transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus size={18} />
            <span>Criar Campanha</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--color-surface-elevated)] p-6 rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)]">
          <p className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest mb-1">Custo Médio por Lead (CPL)</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {cpl > 0 ? `R$ ${cpl.toFixed(2)}` : 'R$ 0,00'}
          </p>
          <p className="text-xs text-[var(--color-text-faint)] mt-2">Calculado com base em investimentos reais</p>
        </div>
        <div className="bg-[var(--color-surface-elevated)] p-6 rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)]">
          <p className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest mb-1">Campanhas Ativas</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {campaigns.filter(c => c.status === 'active').length}
          </p>
          <p className="text-xs text-[var(--color-text-faint)] mt-2">Em veiculação no momento</p>
        </div>
        <div className="bg-[var(--color-surface-elevated)] p-6 rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)]">
          <p className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest mb-1">Total de Leads Rastreados</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{leads.length}</p>
          <p className="text-xs text-[var(--color-text-faint)] mt-2">Leads reais no pipeline do CRM</p>
        </div>
      </div>

      <div className="bg-[var(--color-surface-elevated)] rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border-default)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Campanhas Registradas</h3>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-blue-500/10 text-[var(--color-primary-blue)] text-[10px] font-bold rounded-lg uppercase">Meta Ads</span>
            <span className="px-2 py-1 bg-rose-500/10 text-[var(--color-danger)] text-[10px] font-bold rounded-lg uppercase">Google Ads</span>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] mx-auto flex items-center justify-center mb-3">
              <Megaphone size={24} />
            </div>
            <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Nenhuma campanha cadastrada</h4>
            <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto mt-1 mb-4">
              Cadastre suas campanhas de anúncios para acompanhar a conversão de leads e custos de aquisição.
            </p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2 bg-[var(--color-primary-blue)] hover:opacity-90 text-white rounded-[var(--radius-control)] text-xs font-bold transition-colors shadow-[var(--shadow-control)] inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} />
              Cadastrar Primeira Campanha
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--color-surface-sunken)]">
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest">Campanha</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest text-center">Orçamento / Custo</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest text-center">Leads Gerados</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest text-right">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-[var(--color-surface-sunken)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] rounded-lg">
                          <Megaphone size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--color-text-primary)]">{camp.name}</p>
                          <p className="text-[10px] font-medium text-[var(--color-text-faint)] uppercase tracking-wide">{camp.platform}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold text-[var(--color-text-primary)]">
                      {camp.cost > 0 ? `R$ ${camp.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-[var(--color-primary-blue)]">
                      {camp.leads}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        camp.status === 'active' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' :
                        camp.status === 'paused' ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' :
                        'bg-[var(--color-surface-sunken)] text-[var(--color-text-faint)]'
                      }`}>
                        {camp.status === 'active' ? 'Ativa' : camp.status === 'paused' ? 'Pausada' : 'Finalizada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteCampaign(camp.id)}
                        className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-danger)] rounded-lg transition-colors cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Campaign Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] w-full max-w-md rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-3">
              <h3 className="font-bold text-[var(--color-text-primary)] text-base flex items-center gap-2">
                <Megaphone size={18} className="text-[var(--color-primary-blue)]" />
                Cadastrar Campanha
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-primary)]">Nome da Campanha</label>
                <input 
                  type="text" 
                  placeholder="Ex: Campanha Implantes Google"
                  value={newCampaign.name}
                  onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-primary)]">Plataforma</label>
                <select 
                  value={newCampaign.platform}
                  onChange={e => setNewCampaign({ ...newCampaign, platform: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none"
                >
                  <option value="Meta Ads (Facebook & Instagram)">Meta Ads (Facebook & Instagram)</option>
                  <option value="Google Ads (Pesquisa & Display)">Google Ads (Pesquisa & Display)</option>
                  <option value="TikTok Ads">TikTok Ads</option>
                  <option value="WhatsApp Direto">WhatsApp Direto</option>
                  <option value="Indicação / Parcerias">Indicação / Parcerias</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-primary)]">Orçamento / Gasto Total (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Ex: 1500.00"
                  value={newCampaign.cost}
                  onChange={e => setNewCampaign({ ...newCampaign, cost: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-primary)]">Status</label>
                <select 
                  value={newCampaign.status}
                  onChange={e => setNewCampaign({ ...newCampaign, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none"
                >
                  <option value="active">Ativa</option>
                  <option value="paused">Pausada</option>
                  <option value="completed">Finalizada</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-default)]">
                <button 
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[var(--color-primary-blue)] hover:opacity-90 text-white text-xs font-bold rounded-[var(--radius-control)] shadow-[var(--shadow-control)] cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Salvar Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
