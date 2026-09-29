import React, { useState } from 'react';
import { 
  Plus, 
  Flame, 
  CheckSquare, 
  Square, 
  MinusSquare, 
  MoreHorizontal, 
  ArrowRightCircle, 
  UserCheck, 
  Archive, 
  DollarSign,
  TrendingUp,
  Layers,
  GripVertical,
  Target,
  ArrowDownToLine,
  CheckCircle2,
  Edit2,
  X,
  Check
} from 'lucide-react';
import { Lead, LeadStatus } from '../../types';
import { useDroppable } from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import KanbanCard from './KanbanCard';
import { cn } from '@/src/lib/utils';

const ALL_STAGES: { id: LeadStatus; label: string }[] = [
  { id: LeadStatus.NEW, label: 'Novo lead' },
  { id: LeadStatus.FIRST_CONTACT, label: '1° contato' },
  { id: LeadStatus.SECOND_CONTACT, label: '2° contato' },
  { id: LeadStatus.THIRD_CONTACT, label: '3° contato' },
  { id: LeadStatus.INTERACTED, label: 'Interagiu' },
  { id: LeadStatus.APPOINTMENT, label: 'Agendado' },
  { id: LeadStatus.ATTENDED, label: 'Compareceu' },
  { id: LeadStatus.SOLD, label: 'Comprou' },
  { id: LeadStatus.MISSED, label: 'Faltou' },
  { id: LeadStatus.DISQUALIFIED, label: 'Desqualificado' },
];

const AVAILABLE_OWNERS = [
  'Dr. Roberto Silva',
  'Dra. Marina Costa',
  'Sofia Mendes (CRC)',
  'Lucas Duarte (CRC)'
];

export interface StageGoal {
  targetCount: number;
  targetValue: number;
}

const DEFAULT_STAGE_GOALS: Record<LeadStatus, StageGoal> = {
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
};

interface KanbanColumnProps {
  key?: string | number;
  stage: { id: LeadStatus; label: string; color: string; bg: string };
  leads: Lead[];
  totalLeadsCount: number;
  selectedLeadIds?: string[];
  onToggleSelectLead?: (leadId: string) => void;
  onToggleSelectAllStage?: (stageId: LeadStatus) => void;
  onBatchMoveStage?: (leadIds: string[], targetStage: LeadStatus) => void;
  onBatchChangeOwner?: (leadIds: string[], ownerName: string) => void;
  onBatchArchive?: (leadIds: string[]) => void;
  onOpenDetail: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  focusedLeadId?: string | null;
  isCompact?: boolean;
  columnWidth?: number;
  isDraggingLead?: boolean;
  customGoal?: StageGoal;
  onUpdateGoal?: (stageId: LeadStatus, goal: StageGoal) => void;
}

