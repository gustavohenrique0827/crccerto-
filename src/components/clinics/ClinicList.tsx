import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  ChevronRight, 
  ShieldCheck, 
  Settings, 
  UserCheck, 
  Search, 
  Filter, 
  Layers, 
  Trash2
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { Clinic, Role } from '@/src/types';
import { cn } from '@/src/lib/utils';
import NewClinicModal from './NewClinicModal';
import PageHeader from '../ui/PageHeader';
import { Card } from '../ui/Card';
import StatusBadge from '../ui/StatusBadge';
import { Button } from '../ui/Button';

export default function ClinicList() {
  const { 
    clinics, 
    user, 
    setCurrentClinicId, 
    switchUserRole, 
    setActiveTab, 
    deleteClinic,
    isClientOnlyMode 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [systemFilter, setSystemFilter] = useState('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const filteredClinics = useMemo(() => {
    return clinics.filter(clinic => {
      // In client mode, only show accessible clinics
      if (isClientOnlyMode && user) {
        if (!user.accessibleClinicIds.includes(clinic.id)) return false;
      }

      const matchSearch = 
        clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.responsible.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.cnpj.includes(searchTerm);

      const matchSystem = systemFilter === 'all' || clinic.system === systemFilter;

      return matchSearch && matchSystem;
    });
  }, [clinics, searchTerm, systemFilter, isClientOnlyMode, user]);

  const handleEnterAsClient = (clinic: Clinic) => {
    switchUserRole(Role.CLINIC_ADMIN, clinic.id);
    setActiveTab('dashboard');
  };

  const handleManageClinic = (clinic: Clinic) => {
    setCurrentClinicId(clinic.id);
    setActiveTab('settings');
  };

  const handleDelete = (clinic: Clinic, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja remover a clínica "${clinic.name}"?`)) {
      deleteClinic(clinic.id);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 sm:space-y-8">
      {/* Top Header */}
      <PageHeader
        title="Clientes & Unidades Clínicas"
        subtitle={
          isClientOnlyMode 
            ? 'Visualização exclusiva da sua unidade contratada.' 
            : 'Gerencie todas as clínicas parceiras, módulos liberados e portais isolados.'
        }
        kicker="Gestão Multiclínica ERP"
        actions={
          !isClientOnlyMode && (
            <Button 
              onClick={() => setIsNewModalOpen(true)}
              icon={<Plus size={16} />}
              variant="primary"
            >
              Novo Cliente / Unidade
            </Button>
          )
        }
      />

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome da clínica, responsável, cidade ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter size={15} className="text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={systemFilter}
            onChange={(e) => setSystemFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">Todos os Sistemas</option>
            <option value="clinicorp">Clinicorp</option>
            <option value="simples_dental">Simples Dental</option>
            <option value="google_calendar">Google Calendar</option>
            <option value="other">Outros / Dental Office</option>
          </select>
        </div>
      </Card>

      {/* Clinics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredClinics.map((clinic) => (
          <Card 
            key={clinic.id} 
            className="p-5 flex flex-col justify-between space-y-4 hoverable"
          >
            <div className="space-y-4">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 overflow-hidden border border-blue-100 dark:border-blue-900/60">
                    {clinic.logo ? (
                      <img src={clinic.logo} alt={clinic.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={20} />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                      {clinic.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      Resp: <span className="font-semibold text-slate-700 dark:text-slate-300">{clinic.responsible}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <StatusBadge 
                    label={clinic.status === 'active' ? 'Ativo' : 'Inativo'} 
                    variant={clinic.status === 'active' ? 'success' : 'neutral'}
                    size="sm"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">
                    CNPJ: {clinic.cnpj}
                  </span>
                </div>
              </div>

              {/* Clinic Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 truncate">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{clinic.city}, {clinic.state}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{clinic.whatsapp || clinic.phone}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Mail size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{clinic.email}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Settings size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate capitalize">{clinic.system === 'none' ? 'Sem Software' : clinic.system.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Modules preview */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Layers size={12} />
                  Módulos Habilitados ({clinic.enabledModules.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {clinic.enabledModules.slice(0, 4).map(mod => (
                    <span key={mod} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                      {mod}
                    </span>
                  ))}
                  {clinic.enabledModules.length > 4 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-extrabold">
                      +{clinic.enabledModules.length - 4}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Button 
                  size="sm"
                  variant="primary"
                  onClick={() => handleEnterAsClient(clinic)}
                  icon={<UserCheck size={13} />}
                >
                  Entrar
                </Button>

                <Button 
                  size="sm"
                  variant="secondary"
                  onClick={() => handleManageClinic(clinic)}
                  icon={<Settings size={13} />}
                >
                  Gerenciar
                </Button>
              </div>

              {!isClientOnlyMode && (
                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={(e) => handleDelete(clinic, e)}
                  icon={<Trash2 size={13} className="text-rose-500" />}
                  title="Excluir Unidade"
                />
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* New Clinic Modal */}
      {isNewModalOpen && (
        <NewClinicModal 
          isOpen={isNewModalOpen} 
          onClose={() => setIsNewModalOpen(false)} 
        />
      )}
    </div>
  );
}
