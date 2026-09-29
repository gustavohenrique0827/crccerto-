import { Lead, LeadStatus, Clinic, Patient, Appointment, AppointmentStatus, Task, Sale, Role } from '../types';

export const INITIAL_CLINICS: Clinic[] = [];

export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_PATIENTS: Patient[] = [];

export const INITIAL_APPOINTMENTS: Appointment[] = [];

export const INITIAL_TASKS: Task[] = [];

export const INITIAL_FOLLOWUPS: any[] = [];

export function seedLocalStorageIfEmpty() {
  if (typeof window === 'undefined') return;

  try {
    const isCleared = localStorage.getItem('crm_data_cleared_v2');
    if (!isCleared) {
      localStorage.setItem('crm_data_cleared_v2', 'true');
      localStorage.setItem('crm_clinics_list', JSON.stringify(INITIAL_CLINICS));
      localStorage.setItem('crm_leads_data', JSON.stringify([]));
      localStorage.setItem('crm_patients_data', JSON.stringify([]));
      localStorage.setItem('crm_appointments_data', JSON.stringify([]));
      localStorage.setItem('crm_tasks_data', JSON.stringify([]));
      localStorage.setItem('crm_followups_data', JSON.stringify([]));
    } else {
      if (!localStorage.getItem('crm_clinics_list')) {
        localStorage.setItem('crm_clinics_list', JSON.stringify(INITIAL_CLINICS));
      }
      if (!localStorage.getItem('crm_leads_data')) {
        localStorage.setItem('crm_leads_data', JSON.stringify([]));
      }
      if (!localStorage.getItem('crm_patients_data')) {
        localStorage.setItem('crm_patients_data', JSON.stringify([]));
      }
      if (!localStorage.getItem('crm_appointments_data')) {
        localStorage.setItem('crm_appointments_data', JSON.stringify([]));
      }
      if (!localStorage.getItem('crm_tasks_data')) {
        localStorage.setItem('crm_tasks_data', JSON.stringify([]));
      }
      if (!localStorage.getItem('crm_followups_data')) {
        localStorage.setItem('crm_followups_data', JSON.stringify([]));
      }
    }
  } catch (err) {
    console.error('Failed to seed local storage:', err);
  }
}
