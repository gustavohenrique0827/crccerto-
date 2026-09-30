import React, { useState, useEffect } from 'react';
import { 
  Columns, 
  List, 
  Search, 
  Filter, 
  Download, 
  Minimize2, 
  Maximize2, 
  Archive, 
  X, 
  SlidersHorizontal, 
  ChevronDown, 
  GripVertical,
  ArrowRightCircle,
  UserCheck
} from 'lucide-react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  pointerWithin,
  CollisionDetection,
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  sortableKeyboardCoordinates,
  SortableContext,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { Lead, LeadStatus } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import LeadTable from './LeadTable';
import KanbanColumn, { StageGoal } from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { cn } from '@/src/lib/utils';
import { exportToCSV } from '../../lib/exportUtils';
import { useApp } from '../../context/AppContext';
import { useSupabaseLeads } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

const STAGES: { id: LeadStatus; label: string; color: string; bg: string }[] = [
  { id: LeadStatus.NEW, label: 'Novo lead', color: 'bg-[var(--stage-0)]', bg: 'bg-[var(--color-surface-sunken)]' },
  { id: LeadStatus.FIRST_CONTACT, label: '1° contato', color: 'bg-[var(--stage-1)]', bg: 'bg-[var(--color-surface-sunken)]' },
  { id: LeadStatus.SECOND_CONTACT, label: '2° contato', color: 'bg-[var(--stage-2)]', bg: 'bg-[var(--color-surface-sunken)]' },
  { id: LeadStatus.THIRD_CONTACT, label: '3° contato', color: 'bg-[var(--stage-3)]', bg: 'bg-[var(--color-surface-sunken)]' },
  { id: LeadStatus.INTERACTED, label: 'Interagiu', color: 'bg-[var(--stage-4)]', bg: 'bg-[var(--color-surface-sunken)]' },
  { id: LeadStatus.APPOINTMENT, label: 'Agendado', color: 'bg-[var(--stage-5)]', bg: 'bg-[var(--color-surface-sunken)]' },
  { id: LeadStatus.ATTENDED, label: 'Compareceu', color: 'bg-[var(--stage-6)]', bg: 'bg-[var(--color-surface-sunken)]' },
  { id: LeadStatus.SOLD, label: 'Comprou', color: 'bg-[var(--stage-7)]', bg: 'bg-[var(--color-surface-sunken)]' },
  { id: LeadStatus.MISSED, label: 'Faltou', color: 'bg-[var(--stage-lost)]', bg: 'bg-[var(--color-surface-sunken)]' },
  { id: LeadStatus.DISQUALIFIED, label: 'Desqualificado', color: 'bg-[var(--stage-void)]', bg: 'bg-[var(--color-surface-sunken)]' },
];

const LEAD_SOURCES = [
  { id: 'all', label: 'Todas as Origens' },
  { id: 'fb', label: 'Meta Ads (Facebook/Instagram)' },
  { id: 'google', label: 'Google Ads' },
  { id: 'whatsapp', label: 'WhatsApp Direto' },
  { id: 'lp', label: 'Landing Page' },
  { id: 'referral', label: 'Indicação' },
];

const LEAD_PRIORITIES = [
  { id: 'all', label: 'Todas as Prioridades' },
  { id: 'urgent', label: 'Urgente' },
  { id: 'high', label: 'Alta' },
  { id: 'medium', label: 'Média' },
  { id: 'low', label: 'Baixa' },
];

const AVAILABLE_OWNERS = [
  'Dr. Roberto Silva',
  'Dra. Marina Costa',
  'Sofia Mendes (CRC)',
  'Lucas Duarte (CRC)'
];

interface PipelineProps {
  globalSearchTerm?: string;
  selectedClinicId?: string;
  onLeadClick?: (lead: Lead) => void;
}

