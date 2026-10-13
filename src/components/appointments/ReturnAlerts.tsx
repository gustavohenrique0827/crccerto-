import React, { useMemo, useState } from 'react';
import { BellRing, ChevronDown, MessageCircle } from 'lucide-react';
import { buildSuggestions, KIND, suggestionWhatsApp } from '../followups/ClinicorpSuggestions';
import { cn } from '../../lib/utils';

const br = (ymd: string) => ymd.split('-').reverse().slice(0, 2).join('/');

/** Alertas de retorno da agenda (faltas, cancelamentos e consultas sem confirmação), na lateral da Agenda. */
export default function ReturnAlerts({ appointments }: { appointments: any[] }) {
  const [open, setOpen] = useState(true);
  const items = useMemo(() => buildSuggestions(appointments), [appointments]);

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between cursor-pointer">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <BellRing size={13} className="text-amber-500" />
          Alertas de retorno
          {items.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-black">{items.length}</span>}
        </h3>
        <ChevronDown size={14} className={cn('text-slate-400 transition-transform', !open && '-rotate-90')} />
      </button>

      {open && (
        items.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">Nenhum retorno pendente. Faltas, cancelamentos e consultas sem confirmação aparecem aqui.</p>
        ) : (
          <ul className="mt-3 space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
            {items.slice(0, 20).map(s => {
              const K = KIND[s.kind]; const link = suggestionWhatsApp(s);
              return (
                <li key={s.key} className="flex items-start gap-2">
                  <span className={cn('mt-0.5 shrink-0 px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wide', K.tone)}>{K.label.split(' ')[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">{s.patient}</p>
                    <p className="text-[11px] text-slate-400 truncate">{br(s.date)} {s.time}{s.professional ? ` · ${s.professional.split(' ')[0]}` : ''}</p>
                  </div>
                  {link && (
                    <a href={link} target="_blank" rel="noreferrer" title="Chamar no WhatsApp" className="shrink-0 p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100">
                      <MessageCircle size={13} />
                    </a>
                  )}
                </li>
              );
            })}
            {items.length > 20 && <li className="text-[11px] text-slate-400">+ {items.length - 20} na tela Follow-ups</li>}
          </ul>
        )
      )}
    </div>
  );
}
