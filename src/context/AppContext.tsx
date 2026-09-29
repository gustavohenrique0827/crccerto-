import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Clinic, User, Role, Lead } from '../types';
import { INITIAL_CLINICS, INITIAL_LEADS, seedLocalStorageIfEmpty } from '../lib/mockData';
import {
  getSupabase, isSupabaseConfigured, saveLeadToDb, loadLeadsFromDb, isUuid, newUuid,
  fetchClinicsFromDb, insertClinicInDb, updateClinicInDb, deleteClinicFromDb
} from '../lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

type Theme = 'light' | 'dark';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  
  // Supabase Global Client
  supabase: SupabaseClient | null;

  // Leads State for global access
  leads: Lead[];
  refreshLeads: () => void;
  addLead: (lead: Lead) => Promise<void>;

  // New Clinic & User State
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clinics: Clinic[];
  addClinic: (clinicData: Omit<Clinic, 'id' | 'createdAt'>, clientUser?: { name: string; email: string; password?: string; role?: Role }) => Clinic;
  updateClinic: (id: string, updates: Partial<Clinic>) => void;
  deleteClinic: (id: string) => void;
  switchUserRole: (role: Role, clinicId?: string) => void;
  currentClinicId: string;
  setCurrentClinicId: (id: string) => void;
  currentClinic: Clinic | null;
  isAllClinicsView: boolean;
  isClientOnlyMode: boolean;
  hasPermission: (permission: string) => boolean;

  // Logout Confirmation
  isLogoutModalOpen: boolean;
  setIsLogoutModalOpen: (open: boolean) => void;
  confirmLogout: () => void;

  // Navigation State
  activeTab: string;
  setActiveTab: (tab: string) => void;
  subPage: string | null;
  setSubPage: (page: string | null, data?: any) => void;
  subPageData: any;
  navigationHistory: string[];
  goBack: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ALL_MODULES: any[] = [
  'dashboard', 'crm', 'patients', 'records', 'appointments', 
  'followups', 'tasks', 'communication', 'reports', 'analytics', 
  'integrations', 'team', 'settings'
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return (saved as Theme) || 'light';
    }
    return 'light';
  });
  
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);
  
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('crm_leads_data');
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_LEADS as Lead[];
  });

  const refreshLeads = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('crm_leads_data');
        if (raw) setLeads(JSON.parse(raw));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const handleStorage = () => refreshLeads();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshLeads]);

  const addLead = useCallback(async (incoming: Lead) => {
    // Com Supabase o id precisa ser UUID
    const newLead = isSupabaseConfigured() && !isUuid(incoming.id) ? { ...incoming, id: newUuid() } : incoming;
    setLeads(prev => [newLead, ...prev.filter(l => l.id !== newLead.id)]);
    const ok = await saveLeadToDb(newLead);
    if (!ok) addToast('Não foi possível salvar o lead no banco de dados. Verifique a conexão e tente novamente.', 'error');
    refreshLeads();
  }, [refreshLeads, addToast]);

  const [clinics, setClinics] = useState<Clinic[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('crm_clinics_list');
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter(c => 
              c.name.toLowerCase() !== 'minha clínica' && 
              c.name.toLowerCase() !== 'minha clinica'
            );
          }
        }
      } catch (e) {
        console.error('Failed to load clinics from storage:', e);
      }
    }
    return INITIAL_CLINICS.filter(c => 
      c.name.toLowerCase() !== 'minha clínica' && 
      c.name.toLowerCase() !== 'minha clinica'
    );
  });

  // Ensure localStorage is immediately updated if 'Minha Clínica' was previously stored
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_clinics_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(c => 
              c.name.toLowerCase() !== 'minha clínica' && 
              c.name.toLowerCase() !== 'minha clinica'
            );
            if (cleaned.length !== parsed.length) {
              localStorage.setItem('crm_clinics_list', JSON.stringify(cleaned));
              setClinics(cleaned);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const saveClinicsToStorage = (updatedClinics: Clinic[]) => {
    setClinics(updatedClinics);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_clinics_list', JSON.stringify(updatedClinics));
    }
  };

  const addClinic = useCallback((
    clinicData: Omit<Clinic, 'id' | 'createdAt'>, 
    clientUser?: { name: string; email: string; password?: string; role?: Role }
  ): Clinic => {
    const newId = isSupabaseConfigured() ? newUuid() : String(Date.now());
    const initials = clinicData.name.substring(0, 2).toUpperCase();
    const newClinic: Clinic = {
      ...clinicData,
      id: newId,
      logo: clinicData.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(initials)}&backgroundColor=0284c7`,
      createdAt: new Date().toISOString(),
      enabledModules: clinicData.enabledModules && clinicData.enabledModules.length > 0 ? clinicData.enabledModules : ['dashboard', 'crm', 'patients', 'appointments', 'reports']
    };

    const updated = [...clinics, newClinic];
    saveClinicsToStorage(updated);
    insertClinicInDb(newClinic).then(ok => {
      if (!ok) addToast(`Não foi possível salvar "${newClinic.name}" no banco de dados.`, 'error');
    });

    // If a client account was specified, create corresponding user record
    if (clientUser && clientUser.email) {
      try {
        const teamRaw = localStorage.getItem('crm_team_members');
        const teamList = teamRaw ? JSON.parse(teamRaw) : [];
        const newTeamMember = {
          id: String(Date.now() + 1),
          name: clientUser.name || newClinic.responsible || newClinic.name,
          email: clientUser.email,
          role: clientUser.role === Role.CLINIC_VIEWER ? 'Visualizador da Clínica' : 'Administrador da Clínica',
          status: 'Ativo',
          clinic: newClinic.name
        };
        teamList.push(newTeamMember);
        localStorage.setItem('crm_team_members', JSON.stringify(teamList));
      } catch (e) {
        console.error('Error adding client user:', e);
      }
    }

    addToast(`Cliente/Unidade "${newClinic.name}" cadastrado com sucesso!`, 'success');
    return newClinic;
  }, [clinics, addToast]);

  const updateClinic = useCallback((id: string, updates: Partial<Clinic>) => {
    const updated = clinics.map(c => c.id === id ? { ...c, ...updates } : c);
    saveClinicsToStorage(updated);
    updateClinicInDb(id, updates).then(ok => {
      if (ok) addToast('Configurações da clínica salvas com sucesso!', 'success');
      else addToast('Não foi possível salvar as configurações no banco de dados.', 'error');
    });
  }, [clinics, addToast]);

  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const isClientOnlyMode = Boolean(
    user && (user.role === Role.CLINIC_ADMIN || user.role === Role.CLINIC_VIEWER)
  );

  const [currentClinicId, setCurrentClinicIdState] = useState<string>(() => {
    const saved = localStorage.getItem('currentClinicId') || 'all';
    return saved;
  });

  // Keep clinic selection synchronized with user restrictions
  const setCurrentClinicId = useCallback((id: string) => {
    if (user && (user.role === Role.CLINIC_ADMIN || user.role === Role.CLINIC_VIEWER)) {
      // Locked to accessible clinics
      const allowedId = user.accessibleClinicIds[0] || id;
      setCurrentClinicIdState(allowedId);
      localStorage.setItem('currentClinicId', allowedId);
      return;
    }
    setCurrentClinicIdState(id);
    localStorage.setItem('currentClinicId', id);
  }, [user]);

  const deleteClinic = useCallback((id: string) => {
    const clinicToDelete = clinics.find(c => c.id === id);
    const updated = clinics.filter(c => c.id !== id);
    saveClinicsToStorage(updated);
    if (currentClinicId === id) {
      setCurrentClinicId(updated[0]?.id || 'all');
    }
    if (isSupabaseConfigured()) {
      deleteClinicFromDb(id).then(ok => {
        if (!ok) addToast('Não foi possível excluir a clínica no banco de dados.', 'error');
      });
    } else {
      fetch(`/api/clinics/${id}`, { method: 'DELETE' }).catch(err => {
        console.warn('Backend deletion warning:', err);
      });
    }
    addToast(`Clínica "${clinicToDelete?.name || ''}" removida com sucesso.`, 'info');
  }, [clinics, currentClinicId, setCurrentClinicId, addToast]);

  // If user is client role, ensure currentClinicId matches
  useEffect(() => {
    if (user && (user.role === Role.CLINIC_ADMIN || user.role === Role.CLINIC_VIEWER)) {
      if (user.accessibleClinicIds.length > 0 && currentClinicId !== user.accessibleClinicIds[0]) {
        setCurrentClinicIdState(user.accessibleClinicIds[0]);
        localStorage.setItem('currentClinicId', user.accessibleClinicIds[0]);
      }
    }
  }, [user, currentClinicId]);

  const switchUserRole = useCallback((role: Role, clinicId?: string) => {
    if (role === Role.SUPER_ADMIN) {
      const superUser: User = {
        id: 'u-admin',
        name: 'Gustavo Admin (Rede Geral)',
        email: 'portilhogustavohenriquegodoi@gmail.com',
        role: Role.SUPER_ADMIN,
        accessibleClinicIds: clinics.map(c => c.id),
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GustavoAdmin'
      };
      setUser(superUser);
      localStorage.setItem('user', JSON.stringify(superUser));
      setCurrentClinicIdState('all');
      addToast('Alternado para Perfil: Administrador Geral (Acesso Total)', 'info');
    } else if (role === Role.CEOP_OPERATOR || role === Role.CEOP) {
      const ceopUser: User = {
        id: 'u-ceop-1',
        name: 'Operador CEOP (Atendimento)',
        email: 'ceop@crm.com',
        role: Role.CEOP_OPERATOR,
        accessibleClinicIds: clinics.map(c => c.id),
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CEOP'
      };
      setUser(ceopUser);
      localStorage.setItem('user', JSON.stringify(ceopUser));
      addToast('Modo Operador CEOP Ativo: Acesso à Administração Restrito', 'warning');
    } else {
      const targetClinic = clinics.find(c => c.id === clinicId) || clinics[0];
      const clientUser: User = {
        id: `u-client-${targetClinic?.id || '1'}`,
        name: `${targetClinic?.responsible || 'Gestor'} (${targetClinic?.name || 'Cliente'})`,
        email: targetClinic?.email || `contato@${targetClinic?.name.toLowerCase().replace(/\s+/g, '')}.com`,
        role: role,
        accessibleClinicIds: targetClinic ? [targetClinic.id] : ['1'],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(targetClinic?.name || 'Client')}`
      };
      setUser(clientUser);
      localStorage.setItem('user', JSON.stringify(clientUser));
      if (targetClinic) {
        setCurrentClinicIdState(targetClinic.id);
      }
      addToast(`Modo Cliente Ativo: Visualização restrita exclusiva de "${targetClinic?.name}"`, 'success');
    }
  }, [clinics, addToast]);

  // Monta o usuário do app a partir do usuário do Supabase Auth + tabela profiles
  const buildUserFromSession = useCallback(async (authUser: { id: string; email?: string | null }): Promise<User> => {
    const sb = getSupabase();
    let profile: any = null;
    let allClinicIds: string[] = [];
    if (sb) {
      profile = (await sb.from('profiles').select('*').eq('id', authUser.id).maybeSingle()).data;
      allClinicIds = ((await sb.from('clinics').select('id')).data || []).map((c: any) => c.id);
    }
    const dbRole: string = profile?.role || 'admin';
    const role =
      dbRole === 'super_admin' || dbRole === 'admin' ? Role.SUPER_ADMIN :
      dbRole === 'receptionist' || dbRole === 'marketing' ? Role.CRC_OPERATOR :
      Role.CLINIC_VIEWER;
    const restricted: string[] = profile?.accessible_clinic_ids || [];
    const email = authUser.email || profile?.email || '';
    return {
      id: authUser.id,
      name: profile?.full_name || email.split('@')[0],
      email,
      role,
      accessibleClinicIds: restricted.length > 0 ? restricted : allClinicIds,
      avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`
    };
  }, []);

  const login = async (email: string, password: string) => {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) {
        throw new Error(error?.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : (error?.message || 'Credenciais inválidas'));
      }
      const appUser = await buildUserFromSession(data.user);
      setUser(appUser);
      localStorage.setItem('user', JSON.stringify(appUser));
      addToast('Login realizado com sucesso!', 'success');
      return;
    }

    // Modo demonstração (sem Supabase configurado)
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (email && password) {
          // Check if it matches a specific client
          const matchedClinic = clinics.find(c => c.email.toLowerCase() === email.toLowerCase());
          
          if (matchedClinic) {
            const clientUser: User = {
              id: `u-client-${matchedClinic.id}`,
              name: `${matchedClinic.responsible} (${matchedClinic.name})`,
              email: email,
              role: Role.CLINIC_ADMIN,
              accessibleClinicIds: [matchedClinic.id],
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
            };
            setUser(clientUser);
            localStorage.setItem('user', JSON.stringify(clientUser));
            setCurrentClinicIdState(matchedClinic.id);
            addToast(`Bem-vindo ao Portal ${matchedClinic.name}!`, 'success');
            resolve();
            return;
          }

          // Default admin user
          const mockUser: User = {
            id: 'u1',
            name: 'Gustavo Admin',
            email: email,
            role: Role.SUPER_ADMIN,
            accessibleClinicIds: clinics.map(c => c.id),
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
          };
          setUser(mockUser);
          localStorage.setItem('user', JSON.stringify(mockUser));
          addToast('Login realizado com sucesso!', 'success');
          resolve();
        } else {
          reject(new Error('Credenciais inválidas'));
        }
      }, 600);
    });
  };

  const logout = useCallback(() => {
    getSupabase()?.auth.signOut().catch(() => {});
    setUser(null);
    localStorage.removeItem('user');
    setActiveTabState('dashboard');
    setSubPageState(null);
    setSubPageData(null);
    addToast('Sessão encerrada', 'info');
  }, [addToast]);

  // Sessão: se o Supabase está ativo e não há sessão válida, o login salvo localmente não vale
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setUser(null);
        localStorage.removeItem('user');
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('user');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Fonte da verdade = Supabase: carrega clínicas e leads depois do login
  const syncFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const [dbClinics, dbLeads] = await Promise.all([fetchClinicsFromDb(), loadLeadsFromDb()]);
    if (dbClinics) {
      setClinics(dbClinics);
      localStorage.setItem('crm_clinics_list', JSON.stringify(dbClinics));
      setCurrentClinicIdState(prev => (prev === 'all' || dbClinics.some(c => c.id === prev) ? prev : 'all'));
    }
    if (dbLeads) {
      setLeads(dbLeads);
      localStorage.setItem('crm_leads_data', JSON.stringify(dbLeads));
    }
  }, []);

  useEffect(() => {
    if (user) syncFromSupabase();
  }, [user?.id, syncFromSupabase]);

  useEffect(() => {
    const onLeadsUpdated = () => { if (user) loadLeadsFromDb().then(l => l && setLeads(l)); };
    window.addEventListener('crm_leads_updated', onLeadsUpdated);
    return () => window.removeEventListener('crm_leads_updated', onLeadsUpdated);
  }, [user?.id]);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const confirmLogout = useCallback(() => {
    setIsLogoutModalOpen(true);
  }, []);

  const isAllClinicsView = !isClientOnlyMode && currentClinicId === 'all';
  const currentClinic = clinics.find(c => c.id === currentClinicId) || clinics[0] || null;

  useEffect(() => {
    localStorage.setItem('currentClinicId', currentClinicId);
  }, [currentClinicId]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    
    // Example permission mapping
    const rolePermissions: Record<Role, string[]> = {
      [Role.SUPER_ADMIN]: ['*'],
      [Role.CRC_MANAGER]: ['dashboard', 'crm', 'patients', 'appointments', 'reports', 'integrations', 'settings', 'team'],
      [Role.CRC_OPERATOR]: ['dashboard', 'crm', 'patients', 'appointments', 'followups', 'tasks', 'analise-dados', 'reports', 'ia', 'guia'],
      [Role.CEOP_OPERATOR]: ['dashboard', 'crm', 'patients', 'appointments', 'followups', 'tasks', 'analise-dados', 'reports', 'ia', 'guia'],
      [Role.CEOP]: ['dashboard', 'crm', 'patients', 'appointments', 'followups', 'tasks', 'analise-dados', 'reports', 'ia', 'guia'],
      [Role.CLINIC_ADMIN]: ['dashboard', 'patients', 'appointments', 'reports', 'settings'],
      [Role.CLINIC_VIEWER]: ['dashboard', 'patients', 'appointments'],
    };

    const permissions = rolePermissions[user.role] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }, [user]);

  // Navigation State
  const [activeTab, setActiveTabState] = useState('dashboard');
  const [subPage, setSubPageState] = useState<string | null>(null);
  const [subPageData, setSubPageData] = useState<any>(null);
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['dashboard']);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    setSubPageState(null);
    setSubPageData(null);
    setNavigationHistory(prev => {
      // Don't add if it's the same as current
      if (prev[prev.length - 1] === tab && !subPage) return prev;
      return [...prev, tab];
    });
  }, [subPage]);

  const setSubPage = useCallback((page: string | null, data?: any) => {
    setSubPageState(page);
    if (data) setSubPageData(data);
    if (page) {
      setNavigationHistory(prev => [...prev, `${activeTab}:${page}`]);
    }
  }, [activeTab]);

  const goBack = useCallback(() => {
    setNavigationHistory(prev => {
      if (prev.length <= 1) return prev;
      const newHistory = [...prev];
      newHistory.pop(); // Remove current
      const last = newHistory[newHistory.length - 1];
      
      if (last.includes(':')) {
        const [tab, page] = last.split(':');
        setActiveTabState(tab);
        setSubPageState(page);
      } else {
        setActiveTabState(last);
        setSubPageState(null);
        setSubPageData(null);
      }
      
      return newHistory;
    });
  }, []);

  return (
    <AppContext.Provider value={{ 
      theme, toggleTheme, toasts, addToast, removeToast,
      supabase: getSupabase(),
      leads, refreshLeads, addLead,
      user, login, logout, clinics, addClinic, updateClinic, deleteClinic, switchUserRole,
      currentClinicId, setCurrentClinicId, currentClinic, isAllClinicsView, isClientOnlyMode,
      hasPermission,
      isLogoutModalOpen, setIsLogoutModalOpen, confirmLogout,
      activeTab, setActiveTab, subPage, setSubPage, subPageData, navigationHistory, goBack
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
