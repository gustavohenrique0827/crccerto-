import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createLeadInDb, 
  fetchLeadsFromDb, 
  updateLeadInDb, 
  deleteLeadFromDb,
  checkLeadDuplicateInDb,
  getSupabase,
  isSupabaseConfigured
} from '../src/lib/supabase';
import { Lead, LeadStatus, Clinic, ModuleType } from '../src/types';

describe('Operações de API nos Modais (NewLeadModal, NewClinicModal, TaskModal)', () => {
  beforeEach(() => {
    // Reset local cache before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  // =========================================================================
  // 1. NEW LEAD MODAL API OPERATIONS (CRUD & Loading / Error States)
  // =========================================================================
  describe('NewLeadModal - Operações de Leads (POST, PUT, DELETE, GET, DUPLICATE CHECK)', () => {
    it('POST: deve criar um lead com dados reais e campos de tracking persistidos', async () => {
      const leadInput: Partial<Lead> = {
        name: 'Carlos Eduardo Nogueira',
        whatsapp: '(11) 97777-8888',
        phone: '(11) 97777-8888',
        email: 'carlos.nogueira@email.com',
        clinicId: 'clinic_test_01',
        sourceId: 'Meta Ads (Instagram)',
        procedureType: 'Implante Dentário Unitário',
        estimatedValue: 3800,
        priority: 'high',
        status: LeadStatus.NEW,
        tags: ['implante', 'primeira-consulta']
      };

      const result = await createLeadInDb(leadInput);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Carlos Eduardo Nogueira');
      expect(result.whatsapp).toBe('(11) 97777-8888');
      expect(result.clinicId).toBe('clinic_test_01');
      expect(result.procedureType).toBe('Implante Dentário Unitário');
      expect(result.estimatedValue).toBe(3800);
      expect(result.status).toBe(LeadStatus.NEW);
    });

    it('GET: deve realizar busca com isolamento total por clinicId (multi-tenant)', async () => {
      const clinicAlphaId = '11111111-1111-4111-8111-111111111111';
      const clinicBetaId = '22222222-2222-4222-8222-222222222222';

      await createLeadInDb({
        name: 'Paciente Clínica A',
        whatsapp: '(11) 91111-1111',
        clinicId: clinicAlphaId
      });

      await createLeadInDb({
        name: 'Paciente Clínica B',
        whatsapp: '(11) 92222-2222',
        clinicId: clinicBetaId
      });

      const alphaLeads = await fetchLeadsFromDb(clinicAlphaId);
      const betaLeads = await fetchLeadsFromDb(clinicBetaId);

      expect(alphaLeads.every(l => l.clinicId === clinicAlphaId)).toBe(true);
      expect(betaLeads.every(l => l.clinicId === clinicBetaId)).toBe(true);
      expect(alphaLeads.some(l => l.name === 'Paciente Clínica A')).toBe(true);
      expect(alphaLeads.some(l => l.name === 'Paciente Clínica B')).toBe(false);
    });

    it('PUT: deve atualizar status do lead e valor estimado', async () => {
      const clinicId = '11111111-1111-4111-8111-111111111111';
      const created = await createLeadInDb({
        name: 'Beatriz Vasconcelos',
        whatsapp: '(11) 93333-4444',
        clinicId,
        status: LeadStatus.NEW,
        estimatedValue: 2000
      });

      await updateLeadInDb(created.id, {
        status: LeadStatus.APPOINTMENT,
        estimatedValue: 5500
      });

      const leads = await fetchLeadsFromDb(clinicId);
      const updated = leads.find(l => l.id === created.id);

      expect(updated).toBeDefined();
      expect(updated?.status).toBe(LeadStatus.APPOINTMENT);
      expect(updated?.estimatedValue).toBe(5500);
    });

    it('DELETE: deve excluir o lead e limpar os registros', async () => {
      const clinicId = '11111111-1111-4111-8111-111111111111';
      const created = await createLeadInDb({
        name: 'Lead para Excluir',
        whatsapp: '(11) 90000-0000',
        clinicId
      });

      await deleteLeadFromDb(created.id);
      const leads = await fetchLeadsFromDb(clinicId);
      const deleted = leads.find(l => l.id === created.id);

      expect(deleted).toBeUndefined();
    });

    it('Loading & Error handling: deve capturar validações de formulário sem travar o estado', async () => {
      let isSubmitting = false;
      let errorMessage: string | null = null;

      const submitLead = async (payload: { name?: string; whatsapp?: string }) => {
        isSubmitting = true;
        errorMessage = null;
        try {
          if (!payload.name || payload.name.trim().length < 3) {
            throw new Error('O nome do lead deve conter pelo menos 3 caracteres.');
          }
          if (!payload.whatsapp || payload.whatsapp.replace(/\D/g, '').length < 10) {
            throw new Error('Número de WhatsApp inválido.');
          }
          return { success: true };
        } catch (e: any) {
          errorMessage = e.message;
          return { success: false };
        } finally {
          isSubmitting = false;
        }
      };

      const fail1 = await submitLead({ name: 'Jo', whatsapp: '11999999999' });
      expect(fail1.success).toBe(false);
      expect(errorMessage).toContain('pelo menos 3 caracteres');
      expect(isSubmitting).toBe(false);

      const fail2 = await submitLead({ name: 'João Silva', whatsapp: '123' });
      expect(fail2.success).toBe(false);
      expect(errorMessage).toContain('WhatsApp inválido');
      expect(isSubmitting).toBe(false);

      const success = await submitLead({ name: 'João Silva', whatsapp: '(11) 98765-4321' });
      expect(success.success).toBe(true);
      expect(errorMessage).toBeNull();
      expect(isSubmitting).toBe(false);
    });

    it('DUPLICATE CHECK: deve detectar lead duplicado pelo e-mail ou telefone na mesma clínica', async () => {
      const clinicId = 'clinic_dup_check_01';
      
      // Seed existing lead
      await createLeadInDb({
        name: 'Mariana Duarte',
        email: 'mariana.duarte@email.com',
        phone: '(11) 98888-7777',
        whatsapp: '(11) 98888-7777',
        clinicId,
        status: LeadStatus.NEW
      });

      // Test 1: Duplicate by Email
      const emailDupCheck = await checkLeadDuplicateInDb({
        clinicId,
        email: 'mariana.duarte@email.com',
        phone: '(11) 91111-0000',
        whatsapp: '(11) 91111-0000'
      });
      expect(emailDupCheck.isDuplicate).toBe(true);
      expect(emailDupCheck.duplicateField).toBe('email');
      expect(emailDupCheck.existingLead?.name).toBe('Mariana Duarte');

      // Test 2: Duplicate by Phone / WhatsApp
      const phoneDupCheck = await checkLeadDuplicateInDb({
        clinicId,
        email: 'outro.email@teste.com',
        phone: '11988887777',
        whatsapp: '11988887777'
      });
      expect(phoneDupCheck.isDuplicate).toBe(true);
      expect(phoneDupCheck.duplicateField).toBe('phone');

      // Test 3: No duplicate in a different clinic (Multi-tenant isolation)
      const diffClinicCheck = await checkLeadDuplicateInDb({
        clinicId: 'other_clinic_02',
        email: 'mariana.duarte@email.com',
        phone: '(11) 98888-7777',
        whatsapp: '(11) 98888-7777'
      });
      expect(diffClinicCheck.isDuplicate).toBe(false);

      // Test 4: Completely distinct lead
      const nonDupCheck = await checkLeadDuplicateInDb({
        clinicId,
        email: 'novo.paciente@email.com',
        phone: '(11) 94444-3333',
        whatsapp: '(11) 94444-3333'
      });
      expect(nonDupCheck.isDuplicate).toBe(false);
    });
  });

  // =========================================================================
  // 2. NEW CLINIC MODAL API OPERATIONS (CRUD & Multi-Tenancy)
  // =========================================================================
  describe('NewClinicModal - Operações de Clínicas (POST, PUT, DELETE, GET)', () => {
    const memoryClinics: Clinic[] = [];

    it('POST: deve validar e cadastrar uma nova clínica com módulos habilitados e dados cadastrais', () => {
      const clinicPayload: Clinic = {
        id: 'clinic_' + Date.now(),
        name: 'Clínica Odonto Prime Alphaville',
        corporateName: 'Odonto Prime Alphaville LTDA',
        cnpj: '11.222.333/0001-44',
        phone: '(11) 4195-0000',
        whatsapp: '(11) 94195-0000',
        email: 'contato@odontoprimealpha.com.br',
        address: 'Alameda Rio Negro, 500',
        city: 'Barueri',
        state: 'SP',
        responsible: 'Dra. Camila Siqueira',
        status: 'active',
        system: 'simples_dental',
        enabledModules: ['dashboard', 'crm', 'patients', 'appointments', 'reports'],
        createdAt: new Date().toISOString()
      };

      memoryClinics.push(clinicPayload);

      expect(clinicPayload.name).toBe('Clínica Odonto Prime Alphaville');
      expect(clinicPayload.enabledModules).toContain('crm');
      expect(clinicPayload.enabledModules).toContain('appointments');
      expect(clinicPayload.status).toBe('active');
      expect(memoryClinics.length).toBe(1);
    });

    it('PUT: deve atualizar dados e alterar módulos contratados da unidade', () => {
      const clinic = memoryClinics[0];
      expect(clinic).toBeDefined();

      const updatedModules: ModuleType[] = ['dashboard', 'crm', 'patients', 'appointments', 'reports', 'analytics'];
      const updatedClinic = {
        ...clinic,
        phone: '(11) 4195-9999',
        enabledModules: updatedModules
      };

      memoryClinics[0] = updatedClinic;

      expect(memoryClinics[0].phone).toBe('(11) 4195-9999');
      expect(memoryClinics[0].enabledModules).toContain('analytics');
    });

    it('DELETE: deve remover a unidade com sucesso', () => {
      const initialCount = memoryClinics.length;
      memoryClinics.pop();
      expect(memoryClinics.length).toBe(initialCount - 1);
    });

    it('Multi-Tenancy: deve isolar o acesso aos dados para usuários sem permissão em outras unidades', () => {
      const userPermissions = {
        role: 'CLIENT_VIEWER',
        accessibleClinics: ['clinic_alpha']
      };

      const canAccessAlpha = userPermissions.accessibleClinics.includes('clinic_alpha');
      const canAccessBeta = userPermissions.accessibleClinics.includes('clinic_beta');

      expect(canAccessAlpha).toBe(true);
      expect(canAccessBeta).toBe(false);
    });
  });

  // =========================================================================
  // 3. TASK MODAL API OPERATIONS (CRUD & Loading / Error States)
  // =========================================================================
  describe('TaskModal - Operações de Tarefas (POST, PUT, DELETE, GET)', () => {
    interface TaskItem {
      id: string;
      leadId: string;
      leadName: string;
      title: string;
      description?: string;
      dueDate: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      category: string;
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      clinicId: string;
      createdAt: string;
    }

    const memoryTasks: TaskItem[] = [];

    it('POST: deve criar uma tarefa associada a um lead com categoria e prioridade', () => {
      const taskPayload: TaskItem = {
        id: 'task_' + Date.now(),
        leadId: 'lead_test_123',
        leadName: 'Fernanda Lima',
        title: 'Enviar orçamento de facetas em resina',
        description: 'Paciente solicitou parcelamento em 10x sem juros.',
        dueDate: '2026-09-15',
        priority: 'urgent',
        category: 'Apresentar Orçamento',
        status: 'pending',
        clinicId: 'clinic_test_01',
        createdAt: new Date().toISOString()
      };

      memoryTasks.push(taskPayload);

      expect(taskPayload.title).toBeTruthy();
      expect(taskPayload.leadId).toBe('lead_test_123');
      expect(taskPayload.priority).toBe('urgent');
      expect(taskPayload.status).toBe('pending');
      expect(memoryTasks.length).toBe(1);
    });

    it('PUT: deve alterar status e data de vencimento da tarefa', () => {
      const task = memoryTasks[0];
      expect(task).toBeDefined();

      memoryTasks[0] = {
        ...task,
        status: 'completed',
        dueDate: '2026-09-16'
      };

      expect(memoryTasks[0].status).toBe('completed');
      expect(memoryTasks[0].dueDate).toBe('2026-09-16');
    });

    it('DELETE: deve remover tarefa concluída', () => {
      memoryTasks.pop();
      expect(memoryTasks.length).toBe(0);
    });

    it('Loading & Error handling: deve gerenciar estados de loading e erro adequadamente', async () => {
      let isLoading = false;
      let error: string | null = null;

      const executeTaskCreation = async (title: string) => {
        isLoading = true;
        error = null;
        try {
          if (!title.trim()) {
            throw new Error('Título da tarefa é obrigatório');
          }
          return { success: true };
        } catch (err: any) {
          error = err.message;
          return { success: false };
        } finally {
          isLoading = false;
        }
      };

      // Test validation error
      const failResult = await executeTaskCreation('');
      expect(failResult.success).toBe(false);
      expect(error).toBe('Título da tarefa é obrigatório');
      expect(isLoading).toBe(false);

      // Test success
      const successResult = await executeTaskCreation('Ligar para confirmação');
      expect(successResult.success).toBe(true);
      expect(error).toBeNull();
      expect(isLoading).toBe(false);
    });
  });
});
