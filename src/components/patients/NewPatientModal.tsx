import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  Search, 
  Plus, 
  Save, 
  AlertCircle,
  Shield,
  HeartPulse,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Building2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApp } from '../../context/AppContext';

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPatient?: (patient: any) => void;
}

const COMMON_ALLERGIES = ['Penicilina', 'Dipirona', 'Látex', 'Iodo', 'Anestésico Local', 'AINEs'];
const COMMON_CONDITIONS = ['Hipertensão', 'Diabetes', 'Cardiopatia', 'Gestante', 'Fumante', 'Uso de Anticoagulante'];
const CONVENIOS = ['Particular', 'Unimed Odonto', 'Amil Dental', 'Bradesco Dental', 'SulAmérica', 'Porto Seguro', 'OdontoPrev', 'MetLife'];

export default function NewPatientModal({ isOpen, onClose, onAddPatient }: NewPatientModalProps) {
  const { addToast } = useApp();
  const [step, setStep] = useState(1);
  const [loadingCep, setLoadingCep] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    rg: '',
    birthDate: '',
    gender: 'prefiro_nao_dizer',
    insurance: 'Particular',
    insuranceNumber: '',
    allergies: [] as string[],
    medicalConditions: [] as string[],
    address: {
      zipCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: ''
    },
    emergencyContact: {
      name: '',
      phone: '',
      relation: ''
    }
  });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCepLookup = async (cepValue: string) => {
    const formatted = formatCep(cepValue);
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, zipCode: formatted }
    }));

    const rawCep = formatted.replace(/\D/g, '');
    if (rawCep.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address: {
              ...prev.address,
              street: data.logradouro || prev.address.street,
              neighborhood: data.bairro || prev.address.neighborhood,
              city: data.localidade || prev.address.city,
              state: data.uf || prev.address.state
            }
          }));
          addToast(`Endereço carregado: ${data.localidade} - ${data.uf}`, 'info');
        }
      } catch (err) {
        console.warn('Erro ao buscar CEP:', err);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const toggleArrayItem = (key: 'allergies' | 'medicalConditions', item: string) => {
    setFormData(prev => {
      const current = prev[key];
      const exists = current.includes(item);
      return {
        ...prev,
        [key]: exists ? current.filter(i => i !== item) : [...current, item]
      };
    });
  };

  const handleDemoFill = () => {
    setFormData({
      name: 'Juliana Siqueira Barbosa',
      email: 'juliana.siqueira@email.com',
      phone: '(11) 99887-6655',
      cpf: '456.789.012-34',
      rg: '34.567.890-1',
      birthDate: '1988-11-24',
      gender: 'feminino',
      insurance: 'Unimed Odonto',
      insuranceNumber: '89012345678',
      allergies: ['Dipirona'],
      medicalConditions: [],
      address: {
        zipCode: '04538-133',
        street: 'Av. Brigadeiro Faria Lima',
        number: '3477',
        complement: 'Bloco B, Apto 142',
        neighborhood: 'Itaim Bibi',
        city: 'São Paulo',
        state: 'SP'
      },
      emergencyContact: {
        name: 'Marcelo Barbosa',
        phone: '(11) 99112-3344',
        relation: 'Esposo'
      }
    });
    addToast('Dados de demonstração preenchidos!', 'info');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      addToast('Nome e Telefone são campos obrigatórios.', 'error');
      setStep(1);
      return;
    }

    if (onAddPatient) onAddPatient({ ...formData, id: 'pat_' + Date.now().toString(36), createdAt: new Date().toISOString() });
    addToast(`Paciente ${formData.name} cadastrado com sucesso!`, 'success');
    onClose();
    setStep(1);
  };

  const nextStep = () => {
    if (step === 1 && (!formData.name.trim() || !formData.phone.trim())) {
      addToast('Preencha ao menos o Nome e Telefone do paciente.', 'error');
      return;
    }
    setStep(prev => prev + 1);
  };
  const prevStep = () => setStep(prev => prev - 1);

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
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden relative z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <User size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Cadastro de Paciente
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Prontuário clínico digital e informações cadastrais.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDemoFill}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
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

          {/* Stepper Indicator */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${
                step === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                1
              </span>
              <span>Identificação</span>
            </button>

            <ChevronRight size={14} className="text-slate-300" />

            <button
              type="button"
              onClick={() => setStep(2)}
              className={`flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${
                step === 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                2
              </span>
              <span>Endereço</span>
            </button>

            <ChevronRight size={14} className="text-slate-300" />

            <button
              type="button"
              onClick={() => setStep(3)}
              className={`flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${
                step === 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                3
              </span>
              <span>Saúde & Emergência</span>
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
            <AnimatePresence mode="wait">
              {/* STEP 1: IDENTIFICAÇÃO */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        placeholder="Ex: João da Silva Sauro"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        WhatsApp / Celular *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        <input 
                          type="tel" 
                          name="phone"
                          required
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white font-medium"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        E-mail
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="email" 
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                          placeholder="joao@exemplo.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        CPF
                      </label>
                      <input 
                        type="text" 
                        name="cpf"
                        value={formData.cpf}
                        onChange={e => setFormData({ ...formData, cpf: formatCpf(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        placeholder="000.000.000-00"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        Data de Nascimento
                      </label>
                      <input 
                        type="date" 
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        Gênero
                      </label>
                      <select 
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      >
                        <option value="prefiro_nao_dizer">Prefiro não informar</option>
                        <option value="feminino">Feminino</option>
                        <option value="masculino">Masculino</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: ENDEREÇO COM VIACEP */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                          CEP
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
                          name="address.zipCode"
                          value={formData.address.zipCode}
                          onChange={e => handleCepLookup(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                          placeholder="00000-000"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        Logradouro / Rua
                      </label>
                      <input 
                        type="text" 
                        name="address.street"
                        value={formData.address.street}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        placeholder="Ex: Av. Paulista, Rua das Flores..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        Número
                      </label>
                      <input 
                        type="text" 
                        name="address.number"
                        value={formData.address.number}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        placeholder="123"
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        Complemento
                      </label>
                      <input 
                        type="text" 
                        name="address.complement"
                        value={formData.address.complement}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        placeholder="Apto 42, Bloco B..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        Bairro
                      </label>
                      <input 
                        type="text" 
                        name="address.neighborhood"
                        value={formData.address.neighborhood}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        placeholder="Bairro"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        Cidade
                      </label>
                      <input 
                        type="text" 
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        placeholder="Cidade"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        UF
                      </label>
                      <input 
                        type="text" 
                        name="address.state"
                        maxLength={2}
                        value={formData.address.state}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white uppercase font-bold text-center"
                        placeholder="SP"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: SAÚDE & EMERGÊNCIA */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="space-y-5"
                >
                  {/* Convênio */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        Convênio / Plano
                      </label>
                      <select 
                        name="insurance"
                        value={formData.insurance}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      >
                        {CONVENIOS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                        Número da Carteirinha (Opcional)
                      </label>
                      <input 
                        type="text" 
                        name="insuranceNumber"
                        value={formData.insuranceNumber}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        placeholder="Nº da carteirinha do plano"
                      />
                    </div>
                  </div>

                  {/* Alergias */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">
                      Alergias Conhecidas (Clique para selecionar)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_ALLERGIES.map(item => {
                        const isSelected = formData.allergies.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleArrayItem('allergies', item)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-700 dark:text-rose-300'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {isSelected && <Check size={12} className="text-rose-600" />}
                            <span>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Condições médicas */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">
                      Condições de Saúde / Anamnese Rápida
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_CONDITIONS.map(item => {
                        const isSelected = formData.medicalConditions.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleArrayItem('medicalConditions', item)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 text-amber-700 dark:text-amber-300'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {isSelected && <Check size={12} className="text-amber-600" />}
                            <span>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contato de emergência */}
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <HeartPulse size={16} className="text-rose-500" />
                      Contato de Emergência
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input 
                        type="text" 
                        name="emergencyContact.name"
                        value={formData.emergencyContact.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                        placeholder="Nome do contato"
                      />
                      <input 
                        type="tel" 
                        name="emergencyContact.phone"
                        value={formData.emergencyContact.phone}
                        onChange={e => setFormData({
                          ...formData,
                          emergencyContact: { ...formData.emergencyContact, phone: formatPhone(e.target.value) }
                        })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                        placeholder="Telefone (11) 99999-9999"
                      />
                      <input 
                        type="text" 
                        name="emergencyContact.relation"
                        value={formData.emergencyContact.relation}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                        placeholder="Grau de parentesco"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Footer Navigation */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950">
            <button 
              type="button"
              onClick={step === 1 ? onClose : prevStep}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {step > 1 && <ChevronLeft size={14} />}
              <span>{step === 1 ? 'Cancelar' : 'Voltar'}</span>
            </button>

            <div className="flex items-center gap-2">
              {step < 3 ? (
                <button 
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Avançar</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
                  <span>Finalizar e Salvar Prontuário</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
