import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  History, 
  FileText, 
  ChevronLeft, 
  MoreHorizontal,
  Plus,
  ArrowRight,
  Stethoscope,
  Activity,
  AlertCircle,
  FileDigit,
  Download,
  Building2,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

interface PatientProfileProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
}

export default function PatientProfile({ isOpen, onClose, patient }: PatientProfileProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'appointments' | 'record' | 'files'>('timeline');

  if (!isOpen || !patient) return null;

  const tabs = [
    { id: 'timeline', label: 'Linha do Tempo', icon: History },
    { id: 'appointments', label: 'Agendamentos', icon: Calendar },
    { id: 'record', label: 'Prontuário', icon: Stethoscope },
    { id: 'files', label: 'Documentos', icon: FileText },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-end bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-4xl h-full bg-slate-50 dark:bg-slate-950 shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors uppercase tracking-widest flex items-center gap-2">
                <Plus size={16} />
                Novo Agendamento
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <User size={40} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{patient.name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  Paciente Ativo
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Phone size={14} className="text-slate-300" />
                  {patient.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Mail size={14} className="text-slate-300" />
                  {patient.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Calendar size={14} className="text-slate-300" />
                  Nascimento: 12/05/1988
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 px-6 flex items-center gap-8 border-b border-slate-200 dark:border-slate-800 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "py-4 text-xs font-bold uppercase tracking-widest relative flex items-center gap-2 transition-all",
                activeTab === tab.id 
                  ? "text-blue-600" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                />
              )}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'timeline' && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="relative pl-8 space-y-12 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {[
                    { date: 'Hoje, 10:30', title: 'Agendamento Confirmado', desc: 'Avaliação de Implantes com Dr. Roberto.', type: 'appointment', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { date: '15 Mar 2024', title: 'Lead Convertido', desc: 'Convertido via campanha "Implantes Verão".', type: 'lead', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { date: '10 Mar 2024', title: 'Primeiro Contato', desc: 'Interesse via Landing Page.', type: 'contact', icon: Phone, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                  ].map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className={cn(
                        "absolute -left-8 top-1 w-6 h-6 rounded-full border-4 border-slate-50 dark:border-slate-950 flex items-center justify-center z-10 shadow-sm",
                        item.bg
                      )}>
                        <item.icon className={cn("w-3 h-3", item.color)} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{item.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'appointments' && (
              <motion.div
                key="appointments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {[
                  { date: '25 Out 2024', time: '14:30', procedure: 'Cirurgia de Implante', status: 'pending', clinic: 'Odonto Premium' },
                  { date: '15 Ago 2024', time: '10:00', procedure: 'Avaliação Inicial', status: 'confirmed', clinic: 'Odonto Premium' },
                ].map((apt, i) => (
                  <div key={i} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center border border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">{apt.date.split(' ')[1]}</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-white -mt-1">{apt.date.split(' ')[0]}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{apt.procedure}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Clock size={12} />
                            {apt.time}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Building2 size={12} />
                            {apt.clinic}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                        apt.status === 'confirmed' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                      )}>
                        {apt.status === 'confirmed' ? 'Confirmado' : 'Aguardando'}
                      </span>
                      <button className="p-2 text-slate-300 group-hover:text-blue-500">
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'record' && (
              <motion.div
                key="record"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex items-start gap-4">
                  <AlertCircle className="text-blue-600 mt-1" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400">Observações Importantes</h4>
                    <p className="text-xs text-blue-800 dark:text-blue-300 mt-1 leading-relaxed opacity-80">
                      Paciente apresenta sensibilidade em molar superior esquerdo. Histórico de hipertensão controlada.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Evolução Clínica</h3>
                  {[1, 2].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                              <FileDigit size={16} />
                           </div>
                           <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">Anamnese Geral</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">12 Mar 2024 • Dr. Roberto</p>
                           </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Realizada avaliação clínica inicial. Identificada necessidade de 2 implantes na região posterior. Paciente optou por planejar para o próximo mês.
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'files' && (
              <motion.div
                key="files"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-2 gap-4"
              >
                {[
                  { name: 'Panorâmica_01.jpg', size: '2.4 MB', type: 'Exame de Imagem' },
                  { name: 'Contrato_Prestação.pdf', size: '1.1 MB', type: 'Documento' },
                  { name: 'Orcamento_Aprovado.pdf', size: '450 KB', type: 'Documento' },
                ].map((file, i) => (
                  <div key={i} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{file.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{file.type} • {file.size}</p>
                      </div>
                    </div>
                    <button className="p-2 text-slate-300 hover:text-blue-500">
                      <Download size={18} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
