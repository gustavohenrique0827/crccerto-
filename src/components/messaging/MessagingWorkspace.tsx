import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download, FileText as FileIcon, Loader2, Play,
  ArrowLeft, CheckCheck, ExternalLink, FileText, Inbox, MessageCircle, NotebookPen, RefreshCw, Search, Send, StickyNote, Zap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/utils';
import { Lead, LeadStatus } from '../../types';
import { leadDisplayName } from '../../lib/leadName';
import { stageLabel, useFunnel } from '../../lib/funnelConfig';
import { LiveChat, LiveMessage, fetchLiveChats, fetchLiveMedia, fetchLiveMessages } from '../../lib/wahaLive';
import LeadDetail from '../leads/LeadDetail';
import {
  ConversationRow, addLeadNote, getSupabase, addOutgoingMessage, fetchConversationRows, formatPhoneBR, isSupabaseConfigured, localDay, phoneKey, useSupabaseLeads
} from '../../lib/supabase';

const STAGE_LABEL = new Proxy({} as Record<string, string>, { get: (_t, k) => stageLabel(String(k)) });

type Filter = 'all' | 'unanswered' | 'waiting';

interface Thread {
  chat?: LiveChat; // conversa lida ao vivo do WhatsApp (WAHA)
  lead: Lead;
  rows: ConversationRow[]; // mais recente primeiro
  last: ConversationRow; // última mensagem (cliente ou equipe)
  fromClient: boolean;
}

const DEFAULT_TEMPLATES = [
  { id: 't1', title: 'Primeiro contato', text: 'Olá, {nome}! Aqui é da {clinica}. Vi que você entrou em contato. Como posso te ajudar?' },
  { id: 't2', title: 'Confirmar consulta', text: 'Olá, {nome}! Passando para confirmar sua consulta na {clinica}. Posso confirmar o horário?' },
  { id: 't3', title: 'Reagendar', text: 'Oi, {nome}! Vamos remarcar sua consulta? Me diga o melhor dia e horário para você.' },
  { id: 't4', title: 'Pós-atendimento', text: 'Olá, {nome}! Como você está após o atendimento? Qualquer dúvida, é só me chamar.' }
];

const timeAgo = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = localDay(new Date().toISOString());
  const that = localDay(iso);
  if (that === today) return 'Hoje';
  if (that === localDay(new Date(Date.now() - 86400000).toISOString())) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
};
const waLink = (phone: string, text?: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

const mediaCache = new Map<string, string>(); // id da mensagem -> endereço do arquivo já baixado

/** Áudio, imagem, vídeo, figurinha e documento de uma mensagem do WhatsApp. Imagens abrem sozinhas; o resto, ao clicar. */
function MediaView({ media, clinicId, mine }: { media: NonNullable<ConversationRow['media']>; clinicId: string; mine: boolean }) {
  const kind = /image\/webp/i.test(media.type) ? 'sticker' : /^image/i.test(media.type) ? 'image' : /^audio/i.test(media.type) ? 'audio' : /^video/i.test(media.type) ? 'video' : 'file';
  const [url, setUrl] = useState<string | null>(mediaCache.get(media.messageId) || null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (mediaCache.has(media.messageId)) { setUrl(mediaCache.get(media.messageId)!); return; }
    setState('loading');
    const r = await fetchLiveMedia(clinicId, { session: media.session, chatId: media.chatId, messageId: media.messageId });
    if (r.blob) {
      const u = URL.createObjectURL(r.blob);
      mediaCache.set(media.messageId, u);
      setUrl(u);
      setState('idle');
    } else {
      setError(r.error || 'Não foi possível abrir.');
      setState('error');
    }
  }, [clinicId, media]);

  useEffect(() => { if ((kind === 'image' || kind === 'sticker') && !url && state === 'idle') load(); }, [kind, url, state, load]);

  const label = kind === 'audio' ? 'Áudio' : kind === 'video' ? 'Vídeo' : kind === 'image' ? 'Imagem' : kind === 'sticker' ? 'Figurinha' : (media.name || 'Documento');
  if (url) {
    if (kind === 'image' || kind === 'sticker') return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label} className="rounded-xl max-h-72 max-w-full mb-1" /></a>;
    if (kind === 'audio') return <audio controls src={url} className="max-w-full mb-1" />;
    if (kind === 'video') return <video controls src={url} className="rounded-xl max-h-72 max-w-full mb-1" />;
    return <a href={url} download={media.name || 'arquivo'} className="flex items-center gap-2 underline mb-1"><Download size={14} />{label}</a>;
  }
  return (
    <button onClick={load} disabled={state === 'loading'} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold mb-1 cursor-pointer', mine ? 'bg-blue-500/60 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100')}>
      {state === 'loading' ? <Loader2 size={14} className="animate-spin" /> : kind === 'file' ? <FileIcon size={14} /> : <Play size={14} />}
      {state === 'loading' ? 'Baixando…' : state === 'error' ? `${error} Tentar de novo` : kind === 'audio' ? 'Ouvir áudio' : kind === 'video' ? 'Ver vídeo' : `Abrir ${label}`}
    </button>
  );
}

