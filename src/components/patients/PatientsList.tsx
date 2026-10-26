import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  Calendar,
  User,
  Eye,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PatientProfile from './PatientProfile';
import NewPatientModal from './NewPatientModal';
import { exportToCSV } from '../../lib/exportUtils';
import { useApp } from '../../context/AppContext';
import { fetchPatientsFromDb, insertPatientInDb, isSupabaseConfigured, newUuid } from '../../lib/supabase';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastVisit: string;
  nextAppointment?: string;
  status: 'active' | 'inactive';
  clinicId?: string;
  fromClinicorp?: boolean;
}

const fmtDate = (d?: string) => {
  if (!d) return '—';
  const t = new Date(d.length === 10 ? `${d}T12:00:00` : d);
  return isNaN(t.getTime()) ? '—' : t.toLocaleDateString('pt-BR');
};

export default function PatientsList() {
  const { addToast, setSubPage, subPage, subPageData, currentClinic, currentClinicId, clinics } = useApp();
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [patients, setPatients] = useState<Patient[]>(() => {
    if (isSupabaseConfigured()) return [];
    try {
      const saved = localStorage.getItem('crm_patients_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  // Com Supabase, a lista vem da tabela patients (separada de leads), filtrada pela clínica escolhida
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    setLoading(true);
    fetchPatientsFromDb(currentClinicId).then(list => {
      if (cancelled) return;
      if (list) setPatients(list as Patient[]);
      else addToast('Não foi possível carregar os pacientes do banco de dados.', 'error');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentClinicId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);

  const savePatients = (list: Patient[]) => {
    setPatients(list);
    if (isSupabaseConfigured()) return; // com o banco ativo, ele é a fonte da verdade
    try {
      localStorage.setItem('crm_patients_data', JSON.stringify(list));
      window.dispatchEvent(new Event('crm_patients_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = () => {
    if (filteredPatients.length === 0) {
      addToast('Nenhum paciente filtrado para exportar.', 'info');
      return;
    }
    const dataToExport = filteredPatients.map(p => ({
      ID: p.id,
      Nome: p.name,
      Email: p.email || '',
      Telefone: p.phone || '',
      Status: p.status === 'active' ? 'Ativo' : 'Inativo',
      UltimaVisita: fmtDate(p.lastVisit),
      Unidade: currentClinic?.name || 'Todas as Unidades'
    }));
    exportToCSV(dataToExport, `pacientes_${currentClinic?.name?.toLowerCase().replace(/\s+/g, '_') || 'geral'}`);
    addToast('Lista de pacientes exportada em CSV com sucesso!', 'success');
  };

  const handleAddPatient = (patientData: any) => {
    const targetClinic = clinics.find(c => c.id === currentClinicId) || clinics[0];
    const newP: Patient = {
      ...patientData,
      id: isSupabaseConfigured() ? newUuid() : String(Date.now()),
      lastVisit: '',
      status: 'active',
      clinicId: targetClinic?.id
    };
    setPatients([newP, ...patients]);
    if (isSupabaseConfigured()) {
      insertPatientInDb({ id: newP.id, clinicId: targetClinic?.id || '', name: newP.name, email: newP.email, phone: newP.phone }).then(ok => {
        if (!ok) addToast(`"${newP.name}" não foi salvo no banco de dados. Tente novamente.`, 'error');
        else addToast(`Paciente "${newP.name}" cadastrado com sucesso!`, 'success');
      });
      return;
    }
    savePatients([newP, ...patients]);
    addToast(`Paciente "${newP.name}" cadastrado com sucesso!`, 'success');
  };

  const filteredPatients = patients.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone || '').replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '') || '\u0000')
  );

  const handleOpenDetail = (patient: any) => {
    setSubPage('patient-detail', patient);
  };

  if (subPage === 'patient-detail') {
    return (
      <div className="max-w-[1600px] mx-auto">
        <PatientProfile 
          isOpen={true} 
          onClose={() => setSubPage(null)} 
          patient={subPageData} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Pacientes</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {loading ? 'Carregando pacientes...' : `${filteredPatients.length} paciente${filteredPatients.length === 1 ? '' : 's'}${currentClinic && currentClinicId !== 'all' ? ` em ${currentClinic.name}` : ' na rede'}. Leads ficam no Pipeline.`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={handleExport}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] transition-colors border border-[var(--color-border-default)] flex items-center gap-2 text-xs font-bold uppercase tracking-widest cursor-pointer"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button 
            onClick={() => setIsNewPatientModalOpen(true)}
            className="bg-[var(--color-primary-blue)] !text-white px-4 py-2 rounded-[var(--radius-control)] text-sm font-bold shadow-sm hover:brightness-110 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            <span>Novo Paciente</span>
          </button>
        </div>
      </div>

      <div className="bg-[var(--color-surface-elevated)] rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border-subtle)] flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between bg-[var(--color-surface-sunken)]/50">
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-faint)]" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] focus:border-[var(--color-primary-blue)] rounded-[var(--radius-control)] text-xs font-medium outline-none transition-all text-[var(--color-text-primary)] placeholder:text-[var(--color-text-faint)]"
            />
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <button className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] transition-colors border border-[var(--color-border-default)] cursor-pointer">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-6 py-3.5">Paciente</th>
                <th className="px-6 py-3.5">Contato</th>
                <th className="px-6 py-3.5">Última Visita</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-[var(--color-surface-sunken)]/60 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary-blue)]/10 flex items-center justify-center text-[var(--color-primary-blue)] font-bold">
                        <User size={16} />
                      </div>
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">{patient.name}</span>
                      {patient.fromClinicorp && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)]">Clinicorp</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                        <Phone size={12} />
                        {patient.phone}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                        <Mail size={12} />
                        {patient.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-[var(--color-text-muted)] font-medium">
                      {fmtDate(patient.lastVisit)}
                    </span>
                    {patient.nextAppointment && (
                      <span className="block text-[10px] text-[var(--color-primary-blue)] font-bold mt-0.5">Próxima: {fmtDate(patient.nextAppointment)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      patient.status === 'active' 
                        ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/25' 
                        : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-faint)] border-[var(--color-border-default)]'
                    }`}>
                      {patient.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => handleOpenDetail(patient)}
                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary-blue)] hover:bg-[var(--color-primary-blue)]/10 rounded-[var(--radius-control)] transition-all flex items-center gap-1 text-[10px] font-bold uppercase cursor-pointer"
                      >
                        <Eye size={16} />
                        Prontuário
                      </button>
                      <button className="p-2 text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] cursor-pointer">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && filteredPatients.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-[var(--radius-panel)] bg-[var(--color-surface-sunken)] text-[var(--color-text-faint)] mx-auto flex items-center justify-center mb-3 border border-[var(--color-border-default)]">
                <User size={24} />
              </div>
              <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Nenhum paciente cadastrado</h4>
              <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto mt-1 mb-4">
                {searchTerm ? 'Nenhum paciente corresponde aos critérios da busca.' : 'Sua base de pacientes está limpa. Clique no botão abaixo para registrar o primeiro paciente.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setIsNewPatientModalOpen(true)}
                  className="px-4 py-2 bg-[var(--color-primary-blue)] hover:brightness-110 !text-white rounded-[var(--radius-control)] text-xs font-bold transition-colors shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={14} />
                  Cadastrar Primeiro Paciente
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <NewPatientModal 
        isOpen={isNewPatientModalOpen} 
        onClose={() => setIsNewPatientModalOpen(false)} 
        onAddPatient={handleAddPatient}
      />
    </div>
  );
}
