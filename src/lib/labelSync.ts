import { useEffect } from 'react';
import { getSupabase } from './supabase';

const EVERY_MS = 10 * 60 * 1000;

/** Aplica as etiquetas do WhatsApp no funil sozinho: a cada 10 min por clínica, enquanto o sistema está aberto. */
export function useAutoLabelSync(clinicId: string, onChanged?: () => void) {
  useEffect(() => {
    if (!clinicId || clinicId === 'all' || !/^[0-9a-f-]{36}$/i.test(clinicId)) return;
    let cancelled = false;
    const key = `crm_labels_sync:${clinicId}`;
    const run = async () => {
      if (document.hidden || navigator.onLine === false) return;
      try {
        const last = Number(localStorage.getItem(key) || 0);
        if (Date.now() - last < EVERY_MS) return;
        localStorage.setItem(key, String(Date.now()));
      } catch { /* sem localStorage: roda mesmo assim */ }
      try {
        const sb = getSupabase();
        const { data } = (await sb?.auth.getSession()) || { data: { session: null } };
        const token = data.session?.access_token;
        if (!token) return;
        const send = () => fetch('/api/whatsapp/live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'labels_sync', clinicId, apply: true })
        });
        const res = await send().catch(async () => { await new Promise(r => setTimeout(r, 1500)); return send(); });
        const j = await res.json().catch(() => null);
        if (!cancelled && j?.ok && j.aplicado && j.leadsAfetados > 0) onChanged?.();
      } catch { /* silencioso: tenta de novo no próximo ciclo */ }
    };
    run();
    const t = setInterval(run, EVERY_MS);
    return () => { cancelled = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);
}
