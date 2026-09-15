import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AjusteRecalculo } from '../lib/domain/recalculo';

interface RecalculationNoticeProps {
  ajustes: AjusteRecalculo[];
  proyecto?: string;
}

/**
 * Aviso interno de recálculo. El llamador es responsable de renderizarlo
 * únicamente en la vista Admin/TPM: la vista Stakeholder no debe mostrarlo.
 */
export const RecalculationNotice: React.FC<RecalculationNoticeProps> = ({ ajustes, proyecto }) => {
  useEffect(() => {
    if (ajustes.length === 0) return;
    console.warn(
      `[Recálculo TPM] "${proyecto || 'Propuesta sin nombre'}": ${ajustes.length} cifra(s) difieren de la configuración anterior.`,
      ajustes
    );
  }, [ajustes, proyecto]);

  if (ajustes.length === 0) return null;

  return (
    <div
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-xs"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Recálculo aplicado — visible solo para Admin/TPM
            </h3>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">
              Interno
            </span>
          </div>
          <p className="text-[11px] text-amber-800 mt-1">
            Estas cifras se unificaron contra la regla estricta de <code>business-rules.md</code>. Si
            compartiste una versión anterior de esta propuesta, los números de abajo ya no coinciden.
          </p>

          <ul className="mt-2.5 space-y-2">
            {ajustes.map(ajuste => (
              <li
                key={ajuste.concepto}
                className="text-[11px] bg-white/70 border border-amber-200 rounded-lg px-2.5 py-2"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-bold text-amber-900">{ajuste.concepto}:</span>
                  <span className="font-mono text-amber-700 line-through">{ajuste.anterior}</span>
                  <span className="text-amber-400">→</span>
                  <span className="font-mono font-bold text-amber-900">{ajuste.actual}</span>
                </div>
                <p className="text-amber-700 mt-0.5">{ajuste.motivo}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
