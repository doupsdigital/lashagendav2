'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Plus, Trash2, X } from 'lucide-react';
import type { ScheduleBlockConfigRow } from '@/lib/scheduling/config-service';
import { MAX_BLOCK_REASON, findBlockProblem, todayDateKey } from '@/lib/scheduling/schedule-blocks';

interface ScheduleBlocksManagerProps {
  slug: string;
  blocks: ScheduleBlockConfigRow[];
}

/** "sex, 12/12" (com o ano quando não é o ano corrente). */
function formatDay(dateKey: string, currentYear: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
  const date = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    ...(dateKey.slice(0, 4) !== currentYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
  return `${weekday}, ${date}`;
}

function formatBlockLabel(b: ScheduleBlockConfigRow, currentYear: string): { dates: string; time: string } {
  const start = formatDay(b.start_date, currentYear);
  const dates = b.start_date === b.end_date ? start : `${start} até ${formatDay(b.end_date, currentYear)}`;
  const time = b.all_day
    ? b.start_date === b.end_date
      ? 'Dia inteiro'
      : 'Dias inteiros'
    : `${b.start_time?.slice(0, 5)} às ${b.end_time?.slice(0, 5)}${b.start_date === b.end_date ? '' : ' (em cada dia)'}`;
  return { dates, time };
}

export const ScheduleBlocksManager: React.FC<ScheduleBlocksManagerProps> = ({ slug, blocks }) => {
  const router = useRouter();
  const today = todayDateKey();
  const currentYear = today.slice(0, 4);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Só o que ainda vale (hoje em diante); os passados continuam na Agenda.
  const upcoming = useMemo(() => blocks.filter((b) => b.end_date >= today), [blocks, today]);

  const problem = startDate
    ? findBlockProblem({ start_date: startDate, end_date: endDate || startDate, all_day: allDay, start_time: startTime, end_time: endTime })
    : null;
  const endBeforeToday = Boolean(startDate) && (endDate || startDate) < today;

  const resetForm = () => {
    setShowForm(false);
    setStartDate('');
    setEndDate('');
    setAllDay(true);
    setStartTime('12:00');
    setEndTime('13:00');
    setReason('');
  };

  const handleStartChange = (value: string) => {
    setStartDate(value);
    // Um dia só é o caso mais comum: a data final acompanha a inicial.
    if (!endDate || endDate < value) setEndDate(value);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || problem) return;
    setSubmitting(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch('/api/professional/schedule-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          start_date: startDate,
          end_date: endDate || startDate,
          all_day: allDay,
          start_time: allDay ? undefined : startTime,
          end_time: allDay ? undefined : endTime,
          reason: reason.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Não foi possível criar o bloqueio.');
        return;
      }
      const affected = Number(json.affectedAppointments) || 0;
      if (affected > 0) {
        setWarning(
          affected === 1
            ? 'Bloqueio criado. Atenção: já existe 1 agendamento nesse período — ele continua marcado. Se precisar, desmarque pela Agenda.'
            : `Bloqueio criado. Atenção: já existem ${affected} agendamentos nesse período — eles continuam marcados. Se precisar, desmarque pela Agenda.`
        );
      }
      resetForm();
      router.refresh();
    } catch {
      setError('Falha na conexão.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/professional/schedule-blocks/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Não foi possível apagar o bloqueio.');
        return;
      }
      setConfirmingId(null);
      router.refresh();
    } catch {
      setError('Falha na conexão.');
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass = 'w-full min-w-0 h-11 rounded-xl bg-surface border border-linen px-3 text-[15px] text-ink';

  return (
    <div>
      <p className="text-sm text-ink-soft mb-3">
        Folgas, férias, feriados ou um horário que você não vai atender. Nesses períodos a cliente não consegue agendar.
      </p>

      {!showForm && (
        <div className="flex items-center justify-end mb-3">
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setWarning(null);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-100 text-rose-600 text-[15px] font-bold"
          >
            <Plus className="w-4 h-4" /> Novo bloqueio
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl bg-cream border border-linen p-4 flex flex-col gap-3 mb-3">
          <div className="flex gap-2">
            <label className="flex-1 min-w-0 flex flex-col gap-1 text-sm font-semibold text-ink-soft">
              De
              <input type="date" value={startDate} min={today} onChange={(e) => handleStartChange(e.target.value)} className={inputClass} />
            </label>
            <label className="flex-1 min-w-0 flex flex-col gap-1 text-sm font-semibold text-ink-soft">
              Até
              <input
                type="date"
                value={endDate}
                min={startDate || today}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex items-center gap-2.5 text-[15px] text-ink">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="w-5 h-5 accent-rose-600" />
            Dia inteiro
          </label>

          {!allDay && (
            <div className="flex items-center gap-2">
              <input
                type="time"
                aria-label="Bloquear a partir de"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClass}
              />
              <span className="shrink-0 text-sm text-ink-faint">às</span>
              <input
                type="time"
                aria-label="Bloquear até"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          {!allDay && startDate && endDate && endDate !== startDate && (
            <p className="text-sm text-ink-soft">Esse horário fica bloqueado em cada dia do período.</p>
          )}

          <input
            type="text"
            placeholder="Motivo (opcional, só você vê)"
            value={reason}
            maxLength={MAX_BLOCK_REASON}
            onChange={(e) => setReason(e.target.value)}
            className="h-12 rounded-xl bg-surface border border-linen px-3 text-base text-ink placeholder:text-ink-faint"
          />

          {problem && <p className="text-sm text-rose-600">{problem}</p>}
          {!problem && endBeforeToday && <p className="text-sm text-ink-soft">Esse período já passou.</p>}

          <div className="flex gap-2">
            <button type="button" onClick={resetForm} className="flex-1 h-11 rounded-xl bg-linen text-ink-soft text-[15px] font-bold">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !startDate || Boolean(problem)}
              className="flex-1 h-11 rounded-xl bg-rose-600 text-white text-[15px] font-bold disabled:opacity-50"
            >
              {submitting ? 'Criando...' : 'Criar bloqueio'}
            </button>
          </div>
        </form>
      )}

      {warning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 mb-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-amber-900">{warning}</p>
          <button type="button" aria-label="Fechar aviso" onClick={() => setWarning(null)} className="shrink-0 text-amber-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-rose-600 mb-2">{error}</p>}

      {upcoming.length === 0 ? (
        <p className="text-[15px] text-ink-faint py-4 text-center">Nenhum bloqueio daqui pra frente.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {upcoming.map((b) => {
            const label = formatBlockLabel(b, currentYear);
            const confirming = confirmingId === b.id;
            return (
              <div key={b.id} className="rounded-2xl bg-cream border border-linen p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-ink">{label.dates}</p>
                    <p className="text-sm text-ink-soft mt-0.5">{label.time}</p>
                    {b.reason && <p className="text-sm text-ink-faint truncate mt-0.5">{b.reason}</p>}
                  </div>
                  {!confirming && (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(b.id)}
                      className="shrink-0 w-9 h-9 rounded-full bg-linen text-ink-soft flex items-center justify-center"
                      aria-label="Apagar bloqueio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {confirming && (
                  <div className="mt-3 flex items-center gap-2">
                    <p className="flex-1 text-sm text-ink">Apagar esse bloqueio?</p>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="h-9 px-3 rounded-lg bg-linen text-ink-soft text-sm font-bold"
                    >
                      Não
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === b.id}
                      onClick={() => handleDelete(b.id)}
                      className="h-9 px-3 rounded-lg bg-rose-600 text-white text-sm font-bold disabled:opacity-50"
                    >
                      {deletingId === b.id ? 'Apagando...' : 'Apagar'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
