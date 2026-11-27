'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Utensils, X } from 'lucide-react';
import type { BusinessHoursConfigRow } from '@/lib/scheduling/config-service';
import { MAX_RANGES_PER_DAY, findRangeProblem, type TimeRange } from '@/lib/scheduling/business-hours';

interface BusinessHoursEditorProps {
  slug: string;
  initialHours: BusinessHoursConfigRow[];
}

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const DEFAULT_RANGE = { start_time: '09:00', end_time: '18:00' };
const LUNCH_START = '12:00';
const LUNCH_END = '13:00';

/** Faixa na tela: `key` só identifica a linha no React (não vai pro banco). */
interface RangeState extends TimeRange {
  key: string;
}

interface DayState {
  open: boolean;
  ranges: RangeState[];
}

let keySeq = 0;
const newKey = () => `faixa-${(keySeq += 1)}`;

function buildInitialState(initialHours: BusinessHoursConfigRow[]): DayState[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    const existing = initialHours
      .filter((h) => h.weekday === weekday)
      .map((h) => ({ key: newKey(), start_time: h.start_time.slice(0, 5), end_time: h.end_time.slice(0, 5) }))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    return {
      open: existing.length > 0,
      ranges: existing.length > 0 ? existing : [{ key: newKey(), ...DEFAULT_RANGE }],
    };
  });
}

/** Sugestão para a próxima faixa: 1h depois do fim da última, se couber. */
function nextRangeAfter(ranges: RangeState[]): RangeState {
  const last = [...ranges].sort((a, b) => a.end_time.localeCompare(b.end_time)).pop();
  if (!last) return { key: newKey(), ...DEFAULT_RANGE };
  const [h, m] = last.end_time.split(':').map(Number);
  const startH = Math.min(22, h + 1);
  const endH = Math.min(23, startH + 2);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { key: newKey(), start_time: `${pad(startH)}:${pad(m)}`, end_time: `${pad(endH)}:${pad(m)}` };
}

export const BusinessHoursEditor: React.FC<BusinessHoursEditorProps> = ({ slug, initialHours }) => {
  const router = useRouter();
  const [days, setDays] = useState<DayState[]>(() => buildInitialState(initialHours));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const updateDay = (weekday: number, patch: Partial<DayState>) => {
    setDays((prev) => prev.map((d, idx) => (idx === weekday ? { ...d, ...patch } : d)));
    setSaved(false);
  };

  const updateRange = (weekday: number, key: string, patch: Partial<TimeRange>) =>
    updateDay(weekday, { ranges: days[weekday].ranges.map((r) => (r.key === key ? { ...r, ...patch } : r)) });

  const removeRange = (weekday: number, key: string) =>
    updateDay(weekday, { ranges: days[weekday].ranges.filter((r) => r.key !== key) });

  const addRange = (weekday: number) =>
    updateDay(weekday, { ranges: [...days[weekday].ranges, nextRangeAfter(days[weekday].ranges)] });

  /** Divide a faixa única do dia em manhã e tarde (12:00–13:00 livre). */
  const addLunchBreak = (weekday: number) => {
    const [only] = days[weekday].ranges;
    updateDay(weekday, {
      ranges: [
        { key: newKey(), start_time: only.start_time, end_time: LUNCH_START },
        { key: newKey(), start_time: LUNCH_END, end_time: only.end_time },
      ],
    });
  };

  const problems = useMemo(() => days.map((d) => (d.open ? findRangeProblem(d.ranges) : null)), [days]);
  const hasProblem = problems.some(Boolean);

  const handleSave = async () => {
    if (hasProblem) return;
    setSaving(true);
    setError(null);
    try {
      const hours = days.flatMap((d, weekday) =>
        d.open ? d.ranges.map((r) => ({ weekday, start_time: r.start_time, end_time: r.end_time })) : []
      );

      const res = await fetch('/api/professional/business-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, hours }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Não foi possível salvar.');
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError('Falha na conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {days.map((day, weekday) => {
        const single = day.ranges.length === 1 ? day.ranges[0] : null;
        const canAddLunch = Boolean(single && single.start_time < LUNCH_START && single.end_time > LUNCH_END);
        return (
          <div key={weekday} className="rounded-xl border border-linen bg-cream/50 p-3">
            <label className="flex items-center gap-2.5 text-[15px] font-semibold text-ink">
              <input
                type="checkbox"
                checked={day.open}
                onChange={(e) => updateDay(weekday, { open: e.target.checked })}
                className="w-5 h-5 shrink-0 accent-rose-600"
              />
              {WEEKDAY_LABELS[weekday]}
            </label>
            {day.open ? (
              <div className="mt-2.5 pl-[30px] flex flex-col gap-2">
                {day.ranges.map((range) => (
                  <div key={range.key} className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label={`${WEEKDAY_LABELS[weekday]}: início`}
                      value={range.start_time}
                      onChange={(e) => updateRange(weekday, range.key, { start_time: e.target.value })}
                      className="h-11 min-w-0 flex-1 rounded-lg bg-surface border border-linen px-2 text-[15px] text-ink"
                    />
                    <span className="shrink-0 text-sm text-ink-faint">até</span>
                    <input
                      type="time"
                      aria-label={`${WEEKDAY_LABELS[weekday]}: fim`}
                      value={range.end_time}
                      onChange={(e) => updateRange(weekday, range.key, { end_time: e.target.value })}
                      className="h-11 min-w-0 flex-1 rounded-lg bg-surface border border-linen px-2 text-[15px] text-ink"
                    />
                    {day.ranges.length > 1 && (
                      <button
                        type="button"
                        aria-label="Remover faixa"
                        onClick={() => removeRange(weekday, range.key)}
                        className="shrink-0 w-9 h-9 rounded-lg border border-linen bg-surface text-ink-faint flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {problems[weekday] && <p className="text-sm text-rose-600">{problems[weekday]}</p>}

                <div className="flex flex-wrap gap-2">
                  {canAddLunch && (
                    <button
                      type="button"
                      onClick={() => addLunchBreak(weekday)}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-rose-200 bg-rose-50 text-[13px] font-semibold text-rose-700"
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      Pausa de almoço
                    </button>
                  )}
                  {day.ranges.length < MAX_RANGES_PER_DAY && (
                    <button
                      type="button"
                      onClick={() => addRange(weekday)}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-linen bg-surface text-[13px] font-semibold text-ink-soft"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar faixa
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-1.5 pl-[30px] text-[15px] text-ink-faint">Fechado</p>
            )}
          </div>
        );
      })}

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {hasProblem && <p className="text-sm text-rose-600">Corrija os horários marcados em vermelho para salvar.</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || hasProblem}
        className="mt-1 h-11 rounded-xl bg-rose-600 text-white text-[15px] font-bold disabled:opacity-50"
      >
        {saving ? 'Salvando...' : saved ? 'Salvo ✓' : 'Salvar horários'}
      </button>
    </div>
  );
};
