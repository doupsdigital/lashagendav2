'use client';

import React, { useState } from 'react';
import { CalendarPlus, Lock, LockOpen, X } from 'lucide-react';
import type { ScheduleBlockConfigRow } from '@/lib/scheduling/config-service';

const sheetShell = 'relative w-full max-w-md bg-surface rounded-t-3xl p-6 pb-8 shadow-2xl flex flex-col gap-3';

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Fechar"
      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-linen text-ink-soft flex items-center justify-center"
    >
      <X className="w-4 h-4" />
    </button>
  );
}

interface SlotChoiceSheetProps {
  /** Trecho livre tocado ("HH:MM"). */
  start: string;
  end: string;
  onClose: () => void;
  onBook: () => void;
  onLock: () => void;
}

/** Tocar num horário livre (F6.6): agendar ali ou trancar o trecho. */
export const SlotChoiceSheet: React.FC<SlotChoiceSheetProps> = ({ start, end, onClose, onBook, onLock }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
    <div className={sheetShell}>
      <CloseButton onClick={onClose} />
      <p className="font-serif-pro font-bold text-lg text-ink pr-8">Horário livre</p>
      <p className="text-[15px] text-ink-soft -mt-2">
        {start} às {end}
      </p>
      <button
        type="button"
        onClick={onBook}
        className="h-12 rounded-xl bg-rose-600 text-white text-[15px] font-bold flex items-center justify-center gap-2"
      >
        <CalendarPlus className="w-4 h-4" /> Agendar às {start}
      </button>
      <button
        type="button"
        onClick={onLock}
        className="h-12 rounded-xl border border-linen text-ink text-[15px] font-bold flex items-center justify-center gap-2"
      >
        <Lock className="w-4 h-4" /> Trancar esse horário
      </button>
    </div>
  </div>
);

function dateLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
}

interface BlockDetailSheetProps {
  block: ScheduleBlockConfigRow;
  onClose: () => void;
  /** Destrancado com sucesso — quem chama atualiza a agenda. */
  onRemoved: () => void;
}

/** Tocar num horário trancado (F6.6): motivo, período e destrancar, com
 *  confirmação na própria tela. Bloqueio de vários dias sai inteiro — avisa. */
export const BlockDetailSheet: React.FC<BlockDetailSheetProps> = ({ block, onClose, onRemoved }) => {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const multiDay = block.start_date !== block.end_date;
  const period = block.all_day
    ? 'Dia inteiro'
    : `${(block.start_time || '').slice(0, 5)} às ${(block.end_time || '').slice(0, 5)}`;

  const remove = async () => {
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/professional/schedule-blocks/${block.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Não foi possível destrancar.');
        return;
      }
      onRemoved();
    } catch {
      setError('Falha na conexão.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={sheetShell}>
        <CloseButton onClick={onClose} />
        <p className="font-serif-pro font-bold text-lg text-ink pr-8 flex items-center gap-2">
          <Lock className="w-4 h-4 text-ink-soft" /> Horário trancado
        </p>
        <div className="rounded-xl bg-cream px-4 py-3 flex flex-col gap-1">
          <p className="text-[15px] text-ink">
            {multiDay ? `De ${dateLabel(block.start_date)} até ${dateLabel(block.end_date)}` : dateLabel(block.start_date)} · {period}
          </p>
          {block.reason && <p className="text-sm text-ink-soft">Motivo: {block.reason}</p>}
        </div>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="h-12 rounded-xl border border-linen text-ink text-[15px] font-bold flex items-center justify-center gap-2"
          >
            <LockOpen className="w-4 h-4" /> Destrancar
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[15px] text-ink-soft text-center">
              {multiDay
                ? `Isso destranca o período inteiro (${dateLabel(block.start_date)} a ${dateLabel(block.end_date)}). Esses dias voltam a ficar livres na agenda.`
                : 'Esse horário volta a ficar livre na agenda.'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={removing}
                className="flex-1 h-11 rounded-xl bg-linen text-ink-soft text-[15px] font-bold"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={removing}
                className="flex-1 h-11 rounded-xl bg-rose-600 text-white text-[15px] font-bold disabled:opacity-60"
              >
                {removing ? 'Destrancando...' : 'Sim, destrancar'}
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-rose-600 text-center">{error}</p>}
      </div>
    </div>
  );
};
