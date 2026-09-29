import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Building2, 
  Tag, 
  Send, 
  AlertCircle, 
  Compass, 
  Radio, 
  MapPin, 
  Calendar, 
  Sparkles, 
  DollarSign, 
  ShieldAlert, 
  MessageCircle, 
  Layers, 
  Check, 
  ChevronRight,
  ExternalLink,
  Search,
  Loader2
} from 'lucide-react';
import { LeadStatus } from '../../types';
import { useLeadTracking } from '../../hooks/useLeadTracking';
import { useApp } from '../../context/AppContext';
import { checkLeadDuplicateInDb, DuplicateCheckResult } from '../../lib/supabase';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: any) => void;
}

const POPULAR_PROCEDURES = [
  { name: 'Implante Dentário', value: 3500, category: 'Cirurgia' },
  { name: 'Ortodontia / Invisalign', value: 4200, category: 'Ortodontia' },
  { name: 'Clareamento Dental Laser', value: 1200, category: 'Estética' },
  { name: 'Harmonização Facial (Botox)', value: 2800, category: 'Estética' },
  { name: 'Prótese Protocolo', value: 8500, category: 'Reabilitação' },
  { name: 'Lentes de Contato Dental', value: 6000, category: 'Estética' },
  { name: 'Limpeza & Profilaxia', value: 350, category: 'Clínica Geral' },
  { name: 'Tratamento de Canal (Endo)', value: 950, category: 'Clínica Geral' }
];

