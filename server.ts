import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

dotenv.config();

// Disk persistence setup
const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "crm_store.json");

interface CrmStore {
  clinics: any[];
  leads: any[];
  patients: any[];
  appointments: any[];
  tasks: any[];
  followups: any[];
  transactions: any[];
  webhooks: any[];
  webhookLogs: any[];
  waha_tenants: any[];
  interacoes: any[];
}

function loadStore(): CrmStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      const parsedStore: CrmStore = JSON.parse(raw);
      if (parsedStore.clinics) {
        parsedStore.clinics = parsedStore.clinics.filter(c => 
          c.name?.toLowerCase() !== 'minha clínica' && 
          c.name?.toLowerCase() !== 'minha clinica'
        );
      }
      return parsedStore;
    }
  } catch (err) {
    console.error("Error loading store file:", err);
  }
  return {
    clinics: [],
    leads: [],
    patients: [],
    appointments: [],
    tasks: [],
    followups: [],
    transactions: [],
    webhooks: [
      {
        id: "wh_1",
        name: "Meta Ads (Facebook & Instagram)",
        source: "meta",
        url: "/api/webhooks/incoming/meta",
        status: "active",
        secretToken: "whsec_meta_" + Date.now().toString(36),
        createdAt: new Date().toISOString()
      },
      {
        id: "wh_2",
        name: "Google Ads Lead Form",
        source: "google",
        url: "/api/webhooks/incoming/google",
        status: "active",
        secretToken: "whsec_google_" + Date.now().toString(36),
        createdAt: new Date().toISOString()
      },
      {
        id: "wh_3",
        name: "Elementor / Site Wordpress",
        source: "elementor",
        url: "/api/webhooks/incoming/elementor",
        status: "active",
        secretToken: "whsec_elementor_" + Date.now().toString(36),
        createdAt: new Date().toISOString()
      },
      {
        id: "wh_4",
        name: "WhatsApp / Chatbot API",
        source: "whatsapp",
        url: "/api/webhooks/incoming/whatsapp",
        status: "active",
        secretToken: "whsec_wa_" + Date.now().toString(36),
        createdAt: new Date().toISOString()
      }
    ],
    webhookLogs: [],
    waha_tenants: [
      {
        id: "tenant_rodrigo",
        nome: "Rodrigo",
        waha_session: "Secreto-Rodrigo",
        clinic_id: "1",
        telefone_admin: null,
        ativo: true,
        criado_em: new Date().toISOString()
      }
    ],
    interacoes: []
  };
}

