import React, { useEffect, useState } from 'react';
import { Kanban, RotateCcw, Save } from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { DEFAULT_STAGES, FunnelOverrides, getOverrides, saveFunnel, stageColor, useFunnel } from '@/src/lib/funnelConfig';

/** Hex da cor padrão da etapa (lida das variáveis do tema) para o seletor de cor. */
const defaultHex = (cssVar: string) => {
  const v = typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() : '';
  return /^#[0-9a-f]{6}$/i.test(v) ? v : '#94a3b8';
};

export default function FunnelEditor() {
  const { currentClinic, clinics, addToast } = useApp();
  const clinic = currentClinic || clinics[0];
  const version = useFunnel();
  const [draft, setDraft] = useState<FunnelOverrides>(() => ({ ...getOverrides() }));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft({ ...getOverrides() }); }, [version, clinic?.id]);

  const set = (id: string, patch: { label?: string; color?: string }) =>
    setDraft(prev => ({ ...prev, [id]: { ...(prev as any)[id], ...patch } }));

  const save = async () => {
    if (!clinic) return;
    // só guarda o que é diferente do padrão
    const clean: FunnelOverrides = {};
    DEFAULT_STAGES.forEach(s => {
      const o = (draft as any)[s.id] || {};
      const label = (o.label || '').trim();
      const entry: { label?: string; color?: string } = {};
      if (label && label !== s.label) entry.label = label;
      if (o.color) entry.color = o.color;
      if (entry.label || entry.color) (clean as any)[s.id] = entry;
    });
    setSaving(true);
    const ok = await saveFunnel(clinic.id, clean);
    setSaving(false);
    addToast(ok ? `Funil de ${clinic.name} salvo.` : 'Não foi possível salvar no servidor (ficou salvo só neste navegador).', ok ? 'success' : 'warning');
  };
  const reset = async () => {
    if (!clinic) return;
    setDraft({});
    await saveFunnel(clinic.id, {});
    addToast('Funil restaurado para o padrão.', 'info');
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
          <Kanban size={16} className="text-[var(--color-primary-blue)]" />
          Etapas do funil{clinic ? ` · ${clinic.name}` : ''}
        </h4>
        <button onClick={reset} className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"><RotateCcw size={12} />Restaurar padrão</button>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">Mude o nome e a cor de cada etapa. Vale para o funil, a ficha do lead e a Mensageria desta clínica. As etapas continuam as mesmas por dentro (n8n e sincronização não mudam).</p>
      <div className="space-y-2">
        {DEFAULT_STAGES.map(s => {
          const o = (draft as any)[s.id] || {};
          const color = o.color || defaultHex(s.cssVar);
          return (
            <div key={s.id} className="flex items-center gap-3 p-2.5 bg-[var(--color-surface-sunken)] rounded-[var(--radius-control)]">
              <input type="color" value={color} onChange={e => set(s.id, { color: e.target.value })} aria-label={`Cor de ${s.label}`} className="w-9 h-9 rounded-lg border border-[var(--color-border-default)] bg-transparent cursor-pointer p-0.5" />
              <input
                value={o.label ?? s.label}
                onChange={e => set(s.id, { label: e.target.value })}
                maxLength={28}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-sm font-semibold text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)]/50"
              />
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white" style={{ background: color }}>{(o.label || s.label).trim() || s.label}</span>
              {o.color && <button onClick={() => set(s.id, { color: undefined })} className="text-[11px] font-bold text-[var(--color-text-muted)] hover:underline cursor-pointer">cor padrão</button>}
            </div>
          );
        })}
      </div>
      <Button type="button" onClick={save} disabled={saving} className="w-full">
        <Save size={14} className="mr-2" />{saving ? 'Salvando…' : 'Salvar funil'}
      </Button>
    </Card>
  );
}