export default function NewLeadModal({ isOpen, onClose, onAddLead }: NewLeadModalProps) {
  const { clinics, currentClinicId, addToast } = useApp();
  const { trackingData, enrichLeadWithTracking } = useLeadTracking();
  
  const [activeSection, setActiveSection] = useState<'dados' | 'procedimentos' | 'origem'>('dados');
  const [loadingCep, setLoadingCep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResult | null>(null);

  const initialClinic = currentClinicId && currentClinicId !== 'all' 
    ? currentClinicId 
    : (clinics[0]?.id || '1');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    birthDate: '',
    email: '',
    cpf: '',
    cep: '',
    address: '',
    city: '',
    state: '',
    clinicId: initialClinic,
    sourceId: trackingData.source || 'Meta Ads',
    sourceMedium: trackingData.medium || 'cpc',
    campaignId: trackingData.campaign || 'campanha_geral',
    status: LeadStatus.NEW,
    estimatedValue: 2500,
    procedureType: 'Avaliação Inicial',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    responsibleName: 'Equipe Comercial',
    tags: [] as string[]
  });

  // Sync clinic ID if modal opens or changes
  useEffect(() => {
    if (currentClinicId && currentClinicId !== 'all') {
      setFormData(prev => ({ ...prev, clinicId: currentClinicId }));
    }
  }, [currentClinicId, isOpen]);

  // Live duplicate checking helper on blur or change
  const verifyDuplicate = useCallback(async (emailVal: string, phoneVal: string, clinicVal: string) => {
    const cleanMail = (emailVal || '').trim();
    const rawPh = (phoneVal || '').replace(/\D/g, '');

    if (!cleanMail && (!rawPh || rawPh.length < 8)) {
      setDuplicateWarning(null);
      return;
    }

    setCheckingDuplicate(true);
    try {
      const res = await checkLeadDuplicateInDb({
        clinicId: clinicVal,
        email: cleanMail,
        phone: rawPh,
        whatsapp: rawPh
      });
      setDuplicateWarning(res.isDuplicate ? res : null);
    } catch (e) {
      console.warn('Erro ao checar duplicidade:', e);
    } finally {
      setCheckingDuplicate(false);
    }
  }, []);

  const [tagInput, setTagInput] = useState('');

  // Auto-masking helpers
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCpf = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatCep = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  // Automated ViaCEP lookup
  const handleCepChange = async (val: string) => {
    const formatted = formatCep(val);
    setFormData(prev => ({ ...prev, cep: formatted }));

    const rawCep = formatted.replace(/\D/g, '');
    if (rawCep.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          const autoAddress = `${data.logradouro || ''}, , ${data.bairro || ''}`;
          setFormData(prev => ({
            ...prev,
            address: autoAddress,
            city: data.localidade || '',
            state: data.uf || ''
          }));
          addToast(`Endereço localizado: ${data.localidade}/${data.uf}`, 'info');
        }
      } catch (err) {
        console.warn('Erro ao consultar ViaCEP:', err);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Quick preset test data
  const handleFillDemo = () => {
    setFormData({
      name: 'Camila Ferreira Ramos',
      phone: '(11) 98765-4321',
      whatsapp: '(11) 98765-4321',
      birthDate: '1992-05-18',
      email: 'camila.ramos@email.com',
      cpf: '382.910.455-89',
      cep: '01310-100',
      address: 'Av. Paulista, 1578, Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      clinicId: clinics[0]?.id || '1',
      sourceId: 'Meta Ads',
      sourceMedium: 'stories_ad',
      campaignId: 'implantes_julho',
      status: LeadStatus.NEW,
      estimatedValue: 4200,
      procedureType: 'Ortodontia / Invisalign',
      priority: 'high',
      responsibleName: 'Equipe Comercial',
      tags: ['Invisalign', 'Estética', 'Alta Intenção']
    });
    addToast('Dados de exemplo preenchidos!', 'info');
  };

  const handleSelectProcedure = (proc: { name: string; value: number }) => {
    setFormData(prev => {
      const exists = prev.tags.includes(proc.name);
      const newTags = exists ? prev.tags.filter(t => t !== proc.name) : [...prev.tags, proc.name];
      return {
        ...prev,
        procedureType: proc.name,
        estimatedValue: proc.value,
        tags: newTags
      };
    });
  };

  const addCustomTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || (!formData.whatsapp.trim() && !formData.phone.trim())) {
      addToast('Preencha ao menos Nome e WhatsApp do lead.', 'error');
      return;
    }

    setSubmitting(true);
    setCheckingDuplicate(true);

    // Strict duplicate check against active clinic before allowing save
    const dupCheck = await checkLeadDuplicateInDb({
      clinicId: formData.clinicId,
      email: formData.email,
      phone: formData.phone,
      whatsapp: formData.whatsapp
    });

    setCheckingDuplicate(false);

    if (dupCheck.isDuplicate) {
      setDuplicateWarning(dupCheck);
      addToast(dupCheck.message || 'Já existe um lead cadastrado com este e-mail ou telefone nesta unidade.', 'error');
      setSubmitting(false);
      return;
    }

    const finalPhone = formData.phone.trim() || formData.whatsapp.trim();
    const finalWhatsapp = formData.whatsapp.trim() || formData.phone.trim();

    const baseLead = {
      ...formData,
      phone: finalPhone,
      whatsapp: finalWhatsapp,
      clinicId: formData.clinicId || (clinics[0]?.id || '1'),
      id: 'lead_' + Date.now().toString(36),
      responsibleId: '1',
      createdAt: new Date().toISOString()
    };

    const trackedLead = enrichLeadWithTracking(baseLead);
    await onAddLead(trackedLead);
    
    setSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <User size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Novo Lead Comercial</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    CRM Multi-unidades
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Cadastre o interessado com traqueamento inteligente e direcionamento automático.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFillDemo}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                title="Preencher com dados de teste"
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>Exemplo</span>
              </button>
              <button 
                onClick={onClose} 
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Fechar (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveSection('dados')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeSection === 'dados'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <User size={14} />
              <span>1. Dados & Contato</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('procedimentos')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeSection === 'procedimentos'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Tag size={14} />
              <span>2. Interesse & Procedimentos</span>
              {formData.tags.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                  {formData.tags.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('origem')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeSection === 'origem'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Compass size={14} />
              <span>3. Origem & Marketing</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
            {/* DUPLICATE WARNING ALERT BANNER */}
            {duplicateWarning?.isDuplicate && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="p-4 bg-rose-50/90 dark:bg-rose-950/70 border-2 border-rose-300 dark:border-rose-800/80 rounded-2xl flex items-start gap-3.5 text-rose-900 dark:text-rose-100 shadow-sm"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/30 mt-0.5">
                  <ShieldAlert size={18} />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-rose-700 dark:text-rose-300">Duplicidade Detectada na Clínica</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 font-extrabold uppercase tracking-wide">
                      Ação Bloqueada
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed text-rose-800 dark:text-rose-200">
                    {duplicateWarning.message}
                  </p>
                  {duplicateWarning.existingLead && (
                    <div className="mt-2.5 p-2.5 bg-white dark:bg-slate-900/90 rounded-xl border border-rose-200 dark:border-rose-900/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Lead Cadastrado:</span>{' '}
                        <span className="text-slate-700 dark:text-slate-300">{duplicateWarning.existingLead.name}</span>
                        <span className="ml-2 text-slate-400">({duplicateWarning.existingLead.status})</span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span>Resp: {duplicateWarning.existingLead.responsibleName || 'Comercial'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 1: DADOS PESSOAIS & CONTATO */}
            {activeSection === 'dados' && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block ml-0.5">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Maria Oliveira Santos"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-xs font-medium outline-none transition-all dark:text-white"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block ml-0.5">
                        WhatsApp / Telefone *
                      </label>
                      {checkingDuplicate && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold animate-pulse">
                          <Loader2 size={10} className="animate-spin" /> Checando...
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        placeholder="(11) 99999-9999"
                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border rounded-xl text-xs font-medium outline-none transition-all dark:text-white ${
                          duplicateWarning?.duplicateField === 'phone' || duplicateWarning?.duplicateField === 'whatsapp'
                            ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                            : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800'
                        }`}
                        value={formData.whatsapp}
                        onBlur={() => verifyDuplicate(formData.email, formData.whatsapp, formData.clinicId)}
                        onChange={e => {
                          const formatted = formatPhone(e.target.value);
                          setFormData({ ...formData, whatsapp: formatted, phone: formatted });
                          if (duplicateWarning) setDuplicateWarning(null);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block ml-0.5">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="email" 
                        placeholder="paciente@email.com"
                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border rounded-xl text-xs font-medium outline-none transition-all dark:text-white ${
                          duplicateWarning?.duplicateField === 'email'
                            ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                            : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800'
                        }`}
                        value={formData.email}
                        onBlur={() => verifyDuplicate(formData.email, formData.whatsapp, formData.clinicId)}
                        onChange={e => {
                          setFormData({ ...formData, email: e.target.value });
                          if (duplicateWarning) setDuplicateWarning(null);
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block ml-0.5">
                      CPF
                    </label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00"
                      className="w-full px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-xs font-medium outline-none transition-all dark:text-white"
                      value={formData.cpf}
                      onChange={e => setFormData({ ...formData, cpf: formatCpf(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block ml-0.5">
                      Data de Nascimento
                    </label>
                    <input 
                      type="date"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                      value={formData.birthDate}
                      onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* CEP with auto-lookup */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        CEP (Auto-busca)
                      </label>
                      {loadingCep && (
                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 animate-pulse">
                          <Loader2 size={10} className="animate-spin" /> Buscando...
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="00000-000"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                        value={formData.cep}
                        onChange={e => handleCepChange(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                      Endereço Completo / Bairro
                    </label>
                    <input 
                      type="text" 
                      placeholder="Rua, Número, Bairro, Cidade - UF"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveSection('procedimentos')}
                    className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Avançar para Procedimentos</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* TAB 2: INTERESSE & PROCEDIMENTOS */}
            {activeSection === 'procedimentos' && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 block mb-2">
                    Selecione Procedimentos de Interesse (Sugestões Rápidas)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {POPULAR_PROCEDURES.map((proc, idx) => {
                      const isSelected = formData.tags.includes(proc.name) || formData.procedureType === proc.name;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectProcedure(proc)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold uppercase text-slate-400">{proc.category}</span>
                            {isSelected && <Check size={12} className="text-blue-600" />}
                          </div>
                          <p className="text-xs font-bold leading-tight">{proc.name}</p>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                            ~ R$ {proc.value.toLocaleString('pt-BR')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                      Valor Estimado do Tratamento (R$)
                    </label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                      <input 
                        type="number"
                        placeholder="2500"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white font-bold"
                        value={formData.estimatedValue}
                        onChange={e => setFormData({ ...formData, estimatedValue: Number(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                      Prioridade do Lead
                    </label>
                    <select
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                    >
                      <option value="low">Baixa Prioridade</option>
                      <option value="medium">Média Prioridade</option>
                      <option value="high">Alta Prioridade (Quente)</option>
                      <option value="urgent">Urgente (Fechar Hoje)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                      Responsável Comercial
                    </label>
                    <input 
                      type="text"
                      placeholder="Ex: Amanda Comercial"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      value={formData.responsibleName}
                      onChange={e => setFormData({ ...formData, responsibleName: e.target.value })}
                    />
                  </div>
                </div>

                {/* Custom Tags */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                    Tags Personalizadas
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ex: Primeira Consulta, Indicação Dra. Ana"
                      className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                    />
                    <button 
                      type="button" 
                      onClick={addCustomTag}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-blue-100 dark:border-blue-800">
                        {tag}
                        <button 
                          type="button" 
                          onClick={() => setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })}
                          className="hover:text-rose-500 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: ORIGEM & MARKETING */}
            {activeSection === 'origem' && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-transparent dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-transparent rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <Radio size={16} className="animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Motor de Traqueamento Automático Ativo</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Origem: <strong>{trackingData.source || 'Meta Ads'}</strong> • Campanha: <strong>{trackingData.campaign || 'Geral'}</strong></p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                    Captura UTM
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                      Canal de Captação
                    </label>
                    <select 
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      value={formData.sourceId}
                      onChange={e => setFormData({ ...formData, sourceId: e.target.value })}
                    >
                      <option value="Meta Ads">Meta Ads (Instagram & Facebook)</option>
                      <option value="Google Search">Google Ads (Search & Maps)</option>
                      <option value="Instagram">Instagram Orgânico / Link da Bio</option>
                      <option value="WhatsApp">WhatsApp Direto / Conversa Iniciada</option>
                      <option value="Indicação">Indicação de Paciente / Parceria</option>
                      <option value="Site">Site Oficial / Formulário</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                      Unidade / Clínica de Atendimento
                    </label>
                    <select 
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      value={formData.clinicId}
                      onChange={e => setFormData({ ...formData, clinicId: e.target.value })}
                    >
                      {clinics.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                      UTM Campaign / Nome da Campanha
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: implantes_feed_julho"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      value={formData.campaignId}
                      onChange={e => setFormData({ ...formData, campaignId: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                      UTM Medium / Meio de Tráfego
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: cpc, stories, feed, reels"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      value={formData.sourceMedium}
                      onChange={e => setFormData({ ...formData, sourceMedium: e.target.value })}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              
              <button 
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                <span>Salvar e Iniciar Pipeline</span>
              </button>
            </div>
          </form>

          {/* Quick Notice Tip */}
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 flex items-center justify-between shrink-0 border-t border-blue-100/60 dark:border-blue-900/30 text-[11px] text-blue-700 dark:text-blue-300">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>O lead será inserido na coluna <strong>"Novo Lead"</strong> com sincronização Supabase Realtime ativa.</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Pressione Esc para fechar</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
