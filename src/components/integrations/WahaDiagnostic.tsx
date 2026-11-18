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

  const run = async (action: 'diagnose' | 'labels_sync' = 'diagnose', apply = false) => {
    setLoading(true); setError(''); setResult(null);
    try {
      const sb = getSupabase();
      const { data } = (await sb?.auth.getSession()) || { data: { session: null } };
      const res = await fetch('/api/whatsapp/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
        body: JSON.stringify({ action, clinicId, apply })
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
        <div className="flex flex-wrap gap-2 justify-end">
          <button onClick={() => run('diagnose')} disabled={loading || !clinicId} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50 cursor-pointer">Testar</button>
          <button onClick={() => run('labels_sync', false)} disabled={loading || !clinicId} className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer">
            {loading && <Loader2 size={14} className="animate-spin" />} Ver o que as etiquetas mudariam
          </button>
          <button onClick={() => { if (window.confirm('Mover os leads de etapa conforme as etiquetas do WhatsApp?')) run('labels_sync', true); }} disabled={loading || !clinicId} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">Aplicar etiquetas</button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {result && (
        <>
          <p className="text-[11px] text-slate-500">Copie o resultado abaixo e envie para o Gustavo.</p>
          <pre className="text-[11px] leading-relaxed bg-slate-50 dark:bg-slate-800 rounded-xl p-3 overflow-auto max-h-80 select-all">{JSON.stringify(result.sessions || result, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
