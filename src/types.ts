/**
 * CRM Operational Types
 */

export enum LeadStatus {
  NEW = 'novo',
  FIRST_CONTACT = '1_contato',
  SECOND_CONTACT = '2_contato',
  THIRD_CONTACT = '3_contato',
  INTERACTED = 'interagiu',
  APPOINTMENT = 'agendamento',
  ATTENDED = 'compareceu',
  SOLD = 'vendido',
  MISSED = 'faltou',
  DISQUALIFIED = 'desqualificado'
}

export enum AppointmentStatus {
  PRE_APPOINTMENT = 'pre_agendamento',
  SCHEDULED = 'agendado',
  CONFIRMED = 'confirmado',
  RESCHEDULED = 'reagendamento',
  CANCELLED = 'cancelado',
  NO_SHOW = 'nao_compareceu',
  ATTENDED = 'compareceu',
  COMPLETED = 'concluido'
}

export enum Role {
  SUPER_ADMIN = 'super_admin',
  CRC_MANAGER = 'crc_manager',
  CRC_OPERATOR = 'crc_operator',
  CEOP_OPERATOR = 'ceop_operator',
  CEOP = 'ceop',
  CLINIC_VIEWER = 'clinic_viewer',
  CLINIC_ADMIN = 'clinic_admin'
}

export type ModuleType = 
  | 'dashboard'
  | 'crm'
  | 'analise-dados'
  | 'patients'
  | 'records'
  | 'appointments'
  | 'followups'
  | 'tasks'
  | 'communication'
  | 'reports'
  | 'analytics'
  | 'integrations'
  | 'team'
  | 'settings'
  | 'administration'
  | 'ceop_restriction';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  accessibleClinicIds: string[]; // Clinics this user can access
  avatar?: string;
}

export interface Clinic {
  id: string;
  name: string;
  corporateName: string;
  cnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  responsible: string;
  status: 'active' | 'inactive';
  system: 'clinicorp' | 'simples_dental' | 'google_calendar' | 'other' | 'none';
  logo?: string;
  integrationStatus?: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSyncAt?: string;
  enabledModules: ModuleType[];
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  birthDate?: string;
  cpf?: string;
  cep?: string;
  address?: string;
  clinicId: string;
  sourceId: string;
  sourceMedium?: string;
  campaignId?: string;
  referralUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  serviceId?: string;
  status: LeadStatus;
  responsibleId?: string;
  responsibleName?: string;
  estimatedValue?: number;
  lastInteractionAt: string;
  nextTaskAt?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  nextAppointmentAt?: string;
  lastContactChannel?: 'whatsapp' | 'email' | 'phone' | 'instagram' | 'other';
  procedureType?: string;
  treatmentPlan?: TreatmentPlan;
  documents?: PatientDocument[];
  createdAt: string;
  tags: string[];
}

export interface LeadTrackingData {
  source: string;
  sourceMedium?: string;
  campaignId?: string;
  referralUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  deviceType?: string;
  capturedAt?: string;
}

export interface TreatmentPlan {
  id: string;
  leadId: string;
  title: string;
  description: string;
  items: TreatmentItem[];
  totalAmount: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface TreatmentItem {
  id: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface PatientDocument {
  id: string;
  leadId: string;
  name: string;
  type: 'contract' | 'exam' | 'photo' | 'consent' | 'other';
  url: string;
  uploadedAt: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  cpf?: string;
  birthDate?: string;
  clinicId: string;
  sourceId?: string;
  originalLeadId?: string;
  externalId?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId?: string;
  leadId?: string;
  clinicId: string;
  professionalId: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  status: AppointmentStatus;
  externalId?: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  platform: 'facebook' | 'instagram' | 'google' | 'tiktok' | 'other';
  clinicId: string;
  startDate: string;
  endDate?: string;
  investment: number;
  status: 'active' | 'paused' | 'ended';
}

export interface LeadSource {
  id: string;
  name: string;
  type: 'meta_ads' | 'landing_page' | 'form' | 'whatsapp' | 'api' | 'import';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  responsibleId: string;
  leadId?: string;
  clinicId: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  entityId: string; // leadId, patientId, etc
  entityType: 'lead' | 'patient' | 'appointment';
  type: string;
  description: string;
  userId?: string;
  data?: any;
  createdAt: string;
}

export interface Sale {
  id: string;
  leadId?: string;
  patientId: string;
  clinicId: string;
  amount: number;
  serviceId: string;
  date: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  clinicId: string;
  category?: string;
  duration: number;
  price?: number;
}

export interface Professional {
  id: string;
  name: string;
  clinicId: string;
  specialty?: string;
  status: 'active' | 'inactive';
}
