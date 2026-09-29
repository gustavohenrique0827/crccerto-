import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar, 
  Download, 
  ChevronDown, 
  Upload, 
  FileDown, 
  X, 
  UserCheck, 
  Globe,
  MessageCircle,
  Building2,
  Trash2
} from 'lucide-react';
import { Lead, LeadStatus } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { exportLeadsPDF } from '@/src/lib/pdf-export';
import { exportToCSV } from '@/src/lib/exportUtils';
import { fetchLeadsFromDb, deleteLeadFromDb, updateLeadInDb } from '@/src/lib/supabase';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';

interface LeadTableProps {
  globalSearchTerm?: string;
  onSelectLead?: (lead: Lead) => void;
}

export default function LeadTable({ globalSearchTerm = '', onSelectLead }: LeadTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast, clinics, currentClinicId } = useApp();

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map(l => l.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkUpdate = async (status: string) => {
    for (const id of selectedIds) {
      await updateLeadInDb(id, { status: status as LeadStatus });
    }
    const updated = await fetchLeadsFromDb(currentClinicId);
    setLeads(updated);
    addToast(`${selectedIds.length} leads atualizados para "${status}"`, 'success');
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (confirm(`Deseja realmente excluir ${selectedIds.length} leads?`)) {
      for (const id of selectedIds) {
        await deleteLeadFromDb(id);
      }
      const updated = await fetchLeadsFromDb(currentClinicId);
      setLeads(updated);
      addToast(`${selectedIds.length} leads excluídos com sucesso.`, 'info');
      setSelectedIds([]);
    }
  };

  const handleExportPDF = () => {
    if (filteredLeads.length === 0) {
      addToast('Não há leads para exportar.', 'info');
      return;
    }
    exportLeadsPDF(filteredLeads, statusFilter !== 'all' ? `Leads - Status: ${statusFilter}` : 'Relatório Geral de Leads');
    addToast('PDF gerado com sucesso!', 'success');
  };

  useEffect(() => {
    setLoading(true);
    fetchLeadsFromDb(currentClinicId)
      .then(data => {
        setLeads(data);
        setLoading(false);
      })
      .catch(err => {
        console.warn('Erro ao carregar leads:', err);
        setLoading(false);
      });
  }, [currentClinicId]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchLeadsFromDb(currentClinicId).then(data => setLeads(data));
    };
    window.addEventListener('crm_leads_updated', handleUpdate);
    return () => window.removeEventListener('crm_leads_updated', handleUpdate);
  }, [currentClinicId]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'novo': return 'info';
      case 'em_contato': return 'warning';
      case 'agendamento': return 'purple';
      case 'compareceu': return 'success';
      case 'perdido': return 'danger';
      default: return 'neutral';
    }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      addToast('Por favor, selecione um arquivo CSV válido.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        if (lines.length < 2) {
          addToast('Arquivo CSV vazio ou sem registros.', 'error');
          return;
        }

        const newLeads: Lead[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols[0]) {
            newLeads.push({
              id: 'lead_imp_' + Date.now() + '_' + i,
              name: cols[0],
              whatsapp: cols[1] || cols[2] || '',
              phone: cols[1] || '',
              email: cols[2] && cols[2].includes('@') ? cols[2] : '',
              status: (cols[3] as LeadStatus) || LeadStatus.NEW,
              procedureType: cols[4] || 'Avaliação Inicial',
              estimatedValue: Number(cols[5]) || 2500,
              sourceId: cols[6] || 'Importação CSV',
              responsibleName: cols[7] || 'Equipe Comercial',
              clinicId: clinics[0]?.id || '1',
              createdAt: new Date().toISOString(),
              lastInteractionAt: new Date().toISOString(),
              priority: 'medium',
              tags: ['importado']
            });
          }
        }

        if (newLeads.length > 0) {
          setLeads(prev => [...newLeads, ...prev]);
          addToast(`${newLeads.length} leads importados com sucesso!`, 'success');
        }
      } catch (err: any) {
        addToast(`Erro ao processar CSV: ${err.message}`, 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const downloadCSV = () => {
    if (filteredLeads.length === 0) {
      addToast('Não há leads filtrados para exportar.', 'info');
      return;
    }
    const exportData = filteredLeads.map(lead => {
      const clinicName = clinics.find(c => c.id === lead.clinicId)?.name || 'Unidade';
      return {
        Nome: lead.name,
        Telefone: lead.whatsapp || lead.phone || '',
        Email: lead.email || '',
        Status: lead.status,
        Procedimento: lead.procedureType || '',
        ValorEstimado: lead.estimatedValue || 0,
        Origem: lead.sourceId || '',
        Responsavel: lead.responsibleName || '',
        Clinica: clinicName,
        DataCriacao: new Date(lead.createdAt).toLocaleDateString('pt-BR')
      };
    });
    exportToCSV(exportData, 'relatorio_leads_crm');
    addToast('Exportação CSV realizada com sucesso!', 'success');
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const searchStr = (localSearch || globalSearchTerm).toLowerCase();
      const matchesSearch = !searchStr || 
        lead.name.toLowerCase().includes(searchStr) || 
        lead.whatsapp.toLowerCase().includes(searchStr) ||
        lead.email.toLowerCase().includes(searchStr);
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesOrigin = originFilter === 'all' || lead.sourceId === originFilter;
      const matchesResponsible = responsibleFilter === 'all' || 
        (lead.responsibleId === responsibleFilter) || 
        (lead.responsibleName && lead.responsibleName.toLowerCase().includes(responsibleFilter.toLowerCase()));

      const leadDate = new Date(lead.createdAt);
      const now = new Date();
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = leadDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        matchesDate = leadDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        matchesDate = leadDate >= monthAgo;
      }

      return matchesSearch && matchesStatus && matchesOrigin && matchesResponsible && matchesDate;
    });
  }, [leads, localSearch, globalSearchTerm, statusFilter, originFilter, responsibleFilter, dateFilter]);

  if (loading) return (
    <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[var(--color-surface-sunken)] rounded-[var(--radius-panel)]" />)}
    </div>
  );

  return (
    <Card className="p-0 overflow-hidden space-y-0 border-[var(--color-border-default)]">
      {/* Standard Filter Bar with Pill Tabs Container */}
      <div className="p-3 sm:p-4 border-b border-[var(--color-border-default)] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--color-surface-sunken)]/60">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-faint)]" />
            <input 
              type="text" 
              placeholder="Filtrar por nome, zap ou e-mail..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] focus:border-[var(--color-primary-blue)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-faint)] outline-none transition-all w-full sm:w-60"
            />
          </div>

          {/* Status Filter Pill Tabs Container */}
          <div className="bg-[var(--color-surface-sunken)] p-1 rounded-[var(--radius-control)] border border-[var(--color-border-default)] inline-flex items-center gap-1 overflow-x-auto max-w-full custom-scrollbar">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'novo', label: 'Novos' },
              { id: 'em_contato', label: 'Contato' },
              { id: 'agendamento', label: 'Agendados' },
              { id: 'compareceu', label: 'Compareceu' },
              { id: 'perdido', label: 'Perdidos' }
            ].map(tab => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-[var(--radius-control)] text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                    isActive
                      ? "bg-[var(--color-primary-blue)] !text-white shadow-xs"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <Button 
            variant={showAdvancedFilters ? "info" : "outline"}
            size="xs"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <Filter size={13} />
            <span>Filtros</span>
          </Button>

          <Button 
            variant="ghost"
            size="xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={13} />
            <span>Importar</span>
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
            accept=".csv" 
            className="hidden" 
          />

          <div className="relative group">
            <Button variant="outline" size="xs">
              <Download size={13} />
              <span>Exportar</span>
              <ChevronDown size={12} />
            </Button>
            <div className="absolute right-0 top-full mt-1 w-40 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] py-1 z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button 
                type="button"
                onClick={handleExportPDF} 
                className="w-full px-4 py-2 text-left text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] flex items-center gap-2 cursor-pointer"
              >
                <FileDown size={14} /> Documento PDF
              </button>
              <button 
                type="button"
                onClick={downloadCSV} 
                className="w-full px-4 py-2 text-left text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] flex items-center gap-2 cursor-pointer"
              >
                <Download size={14} /> Planilha CSV
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-[var(--color-text-muted)] font-medium">
          Exibindo <span className="text-[var(--color-text-primary)] font-bold tabular-nums">{filteredLeads.length}</span> leads
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showAdvancedFilters && (
        <div className="p-4 sm:p-5 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-default)] animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
                <Globe size={12} className="text-[var(--color-primary-blue)]" />
                Origem do Lead
              </label>
              <select 
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs font-medium outline-none text-[var(--color-text-primary)]"
              >
                <option value="all">Todas as Origens</option>
                <option value="facebook_ads">Facebook Ads</option>
                <option value="google_ads">Google Ads</option>
                <option value="instagram">Instagram</option>
                <option value="indicacao">Indicação</option>
                <option value="site">Site Institucional</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
                <UserCheck size={12} className="text-[var(--color-primary-blue)]" />
                Responsável
              </label>
              <select 
                value={responsibleFilter}
                onChange={(e) => setResponsibleFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs font-medium outline-none text-[var(--color-text-primary)]"
              >
                <option value="all">Todos os Responsáveis</option>
                <option value="gustavo">Gustavo Admin</option>
                <option value="ana">Ana Beatriz</option>
                <option value="ricardo">Ricardo Lima</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} className="text-[var(--color-success)]" />
                Data de Criação
              </label>
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs font-medium outline-none text-[var(--color-text-primary)]"
              >
                <option value="all">Todo o Período</option>
                <option value="today">Hoje</option>
                <option value="week">Últimos 7 dias</option>
                <option value="month">Último mês</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOriginFilter('all');
                  setResponsibleFilter('all');
                  setDateFilter('all');
                  setStatusFilter('all');
                  setLocalSearch('');
                }}
                className="w-full text-[var(--color-danger)]"
              >
                <X size={14} />
                Limpar Filtros
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* High Density Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[720px] text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-default)] text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-6 py-3.5 w-4">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-[var(--color-border-default)] text-[var(--color-primary-blue)] focus:ring-[var(--color-primary-blue)] cursor-pointer"
                />
              </th>
              <th className="px-6 py-3.5">Lead</th>
              <th className="px-6 py-3.5">Unidade</th>
              <th className="px-6 py-3.5">Origem</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Responsável</th>
              <th className="px-6 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {filteredLeads.map((lead) => {
              const isSelected = selectedIds.includes(lead.id);
              const mockResponsible = parseInt(lead.id.replace(/\D/g, '')) % 3 === 0 ? 'Gustavo' : 'Ana B.';

              return (
                <tr 
                  key={lead.id} 
                  onClick={() => onSelectLead?.(lead)}
                  className={cn(
                    "transition-colors group cursor-pointer",
                    isSelected 
                      ? "bg-[var(--color-primary-blue)]/10" 
                      : "hover:bg-[var(--color-surface-sunken)]/50"
                  )}
                >
                  <td className="px-6 py-3.5">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={(e) => toggleSelectOne(lead.id, e as any)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-[var(--color-border-default)] text-[var(--color-primary-blue)] cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] font-bold text-xs flex items-center justify-center shrink-0">
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--color-text-primary)] leading-none">{lead.name}</p>
                        <p className="text-[11px] text-[var(--color-text-faint)] mt-1">{lead.whatsapp}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <Building2 className="w-3.5 h-3.5 text-[var(--color-text-faint)] shrink-0" />
                      <span className="text-xs font-medium">{lead.clinicId === '1' ? 'Odonto Premium' : 'Estética Viver'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs font-medium text-[var(--color-text-muted)] capitalize">{lead.sourceId.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge variant={getStatusBadgeVariant(lead.status)} isTableStatus>
                      {lead.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2 text-[var(--color-text-faint)]">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold text-[var(--color-text-muted)]">{mockResponsible}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-success)] rounded-md transition-colors" title="WhatsApp">
                        <MessageCircle size={15} />
                      </button>
                      <button className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-primary-blue)] rounded-md transition-colors" title="Agendar">
                        <Calendar size={15} />
                      </button>
                      <button className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] rounded-md transition-colors">
                        <MoreHorizontal size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] px-6 py-3.5 rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] flex items-center gap-6 backdrop-blur-md">
            <div className="flex items-center gap-3 pr-6 border-r border-[var(--color-border-default)]">
              <div className="w-7 h-7 bg-[var(--color-primary-blue)] text-white rounded-lg flex items-center justify-center font-bold text-xs">
                {selectedIds.length}
              </div>
              <p className="text-xs font-bold tracking-tight whitespace-nowrap">Leads Selecionados</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="xs" onClick={() => handleBulkUpdate('agendamento')}>
                <Calendar className="w-3.5 h-3.5" />
                <span>Mudar Status</span>
              </Button>
              <Button size="xs" variant="danger" onClick={handleBulkDelete}>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </Button>
            </div>
            
            <button 
              onClick={() => setSelectedIds([])}
              className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
