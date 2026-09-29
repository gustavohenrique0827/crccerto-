import React, { useState } from 'react';
import { useApp } from '@/src/context/AppContext';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Search,
  Plus,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import NewClinicModal from '../clinics/NewClinicModal';

export default function ClinicSwitcher() {
  const { 
    clinics, 
    user,
    currentClinicId, 
    setCurrentClinicId, 
    currentClinic, 
    isAllClinicsView,
    isClientOnlyMode 
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // In client mode, restrict to accessible clinics
  const accessibleClinics = isClientOnlyMode && user
    ? clinics.filter(c => user.accessibleClinicIds.includes(c.id))
    : clinics;

  const filteredClinics = accessibleClinics.filter(clinic => 
    clinic.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative px-2 mb-4">
      <div className="flex items-center justify-between px-2 mb-1.5">
        <p className="text-[10px] font-black text-[var(--color-text-faint)] tracking-widest uppercase">
          {isClientOnlyMode ? 'Portal Unidade' : 'Unidade Ativa'}
        </p>
        {isClientOnlyMode && (
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] border border-[var(--color-primary-blue)]/20">
            Exclusivo
          </span>
        )}
      </div>
      
      <button
        type="button"
        onClick={() => !isClientOnlyMode && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-control)] border transition-all duration-200 group text-left",
          isClientOnlyMode ? "cursor-default border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]" : "cursor-pointer border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-elevated)]"
        )}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-[var(--radius-control)] bg-[var(--color-primary-blue)] flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            {isAllClinicsView ? (
              <LayoutGrid className="w-3.5 h-3.5 text-white" />
            ) : currentClinic?.logo ? (
              <img src={currentClinic.logo} alt="" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-white" />
            )}
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="text-xs font-bold text-[var(--color-text-primary)] truncate leading-tight">
              {isAllClinicsView ? 'Todas as Clínicas' : currentClinic?.name}
            </p>
            <p className="text-[10px] text-[var(--color-text-faint)] truncate leading-tight mt-0.5">
              {isAllClinicsView ? 'Visão Consolidada' : currentClinic?.city || 'Unidade'}
            </p>
          </div>
        </div>
        {!isClientOnlyMode && (
          <ChevronDown className={cn(
            "w-4 h-4 text-[var(--color-text-faint)] transition-transform duration-200 shrink-0 ml-1",
            isOpen && "rotate-180 text-[var(--color-primary-blue)]"
          )} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && !isClientOnlyMode && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-2 right-2 top-full mt-1.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-panel)] shadow-[var(--shadow-panel)] z-50 overflow-hidden"
            >
              <div className="p-2 border-b border-[var(--color-border-default)] bg-[var(--color-surface-sunken)]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-faint)]" />
                  <input 
                    type="text" 
                    placeholder="Buscar unidade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs outline-none focus:ring-1 focus:ring-[var(--color-primary-blue)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-faint)]"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-[260px] overflow-y-auto p-1.5 custom-scrollbar space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentClinicId('all');
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-[var(--radius-control)] text-left transition-colors cursor-pointer",
                    currentClinicId === 'all' 
                      ? "bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] font-bold" 
                      : "hover:bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded bg-[var(--color-surface-sunken)] flex items-center justify-center">
                      <LayoutGrid size={13} className={currentClinicId === 'all' ? "text-[var(--color-primary-blue)]" : "text-[var(--color-text-faint)]"} />
                    </div>
                    <div>
                      <p className="text-xs">Todas as Clínicas</p>
                      <p className="text-[10px] text-[var(--color-text-faint)] italic">Visão consolidada</p>
                    </div>
                  </div>
                  {currentClinicId === 'all' && <Check size={14} />}
                </button>

                <div className="my-1 border-t border-[var(--color-border-subtle)]" />

                {filteredClinics.map((clinic) => (
                  <button
                    key={clinic.id}
                    type="button"
                    onClick={() => {
                      setCurrentClinicId(clinic.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-[var(--radius-control)] text-left transition-colors cursor-pointer",
                      currentClinicId === clinic.id 
                        ? "bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)] font-bold" 
                        : "hover:bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-6 h-6 rounded bg-[var(--color-primary-blue)]/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {clinic.logo ? (
                          <img src={clinic.logo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 size={13} className="text-[var(--color-primary-blue)]" />
                        )}
                      </div>
                      <div className="overflow-hidden min-w-0">
                        <p className="text-xs truncate">{clinic.name}</p>
                        <p className="text-[10px] text-[var(--color-text-faint)] truncate">
                          {clinic.city}
                        </p>
                      </div>
                    </div>
                    {currentClinicId === clinic.id && <Check size={14} className="shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="p-2 bg-[var(--color-surface-sunken)] border-t border-[var(--color-border-default)]">
                <button 
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsNewModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-1 text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary-blue)] transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  NOVA CLÍNICA / CLIENTE
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <NewClinicModal 
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
      />
    </div>
  );
}
