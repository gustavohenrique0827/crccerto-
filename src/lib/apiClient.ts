// API Client for interacting with the backend CRM Express Server & Webhook Engine

export interface ApiLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  clinicId?: string;
  source?: string;
  status?: string;
  procedureInterest?: string;
  estimatedValue?: number;
  notes?: string;
  createdAt?: string;
}

export interface WebhookLog {
  id: string;
  source: string;
  payload: any;
  status: 'success' | 'error';
  statusCode: number;
  message: string;
  timestamp: string;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  source: string;
  status: 'active' | 'inactive';
  secretToken: string;
  createdAt: string;
}

class CrmApiClient {
  private baseUrl = '';

  // Webhook Ingestion URL generator
  getWebhookUrl(source: string = 'custom'): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `${origin}/api/webhooks/incoming/${source}`;
  }

  // Get API info & documentation
  async getApiInfo() {
    try {
      const res = await fetch('/api/info');
      if (!res.ok) throw new Error('Failed to fetch API info');
      return await res.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // Webhooks
  async getWebhookLogs(): Promise<WebhookLog[]> {
    try {
      const res = await fetch('/api/webhooks/logs');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async clearWebhookLogs(): Promise<boolean> {
    try {
      const res = await fetch('/api/webhooks/logs', { method: 'DELETE' });
      return res.ok;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async sendTestWebhook(source: string = 'test', payload?: any): Promise<{ success: boolean; lead?: any; log?: any; message?: string }> {
    try {
      const res = await fetch(`/api/webhooks/incoming/${source}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {
          nome: 'Paciente Teste Webhook',
          telefone: '(11) 99876-5432',
          email: 'teste.webhook@exemplo.com',
          origem: 'Teste de Integração Webhook',
          procedimento: 'Invisalign / Implante',
          observacao: 'Lead gerado via teste direto de Webhook'
        })
      });
      const data = await res.json();
      return { success: res.ok, ...data };
    } catch (e: any) {
      console.error(e);
      return { success: false, message: e.message || 'Erro ao enviar webhook de teste' };
    }
  }

  async getWebhookConfigs(): Promise<WebhookConfig[]> {
    try {
      const res = await fetch('/api/webhooks/list');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async createWebhookConfig(config: { name: string; source: string; url?: string }): Promise<WebhookConfig | null> {
    try {
      const res = await fetch('/api/webhooks/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // Leads API
  async getLeads(clinicId?: string): Promise<ApiLead[]> {
    try {
      const url = clinicId ? `/api/leads?clinicId=${clinicId}` : '/api/leads';
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async createLead(leadData: Partial<ApiLead>): Promise<ApiLead | null> {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async updateLead(id: string, updates: Partial<ApiLead>): Promise<ApiLead | null> {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async deleteLead(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

export const crmApiClient = new CrmApiClient();