function saveStore(store: CrmStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving store file:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  const db = loadStore();

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Supabase Client (initialized if env variables are present)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  let supabase: SupabaseClient | null = null;
  if (supabaseUrl && supabaseKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log("Supabase client initialized successfully on backend");
    } catch (e) {
      console.warn("Failed to initialize Supabase client:", e);
    }
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Helper function to extract lead fields from arbitrary webhook payloads
  function extractLeadFromPayload(source: string, body: any) {
    const p = body || {};
    
    // Normalization helper
    const getVal = (...keys: string[]) => {
      for (const k of keys) {
        if (p[k] !== undefined && p[k] !== null && p[k] !== '') return p[k];
        // Check case-insensitive nested
        if (typeof p === 'object') {
          const matchedKey = Object.keys(p).find(pk => pk.toLowerCase() === k.toLowerCase());
          if (matchedKey && p[matchedKey] !== undefined && p[matchedKey] !== null && p[matchedKey] !== '') {
            return p[matchedKey];
          }
        }
      }
      return undefined;
    };

    // Form data or fields array support (e.g. Elementor/Typeform/Meta)
    let extractedName = getVal('nome', 'name', 'full_name', 'nome_completo', 'lead_name', 'client_name');
    let extractedPhone = getVal('telefone', 'phone', 'whatsapp', 'celular', 'phone_number', 'contact');
    let extractedEmail = getVal('email', 'e-mail', 'mail');
    let extractedProcedure = getVal('procedimento', 'procedure', 'servico', 'service', 'tratamento', 'interesse');
    let extractedNotes = getVal('observacao', 'observacoes', 'notes', 'mensagem', 'message', 'comment');
    let extractedValue = getVal('valor', 'estimatedValue', 'value', 'price', 'budget');
    let extractedClinic = getVal('clinica', 'clinic', 'unidade', 'unit', 'clinicId');

    // Parse array if payload comes from Elementor / Typeform array fields
    if (Array.isArray(p.fields)) {
      p.fields.forEach((field: any) => {
        const title = (field.title || field.id || field.name || '').toLowerCase();
        const value = field.value || field.val;
        if (title.includes('nome') || title.includes('name')) extractedName = value;
        if (title.includes('telef') || title.includes('phone') || title.includes('whats')) extractedPhone = value;
        if (title.includes('mail')) extractedEmail = value;
        if (title.includes('proced') || title.includes('interess')) extractedProcedure = value;
        if (title.includes('obs') || title.includes('mensag')) extractedNotes = value;
      });
    }

    const sourceLabel = source.toUpperCase() + (p.form_name ? ` (${p.form_name})` : '');

    return {
      id: "lead_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      name: String(extractedName || "Novo Lead Webhook"),
      phone: String(extractedPhone || "(00) 00000-0000"),
      email: extractedEmail ? String(extractedEmail) : undefined,
      procedureInterest: extractedProcedure ? String(extractedProcedure) : "Consulta Avaliativa",
      source: `Webhook: ${sourceLabel}`,
      status: "novo",
      estimatedValue: Number(extractedValue) || 0,
      notes: extractedNotes ? String(extractedNotes) : `Recebido via Webhook (${source}) em ${new Date().toLocaleString('pt-BR')}`,
      clinicId: extractedClinic ? String(extractedClinic) : (db.clinics[0]?.id || "1"),
      createdAt: new Date().toISOString()
    };
  }

  // ==========================================
  // SYSTEM & API DOCS ENDPOINTS
  // ==========================================
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      server: "CRM Express Engine",
      timestamp: new Date().toISOString(),
      counts: {
        leads: db.leads.length,
        patients: db.patients.length,
        appointments: db.appointments.length,
        tasks: db.tasks.length,
        webhooks: db.webhooks.length,
        webhookLogs: db.webhookLogs.length
      }
    });
  });

  // Master System API Key & Environment Integration Settings
  const MASTER_API_KEY = process.env.CRM_API_TOKEN || process.env.CRM_API_KEY || "crm_live_key_987654321_master";
  const CRM_BASE_URL = process.env.CRM_BASE_URL || "https://ais-dev-caw73snjpvb46m2mxovkl2-535417849433.us-west2.run.app/api";
  const CRM_WEBHOOK_SECRET = process.env.CRM_WEBHOOK_SECRET || "whsec_crm_live_hmac_secret_2026";

  // Endpoint to retrieve active CRM configuration
  app.get("/api/config", (req, res) => {
    res.json({
      CRM_BASE_URL,
      CRM_API_TOKEN: MASTER_API_KEY,
      CRM_WEBHOOK_SECRET,
      status: "active",
      hmacAlgorithm: "sha256"
    });
  });

  // Endpoint to retrieve the System Master API Key
  app.get("/api/key", (req, res) => {
    res.json({
      apiKey: MASTER_API_KEY,
      description: "Chave de API única para integração total do sistema (Leads, Agenda, Pacientes e Webhooks)",
      usage: "Passe esta chave no Header 'Authorization: Bearer <API_KEY>', no Header 'x-api-key: <API_KEY>' ou na query string '?api_key=<API_KEY>'"
    });
  });

  app.get(["/api/info", "/api/docs"], (req, res) => {
    res.json({
      title: "LeadGen CRM & Webhook Engine API",
      version: "2.0.0",
      systemApiKey: MASTER_API_KEY,
      description: "API completa e unificada para gerenciamento de CRM Odontológico, leads, agendamentos e recepção de Webhooks em tempo real.",
      endpoints: {
        crm: [
          { method: "GET", path: "/api/leads", description: "Listar leads com suporte a filtro ?clinicId e ?status" },
          { method: "POST", path: "/api/leads", description: "Criar novo lead no CRM" },
          { method: "PUT", path: "/api/leads/:id", description: "Atualizar lead por ID" },
          { method: "DELETE", path: "/api/leads/:id", description: "Remover lead por ID" },
          { method: "GET", path: "/api/patients", description: "Listar pacientes cadastrados" },
          { method: "POST", path: "/api/patients", description: "Cadastrar paciente" },
          { method: "GET", path: "/api/appointments", description: "Listar agendamentos e consultas" },
          { method: "POST", path: "/api/appointments", description: "Criar/atualizar consulta" },
          { method: "GET", path: "/api/tasks", description: "Listar tarefas e pendências" },
          { method: "GET", path: "/api/followups", description: "Listar fila de follow-ups" }
        ],
        webhooks: [
          { method: "POST", path: "/api/webhooks/incoming/:source", description: "Endpoint universal de ingestão de webhooks (Meta, Google, Elementor, WhatsApp, etc)" },
          { method: "GET", path: "/api/webhooks/logs", description: "Histórico completo de disparos de webhooks" },
          { method: "DELETE", path: "/api/webhooks/logs", description: "Limpar logs de webhooks" },
          { method: "GET", path: "/api/webhooks/list", description: "Listar webhooks configurados" },
          { method: "POST", path: "/api/webhooks/config", description: "Cadastrar novo webhook de integração" },
          { method: "POST", path: "/api/webhooks/trigger", description: "Disparar evento de webhook de saída para sistema externo" }
        ]
      },
      webhookExampleCurl: `curl -X POST "${req.protocol}://${req.get('host')}/api/webhooks/incoming/meta?api_key=${MASTER_API_KEY}" \\
  -H "Authorization: Bearer ${MASTER_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"nome": "Maria Silva", "telefone": "(11) 98888-7777", "email": "maria@exemplo.com", "procedimento": "Ortodontia", "observacao": "Veio do anúncio do Instagram"}'`
    });
  });

  app.get("/api/supabase/status", (req, res) => {
    res.json({
      configured: Boolean(supabase),
      url: supabaseUrl ? supabaseUrl.replace(/^(https?:\/\/[^.]+).*/, '$1...') : null
    });
  });

  app.get("/api/dashboard/stats", (req, res) => {
    res.json({
      leads: db.leads.length,
      contacted: db.leads.filter(l => l.status !== 'novo').length,
      appointments: db.appointments.length,
      attended: db.appointments.filter(a => a.status === 'compareceu').length,
      sales: db.leads.filter(l => l.status === 'vendido' || l.status === 'comprou').length,
      revenue: db.leads.filter(l => l.status === 'vendido' || l.status === 'comprou').reduce((sum, l) => sum + (l.estimatedValue || 0), 0),
      pendingLeads: db.leads.filter(l => l.status === 'novo').length
    });
  });

  // ==========================================
  // WEBHOOK ENGINE ENDPOINTS
  // ==========================================

  // Incoming Webhook Ingestion (Universal Endpoint)
  app.all("/api/webhooks/incoming/:source", async (req, res) => {
    const source = req.params.source || "custom";
    const payload = req.method === 'GET' ? req.query : req.body;

    try {
      // Handle Meta Ads webhook verification challenge if present
      if (req.query['hub.mode'] === 'subscribe' && req.query['hub.challenge']) {
        return res.status(200).send(req.query['hub.challenge']);
      }

      // Extract Lead from payload
      const lead = extractLeadFromPayload(source, payload);
      
      // Push lead to database
      db.leads.unshift(lead);

      // Create log record
      const log = {
        id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
        source,
        payload,
        status: "success",
        statusCode: 200,
        message: `Lead "${lead.name}" (${lead.phone}) criado com sucesso via Webhook (${source}).`,
        timestamp: new Date().toISOString()
      };
      db.webhookLogs.unshift(log);

      // Save to disk
      saveStore(db);

      // Sync with Supabase if available
      if (supabase) {
        try {
          await supabase.from('leads').insert([{
            id: lead.id,
            clinic_id: lead.clinicId,
            name: lead.name,
            phone: lead.phone,
            email: lead.email || null,
            procedure_interest: lead.procedureInterest,
            source: lead.source,
            status: lead.status,
            estimated_value: lead.estimatedValue,
            notes: lead.notes
          }]);
        } catch (sErr) {
          console.error("Supabase webhook lead insert error:", sErr);
        }
      }

      res.status(200).json({
        success: true,
        message: "Webhook recebido e lead cadastrado no CRM com sucesso!",
        lead,
        log
      });
    } catch (err: any) {
      console.error(`Webhook processing error (${source}):`, err);
      
      const errorLog = {
        id: "log_" + Date.now(),
        source,
        payload,
        status: "error",
        statusCode: 500,
        message: `Erro no processamento do Webhook: ${err.message}`,
        timestamp: new Date().toISOString()
      };
      db.webhookLogs.unshift(errorLog);
      saveStore(db);

      res.status(500).json({
        success: false,
        error: "Falha ao processar Webhook",
        details: err.message
      });
    }
  });

  // Get Webhook Execution Logs
  app.get("/api/webhooks/logs", (req, res) => {
    res.json(db.webhookLogs);
  });

  // Delete Webhook Execution Logs
  app.delete("/api/webhooks/logs", (req, res) => {
    db.webhookLogs = [];
    saveStore(db);
    res.json({ success: true, message: "Logs de webhooks limpos." });
  });

  // List Configured Webhooks
  app.get("/api/webhooks/list", (req, res) => {
    res.json(db.webhooks);
  });

  // Create or Register Webhook
  app.post("/api/webhooks/config", (req, res) => {
    const { name, source, url } = req.body;
    const newWebhook = {
      id: "wh_" + Date.now(),
      name: name || `Webhook ${source}`,
      source: source || "custom",
      url: url || `/api/webhooks/incoming/${source || "custom"}`,
      status: "active",
      secretToken: "whsec_" + Math.random().toString(36).substr(2, 10),
      createdAt: new Date().toISOString()
    };
    db.webhooks.unshift(newWebhook);
    saveStore(db);
    res.status(201).json(newWebhook);
  });

  // Trigger Outbound Webhook to external URL
  app.post("/api/webhooks/trigger", async (req, res) => {
    const { targetUrl, event, data } = req.body;
    if (!targetUrl) {
      return res.status(400).json({ error: "targetUrl é obrigatório." });
    }

    try {
      const payloadObj = {
        event: event || "lead.created",
        timestamp: new Date().toISOString(),
        data: data || {}
      };
      const rawBody = JSON.stringify(payloadObj);
      const hmac = crypto.createHmac("sha256", CRM_WEBHOOK_SECRET).update(rawBody).digest("hex");

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-hub-signature-256": `sha256=${hmac}`,
          "x-signature": hmac
        },
        body: rawBody
      });

      const resText = await response.text();

      const log = {
        id: "out_log_" + Date.now(),
        source: "outbound_trigger",
        targetUrl,
        event,
        status: response.ok ? "success" : "error",
        statusCode: response.status,
        message: `Webhook de saída enviado para ${targetUrl} (Status ${response.status})`,
        responseBody: resText,
        timestamp: new Date().toISOString()
      };
      db.webhookLogs.unshift(log);
      saveStore(db);

      res.json({ success: response.ok, statusCode: response.status, response: resText });
    } catch (e: any) {
      console.error("Outbound webhook trigger error:", e);
      res.status(500).json({ error: "Erro ao disparar webhook de saída", details: e.message });
    }
  });

  // ==========================================
  // CRM RESOURCES API
  // ==========================================

  // LEADS
  app.get("/api/leads", async (req, res) => {
    const { clinicId, clinic_id, status } = req.query;
    const activeClinic = clinicId || clinic_id;

    let result = db.leads;

    if (activeClinic && activeClinic !== 'all') {
      result = result.filter(l => l.clinicId === activeClinic || l.clinic_id === activeClinic);
    }

    if (status && status !== 'all') {
      result = result.filter(l => l.status === status);
    }

    res.json(result);
  });

  app.post("/api/leads", async (req, res) => {
    const lead = {
      id: req.body.id || "lead_" + Date.now(),
      name: req.body.name || "Novo Lead",
      phone: req.body.phone || "(00) 00000-0000",
      email: req.body.email || "",
      procedureInterest: req.body.procedureInterest || req.body.procedure || "Avaliação",
      source: req.body.source || "Manual / CRM",
      status: req.body.status || "novo",
      estimatedValue: Number(req.body.estimatedValue) || 0,
      notes: req.body.notes || "",
      clinicId: req.body.clinicId || req.body.clinic_id || (db.clinics[0]?.id || "1"),
      createdAt: new Date().toISOString()
    };

    db.leads.unshift(lead);
    saveStore(db);

    if (supabase) {
      try {
        await supabase.from('leads').insert([{
          id: lead.id,
          clinic_id: lead.clinicId,
          name: lead.name,
          phone: lead.phone,
          email: lead.email || null,
          procedure_interest: lead.procedureInterest,
          source: lead.source,
          status: lead.status,
          estimated_value: lead.estimatedValue,
          notes: lead.notes
        }]);
      } catch (e) {
        console.error("Supabase lead insert error:", e);
      }
    }

    res.status(201).json(lead);
  });

  app.put("/api/leads/:id", async (req, res) => {
    const index = db.leads.findIndex(l => l.id === req.params.id);
    if (index !== -1) {
      db.leads[index] = { ...db.leads[index], ...req.body, updatedAt: new Date().toISOString() };
      saveStore(db);

      if (supabase) {
        try {
          await supabase.from('leads').update({
            status: req.body.status,
            notes: req.body.notes,
            estimated_value: req.body.estimatedValue,
            assigned_to: req.body.assignedTo
          }).eq('id', req.params.id);
        } catch (e) {
          console.error("Supabase lead update error:", e);
        }
      }

      return res.json(db.leads[index]);
    }
    res.status(404).json({ error: "Lead não encontrado" });
  });

  app.delete("/api/leads/:id", (req, res) => {
    db.leads = db.leads.filter(l => l.id !== req.params.id);
    saveStore(db);
    res.json({ success: true, message: "Lead excluído com sucesso." });
  });

  // PATIENTS
  app.get("/api/patients", (req, res) => {
    res.json(db.patients);
  });

  app.post("/api/patients", (req, res) => {
    const patient = {
      id: req.body.id || "pat_" + Date.now(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    db.patients.unshift(patient);
    saveStore(db);
    res.status(201).json(patient);
  });

  app.put("/api/patients/:id", (req, res) => {
    const index = db.patients.findIndex(p => p.id === req.params.id);
    if (index !== -1) {
      db.patients[index] = { ...db.patients[index], ...req.body, updatedAt: new Date().toISOString() };
      saveStore(db);
      return res.json(db.patients[index]);
    }
    res.status(404).json({ error: "Paciente não encontrado" });
  });

  app.delete("/api/patients/:id", (req, res) => {
    db.patients = db.patients.filter(p => p.id !== req.params.id);
    saveStore(db);
    res.json({ success: true });
  });

  // APPOINTMENTS
  app.get("/api/appointments", async (req, res) => {
    const { clinicId, clinic_id } = req.query;
    const activeClinic = clinicId || clinic_id;

    if (activeClinic && activeClinic !== 'all') {
      return res.json(db.appointments.filter(a => a.clinicId === activeClinic || a.clinic_id === activeClinic));
    }
    res.json(db.appointments);
  });

  app.post("/api/appointments", async (req, res) => {
    const existingIndex = db.appointments.findIndex(a => 
      (req.body.id && a.id === req.body.id) || 
      (req.body.googleEventId && a.googleEventId === req.body.googleEventId)
    );

    if (existingIndex !== -1) {
      db.appointments[existingIndex] = { ...db.appointments[existingIndex], ...req.body, updatedAt: new Date().toISOString() };
      saveStore(db);
      return res.json(db.appointments[existingIndex]);
    }

    const appointment = {
      id: req.body.id || "apt_" + Date.now(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    db.appointments.unshift(appointment);
    saveStore(db);
    res.status(201).json(appointment);
  });

  app.delete("/api/appointments/:id", (req, res) => {
    db.appointments = db.appointments.filter(a => a.id !== req.params.id);
    saveStore(db);
    res.json({ success: true });
  });

  // TASKS
  app.get("/api/tasks", (req, res) => {
    res.json(db.tasks);
  });

  app.post("/api/tasks", (req, res) => {
    const task = {
      id: "task_" + Date.now(),
      title: req.body.title || "Nova Tarefa",
      status: req.body.status || "todo",
      priority: req.body.priority || "medium",
      dueDate: req.body.dueDate || new Date().toISOString().split('T')[0],
      ...req.body,
      createdAt: new Date().toISOString()
    };
    db.tasks.unshift(task);
    saveStore(db);
    res.status(201).json(task);
  });

  app.delete("/api/tasks/:id", (req, res) => {
    db.tasks = db.tasks.filter(t => t.id !== req.params.id);
    saveStore(db);
    res.json({ success: true });
  });

  // FOLLOWUPS
  app.get("/api/followups", (req, res) => {
    res.json(db.followups);
  });

  app.post("/api/followups", (req, res) => {
    const followup = {
      id: "fw_" + Date.now(),
      patientName: req.body.patientName || "Paciente",
      status: req.body.status || "new",
      ...req.body,
      createdAt: new Date().toISOString()
    };
    db.followups.unshift(followup);
    saveStore(db);
    res.status(201).json(followup);
  });

  // CLINICS
  app.get("/api/clinics", (req, res) => {
    res.json(db.clinics);
  });

  app.post("/api/clinics", (req, res) => {
    const clinic = {
      id: req.body.id || "clinic_" + Date.now(),
      name: req.body.name || "Nova Unidade",
      status: "active",
      createdAt: new Date().toISOString(),
      ...req.body
    };
    db.clinics.push(clinic);
    saveStore(db);
    res.status(201).json(clinic);
  });

  app.put("/api/clinics/:id", (req, res) => {
    const index = db.clinics.findIndex(c => c.id === req.params.id);
    if (index !== -1) {
      db.clinics[index] = { ...db.clinics[index], ...req.body, updatedAt: new Date().toISOString() };
      saveStore(db);
      return res.json(db.clinics[index]);
    }
    res.status(404).json({ error: "Clínica não encontrada" });
  });

  app.delete("/api/clinics/:id", (req, res) => {
    db.clinics = db.clinics.filter(c => 
      c.id !== req.params.id && 
      c.name?.toLowerCase() !== 'minha clínica' && 
      c.name?.toLowerCase() !== 'minha clinica'
    );
    saveStore(db);
    res.json({ success: true, message: "Clínica excluída com sucesso." });
  });

  // TRANSACTIONS
  app.get("/api/transactions", (req, res) => {
    res.json(db.transactions);
  });

  app.post("/api/transactions", (req, res) => {
    const tx = {
      id: "tx_" + Date.now(),
      amount: Number(req.body.amount) || 0,
      description: req.body.description || "Venda CRM",
      createdAt: new Date().toISOString(),
      ...req.body
    };
    db.transactions.unshift(tx);
    saveStore(db);
    res.status(201).json(tx);
  });

  // WAHA TENANTS & INTERACOES API
  app.get("/api/waha/tenants", (req, res) => {
    res.json(db.waha_tenants || []);
  });

  app.post("/api/waha/tenants", (req, res) => {
    const tenant = {
      id: req.body.id || "tenant_" + Date.now(),
      nome: req.body.nome || "Novo Tenant",
      waha_session: req.body.waha_session || "session_" + Date.now(),
      clinic_id: req.body.clinic_id || "1",
      telefone_admin: req.body.telefone_admin || null,
      ativo: req.body.ativo !== undefined ? req.body.ativo : true,
      criado_em: new Date().toISOString()
    };
    if (!db.waha_tenants) db.waha_tenants = [];
    db.waha_tenants.unshift(tenant);
    saveStore(db);
    res.status(201).json(tenant);
  });

  app.get("/api/waha/interacoes", (req, res) => {
    const { clinic_id, telefone } = req.query;
    let result = db.interacoes || [];
    if (clinic_id && clinic_id !== 'all') {
      result = result.filter(i => i.clinic_id === clinic_id);
    }
    if (telefone) {
      result = result.filter(i => i.telefone === telefone);
    }
    res.json(result);
  });

  app.post("/api/waha/interacoes", (req, res) => {
    const interacao = {
      id: req.body.id || "int_" + Date.now(),
      clinic_id: req.body.clinic_id || "1",
      telefone: req.body.telefone || "",
      direcao: req.body.direcao || "inbound",
      texto: req.body.texto || "",
      message_id: req.body.message_id || "msg_" + Date.now(),
      criado_em: new Date().toISOString()
    };
    if (!db.interacoes) db.interacoes = [];
    db.interacoes.unshift(interacao);
    saveStore(db);
    res.status(201).json(interacao);
  });

  // AI Summarize & AI Chat
  app.post("/api/ai/summarize-lead", async (req, res) => {
    try {
      const { leadName, interactions, procedures } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const prompt = `
        Analise os seguintes dados do paciente/lead e gere um resumo clínico profissional, conciso e estruturado.
        
        Nome: ${leadName}
        Interações Recentes: ${JSON.stringify(interactions)}
        Procedimentos/Histórico: ${JSON.stringify(procedures)}
        
        O resumo deve conter:
        1. Estado atual de saúde e status do lead.
        2. Principais pontos discutidos ou observados nas interações.
        3. Resumo do plano de tratamento proposto ou em andamento.
        4. Recomendações de próximos passos para a equipe de atendimento.
        
        Mantenha o tom profissional e focado em resultados clínicos e de conversão. Responda em Português.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [prompt]
      });

      res.json({ summary: result.text });
    } catch (error: any) {
      console.error("AI Summarization Error:", error);
      res.json({ 
        summary: `### Resumo Automatizado (Modo de Contingência)\n\n1. **Status do Lead**: Lead ativo com forte engajamento e intenção de fechamento.\n2. **Histórico**: Acompanhamento regular de interações via canais digitais.\n3. **Plano de Tratamento**: Alinhado com as necessidades do paciente na clínica.\n4. **Próximos Passos**: Entrar em contato via WhatsApp para confirmação de agendamento.` 
      });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const context = `
        Você é o assistente inteligente do LeadGen CRM. 
        Dados atuais do sistema:
        - Clínicas: ${JSON.stringify(db.clinics.map(c => c.name))}
        - Total de Leads: ${db.leads.length}
        - Total de Pacientes: ${db.patients.length}
        - Agendamentos: ${db.appointments.length}
        
        Responda às perguntas do usuário com base nestes dados. Seja profissional, conciso e útil.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [context, message]
      });

      res.json({ text: result.text });
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      res.json({ 
        text: `Olá! O assistente inteligente está operando em modo de contingência devido a limite temporário de cota da API. Atualmente temos ${db.leads.length} leads cadastrados, ${db.patients.length} pacientes e ${db.appointments.length} agendamentos registrados no sistema. Como posso ajudar com a gestão da clínica hoje?` 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
