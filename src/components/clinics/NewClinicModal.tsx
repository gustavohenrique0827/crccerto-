import React, { useState } from 'react';
import { 
  Building2, 
  X, 
  Check, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Layers, 
  Globe, 
  Sparkles,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/src/context/AppContext';
import { Clinic, Role, ModuleType } from '@/src/types';
import { cn } from '@/src/lib/utils';

interface NewClinicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClinicCreated?: (clinic: Clinic) => void;
}

const ALL_AVAILABLE_MODULES: { id: ModuleType; label: string; desc: string }[] = [
  { id: 'dashboard', label: 'Dashboard Operacional', desc: 'KPIs e central de comando' },
  { id: 'crm', label: 'CRM & Pipeline de Leads', desc: 'Funil e conversão' },
  { id: 'patients', label: 'Gestão de Pacientes', desc: 'Prontuários e linha do tempo' },
  { id: 'appointments', label: 'Agenda & Consultas', desc: 'Calendário e confirmações' },
  { id: 'followups', label: 'Follow-ups & Régua', desc: 'Relacionamento ativo' },
  { id: 'tasks', label: 'Tarefas Operacionais', desc: 'Workflow e pendências' },
  { id: 'analise-dados', label: 'Análise de Dados', desc: 'Tráfego e métricas' },
  { id: 'reports', label: 'Relatórios & Exportação', desc: 'Auditoria e relatórios' },
  { id: 'integrations', label: 'Integrações Externas', desc: 'Clinicorp, Simples Dental, etc.' },
];

