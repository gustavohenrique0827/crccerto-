import { useApp } from '../context/AppContext';
import { Role } from '../types';

export interface ModuleAccessResult {
  hasAccess: boolean;
  reason?: string;
  moduleName: string;
  clinicName?: string;
}

export function useModuleAccess(moduleId: string): ModuleAccessResult {
  const { currentClinic, isAllClinicsView, user } = useApp();

  if (!user) {
    return { 
      hasAccess: false, 
      reason: 'Sessão expirada ou usuário não autenticado no sistema.', 
      moduleName: moduleId 
    };
  }

  // Super Admin or Consolidate View has full uninhibited access
  if (isAllClinicsView || user.role === Role.SUPER_ADMIN) {
    return { 
      hasAccess: true, 
      moduleName: moduleId, 
      clinicName: isAllClinicsView ? 'Rede Consolidada' : currentClinic?.name 
    };
  }

  const adminTabs = ['clinicas', 'equipe', 'integracoes', 'configuracoes', 'settings', 'administration'];

  // CEOP or CRC operators restricted from administrative settings
  if (adminTabs.includes(moduleId) && (user.role === Role.CEOP_OPERATOR || user.role === Role.CEOP || user.role === Role.CRC_OPERATOR)) {
    return { 
      hasAccess: false, 
      reason: 'O perfil de Operador CEOP/CRC não possui privilégios para acessar áreas administrativas do sistema.',
      moduleName: moduleId,
      clinicName: currentClinic?.name
    };
  }

  const enabledList: string[] = currentClinic?.enabledModules || [];

  // Check master administration toggle for single-clinic view
  if (adminTabs.includes(moduleId) && enabledList.length > 0 && !enabledList.includes('administration')) {
    return {
      hasAccess: false,
      reason: `As rotas administrativas estão temporariamente bloqueadas para a unidade "${currentClinic?.name || 'esta clínica'}".`,
      moduleName: moduleId,
      clinicName: currentClinic?.name
    };
  }

  const idToModuleMap: Record<string, string> = {
    'dashboard': 'dashboard',
    'leads': 'crm',
    'crm': 'crm',
    'analise-dados': 'analise-dados',
    'pacientes': 'patients',
    'patients': 'patients',
    'agenda': 'appointments',
    'appointments': 'appointments',
    'followups': 'followups',
    'tarefas': 'tasks',
    'relatorios': 'reports',
    'reports': 'reports',
    'analytics': 'reports',
    'integracoes': 'integrations',
    'integrations': 'integrations',
    'equipe': 'team',
    'team': 'team',
    'configuracoes': 'settings',
    'settings': 'settings'
  };

  const moduleKey = idToModuleMap[moduleId] || moduleId;

  if (enabledList.length > 0 && !enabledList.includes(moduleKey)) {
    return {
      hasAccess: false,
      reason: `O módulo "${moduleKey.toUpperCase()}" não está habilitado no plano de acesso da unidade "${currentClinic?.name || 'esta clínica'}".`,
      moduleName: moduleKey,
      clinicName: currentClinic?.name
    };
  }

  return { 
    hasAccess: true, 
    moduleName: moduleId, 
    clinicName: currentClinic?.name 
  };
}
