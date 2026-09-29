import React, { useState, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  MoreHorizontal, 
  Search, 
  Filter,
  Trash2,
  X,
  Check,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Upload,
  Download
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { exportToCSV } from '@/src/lib/exportUtils';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  password?: string;
  status: 'Ativo' | 'Inativo' | 'Pendente';
  clinic: string;
}

export default function TeamManagement() {
  const { user, clinics, currentClinic, addToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [team, setTeam] = useState<TeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('crm_team_members');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: '1',
        name: user?.name || 'Gustavo Henrique Godoi Portilho',
        role: 'Administrador',
        email: user?.email || 'portilhogustavohenriquegodoi@gmail.com',
        status: 'Ativo',
        clinic: 'Todas as Unidades'
      }
    ];
  });

  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Dentista / Especialista',
    clinic: clinics[0]?.name || 'Todas as Unidades'
  });

  const saveTeam = (updated: TeamMember[]) => {
    setTeam(updated);
    try {
      localStorage.setItem('crm_team_members', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim() || !newMember.email.trim()) {
      addToast('Preencha o nome e e-mail do membro', 'error');
      return;
    }

    if (!newMember.password) {
      addToast('A senha do usuário é obrigatória.', 'error');
      return;
    }

    // Password regex validation: at least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const minLengthRegex = /.{8,}/;
    const upperRegex = /[A-Z]/;
    const lowerRegex = /[a-z]/;
    const numberRegex = /[0-9]/;
    const specialRegex = /[^A-Za-z0-9]/;

    if (!minLengthRegex.test(newMember.password)) {
      addToast('A senha deve ter no mínimo 8 caracteres.', 'error');
      return;
    }

    if (!upperRegex.test(newMember.password) || !lowerRegex.test(newMember.password)) {
      addToast('A senha deve conter letras maiúsculas e minúsculas.', 'error');
      return;
    }

    if (!numberRegex.test(newMember.password)) {
      addToast('A senha deve conter pelo menos um número.', 'error');
      return;
    }

    const member: TeamMember = {
      id: String(Date.now()),
      name: newMember.name.trim(),
      email: newMember.email.trim(),
      password: newMember.password,
      role: newMember.role,
      status: 'Ativo',
      clinic: newMember.clinic
    };

    saveTeam([...team, member]);
    setIsInviteModalOpen(false);
    setNewMember({
      name: '',
      email: '',
      password: '',
      role: 'Dentista / Especialista',
      clinic: clinics[0]?.name || 'Todas as Unidades'
    });
    addToast(`Usuário "${member.name}" criado com sucesso com acesso por senha!`, 'success');
  };

  const handleRemoveMember = (id: string, name: string) => {
    if (team.length <= 1) {
      addToast('O sistema precisa de ao menos um administrador ativo.', 'error');
      return;
    }
    const updated = team.filter(m => m.id !== id);
    saveTeam(updated);
    addToast(`Membro "${name}" removido da equipe.`, 'info');
  };

  const filteredTeam = team.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.clinic.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (currentClinic && member.clinic !== 'Todas as Unidades' && member.clinic !== currentClinic.name) {
      return false;
    }
    return true;
  });

  const handleExportTeam = () => {
    if (filteredTeam.length === 0) {
      addToast('Não há membros para exportar.', 'info');
      return;
    }
    const dataToExport = filteredTeam.map(m => ({
      Nome: m.name,
      Email: m.email,
      Funcao: m.role,
      Status: m.status,
      Clinica: m.clinic
    }));
    const clinicSuffix = currentClinic ? `_${currentClinic.name.toLowerCase().replace(/\s+/g, '_')}` : '';
    exportToCSV(dataToExport, `equipe_crm${clinicSuffix}`);
    addToast('Lista da equipe exportada em CSV com sucesso!', 'success');
  };

  const handleImportTeam = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const imported: TeamMember[] = parsed.map((m: any, idx: number) => ({
              id: m.id || String(Date.now() + idx),
              name: m.name || m.Nome || 'Membro Importado',
              email: m.email || m.Email || `user${idx}@clinica.com`,
              role: m.role || m.Funcao || 'Dentista / Especialista',
              status: m.status || m.Status || 'Ativo',
              clinic: m.clinic || m.Clinica || (clinics[0]?.name || 'Todas as Unidades')
            }));
            const updated = [...team, ...imported];
            saveTeam(updated);
            addToast(`${imported.length} membro(s) importado(s) com sucesso via JSON!`, 'success');
          } else {
            addToast('Arquivo JSON inválido ou vazio.', 'error');
          }
        } else {
          // CSV Parser
          const lines = text.split('\n').filter(l => l.trim().length > 0);
          if (lines.length > 1) {
            const newMembers: TeamMember[] = [];
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
              if (cols[0] && cols[1]) {
                newMembers.push({
                  id: String(Date.now() + i),
                  name: cols[0],
                  email: cols[1],
                  role: cols[2] || 'Dentista / Especialista',
                  status: 'Ativo',
                  clinic: cols[4] || (clinics[0]?.name || 'Todas as Unidades')
                });
              }
            }
            if (newMembers.length > 0) {
              const updated = [...team, ...newMembers];
              saveTeam(updated);
              addToast(`${newMembers.length} membro(s) importado(s) com sucesso via CSV!`, 'success');
            } else {
              addToast('Nenhum registro válido encontrado no CSV.', 'error');
            }
          }
        }
      } catch (err: any) {
        addToast(`Erro ao importar arquivo: ${err.message}`, 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Equipe & Usuários</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Gerencie os usuários do sistema, senhas de acesso e permissões.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportTeam} 
            accept=".csv,.json" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] rounded-[var(--radius-control)] text-xs font-bold shadow-[var(--shadow-control)] hover:bg-[var(--color-surface-sunken)] transition-all cursor-pointer"
            title="Importar equipe de arquivo CSV ou JSON"
          >
            <Upload size={14} />
            <span>Importar Dados</span>
          </button>
          <button 
            onClick={handleExportTeam}
            className="flex items-center gap-2 px-3.5 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] rounded-[var(--radius-control)] text-xs font-bold shadow-[var(--shadow-control)] hover:bg-[var(--color-surface-sunken)] transition-all cursor-pointer"
            title="Exportar equipe para CSV"
          >
            <Download size={14} />
            <span>Exportar Dados</span>
          </button>
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-[var(--color-primary-blue)] text-white px-4 py-2 rounded-[var(--radius-control)] text-xs font-bold shadow-[var(--shadow-control)] hover:opacity-95 transition-colors flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <UserPlus size={16} />
            <span>Criar Usuário / Membro</span>
          </button>
        </div>
      </div>

      <div className="bg-[var(--color-surface-elevated)] rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border-default)] flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-faint)]" />
            <input 
              type="text" 
              placeholder="Buscar por nome, e-mail, cargo, unidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none"
            />
          </div>
          <div className="text-xs text-[var(--color-text-faint)] font-semibold flex items-center gap-2">
            <span>{filteredTeam.length} usuário(s) cadastrado(s)</span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="bg-[var(--color-surface-sunken)]">
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest">Usuário</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest">Cargo / Função</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest">Unidade</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest">Acesso por Senha</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {filteredTeam.map((member) => (
                <tr key={member.id} className="hover:bg-[var(--color-surface-sunken)] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--color-primary-blue)]/10 flex items-center justify-center text-[var(--color-primary-blue)] font-bold text-xs shadow-xs">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--color-text-primary)]">{member.name}</p>
                        <p className="text-xs text-[var(--color-text-faint)]">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-[var(--color-primary-blue)]" />
                      <span className="text-xs text-[var(--color-text-primary)] font-semibold">{member.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-[var(--color-text-muted)]">{member.clinic}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-surface-sunken)] text-[11px] font-semibold text-[var(--color-text-muted)] border border-[var(--color-border-default)]">
                      <Lock size={12} className="text-[var(--color-text-faint)]" />
                      {member.password ? 'Senha Definida' : 'Senha Padrão'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      member.status === 'Ativo' 
                        ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' 
                        : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      title="Remover membro"
                      className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite / Create Member Modal with Password Field */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] w-full max-w-md rounded-[var(--radius-panel)] border border-[var(--color-border-default)] shadow-[var(--shadow-panel)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-3">
              <h3 className="font-bold text-[var(--color-text-primary)] text-base flex items-center gap-2">
                <UserPlus size={18} className="text-[var(--color-primary-blue)]" />
                Criar Novo Usuário / Membro
              </h3>
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-primary)]">Nome Completo</label>
                <input 
                  type="text" 
                  placeholder="Ex: Dra. Camila Rocha"
                  value={newMember.name}
                  onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-primary)]">E-mail Profissional</label>
                <input 
                  type="email" 
                  placeholder="Ex: camila@clinica.com"
                  value={newMember.email}
                  onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none"
                />
              </div>

              {/* Password Field with Strength Meter and Regex Validation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--color-text-primary)] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock size={13} className="text-[var(--color-primary-blue)]" />
                    Senha de Acesso Segura
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--color-text-faint)]">Mín. 8 caracteres</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Crie uma senha forte (ex: Clinica@2026)"
                    value={newMember.password}
                    onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                    required
                    className="w-full pl-3 pr-10 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newMember.password && (
                  <div className="pt-1 space-y-1.5">
                    {(() => {
                      const p = newMember.password;
                      const hasMinLength = p.length >= 8;
                      const hasUpper = /[A-Z]/.test(p);
                      const hasLower = /[a-z]/.test(p);
                      const hasNumber = /[0-9]/.test(p);
                      const hasSpecial = /[^A-Za-z0-9]/.test(p);
                      
                      const score = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
                      
                      let strengthLabel = 'Fraca';
                      let barColor = 'bg-rose-500';
                      let textColor = 'text-rose-500';
                      
                      if (score >= 4) {
                        strengthLabel = 'Forte';
                        barColor = 'bg-emerald-500';
                        textColor = 'text-emerald-500';
                      } else if (score >= 3) {
                        strengthLabel = 'Média';
                        barColor = 'bg-amber-500';
                        textColor = 'text-amber-500';
                      }

                      return (
                        <>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[var(--color-text-faint)]">Força da Senha:</span>
                            <span className={`font-bold ${textColor}`}>{strengthLabel}</span>
                          </div>
                          <div className="h-1.5 w-full bg-[var(--color-surface-sunken)] rounded-full overflow-hidden flex gap-1 border border-[var(--color-border-subtle)]">
                            <div className={`h-full flex-1 rounded-full transition-all ${score >= 1 ? barColor : 'bg-[var(--color-surface-sunken)]'}`} />
                            <div className={`h-full flex-1 rounded-full transition-all ${score >= 3 ? barColor : 'bg-[var(--color-surface-sunken)]'}`} />
                            <div className={`h-full flex-1 rounded-full transition-all ${score >= 4 ? barColor : 'bg-[var(--color-surface-sunken)]'}`} />
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[10px] text-[var(--color-text-muted)] pt-1">
                            <span className={`flex items-center gap-1 ${hasMinLength ? 'text-[var(--color-success)] font-medium' : ''}`}>
                              {hasMinLength ? '✓' : '○'} 8+ caracteres
                            </span>
                            <span className={`flex items-center gap-1 ${hasUpper && hasLower ? 'text-[var(--color-success)] font-medium' : ''}`}>
                              {hasUpper && hasLower ? '✓' : '○'} Maiúsculas e minúsculas
                            </span>
                            <span className={`flex items-center gap-1 ${hasNumber ? 'text-[var(--color-success)] font-medium' : ''}`}>
                              {hasNumber ? '✓' : '○'} Números (0-9)
                            </span>
                            <span className={`flex items-center gap-1 ${hasSpecial ? 'text-[var(--color-success)] font-medium' : ''}`}>
                              {hasSpecial ? '✓' : '○'} Símbolo especial
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-primary)]">Cargo / Função</label>
                <select 
                  value={newMember.role}
                  onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none cursor-pointer"
                >
                  <option value="Cirurgião Dentista">Cirurgião Dentista</option>
                  <option value="Ortodontista">Ortodontista</option>
                  <option value="Implantodontista">Implantodontista</option>
                  <option value="Operador CEOP (Central de Atendimento)">Operador CEOP (Central de Atendimento)</option>
                  <option value="Recepcionista / CRC">Recepcionista / CRC</option>
                  <option value="Gerente da Unidade">Gerente da Unidade</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-primary)]">Unidade de Atendimento</label>
                <select 
                  value={newMember.clinic}
                  onChange={e => setNewMember({ ...newMember, clinic: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary-blue)] outline-none cursor-pointer"
                >
                  <option value="Todas as Unidades">Todas as Unidades</option>
                  {clinics.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-default)]">
                <button 
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[var(--color-primary-blue)] hover:opacity-95 text-white text-xs font-bold rounded-[var(--radius-control)] shadow-[var(--shadow-control)] cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