export default function KanbanColumn({ 
  stage, 
  leads, 
  totalLeadsCount, 
  selectedLeadIds = [],
  onToggleSelectLead,
  onToggleSelectAllStage,
  onBatchMoveStage,
  onBatchChangeOwner,
  onBatchArchive,
  onOpenDetail, 
  onStatusChange, 
  focusedLeadId,
  isCompact,
  columnWidth = 280,
  isDraggingLead = false,
  customGoal,
  onUpdateGoal
}: KanbanColumnProps) {
  // Sortable for horizontal column reordering
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isStageDragging
  } = useSortable({
    id: `stage-${stage.id}`,
  });

  // Droppable for receiving cards
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: stage.id,
  });

  const [isBatchMenuOpen, setIsBatchMenuOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<'move' | 'owner' | null>(null);
  const [isGoalEditorOpen, setIsGoalEditorOpen] = useState(false);

  // Goal state
  const currentGoal: StageGoal = customGoal || DEFAULT_STAGE_GOALS[stage.id] || { targetCount: 5, targetValue: 20000 };
  const [tempTargetCount, setTempTargetCount] = useState<number>(currentGoal.targetCount);
  const [tempTargetValue, setTempTargetValue] = useState<number>(currentGoal.targetValue);

  // Financial Summary Calculation
  const totalValue = leads.reduce((acc, lead) => acc + (lead.estimatedValue || 0), 0);
  const formattedTotalValue = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL', 
    maximumFractionDigits: 0 
  }).format(totalValue);

  const formattedTargetValue = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL', 
    maximumFractionDigits: 0 
  }).format(currentGoal.targetValue);

  // Goal progress calculations
  const countProgressPercent = currentGoal.targetCount > 0 
    ? Math.min(100, Math.round((leads.length / currentGoal.targetCount) * 100))
    : 0;

  const valueProgressPercent = currentGoal.targetValue > 0 
    ? Math.min(100, Math.round((totalValue / currentGoal.targetValue) * 100))
    : 0;

  const isGoalAchieved = (leads || []).length >= currentGoal.targetCount;

  // Selection state for this column
  const stageLeadIds = (leads || []).map(l => l.id);
  const selectedStageLeads = (leads || []).filter(l => selectedLeadIds.includes(l.id));
  const selectedInThisStageCount = selectedStageLeads.length;
  const isAllSelected = (leads || []).length > 0 && selectedInThisStageCount === leads.length;
  const isSomeSelected = selectedInThisStageCount > 0 && !isAllSelected;

  // Calculate clean column indicator
  const leadCount = (leads || []).length;
  const percentage = totalLeadsCount > 0 ? Math.round((leadCount / totalLeadsCount) * 100) : 0;

  const heatBg = 'bg-[var(--color-surface-sunken)]/60 border border-[var(--color-border-default)]';
  const heatColor = 'bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] font-bold border border-[var(--color-border-subtle)]';

  const handleApplyBatchMove = (targetStage: LeadStatus) => {
    const idsToMove = selectedInThisStageCount > 0 ? (selectedStageLeads || []).map(l => l.id) : stageLeadIds;
    if (onBatchMoveStage && idsToMove.length > 0) {
      onBatchMoveStage(idsToMove, targetStage);
    }
    setIsBatchMenuOpen(false);
    setActiveSubMenu(null);
  };

  const handleApplyBatchOwner = (ownerName: string) => {
    const idsToUpdate = selectedInThisStageCount > 0 ? (selectedStageLeads || []).map(l => l.id) : stageLeadIds;
    if (onBatchChangeOwner && idsToUpdate.length > 0) {
      onBatchChangeOwner(idsToUpdate, ownerName);
    }
    setIsBatchMenuOpen(false);
    setActiveSubMenu(null);
  };

  const handleApplyBatchArchive = () => {
    const idsToArchive = selectedInThisStageCount > 0 ? (selectedStageLeads || []).map(l => l.id) : stageLeadIds;
    if (onBatchArchive && idsToArchive.length > 0) {
      onBatchArchive(idsToArchive);
    }
    setIsBatchMenuOpen(false);
    setActiveSubMenu(null);
  };

  const handleSaveGoal = () => {
    if (onUpdateGoal) {
      onUpdateGoal(stage.id, {
        targetCount: Math.max(1, tempTargetCount),
        targetValue: Math.max(0, tempTargetValue)
      });
    }
    setIsGoalEditorOpen(false);
  };

  const columnStyle = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isStageDragging ? 0.35 : 1,
    width: `${columnWidth}px`,
    minWidth: `${columnWidth}px`,
    maxWidth: `${columnWidth}px`,
  };

  return (
    <div 
      ref={setSortableRef}
      style={columnStyle}
      className={cn(
        "flex-shrink-0 flex flex-col group transition-all duration-200 relative",
        isStageDragging && "scale-[0.98] ring-2 ring-blue-500 rounded-2xl shadow-xl z-30"
      )}
    >
      {/* Column Header */}
      <div className="flex flex-col gap-1.5 mb-2.5 px-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Dedicated Drag-Handle to Reorder Stages Horizontally */}
            <button
              {...attributes}
              {...listeners}
              title="Arraste para reordenar esta etapa horizontalmente"
              className="cursor-grab active:cursor-grabbing p-1 text-[var(--color-text-faint)] hover:text-[var(--color-primary-blue)] hover:bg-[var(--color-surface-sunken)] rounded-md transition-colors shrink-0 touch-none"
            >
              <GripVertical size={14} />
            </button>

            {/* Select All Checkbox */}
            <button
              onClick={() => onToggleSelectAllStage && onToggleSelectAllStage(stage.id)}
              title={isAllSelected ? "Desmarcar todos desta etapa" : "Selecionar todos desta etapa"}
              className="text-[var(--color-text-faint)] hover:text-[var(--color-primary-blue)] transition-colors p-0.5 rounded shrink-0 focus:outline-none"
            >
              {isAllSelected ? (
                <CheckSquare size={15} className="text-[var(--color-primary-blue)]" />
              ) : isSomeSelected ? (
                <MinusSquare size={15} className="text-[var(--color-primary-blue)]" />
              ) : (
                <Square size={15} className="text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)]" />
              )}
            </button>

            <div className={`w-2.5 h-2.5 rounded-full ${stage.color} ring-2 ring-[var(--color-surface)] shadow-xs shrink-0`} />
            
            <h3 className={cn(
              "font-black text-[var(--color-text-primary)] uppercase tracking-wider truncate",
              isCompact || columnWidth < 250 ? "text-[10.5px]" : "text-xs"
            )}>
              {stage.label}
            </h3>
            
            <span className={cn("text-[9px] font-black px-1.5 py-0.2 rounded-full flex items-center gap-1 shrink-0", heatColor)}>
              {leadCount}
            </span>

            {/* Daily Goal / Target Value Badge */}
            <div className="relative shrink-0">
              <button
                onClick={() => {
                  setTempTargetCount(currentGoal.targetCount);
                  setTempTargetValue(currentGoal.targetValue);
                  setIsGoalEditorOpen(!isGoalEditorOpen);
                }}
                title={`Meta Diária: ${leadCount}/${currentGoal.targetCount} leads (${countProgressPercent}%). Clique para editar meta.`}
                className={cn(
                  "px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1 transition-all border shrink-0",
                  isGoalAchieved 
                    ? "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/25 shadow-2xs"
                    : countProgressPercent >= 50
                      ? "bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] border-[var(--color-primary-blue)]/25"
                      : "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/25"
                )}
              >
                <Target size={10} className={cn(isGoalAchieved ? "text-[var(--color-success)]" : "text-[var(--color-primary-blue)]")} />
                <span className="font-mono">{leadCount}/{currentGoal.targetCount}</span>
                {columnWidth > 260 && (
                  <span className="opacity-75 font-mono">({countProgressPercent}%)</span>
                )}
              </button>

              {/* Goal Editor Popover */}
              <AnimatePresence>
                {isGoalEditorOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsGoalEditorOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      className="absolute left-0 top-7 w-64 bg-[var(--color-surface-elevated)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] border border-[var(--color-border-default)] z-50 p-3.5 space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
                        <div className="flex items-center gap-1.5 font-bold text-[var(--color-text-primary)]">
                          <Target size={14} className="text-[var(--color-primary-blue)]" />
                          <span>Meta da Etapa: {stage.label}</span>
                        </div>
                        <button 
                          onClick={() => setIsGoalEditorOpen(false)}
                          className="text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] p-0.5"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                          Meta Diária de Leads
                        </label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            min="1"
                            max="100"
                            value={tempTargetCount}
                            onChange={(e) => setTempTargetCount(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)]"
                          />
                          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] shrink-0">leads</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                          Meta Financeira Estimada (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)] text-xs font-bold">R$</span>
                          <input 
                            type="number"
                            step="1000"
                            min="0"
                            value={tempTargetValue}
                            onChange={(e) => setTempTargetValue(Number(e.target.value))}
                            className="w-full pl-8 pr-2.5 py-1.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)]"
                          />
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-end gap-2 border-t border-[var(--color-border-subtle)]">
                        <button
                          onClick={() => setIsGoalEditorOpen(false)}
                          className="px-2.5 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xs font-medium"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveGoal}
                          className="flex items-center gap-1 px-3 py-1 bg-[var(--color-primary-blue)] hover:brightness-110 !text-white rounded-[var(--radius-control)] text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Check size={12} />
                          Salvar Meta
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-1 relative shrink-0">
            {/* Column Batch Actions Button */}
            <button 
              onClick={() => {
                setIsBatchMenuOpen(!isBatchMenuOpen);
                setActiveSubMenu(null);
              }}
              title="Ações em Lote nesta Etapa"
              className={cn(
                "p-1 rounded-[var(--radius-control)] transition-colors text-[var(--color-text-faint)] hover:text-[var(--color-primary-blue)] hover:bg-[var(--color-surface-sunken)]",
                (isBatchMenuOpen || selectedInThisStageCount > 0) && "text-[var(--color-primary-blue)] bg-[var(--color-primary-blue)]/10"
              )}
            >
              <MoreHorizontal size={14} />
            </button>

            {/* Batch Menu Popover */}
            <AnimatePresence>
              {isBatchMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => {
                      setIsBatchMenuOpen(false);
                      setActiveSubMenu(null);
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute right-0 top-7 w-56 bg-[var(--color-surface-elevated)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] border border-[var(--color-border-default)] z-50 overflow-hidden py-1 text-xs"
                  >
                    <div className="px-3 py-1.5 text-[9px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider border-b border-[var(--color-border-subtle)] flex items-center justify-between">
                      <span>Ações em Lote ({selectedInThisStageCount > 0 ? `${selectedInThisStageCount} sel.` : `Todos (${leadCount})`})</span>
                    </div>

                    {/* Action 1: Move Stage */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveSubMenu(activeSubMenu === 'move' ? null : 'move')}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-primary-blue)] flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <ArrowRightCircle size={13} className="text-[var(--color-primary-blue)]" />
                          Mover para Estágio
                        </span>
                        <span className="text-[10px] text-[var(--color-text-faint)]">›</span>
                      </button>

                      {activeSubMenu === 'move' && (
                        <div className="bg-[var(--color-surface-sunken)] p-1.5 border-y border-[var(--color-border-default)] space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                          {ALL_STAGES.filter(s => s.id !== stage.id).map(s => (
                            <button
                              key={s.id}
                              onClick={() => handleApplyBatchMove(s.id)}
                              className="w-full text-left px-2 py-1 text-[11px] rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-primary-blue)] font-medium transition-colors"
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action 2: Change Owner */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveSubMenu(activeSubMenu === 'owner' ? null : 'owner')}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-primary-blue)] flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <UserCheck size={13} className="text-[var(--color-tech-cyan)]" />
                          Mudar Responsável
                        </span>
                        <span className="text-[10px] text-[var(--color-text-faint)]">›</span>
                      </button>

                      {activeSubMenu === 'owner' && (
                        <div className="bg-[var(--color-surface-sunken)] p-1.5 border-y border-[var(--color-border-default)] space-y-1">
                          {AVAILABLE_OWNERS.map(owner => (
                            <button
                              key={owner}
                              onClick={() => handleApplyBatchOwner(owner)}
                              className="w-full text-left px-2 py-1 text-[11px] rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-primary-blue)] font-medium transition-colors"
                            >
                              {owner}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action 3: Mass Archive / Disqualify */}
                    <button
                      onClick={handleApplyBatchArchive}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 flex items-center gap-1.5 transition-colors border-t border-[var(--color-border-subtle)] mt-1"
                    >
                      <Archive size={13} className="text-[var(--color-danger)]" />
                      Desqualificar / Arquivar
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Summary Overlay: Count of leads & Total Estimated Financial Value + Goal Progress */}
        <div className={cn(
          "flex items-center justify-between px-2.5 py-1.5 bg-[var(--color-surface-elevated)] rounded-[var(--radius-control)] border border-[var(--color-border-default)] shadow-[var(--shadow-control)]",
          isCompact || columnWidth < 250 ? "text-[9px] py-1" : "text-[10px]"
        )}>
          <div className="flex items-center gap-1 text-[var(--color-text-muted)] font-medium">
            <Layers size={11} className="text-[var(--color-text-faint)] shrink-0" />
            <span className="truncate">{leadCount} {leadCount === 1 ? 'lead' : 'leads'}</span>
          </div>

          <div className="flex items-center gap-1 font-mono font-bold text-[var(--color-success)] bg-[var(--color-success)]/10 px-1.5 py-0.2 rounded-md border border-[var(--color-success)]/25 text-[10px]">
            <span>{formattedTotalValue}</span>
          </div>
        </div>
      </div>
      
      {/* Droppable Cards Container with dynamic drop-state feedback */}
      <div 
        ref={setDroppableRef}
        className={cn(
          "flex-1 rounded-[var(--radius-panel)] transition-all duration-300 border-2 min-h-[380px] h-full overflow-y-auto custom-scrollbar flex flex-col justify-between",
          isOver
            ? "border-[var(--color-primary-blue)] bg-[var(--color-primary-blue)]/10 ring-2 ring-[var(--color-primary-blue)]/20 shadow-lg"
            : isDraggingLead
              ? "border-dashed border-[var(--color-primary-blue)]/50 bg-[var(--color-primary-blue)]/5"
              : "border-transparent group-hover:border-[var(--color-border-default)]",
          isCompact || columnWidth < 250 ? "p-1.5 space-y-1.5" : "p-2.5 space-y-2.5",
          heatBg
        )}
      >
        <div className={cn(
          "flex-1 space-y-2",
          isCompact || columnWidth < 250 ? "space-y-1.5" : "space-y-2.5"
        )}>
          <SortableContext 
            items={(leads || []).map(l => l.id)} 
            strategy={verticalListSortingStrategy}
          >
            {(leads || []).map((lead) => (
              <KanbanCard 
                key={lead.id} 
                lead={lead} 
                onOpenDetail={onOpenDetail}
                onStatusChange={onStatusChange}
                isFocused={focusedLeadId === lead.id}
                isCompact={isCompact || columnWidth < 250}
                isSelected={selectedLeadIds.includes(lead.id)}
                onToggleSelect={onToggleSelectLead}
              />
            ))}
          </SortableContext>
          
          {/* Subtle 'Drop lead here' indicator or ghost-state when dragging over or when column is empty */}
          {(leads || []).length === 0 && (
            <div className={cn(
              "h-44 border-2 border-dashed rounded-[var(--radius-panel)] flex flex-col items-center justify-center p-4 text-center group/empty transition-all duration-300",
              isOver 
                ? "border-[var(--color-primary-blue)] bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] scale-[1.02] shadow-inner"
                : isDraggingLead
                  ? "border-[var(--color-primary-blue)]/60 bg-[var(--color-primary-blue)]/5 text-[var(--color-primary-blue)] animate-pulse"
                  : "border-[var(--color-border-default)] text-[var(--color-text-faint)] hover:bg-[var(--color-surface-elevated)]/50"
            )}>
              <motion.div 
                animate={isDraggingLead ? { y: [0, -3, 0] } : {}}
                transition={{ repeat: Infinity, duration: 1.4 }}
                className={cn(
                  "mb-2 p-2.5 rounded-[var(--radius-control)] transition-transform",
                  isOver 
                    ? "bg-[var(--color-primary-blue)] !text-white scale-110 shadow-md shadow-[var(--color-primary-blue)]/30" 
                    : isDraggingLead
                      ? "bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)]"
                      : "bg-[var(--color-surface-sunken)] text-[var(--color-text-faint)] group-hover/empty:scale-110"
                )}
              >
                {isDraggingLead ? <ArrowDownToLine size={18} /> : <Plus size={16} />}
              </motion.div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                isDraggingLead ? "text-[var(--color-primary-blue)]" : "text-[var(--color-text-muted)]"
              )}>
                {isOver ? 'Solte o lead aqui' : isDraggingLead ? 'Solte o lead aqui' : 'Nenhum Lead'}
              </span>
              <p className="text-[8.5px] mt-0.5 opacity-60 font-medium">
                {isDraggingLead ? 'Etapa receptora pronta' : 'Arraste para mover'}
              </p>
            </div>
          )}

          {/* Ghost drop-slot feedback indicator when dragging over an occupied column */}
          {isOver && isDraggingLead && leads.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="border-2 border-dashed border-[var(--color-primary-blue)] bg-[var(--color-primary-blue)]/10 rounded-[var(--radius-control)] p-2.5 flex items-center justify-center gap-1.5 text-[var(--color-primary-blue)] text-[10.5px] font-bold shadow-inner"
            >
              <ArrowDownToLine size={13} className="animate-bounce" />
              <span>Solte o lead aqui para transferir</span>
            </motion.div>
          )}
        </div>

        {/* Bottom Progress Bar: Stage Percentage of Total Active Leads & Goal Achievement */}
        <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)] px-0.5 shrink-0 space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-bold text-[var(--color-text-muted)]">
            <span className="truncate">Progresso da Meta:</span>
            <span className={cn("font-mono", isGoalAchieved ? "text-[var(--color-success)] font-black" : "text-[var(--color-text-primary)]")}>
              {countProgressPercent}% {isGoalAchieved ? '🎯' : ''}
            </span>
          </div>
          
          <div className="w-full h-1.5 bg-[var(--color-surface-sunken)] rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500", 
                isGoalAchieved ? "bg-[var(--color-success)]" : stage.color
              )} 
              style={{ width: `${Math.min(100, Math.max(countProgressPercent, leadCount > 0 ? 5 : 0))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

