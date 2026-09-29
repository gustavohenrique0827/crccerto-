import React, { useState } from 'react';
import { 
  MoreHorizontal, 
  Clock, 
  Phone, 
  User,
  Calendar,
  MessageSquare,
  Instagram,
  Mail,
  MoreVertical,
  CheckCircle2
} from 'lucide-react';
import { Lead, LeadStatus } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/src/lib/utils';

interface KanbanCardProps {
  key?: string | number;
  lead: Lead;
  onOpenDetail: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  isFocused?: boolean;
  isCompact?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (leadId: string) => void;
}

const STAGES: { id: LeadStatus; label: string }[] = [
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

export default function KanbanCard({ 
  lead, 
  onOpenDetail, 
  onStatusChange, 
  isFocused, 
  isCompact,
  isSelected,
  onToggleSelect 
}: KanbanCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const getPriorityConfig = (priority?: string) => {
    switch (priority) {
      case 'urgent': return { label: 'Urgente', color: 'bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/25', text: 'text-[var(--color-danger)]' };
      case 'high': return { label: 'Alta', color: 'bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/25', text: 'text-[var(--color-warning)]' };
      case 'medium': return { label: 'Média', color: 'bg-[var(--color-primary-blue)]/10 border border-[var(--color-primary-blue)]/25', text: 'text-[var(--color-primary-blue)]' };
      case 'low': return { label: 'Baixa', color: 'bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)]', text: 'text-[var(--color-text-muted)]' };
      default: return { label: 'Normal', color: 'bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)]', text: 'text-[var(--color-text-muted)]' };
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
  };

  const formatCurrency = (val?: number) => {
    if (!val) return null;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative"
    >
      <motion.div 
        layout
        className={cn(
          "bg-[var(--color-surface-elevated)] rounded-[var(--radius-control)] border transition-all cursor-grab active:cursor-grabbing group/card relative shadow-[var(--shadow-control)]",
          isSelected 
            ? "border-[var(--color-primary-blue)] bg-[var(--color-primary-blue)]/10" 
            : "border-[var(--color-border-default)] hover:border-[var(--color-primary-blue)]/50",
          isCompact ? "p-2 space-y-1.5" : "p-3 space-y-2",
          isDragging && "border-[var(--color-primary-blue)] opacity-60",
          isFocused && "border-[var(--color-primary-blue)]"
        )}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-start justify-between gap-1.5">
          {/* Multi-Select Checkbox */}
          <div 
            className="pt-0.5 shrink-0" 
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              if (onToggleSelect) onToggleSelect(lead.id);
            }}
          >
            <input 
              type="checkbox"
              checked={!!isSelected}
              onChange={() => {}}
              className="w-3.5 h-3.5 text-[var(--color-primary-blue)] rounded border-[var(--color-border-default)] focus:ring-[var(--color-primary-blue)] cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-1">
            <div className="flex items-center gap-1 flex-wrap">
              {lead.priority && (
                <span className={cn(
                  "rounded-full font-bold tracking-normal",
                  isCompact ? "px-1.5 py-0.2 text-[8px]" : "px-2 py-0.2 text-[8.5px]",
                  getPriorityConfig(lead.priority).color,
                  getPriorityConfig(lead.priority).text
                )}>
                  {getPriorityConfig(lead.priority).label}
                </span>
              )}
              {lead.tags?.[0] && (
                <span className={cn(
                  "rounded-full bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] font-medium tracking-normal border border-[var(--color-border-default)] truncate max-w-[85px]",
                  isCompact ? "px-1.5 py-0.2 text-[8px]" : "px-2 py-0.2 text-[8.5px]"
                )}>
                  {lead.tags[0]}
                </span>
              )}
            </div>
            <h4 className={cn(
              "font-bold text-[var(--color-text-primary)] group-hover/card:text-[var(--color-primary-blue)] transition-colors truncate",
              isCompact ? "text-[11px] leading-tight mt-0.5" : "text-xs mt-1"
            )}>
              {lead.name}
            </h4>
          </div>
          
          <div className="relative shrink-0" onPointerDown={e => e.stopPropagation()}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="p-0.5 text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] rounded transition-colors"
            >
              <MoreVertical size={isCompact ? 12 : 14} />
            </button>
            
            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-1 w-48 bg-[var(--color-surface-elevated)] rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)] z-50 overflow-hidden py-1"
                  >
                    <div className="px-3 py-1 text-[9px] font-extrabold text-[var(--color-text-faint)] uppercase tracking-wider border-b border-[var(--color-border-subtle)] mb-1">
                      Mudar Status
                    </div>
                    {STAGES.map((stage) => (
                      <button
                        key={stage.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(lead.id, stage.id);
                          setIsMenuOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-xs font-medium transition-colors flex items-center justify-between",
                          lead.status === stage.id 
                            ? "text-[var(--color-primary-blue)] font-bold" 
                            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)]"
                        )}
                      >
                        {stage.label}
                        {lead.status === stage.id && <CheckCircle2 size={12} />}
                      </button>
                    ))}
                    <div className="border-t border-[var(--color-border-subtle)] mt-1 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetail(lead);
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)]"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Value + Interaction Info */}
        <div className="flex items-center justify-between gap-1">
          <div className={cn(
            "text-[var(--color-text-muted)] font-normal bg-[var(--color-surface-sunken)] rounded px-1.5 py-0.5 text-[9px] truncate border border-[var(--color-border-subtle)]",
          )}>
            <span className="capitalize truncate">{lead.lastContactChannel || 'WhatsApp'}</span>
          </div>

          {lead.estimatedValue ? (
            <span className={cn(
              "font-mono font-bold text-[var(--color-success)] bg-[var(--color-success)]/10 rounded px-1.5 py-0.5 border border-[var(--color-success)]/25 text-[9px]"
            )}>
              {formatCurrency(lead.estimatedValue)}
            </span>
          ) : (
            <div className={cn(
              "text-[var(--color-text-faint)] bg-[var(--color-surface-sunken)] rounded px-1.5 py-0.5 border border-[var(--color-border-subtle)] text-[9px] shrink-0 font-normal"
            )}>
              {getTimeAgo(lead.lastInteractionAt)}
            </div>
          )}
        </div>

        {/* Responsible Person if specified */}
        {lead.responsibleName && (
          <div className={cn(
            "text-[var(--color-text-faint)] truncate text-[9px]",
          )}>
            <span className="truncate">Resp: {lead.responsibleName}</span>
          </div>
        )}

        {/* Next Appointment Preview */}
        {lead.nextAppointmentAt && (
          <div className={cn(
            "bg-[var(--color-primary-blue)]/10 rounded border border-[var(--color-primary-blue)]/20 px-2 py-1",
          )}>
            <div className="flex items-center justify-between text-[8.5px] font-bold text-[var(--color-primary-blue)]">
              <span>Próx. Agendamento</span>
              <span>{new Date(lead.nextAppointmentAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        )}
        
        <div className={cn(
          "flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-1.5 text-[9px]",
        )}>
          <span className="text-[var(--color-text-muted)] font-normal truncate">{lead.whatsapp}</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(lead);
            }}
            className="font-bold text-[var(--color-primary-blue)] hover:underline shrink-0 ml-1"
          >
            Detalhes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