export default function Pipeline({ globalSearchTerm = '', selectedClinicId = 'all', onLeadClick }: PipelineProps) {
  const { addToast } = useApp();
  const [stages, setStages] = useState(STAGES);
  const { leads, loading, updateLeadStatus } = useSupabaseLeads(selectedClinicId);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isCompact, setIsCompact] = useState(false);
  const [columnWidth, setColumnWidth] = useState<number>(280);
  const [localSearch, setLocalSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusedLeadId, setFocusedLeadId] = useState<string | null>(null);

  const [stageGoals, setStageGoals] = useState<Record<string, StageGoal>>({
    [LeadStatus.NEW]: { targetCount: 10, targetValue: 30000 },
    [LeadStatus.FIRST_CONTACT]: { targetCount: 8, targetValue: 25000 },
    [LeadStatus.SECOND_CONTACT]: { targetCount: 6, targetValue: 20000 },
    [LeadStatus.THIRD_CONTACT]: { targetCount: 5, targetValue: 15000 },
    [LeadStatus.INTERACTED]: { targetCount: 6, targetValue: 20000 },
    [LeadStatus.APPOINTMENT]: { targetCount: 5, targetValue: 35000 },
    [LeadStatus.ATTENDED]: { targetCount: 4, targetValue: 25000 },
    [LeadStatus.SOLD]: { targetCount: 3, targetValue: 30000 },
    [LeadStatus.MISSED]: { targetCount: 1, targetValue: 5000 },
    [LeadStatus.DISQUALIFIED]: { targetCount: 2, targetValue: 0 },
  });

  const handleUpdateGoal = (stageId: LeadStatus, newGoal: StageGoal) => {
    setStageGoals(prev => ({
      ...prev,
      [stageId]: newGoal
    }));
    const stageLabel = stages.find(s => s.id === stageId)?.label || stageId;
    addToast(`Meta atualizada para etapa "${stageLabel}": ${newGoal.targetCount} leads`, 'success');
  };

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isGlobalBatchMoveOpen, setIsGlobalBatchMoveOpen] = useState(false);
  const [isGlobalBatchOwnerOpen, setIsGlobalBatchOwnerOpen] = useState(false);

  const handleExport = () => {
    exportToCSV(filteredLeads, 'leads');
    addToast('Lista de leads exportada com sucesso!', 'success');
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Arrastar card: ignora as colunas "sortable" (stage-x) e usa a posição do ponteiro,
  // assim o card cai na coluna/card que está sob o mouse. Arrastar coluna segue usando cantos.
  const collisionDetection: CollisionDetection = (args) => {
    const draggingStage = String(args.active.id).startsWith('stage-');
    if (draggingStage) {
      return closestCorners({
        ...args,
        droppableContainers: args.droppableContainers.filter(c => String(c.id).startsWith('stage-'))
      });
    }
    const cardTargets = args.droppableContainers.filter(c => !String(c.id).startsWith('stage-'));
    const hits = pointerWithin({ ...args, droppableContainers: cardTargets });
    return hits.length > 0 ? hits : closestCorners({ ...args, droppableContainers: cardTargets });
  };

  const effectiveSearch = localSearch || globalSearchTerm;
  
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      lead.whatsapp.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      lead.tags.some(t => t.toLowerCase().includes(effectiveSearch.toLowerCase())) ||
      (lead.procedureType && lead.procedureType.toLowerCase().includes(effectiveSearch.toLowerCase()));
      
    const matchesClinic = selectedClinicId === 'all' || lead.clinicId === selectedClinicId;
    const matchesStage = selectedStageFilter === 'all' || lead.status === selectedStageFilter;
    const matchesPriority = selectedPriorityFilter === 'all' || lead.priority === selectedPriorityFilter;
    const matchesSource = selectedSourceFilter === 'all' || lead.sourceId === selectedSourceFilter;
    
    return matchesSearch && matchesClinic && matchesStage && matchesPriority && matchesSource;
  });

  const activeFiltersCount = 
    (selectedStageFilter !== 'all' ? 1 : 0) +
    (selectedPriorityFilter !== 'all' ? 1 : 0) +
    (selectedSourceFilter !== 'all' ? 1 : 0);

  const handleClearFilters = () => {
    setSelectedStageFilter('all');
    setSelectedPriorityFilter('all');
    setSelectedSourceFilter('all');
    addToast('Filtros restaurados', 'info');
  };

  const handleToggleSelectLead = (leadId: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleToggleSelectAllStage = (stageId: LeadStatus) => {
    const stageLeads = (filteredLeads || []).filter(l => l.status === stageId);
    const stageLeadIds = (stageLeads || []).map(l => l.id);
    const allStageSelected = stageLeadIds.every(id => selectedLeadIds.includes(id));

    if (allStageSelected) {
      setSelectedLeadIds(prev => prev.filter(id => !stageLeadIds.includes(id)));
    } else {
      setSelectedLeadIds(prev => Array.from(new Set([...prev, ...stageLeadIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedLeadIds([]);
  };

  const handleBatchMoveStage = async (leadIds: string[], targetStage: LeadStatus) => {
    for (const id of leadIds) {
      await updateLeadStatus(id, targetStage);
    }
    const stageName = STAGES.find(s => s.id === targetStage)?.label || targetStage;
    addToast(`${leadIds.length} leads movidos para "${stageName}"`, 'success');
    setSelectedLeadIds(prev => prev.filter(id => !leadIds.includes(id)));
  };

  const handleBatchChangeOwner = (leadIds: string[], ownerName: string) => {
    addToast(`${leadIds.length} leads atribuídos a ${ownerName}`, 'success');
    setSelectedLeadIds(prev => prev.filter(id => !leadIds.includes(id)));
  };

  const handleBatchArchive = async (leadIds: string[]) => {
    for (const id of leadIds) {
      await updateLeadStatus(id, LeadStatus.DISQUALIFIED);
    }
    addToast(`${leadIds.length} leads desqualificados/arquivados`, 'info');
    setSelectedLeadIds(prev => prev.filter(id => !leadIds.includes(id)));
  };

  const handleOpenDetail = (lead: Lead) => {
    if (onLeadClick) onLeadClick(lead);
  };

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    updateLeadStatus(leadId, newStatus);
    const stageName = STAGES.find(s => s.id === newStatus)?.label || newStatus;
    addToast(`Lead movido para "${stageName}"`, 'success');
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    if (activeIdStr.startsWith('stage-')) {
      const activeStageId = activeIdStr.replace('stage-', '');
      const overStageId = overIdStr.replace('stage-', '');

      const oldIndex = stages.findIndex(s => s.id === activeStageId);
      const newIndex = stages.findIndex(s => s.id === overStageId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setStages(prev => arrayMove(prev, oldIndex, newIndex));
        addToast('Ordem das etapas reorganizada com sucesso!', 'success');
      }
      return;
    }

    const leadId = activeIdStr;
    const overId = overIdStr;

    const overStatus = overId.replace(/^stage-/, '') as LeadStatus;
    if (Object.values(LeadStatus).includes(overStatus)) {
      const current = leads.find(l => l.id === leadId);
      if (current && current.status !== overStatus) {
        updateLeadStatus(leadId, overStatus);
        const stageName = STAGES.find(st => st.id === overStatus)?.label || overStatus;
        addToast(`Lead movido para "${stageName}"`, 'success');
      }
      return;
    }

    const activeLead = leads.find(l => l.id === leadId);
    const overLead = leads.find(l => l.id === overId);

    if (activeLead && overLead && activeLead.status !== overLead.status) {
      updateLeadStatus(leadId, overLead.status);
      const stageName = STAGES.find(st => st.id === overLead.status)?.label || overLead.status;
      addToast(`Lead movido para "${stageName}"`, 'success');
    }
  };

  const isDraggingLead = Boolean(activeId && !activeId.startsWith('stage-'));
  const activeLead = isDraggingLead ? leads.find(l => l.id === activeId) : null;
  const activeStage = activeId && activeId.startsWith('stage-') 
    ? stages.find(s => `stage-${s.id}` === activeId) 
    : null;

  const totalPipelineValue = filteredLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
  const formattedPipelineTotal = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL', 
    maximumFractionDigits: 0 
  }).format(totalPipelineValue);

  if (loading) return null;

  return (
    <div className="space-y-4 h-full flex flex-col relative animate-fade-in">
      {/* Standard Filter Bar (Pill Tabs inside bg-sunken container) */}
      <Card className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pill Tabs inside bg-sunken container */}
          <div className="bg-[var(--color-surface-sunken)] p-1 rounded-[var(--radius-control)] border border-[var(--color-border-default)] inline-flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={cn(
                "px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                viewMode === 'kanban'
                  ? "bg-[var(--color-primary-blue)] !text-white shadow-xs"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]"
              )}
            >
              <Columns size={14} />
              <span>Board</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                viewMode === 'list'
                  ? "bg-[var(--color-primary-blue)] !text-white shadow-xs"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]"
              )}
            >
              <List size={14} />
              <span>Lista</span>
            </button>
          </div>

          {/* Compact / Detail View Toggle */}
          {viewMode === 'kanban' && (
            <Button
              type="button"
              variant={isCompact ? "info" : "outline"}
              size="xs"
              onClick={() => {
                const nextCompact = !isCompact;
                setIsCompact(nextCompact);
                setColumnWidth(nextCompact ? 240 : 290);
                addToast(nextCompact ? 'Modo compacto ativo' : 'Modo expandido ativo', 'info');
              }}
            >
              {isCompact ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              <span>{isCompact ? 'Visão Geral' : 'Detalhes'}</span>
            </Button>
          )}

          {/* Pipeline Total Value KPI Badge */}
          <Badge variant="success" className="hidden md:inline-flex">
            <span>Total em Pipeline:</span>
            <span className="font-mono font-black">{formattedPipelineTotal}</span>
          </Badge>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search with Search icon left */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" size={14} />
            <input 
              type="text" 
              placeholder="Buscar por nome, WhatsApp, tag..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-faint)] outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)]/50"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <Button
              type="button"
              variant={activeFiltersCount > 0 ? "default" : "outline"}
              size="xs"
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            >
              <SlidersHorizontal size={14} />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-[var(--color-primary-blue)] text-[10px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown size={12} className={cn("transition-transform", isFilterMenuOpen && "rotate-180")} />
            </Button>

            <AnimatePresence>
              {isFilterMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsFilterMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    className="absolute right-0 mt-2 w-72 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] z-50 p-4 space-y-4 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-2">
                      <div className="flex items-center gap-1.5 font-bold text-[var(--color-text-primary)]">
                        <Filter size={14} className="text-[var(--color-primary-blue)]" />
                        <span>Filtros do Pipeline</span>
                      </div>
                      {activeFiltersCount > 0 && (
                        <button 
                          onClick={handleClearFilters}
                          className="text-[10px] font-bold text-[var(--color-primary-blue)] hover:underline"
                        >
                          Limpar tudo
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                        Filtrar por Etapa
                      </label>
                      <select
                        value={selectedStageFilter}
                        onChange={(e) => setSelectedStageFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] outline-none"
                      >
                        <option value="all">Todas as Etapas (Board Completo)</option>
                        {stages.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                        Filtrar por Prioridade
                      </label>
                      <select
                        value={selectedPriorityFilter}
                        onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] outline-none"
                      >
                        {LEAD_PRIORITIES.map(p => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                        Filtrar por Origem do Lead
                      </label>
                      <select
                        value={selectedSourceFilter}
                        onChange={(e) => setSelectedSourceFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] outline-none"
                      >
                        {LEAD_SOURCES.map(src => (
                          <option key={src.id} value={src.id}>{src.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-2 border-t border-[var(--color-border-default)] flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                        {filteredLeads.length} leads
                      </span>
                      <Button
                        size="xs"
                        onClick={() => setIsFilterMenuOpen(false)}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <Button 
            variant="ghost"
            size="xs"
            onClick={handleExport}
            title="Exportar Leads para CSV"
          >
            <Download size={14} />
            <span className="hidden md:inline">Exportar</span>
          </Button>
        </div>
      </Card>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-1 shrink-0 text-xs">
          <span className="text-[11px] font-bold text-[var(--color-text-faint)] uppercase">Filtros ativos:</span>
          {selectedStageFilter !== 'all' && (
            <Badge variant="info">
              Etapa: {stages.find(s => s.id === selectedStageFilter)?.label}
              <X size={12} className="cursor-pointer hover:opacity-80" onClick={() => setSelectedStageFilter('all')} />
            </Badge>
          )}
          {selectedPriorityFilter !== 'all' && (
            <Badge variant="info">
              Prioridade: {LEAD_PRIORITIES.find(p => p.id === selectedPriorityFilter)?.label}
              <X size={12} className="cursor-pointer hover:opacity-80" onClick={() => setSelectedPriorityFilter('all')} />
            </Badge>
          )}
          {selectedSourceFilter !== 'all' && (
            <Badge variant="info">
              Origem: {LEAD_SOURCES.find(s => s.id === selectedSourceFilter)?.label}
              <X size={12} className="cursor-pointer hover:opacity-80" onClick={() => setSelectedSourceFilter('all')} />
            </Badge>
          )}
          <button 
            onClick={handleClearFilters}
            className="text-xs font-bold text-[var(--color-primary-blue)] hover:underline ml-1 cursor-pointer"
          >
            Limpar todos
          </button>
        </div>
      )}

      {/* Main Board / List Canvas */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          <LeadTable 
            globalSearchTerm={effectiveSearch} 
            onSelectLead={handleOpenDetail} 
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className={cn(
              "flex overflow-x-auto pb-6 custom-scrollbar h-full transition-all duration-300",
              columnWidth < 250 ? "gap-3" : "gap-4"
            )}>
              <SortableContext 
                items={stages.map(s => `stage-${s.id}`)}
                strategy={horizontalListSortingStrategy}
              >
                {stages.filter(stage => selectedStageFilter === 'all' || stage.id === selectedStageFilter).map((stage) => {
                  const stageLeads = filteredLeads.filter(l => l.status === stage.id);
                  
                  return (
                    <KanbanColumn 
                      key={stage.id}
                      stage={stage}
                      leads={stageLeads}
                      totalLeadsCount={filteredLeads.length}
                      selectedLeadIds={selectedLeadIds}
                      onToggleSelectLead={handleToggleSelectLead}
                      onToggleSelectAllStage={handleToggleSelectAllStage}
                      onBatchMoveStage={handleBatchMoveStage}
                      onBatchChangeOwner={handleBatchChangeOwner}
                      onBatchArchive={handleBatchArchive}
                      onOpenDetail={handleOpenDetail}
                      onStatusChange={handleStatusChange}
                      focusedLeadId={focusedLeadId}
                      isCompact={isCompact}
                      columnWidth={columnWidth}
                      isDraggingLead={isDraggingLead}
                      customGoal={stageGoals[stage.id]}
                      onUpdateGoal={handleUpdateGoal}
                    />
                  );
                })}
              </SortableContext>
            </div>

            <DragOverlay dropAnimation={{
              duration: 250,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}>
              {activeLead ? (
                <div style={{ width: `${Math.min(320, columnWidth)}px` }} className="rotate-3 scale-105 transition-transform">
                  <KanbanCard 
                    lead={activeLead} 
                    onOpenDetail={() => {}} 
                    onStatusChange={() => {}}
                    isCompact={isCompact || columnWidth < 250}
                  />
                </div>
              ) : activeStage ? (
                <div 
                  style={{ width: `${columnWidth}px` }} 
                  className="bg-[var(--color-surface-elevated)] border-2 border-[var(--color-primary-blue)] p-3 rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] flex items-center gap-2 text-xs font-bold text-[var(--color-text-primary)] rotate-2 scale-105"
                >
                  <GripVertical size={16} className="text-[var(--color-primary-blue)]" />
                  <div className={`w-3 h-3 rounded-full ${activeStage.color}`} />
                  <span>Reordenando: {activeStage.label}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Floating Bottom Batch Operations Bar */}
      <AnimatePresence>
        {selectedLeadIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-5 py-3 rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] border border-[var(--color-border-default)] flex items-center gap-4 flex-wrap backdrop-blur-md"
          >
            <div className="flex items-center gap-2 pr-3 border-r border-[var(--color-border-default)]">
              <span className="w-6 h-6 rounded-full bg-[var(--color-primary-blue)] text-white font-black text-xs flex items-center justify-center">
                {selectedLeadIds.length}
              </span>
              <span className="text-xs font-bold">
                {selectedLeadIds.length === 1 ? 'Lead Selecionado' : 'Leads Selecionados'}
              </span>
            </div>

            <div className="relative">
              <Button
                size="xs"
                onClick={() => {
                  setIsGlobalBatchMoveOpen(!isGlobalBatchMoveOpen);
                  setIsGlobalBatchOwnerOpen(false);
                }}
              >
                <ArrowRightCircle size={14} />
                <span>Mover Estágio</span>
                <ChevronDown size={12} />
              </Button>

              <AnimatePresence>
                {isGlobalBatchMoveOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute bottom-10 left-0 w-48 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] p-1 space-y-0.5 z-50 max-h-56 overflow-y-auto custom-scrollbar"
                  >
                    <div className="px-2 py-1 text-[9px] font-bold text-[var(--color-text-faint)] uppercase border-b border-[var(--color-border-subtle)] mb-1">
                      Destino:
                    </div>
                    {stages.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          handleBatchMoveStage(selectedLeadIds, s.id);
                          setIsGlobalBatchMoveOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] font-medium transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <Button
                size="xs"
                variant="secondary"
                onClick={() => {
                  setIsGlobalBatchOwnerOpen(!isGlobalBatchOwnerOpen);
                  setIsGlobalBatchMoveOpen(false);
                }}
              >
                <UserCheck size={14} />
                <span>Atribuir Responsável</span>
                <ChevronDown size={12} />
              </Button>

              <AnimatePresence>
                {isGlobalBatchOwnerOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute bottom-10 left-0 w-52 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] p-1 space-y-0.5 z-50"
                  >
                    <div className="px-2 py-1 text-[9px] font-bold text-[var(--color-text-faint)] uppercase border-b border-[var(--color-border-subtle)] mb-1">
                      Responsável:
                    </div>
                    {AVAILABLE_OWNERS.map(owner => (
                      <button
                        key={owner}
                        onClick={() => {
                          handleBatchChangeOwner(selectedLeadIds, owner);
                          setIsGlobalBatchOwnerOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] font-medium transition-colors"
                      >
                        {owner}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              size="xs"
              variant="danger"
              onClick={() => handleBatchArchive(selectedLeadIds)}
            >
              <Archive size={14} />
              <span>Desqualificar</span>
            </Button>

            <button
              onClick={handleClearSelection}
              className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
              title="Cancelar Seleção"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
