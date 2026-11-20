import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, QrCode } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApp } from '../../context/AppContext';
import { AgentStatus, agentQr, agentStart, agentStatus } from '../../lib/agentSetup';

const STATUS_TEXT: Record<string, string> = {
  STOPPED: 'Sessão parada', STARTING: 'Iniciando…', SCAN_QR_CODE: 'Aguardando a leitura do QR code',
  WORKING: 'Conectada', FAILED: 'Falhou', NOT_FOUND: 'Sessão ainda não existe no WAHA', UNKNOWN: 'Estado desconhecido'
};

/** Caixa do QR code do WhatsApp do cliente: mostra o estado da sessão e, quando precisa conectar, o QR para ler. */
export default function WhatsappQrCard({ clinicId, title }: { clinicId: string; title?: string }) {
  const { addToast } = useApp();
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (document.hidden) return;
    const s = await agentStatus(clinicId);
    setStatus(s);
    if (s.ok && s.status === 'SCAN_QR_CODE') { const q = await agentQr(clinicId); setQr(q.qr || null); } else setQr(null);
  }, [clinicId]);

  useEffect(() => {
    setStatus(null); setQr(null);
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  const start = async () => {
    setBusy(true);
    const r = await agentStart(clinicId);
    setBusy(false);
    if (!r.ok) addToast(r.message || 'Não consegui iniciar a sessão.', 'error');
    refresh();
  };

  // clínica sem sessão de WhatsApp: nada para mostrar
  if (status && !status.ok && /sess[ãa]o de WhatsApp/i.test(status.message || '')) return null;

  const st = status?.status || '';
  const canStart = status?.ok && (st === 'STOPPED' || st === 'NOT_FOUND' || st === 'FAILED');
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-wrap items-center gap-5">
      <div className="w-44 h-44 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white flex items-center justify-center overflow-hidden">
        {qr ? <img src={qr} alt="QR code do WhatsApp" className="w-full h-full object-contain p-1.5" />
          : st === 'WORKING' ? <CheckCircle2 size={44} className="text-emerald-500" />
          : <QrCode size={44} className="text-slate-300" />}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">QR code do WhatsApp{title ? ` · ${title}` : ''}</h3>
        <p className={cn('text-xs font-semibold', st === 'WORKING' ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300')}>
          {!status ? 'Verificando…' : !status.ok ? (status.message || 'Não consegui verificar o WhatsApp.') : (STATUS_TEXT[st] || st)}{status?.me ? ` · ${status.me}` : ''}
        </p>
        {qr && <p className="text-xs text-slate-500 dark:text-slate-400">No celular da clínica: WhatsApp, Aparelhos conectados, Conectar um aparelho, e leia este código.</p>}
        {st === 'WORKING' && <p className="text-xs text-slate-500 dark:text-slate-400">WhatsApp conectado. Para trocar o número, desconecte o aparelho no celular e gere um novo QR.</p>}
        {canStart && (
          <button onClick={start} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}Iniciar sessão e gerar QR code
          </button>
        )}
      </div>
    </section>
  );
}
