import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

declare const __APP_VERSION__: string;

/** Avisa quando a Vercel publicou uma versão nova enquanto o usuário está com o sistema aberto. */
export default function UpdateBanner() {
  const [remote, setRemote] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    const current = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';
    if (!current) return;
    let stop = false;
    const check = async () => {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (!stop && j?.version && j.version !== current) setRemote(String(j.version));
      } catch { /* sem rede ou ambiente de desenvolvimento: ignora */ }
    };
    check();
    const t = setInterval(check, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  if (!remote || dismissed === remote) return null;
  return (
    <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-3 pl-4 pr-2 py-2.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-white/10">
      <RefreshCw size={16} className="text-emerald-400 shrink-0" />
      <span className="text-sm font-semibold">Há uma nova versão do sistema.</span>
      <button onClick={() => window.location.reload()} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer">Atualizar agora</button>
      <button onClick={() => setDismissed(remote)} aria-label="Depois" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"><X size={14} /></button>
    </div>
  );
}