export default function NewClinicModal({ isOpen, onClose, onClinicCreated }: NewClinicModalProps) {
  const { addClinic, switchUserRole } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    corporateName: '',
    cnpj: '',
    responsible: '',
    email: '',
    phone: '',
    whatsapp: '',
    city: '',
    state: 'SP',
    address: '',
    system: 'clinicorp' as Clinic['system'],
    clientPassword: '',
    clientRole: Role.CLINIC_ADMIN,
    loginImmediately: false
  });

  const [selectedModules, setSelectedModules] = useState<ModuleType[]>([
    'dashboard', 'crm', 'patients', 'appointments', 'followups', 'tasks', 'reports'
  ]);

  const toggleModule = (modId: ModuleType) => {
    setSelectedModules(prev => 
      prev.includes(modId) ? prev.filter(m => m !== modId) : [...prev, modId]
    );
  };

  const handleSelectAllModules = () => {
    if (selectedModules.length === ALL_AVAILABLE_MODULES.length) {
      setSelectedModules(['dashboard', 'crm']);
    } else {
      setSelectedModules(ALL_AVAILABLE_MODULES.map(m => m.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const newClinic = addClinic({
      name: formData.name.trim(),
      corporateName: formData.corporateName.trim() || formData.name.trim(),
      cnpj: formData.cnpj.trim() || '00.000.000/0001-99',
      responsible: formData.responsible.trim() || 'Gestor Responsável',
      email: formData.email.trim() || `contato@${formData.name.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: formData.phone.trim() || '(11) 3000-0000',
      whatsapp: formData.whatsapp.trim() || formData.phone.trim() || '(11) 99000-0000',
      address: formData.address.trim() || 'Av. Principal, 100',
      city: formData.city.trim() || 'São Paulo',
      state: formData.state.trim() || 'SP',
      status: 'active',
      system: formData.system,
      integrationStatus: 'connected',
      enabledModules: selectedModules,
    }, {
      name: formData.responsible.trim() || formData.name.trim(),
      email: formData.email.trim() || `cliente@${formData.name.toLowerCase().replace(/\s+/g, '')}.com`,
      password: formData.clientPassword || 'cliente123',
      role: formData.clientRole
    });

    if (formData.loginImmediately) {
      switchUserRole(formData.clientRole, newClinic.id);
    }

    if (onClinicCreated) {
      onClinicCreated(newClinic);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Cadastrar Novo Cliente / Clínica</h2>
              <p className="text-xs text-slate-500">Crie a unidade com portal exclusivo e controle de visualização.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          
          {/* Section 1: Dados da Clínica */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Building2 size={14} className="text-blue-500" />
              Identificação da Unidade
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nome da Clínica / Cliente *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Clínica Odonto Prime Centro"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-xs sm:text-sm font-medium outline-none transition-all dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Razão Social
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Odonto Prime Serviços Ltda"
                  value={formData.corporateName}
                  onChange={e => setFormData({ ...formData, corporateName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-xs sm:text-sm font-medium outline-none transition-all dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  CNPJ
                </label>
                <input 
                  type="text" 
                  placeholder="00.000.000/0001-00"
                  value={formData.cnpj}
                  onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-xs sm:text-sm font-medium outline-none transition-all dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Responsável / Doutor(a)
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Dr. Roberto Alcantara"
                  value={formData.responsible}
                  onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-xs sm:text-sm font-medium outline-none transition-all dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Sistema / Software Dental
                </label>
                <select
                  value={formData.system}
                  onChange={e => setFormData({ ...formData, system: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-xs sm:text-sm font-medium outline-none transition-all dark:text-white"
                >
                  <option value="clinicorp">Clinicorp</option>
                  <option value="simples_dental">Simples Dental</option>
                  <option value="google_calendar">Google Calendar / Agenda</option>
                  <option value="other">Dental Office / Outros</option>
                  <option value="none">Nenhum (Operação Direta CRM)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Contato & Localização */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <MapPin size={14} className="text-emerald-500" />
              Contato & Localização
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  WhatsApp / Celular
                </label>
                <input 
                  type="text" 
                  placeholder="(11) 98888-7777"
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Cidade
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: São Paulo"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Estado (UF)
                </label>
                <input 
                  type="text" 
                  maxLength={2}
                  placeholder="SP"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white uppercase"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Acesso Exclusivo do Cliente */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 bg-blue-50/40 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <Shield size={14} />
                Portal Exclusivo do Cliente (Restrito)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                Acesso Isolado
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              O cliente só terá visualização dos leads, pacientes, consultas e relatórios desta unidade. Não terá acesso aos dados de outras clínicas.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  E-mail de Login do Cliente *
                </label>
                <input 
                  type="email" 
                  placeholder="cliente@clinica.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nível de Permissão do Cliente
                </label>
                <select
                  value={formData.clientRole}
                  onChange={e => setFormData({ ...formData, clientRole: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                >
                  <option value={Role.CLINIC_ADMIN}>Administrador da Clínica (Gerencia sua Unidade)</option>
                  <option value={Role.CEOP_OPERATOR}>Operador CEOP (Apenas Operacional - Sem Administração)</option>
                  <option value={Role.CLINIC_VIEWER}>Visualizador da Clínica (Apenas Leitura)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer pt-1">
              <input 
                type="checkbox" 
                checked={formData.loginImmediately}
                onChange={e => setFormData({ ...formData, loginImmediately: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Alternar imediatamente para a visão restrita deste cliente após salvar
              </span>
            </label>
          </div>

          {/* Section 4: Módulos Habilitados */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Layers size={14} className="text-purple-500" />
                Módulos Habilitados para este Cliente
              </h3>
              <button 
                type="button"
                onClick={handleSelectAllModules}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {selectedModules.length === ALL_AVAILABLE_MODULES.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {ALL_AVAILABLE_MODULES.map(mod => {
                const isSelected = selectedModules.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={cn(
                      "flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer",
                      isSelected 
                        ? "bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100" 
                        : "bg-slate-50/40 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-500"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded mt-0.5 flex items-center justify-center border shrink-0 transition-colors",
                      isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    )}>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate">{mod.label}</p>
                      <p className="text-[10px] text-slate-400 truncate">{mod.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 pb-1">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check size={16} />
              <span>Salvar e Criar Cliente</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