export default function MessagingWorkspace() {
  const { currentClinicId, currentClinic, clinics, user, addToast, messagingTarget, clearMessagingTarget } = useApp();
  useFunnel();
  const { leads, loading: leadsLoading } = useSupabaseLeads(currentClinicId);
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [starter, setStarter] = useState<Lead | null>(null); // contato sem histórico, aberto por um botão de WhatsApp
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Modelos de mensagem: ficam no navegador, separados por clínica
  const tplKey = `crm_msg_templates_v1:${currentClinic?.id || 'all'}`;
  const [templates, setTemplates] = useState(() => {
    try { const raw = localStorage.getItem(tplKey); return raw ? JSON.parse(raw) : DEFAULT_TEMPLATES; } catch { return DEFAULT_TEMPLATES; }
  });
  useEffect(() => {
    try { const raw = localStorage.getItem(tplKey); setTemplates(raw ? JSON.parse(raw) : DEFAULT_TEMPLATES); } catch { setTemplates(DEFAULT_TEMPLATES); }
  }, [tplKey]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const data = await fetchConversationRows();
    if (data) setRows(data);
    setLoading(false);
  }, []);
  // Tempo real: cada mensagem nova gravada pelo agente aparece na hora (canal do Supabase).
  // O recarregamento a cada 10 s garante que nada se perca se o canal cair.
  const [live, setLive] = useState(false);
  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 10000);
    const sb = getSupabase();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = sb
      ?.channel('mensageria-lead-interactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_interactions' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => load(true), 400); // agrupa rajadas de mensagens
      })
      .subscribe(status => setLive(status === 'SUBSCRIBED'));
    return () => { clearInterval(t); if (timer) clearTimeout(timer); if (sb && channel) sb.removeChannel(channel); };
  }, [load]);

  // Última mensagem recebida: se o agente parou de gravar, isso aparece aqui
  const lastMessageAt = useMemo(
    () => rows.find(r => r.type === 'mensagem_cliente' || r.type === 'mensagem_responsavel')?.createdAt || null,
    [rows]
  );
  const staleHours = lastMessageAt ? (Date.now() - new Date(lastMessageAt).getTime()) / 3600000 : null;

  // Conversas lidas direto do WAHA (como no SPY): não dependem do n8n nem do banco
  const liveClinicId = currentClinic?.id || (currentClinicId && currentClinicId !== 'all' ? currentClinicId : '') || clinics[0]?.id || '';
  const [liveChats, setLiveChats] = useState<LiveChat[]>([]);
  const [liveState, setLiveState] = useState<{ ok: boolean; reason?: string }>({ ok: false });
  useEffect(() => {
    if (!liveClinicId) return;
    let cancelled = false;
    const run = async () => {
      const r = await fetchLiveChats(liveClinicId);
      if (cancelled) return;
      setLiveState({ ok: r.ok && r.source === 'waha', reason: r.reason });
      if (r.ok && r.source === 'waha') setLiveChats(r.data);
    };
    run();
    const t = setInterval(run, 8000);
    return () => { cancelled = true; clearInterval(t); };
  }, [liveClinicId]);

  const threads = useMemo<Thread[]>(() => {
    const byLead = new Map<string, ConversationRow[]>();
    rows.forEach(r => { const a = byLead.get(r.leadId); if (a) a.push(r); else byLead.set(r.leadId, [r]); });
    const out: Thread[] = [];
    leads.forEach(lead => {
      const list = byLead.get(lead.id);
      if (!list) return;
      const last = list.find(r => r.type === 'mensagem_cliente' || r.type === 'mensagem_responsavel');
      if (!last) return;
      out.push({ lead, rows: list, last, fromClient: last.type === 'mensagem_cliente' });
    });
    // Conversas ao vivo do WAHA: valem mais que o banco para a última mensagem e trazem contatos que nunca viraram lead
    liveChats.forEach(c => {
      const at = c.last.at || new Date(0).toISOString();
      const lastRow: ConversationRow = { id: `live:${c.chatId}`, leadId: c.leadId || '', type: c.last.fromMe ? 'mensagem_responsavel' : 'mensagem_cliente', message: c.last.body, createdAt: at };
      const idx = c.leadId ? out.findIndex(t => t.lead.id === c.leadId) : out.findIndex(t => phoneKey(t.lead.whatsapp) === phoneKey(c.phone) && !!phoneKey(c.phone));
      if (idx >= 0) {
        if (at >= out[idx].last.createdAt) out[idx] = { ...out[idx], chat: c, last: lastRow, fromClient: !c.last.fromMe };
        else out[idx] = { ...out[idx], chat: c };
        return;
      }
      const lead = (c.leadId ? leads.find(l => l.id === c.leadId) : undefined) || ({
        id: c.leadId || `tel:${phoneKey(c.phone) || c.chatId}`, name: c.leadName || c.name || '', phone: c.phone, whatsapp: c.phone, email: '',
        clinicId: liveClinicId, sourceId: 'whatsapp', status: (c.status as LeadStatus) || LeadStatus.NEW, lastInteractionAt: at
      } as unknown as Lead);
      out.push({ lead, chat: c, rows: [], last: lastRow, fromClient: !c.last.fromMe });
    });
    if (starter && !out.some(t => t.lead.id === starter.id)) {
      const now = new Date().toISOString();
      out.push({ lead: starter, rows: [], last: { id: 'new', leadId: starter.id, type: 'mensagem_responsavel', message: 'Nova conversa', createdAt: now }, fromClient: false });
    }
    return out.sort((a, b) => b.last.createdAt.localeCompare(a.last.createdAt));
  }, [rows, leads, starter, liveChats, liveClinicId]);

  // Botão de WhatsApp em outra tela: abre a conversa do contato (e já deixa a mensagem no campo)
  useEffect(() => {
    if (!messagingTarget || leadsLoading) return;
    const key = phoneKey(messagingTarget.phone);
    const found = leads.find(l => l.id === messagingTarget.leadId) || (key ? leads.find(l => phoneKey(l.whatsapp) === key || phoneKey(l.phone) === key) : undefined) ||
      (messagingTarget.name ? leads.find(l => l.name.trim().toLowerCase() === messagingTarget.name!.trim().toLowerCase()) : undefined);
    const lead = found || ({
      id: `tel:${key || messagingTarget.phone || 'novo'}`, name: messagingTarget.name || '', phone: messagingTarget.phone || '', whatsapp: messagingTarget.phone || '',
      email: '', clinicId: currentClinic?.id || '', sourceId: 'manual', status: LeadStatus.NEW, lastInteractionAt: new Date().toISOString()
    } as unknown as Lead);
    setStarter(lead);
    setSelectedId(lead.id);
    setFilter('all');
    setSearch('');
    if (messagingTarget.draft) setDraft(messagingTarget.draft);
    clearMessagingTarget();
  }, [messagingTarget, leads, leadsLoading, currentClinic?.id, clearMessagingTarget]);

  const counts = useMemo(() => ({
    all: threads.length,
    unanswered: threads.filter(t => t.fromClient).length,
    waiting: threads.filter(t => !t.fromClient).length
  }), [threads]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter(t => {
      if (filter === 'unanswered' && !t.fromClient) return false;
      if (filter === 'waiting' && t.fromClient) return false;
      if (!q) return true;
      return t.lead.name.toLowerCase().includes(q) || (t.lead.phone || '').includes(q) || t.last.message.toLowerCase().includes(q);
    });
  }, [threads, filter, search]);

  const selected = threads.find(t => t.lead.id === selectedId) || null;
  const [liveMsgs, setLiveMsgs] = useState<LiveMessage[] | null>(null);
  const selectedKey = selected ? `${selected.lead.id}|${selected.chat?.chatId || ''}` : '';
  useEffect(() => {
    setLiveMsgs(null);
    if (!selected || !liveClinicId) return;
    let cancelled = false;
    const isUuid = /^[0-9a-f-]{36}$/i.test(selected.lead.id);
    const run = async () => {
      const r = await fetchLiveMessages(liveClinicId, selected.chat
        ? { chatId: selected.chat.chatId, session: selected.chat.session }
        : { leadId: isUuid ? selected.lead.id : undefined, phone: selected.lead.whatsapp || selected.lead.phone });
      if (!cancelled && r.ok && r.source === 'waha') setLiveMsgs(r.data);
    };
    run();
    const t = setInterval(run, 5000);
    return () => { cancelled = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, liveClinicId]);

  const messages = useMemo<ConversationRow[]>(() => {
    if (!selected) return [];
    const internal = selected.rows.filter(r => r.type === 'nota' || r.type === 'mudanca_etapa');
    if (liveMsgs && liveMsgs.length > 0) {
      const live: ConversationRow[] = liveMsgs.map(m => ({ id: m.id, leadId: selected.lead.id, type: m.fromMe ? 'mensagem_responsavel' : 'mensagem_cliente', message: m.hasMedia ? m.caption : m.text, createdAt: m.at, ...(m.hasMedia ? { media: { type: m.mediaType, name: m.mediaName, session: m.session, chatId: m.chatId, messageId: m.id } } : {}) }));
      return [...live, ...internal].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    return [...selected.rows].reverse();
  }, [selected, liveMsgs]);
  useEffect(() => { threadEndRef.current?.scrollIntoView({ block: 'end' }); }, [selectedId, messages.length]);

  const fill = (text: string) => text
    .replace(/\{nome\}/g, selected ? leadDisplayName(selected.lead).split(' ')[0].replace(/^NOVO$/, '') : '')
    .replace(/\{clinica\}/g, currentClinic?.name || 'nossa clínica');

  const sendViaWhatsapp = async () => {
    if (!selected || !draft.trim()) return;
    const phone = selected.lead.whatsapp || selected.lead.phone;
    const url = waLink(phone, draft.trim());
    if (!url) { addToast('Este contato não tem telefone cadastrado.', 'error'); return; }
    setSending(true);
    window.open(url, '_blank', 'noopener');
    const ok = await addOutgoingMessage(selected.lead.id, draft, user?.id);
    setSending(false);
    if (ok) { setDraft(''); load(true); addToast('Mensagem aberta no WhatsApp e registrada no histórico.', 'success'); }
    else addToast('WhatsApp aberto, mas não foi possível registrar no histórico.', 'warning');
  };

  const saveAsNote = async () => {
    if (!selected || !draft.trim()) return;
    setSending(true);
    const ok = await addLeadNote(selected.lead.id, draft, localDay(new Date().toISOString()), user?.id);
    setSending(false);
    if (ok) { setDraft(''); load(true); addToast('Anotação salva no histórico do lead.', 'success'); }
    else addToast('Não foi possível salvar a anotação.', 'error');
  };

  const filters: { id: Filter; label: string; hint: string }[] = [
    { id: 'all', label: 'Todas', hint: 'Todas as conversas' },
    { id: 'unanswered', label: 'Sem resposta', hint: 'O cliente escreveu por último' },
    { id: 'waiting', label: 'Aguardando cliente', hint: 'A equipe escreveu por último' }
  ];

  if (!isSupabaseConfigured()) {
    return <div className="h-full flex items-center justify-center text-sm text-slate-400">Conecte o Supabase para ver as conversas.</div>;
  }

  return (
    <div className="h-full flex flex-col gap-3" style={{ minHeight: 520 }}>
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Chat</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Conversas de WhatsApp do agente e da equipe, organizadas por contato.</p>
        </div>
        <span className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold', liveState.ok || live ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')} title={live ? 'Novas mensagens aparecem na hora' : 'Atualizando a cada 10 segundos'}>
          <span className={cn('w-2 h-2 rounded-full', liveState.ok || live ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')} />{liveState.ok ? 'WhatsApp ao vivo' : live ? 'Ao vivo (banco)' : 'Atualiza a cada 10 s'}
        </span>
        <button onClick={() => load()} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {!liveState.ok && staleHours !== null && staleHours > 6 && (
        <div className="shrink-0 flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200">
          <span className="font-bold shrink-0">Sem mensagens novas.</span>
          <span>A última mensagem registrada é de {new Date(lastMessageAt!).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} ({staleHours >= 48 ? `${Math.floor(staleHours / 24)} dias` : `${Math.floor(staleHours)} h`} atrás). O sistema está mostrando só o que o agente gravou no banco{liveState.reason ? ` (leitura direta do WhatsApp indisponível: ${liveState.reason})` : ''}. Configure WAHA_URL e WAHA_API_KEY na Vercel para ler as conversas direto do WhatsApp.</span>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_1fr] rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Lista de conversas */}
        <div className={cn('min-h-0 flex-col border-r border-slate-200 dark:border-slate-800', selected ? 'hidden lg:flex' : 'flex')}>
          <div className="p-3 space-y-2 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, telefone ou mensagem" className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
            </div>
            <div className="flex gap-1">
              {filters.map(f => (
                <button key={f.id} title={f.hint} onClick={() => setFilter(f.id)} className={cn('flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors', filter === f.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700')}>
                  {f.label} <span className="opacity-80">{counts[f.id]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {(loading || leadsLoading) && visible.length === 0 && <p className="p-6 text-center text-xs text-slate-400">Carregando conversas…</p>}
            {!loading && !leadsLoading && visible.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <Inbox size={28} className="mx-auto mb-2" />
                <p className="text-xs">{search || filter !== 'all' ? 'Nenhuma conversa com esse filtro.' : 'Ainda não há conversas registradas.'}</p>
              </div>
            )}
            {visible.map(t => (
              <button key={t.lead.id} onClick={() => setSelectedId(t.lead.id)} className={cn('w-full text-left px-3 py-3 flex gap-3 border-b border-slate-100 dark:border-slate-800/70 cursor-pointer transition-colors', selectedId === t.lead.id ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50')}>
                <span className="w-10 h-10 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-extrabold text-slate-600 dark:text-slate-200">
                  {leadDisplayName(t.lead).split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn('truncate text-[13px]', t.fromClient ? 'font-extrabold text-slate-900 dark:text-white' : 'font-bold text-slate-700 dark:text-slate-200')}>{leadDisplayName(t.lead)}</span>
                    <span className={cn('shrink-0 text-[11px]', t.fromClient ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-400')}>{timeAgo(t.last.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-1 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {!t.fromClient && <CheckCheck size={13} className="shrink-0 text-blue-500" />}
                    <span className="truncate">{t.last.message || '(sem texto)'}</span>
                  </span>
                  <span className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">{STAGE_LABEL[t.lead.status] || t.lead.status}</span>
                    {t.fromClient && <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-[10px] font-bold text-amber-700 dark:text-amber-300">Responder</span>}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Conversa */}
        <div className={cn('min-h-0 flex-col', selected ? 'flex' : 'hidden lg:flex')}>
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
              <MessageCircle size={36} />
              <p className="text-sm font-semibold">Escolha uma conversa para ver o histórico</p>
              <p className="text-xs">Os contatos que escreveram por último aparecem primeiro em “Sem resposta”.</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <button onClick={() => setSelectedId(null)} aria-label="Voltar" className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><ArrowLeft size={18} /></button>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{leadDisplayName(selected.lead)}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatPhoneBR(selected.lead.whatsapp || selected.lead.phone)} · {STAGE_LABEL[selected.lead.status] || selected.lead.status}{selected.lead.responsibleName ? ` · ${selected.lead.responsibleName}` : ''}</p>
                </div>
                <button onClick={() => setDetailLead(selected.lead)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <ExternalLink size={14} /> Abrir ficha
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4 space-y-1.5 bg-slate-50/60 dark:bg-slate-950/30">
                {messages.map((m, i) => {
                  const showDay = i === 0 || localDay(messages[i - 1].createdAt) !== localDay(m.createdAt);
                  return (
                    <React.Fragment key={m.id}>
                      {showDay && <div className="text-center my-3"><span className="px-3 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 capitalize">{dayLabel(m.createdAt)}</span></div>}
                      {m.type === 'mudanca_etapa' ? (
                        <div className="text-center"><span className="inline-block px-3 py-1 rounded-full text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/70">{m.message || 'Mudou de etapa'} · {hhmm(m.createdAt)}</span></div>
                      ) : m.type === 'nota' ? (
                        <div className="flex justify-center"><div className="max-w-[80%] rounded-xl px-3 py-2 bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 text-xs"><span className="flex items-center gap-1 font-bold mb-0.5"><StickyNote size={12} />Anotação interna</span><span className="whitespace-pre-wrap break-words">{m.message}</span><span className="block text-right text-[10px] opacity-70 mt-0.5">{hhmm(m.createdAt)}</span></div></div>
                      ) : (
                        <div className={cn('flex', m.type === 'mensagem_responsavel' ? 'justify-end' : 'justify-start')}>
                          <div className={cn('max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px] shadow-sm', m.type === 'mensagem_responsavel' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md border border-slate-200 dark:border-slate-700')}>
                            {m.media && <MediaView media={m.media} clinicId={liveClinicId} mine={m.type === 'mensagem_responsavel'} />}
                            {(m.message || !m.media) && <span className="whitespace-pre-wrap break-words">{m.message || '(mensagem sem texto)'}</span>}
                            <span className={cn('block text-right text-[10px] mt-0.5', m.type === 'mensagem_responsavel' ? 'text-blue-100' : 'text-slate-400')}>{hhmm(m.createdAt)}</span>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
                <div ref={threadEndRef} />
              </div>

              <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 p-3 space-y-2">
                <div className="relative">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendViaWhatsapp(); } }}
                    rows={3}
                    placeholder="Escreva a resposta… (Ctrl+Enter abre no WhatsApp)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <button onClick={() => setTemplatesOpen(o => !o)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                      <Zap size={14} /> Modelos
                    </button>
                    {templatesOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setTemplatesOpen(false)} />
                        <div className="absolute bottom-full mb-2 left-0 z-50 w-80 max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5">
                          <button onClick={() => {
                            if (!draft.trim()) { addToast('Escreva a mensagem no campo e clique de novo para salvá-la como modelo.', 'info'); return; }
                            const title = window.prompt('Nome do modelo (ex.: Pós-orçamento)');
                            if (!title?.trim()) return;
                            const next = [...templates, { id: `t${Date.now()}`, title: title.trim(), text: draft.trim() }];
                            setTemplates(next);
                            try { localStorage.setItem(tplKey, JSON.stringify(next)); } catch { /* */ }
                            setTemplatesOpen(false);
                          }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">+ Salvar o texto atual como modelo</button>
                          {templates.map((t: { id: string; title: string; text: string }) => (
                            <button key={t.id} onClick={() => { setDraft(fill(t.text)); setTemplatesOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100"><FileText size={12} />{t.title}{t.id.startsWith('t') && /^t\d{6,}$/.test(t.id) && (
                                <span role="button" tabIndex={0} title="Excluir modelo" onClick={(e) => { e.stopPropagation(); const next = templates.filter((x: { id: string }) => x.id !== t.id); setTemplates(next); try { localStorage.setItem(tplKey, JSON.stringify(next)); } catch { /* */ } }} className="ml-auto text-slate-400 hover:text-rose-500">×</span>
                              )}</span>
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{t.text}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex-1" />
                  <button onClick={saveAsNote} disabled={!draft.trim() || sending} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer">
                    <NotebookPen size={14} /> Salvar como anotação
                  </button>
                  <button onClick={sendViaWhatsapp} disabled={!draft.trim() || sending} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40 cursor-pointer">
                    <Send size={14} /> Responder no WhatsApp
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {detailLead && <LeadDetail isOpen onClose={() => setDetailLead(null)} lead={detailLead} />}
    </div>
  );
}
