import { useState } from 'react';
import { Tag, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getSupabase } from '../../lib/supabase';

/** Teste só de leitura: o WAHA entrega as etiquetas do WhatsApp e quem tem nome salvo? */
export default function WahaDiagnostic() {
  const { currentClinic, clinics } = useApp();
  const clinicId = currentClinic?.id || clinics[0]?.id || '';
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const sb = getSupabase();
      const { data } = (await sb?.auth.getSession()) || { data: { session: null } };
      const res = await fetch('/api/whatsapp/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
        body: JSON.stringify({ action: 'diagnose', clinicId })
      });
      const j = await res.json().catch(() => null);
      if (!j || j.ok === false) setError(j?.message || `O servidor respondeu ${res.status}.`);
      else setResult(j);
    } catch (e: any) { setError(e?.message || 'Sem conexão.'); }
    setLoading(false);
  };

  return (
    <div className="mt-6 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2"><Tag size={16} /> Testar etiquetas e contatos do WhatsApp</h3>
          <p className="text-xs text-slate-500 mt-0.5">Só leitura: mostra se a WAHA entrega as etiquetas e quais contatos têm nome salvo. Nada é alterado.</p>
        </div>
        <button onClick={run} disabled={loading || !clinicId} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer">
          {loading && <Loader2 size={14} className="animate-spin" />} Testar agora
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {result && (
        <>
          <p className="text-[11px] text-slate-500">Copie o resultado abaixo e envie para o Gustavo.</p>
          <pre className="text-[11px] leading-relaxed bg-slate-50 dark:bg-slate-800 rounded-xl p-3 overflow-auto max-h-80 select-all">{JSON.stringify(result.sessions, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
