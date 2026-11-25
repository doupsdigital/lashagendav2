'use client';

import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { durationToLabel, formatBRL, priceToLabel } from '@/lib/service-format';
import { amountToInput } from '@/lib/scheduling/appointment-actions';
import { MAX_RECORD_NOTES, MIN_RECORD_DATE } from '@/lib/clients/client-record';
import type { ManualBookingService } from '@/lib/scheduling/agenda-service';

const MAX_ITEMS = 5;
const inputClass =
  'h-12 rounded-xl border border-linen bg-cream px-4 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-rose-400';

interface Line {
  key: number;
  serviceId: string;
  variationId: string;
}

interface RecordVisitSheetProps {
  slug: string;
  clientId: string;
  clientName: string;
  services: ManualBookingService[];
  /** "AAAA-MM-DD" no fuso do estúdio — limite da data. */
  today: string;
  onClose: () => void;
  onSaved: () => void;
}

/** Registrar um atendimento feito fora do app (F7.4): data (hoje ou antes),
 *  serviços e valor recebido. Entra no histórico e nos números, sem horário. */
export const RecordVisitSheet: React.FC<RecordVisitSheetProps> = ({ slug, clientId, clientName, services, today, onClose, onSaved }) => {
  const [date, setDate] = useState(today);
  const [lines, setLines] = useState<Line[]>(() => [{ key: 1, serviceId: services[0]?.id || '', variationId: '' }]);
  // Valor: segue o total até ela mexer no campo.
  const [amount, setAmount] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = lines.map((line) => {
    const service = services.find((s) => s.id === line.serviceId) || null;
    const variation = service?.variations.find((v) => v.id === line.variationId) || null;
    return { line, service, variation, price: variation ? variation.price : (service?.price_value ?? null) };
  });
  const priced = chosen.filter((c) => c.price !== null);
  const total = priced.length ? Math.round(priced.reduce((sum, c) => sum + (c.price as number), 0) * 100) / 100 : null;
  const amountValue = amount ?? amountToInput(total);

  const usedIds = new Set(lines.map((l) => l.serviceId));
  const canAddLine = lines.length < MAX_ITEMS && services.some((s) => !usedIds.has(s.id));
  const updateLine = (key: number, patch: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () => {
    const next = services.find((s) => !usedIds.has(s.id));
    if (!next) return;
    setLines((prev) => [...prev, { key: Math.max(...prev.map((l) => l.key)) + 1, serviceId: next.id, variationId: '' }]);
  };
  const removeLine = (key: number) => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chosen.some((c) => c.service && c.service.variations.length > 0 && !c.variation)) {
      setError('Escolha a opção de cada serviço.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/professional/clients/${clientId}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          date,
          items: lines.map((l) => ({ service_id: l.serviceId, variation_id: l.variationId || null })),
          amount_received: amountValue,
          notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onSaved();
        return;
      }
      setError(json.message || 'Não foi possível registrar.');
    } catch {
      setError('Falha na conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md bg-surface rounded-t-3xl p-6 pb-8 shadow-2xl flex flex-col gap-3 max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-linen text-ink-soft flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="pr-8">
          <p className="font-serif-pro font-bold text-lg text-ink">Registrar atendimento</p>
          <p className="text-sm text-ink-soft">
            Algo que você já fez com {clientName.split(' ')[0]} fora do app. Entra no histórico e nos números, sem ocupar a agenda.
          </p>
        </div>

        {services.length === 0 ? (
          <p className="text-[15px] text-ink-soft">Cadastre um serviço no catálogo antes de registrar atendimentos.</p>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-ink-soft">Data do atendimento</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={MIN_RECORD_DATE} max={today} className={inputClass} />
            </label>

            <p className="text-sm font-semibold text-ink-soft -mb-1">Serviços</p>
            <div className="flex flex-col gap-2">
              {chosen.map(({ line, service }) => (
                <div key={line.key} className="flex flex-col gap-1.5 rounded-xl border border-linen p-2.5">
                  <div className="flex gap-2">
                    <select
                      value={line.serviceId}
                      onChange={(e) => updateLine(line.key, { serviceId: e.target.value, variationId: '' })}
                      aria-label="Serviço"
                      className={`${inputClass} flex-1 min-w-0`}
                    >
                      {services
                        .filter((s) => s.id === line.serviceId || !usedIds.has(s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                            {s.variations.length === 0 ? ` · ${s.price}` : ''}
                          </option>
                        ))}
                    </select>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        aria-label="Tirar serviço"
                        className="w-12 h-12 shrink-0 rounded-xl border border-linen text-ink-faint flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {service && service.variations.length > 0 && (
                    <select
                      value={line.variationId}
                      onChange={(e) => updateLine(line.key, { variationId: e.target.value })}
                      aria-label="Opção"
                      className={`${inputClass} ${line.variationId ? '' : 'text-ink-faint'}`}
                    >
                      <option value="">Escolha a opção…</option>
                      {service.variations.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} · {priceToLabel(v.price)} · {durationToLabel(v.duration_minutes)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
              {canAddLine && (
                <button type="button" onClick={addLine} className="self-start flex items-center gap-1.5 text-[15px] font-semibold text-rose-600 py-1">
                  <Plus className="w-4 h-4" /> Adicionar outro serviço
                </button>
              )}
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-ink-soft">
                Valor recebido {total !== null && <span className="font-normal">(total {formatBRL(total)})</span>}
              </span>
              <input
                value={amountValue}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder={total === null ? 'Ex.: 150' : ''}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-ink-soft">Anotação (opcional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={MAX_RECORD_NOTES}
                rows={2}
                className="rounded-xl border border-linen bg-cream px-4 py-3 text-[16px] text-ink focus:outline-none focus:border-rose-400 resize-none"
              />
            </label>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button type="submit" disabled={saving} className="h-12 rounded-xl bg-rose-600 text-white text-[15px] font-bold disabled:opacity-60 mt-1">
              {saving ? 'Registrando...' : 'Registrar atendimento'}
            </button>
          </>
        )}
      </form>
    </div>
  );
};
