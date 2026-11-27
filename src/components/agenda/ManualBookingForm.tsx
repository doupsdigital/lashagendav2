'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import { localDateTimeToUTC } from '@/lib/scheduling/availability';
import { formatPhoneBR } from '@/lib/format';
import { bookingTotalLabel, durationToLabel, priceToLabel } from '@/lib/service-format';
import type { ManualBookingService, StudioClientOption } from '@/lib/scheduling/agenda-service';
import type { SuccessModalRow } from './SuccessModal';

interface ManualBookingFormProps {
  slug: string;
  services: ManualBookingService[];
  defaultDate: string;
  /** Horário pré-preenchido quando o formulário é aberto a partir de um
   *  clique num horário livre da agenda. */
  defaultTime?: string;
  /** Cliente já escolhida (atalho "Agendar" do perfil, F7.5). */
  defaultClient?: StudioClientOption | null;
  onClose: () => void;
  onCreated: (summary: { title: string; rows: SuccessModalRow[] }) => void;
}

/** Mesmo limite do agendamento pela cliente (`MAX_BOOKING_ITEMS`). */
const MAX_ITEMS = 5;

interface Line {
  key: number;
  serviceId: string;
  variationId: string;
}

const inputClass = 'h-11 rounded-xl bg-surface border border-linen px-3 text-[15px] text-ink placeholder:text-ink-faint';

/** Agendamento manual da profissional (F6.4): cliente já cadastrada (busca
 *  por nome ou WhatsApp) ou nova, até 5 serviços com as opções, total e
 *  encaixe fora do expediente com confirmação. */
export const ManualBookingForm: React.FC<ManualBookingFormProps> = ({
  slug,
  services,
  defaultDate,
  defaultTime,
  defaultClient = null,
  onClose,
  onCreated,
}) => {
  const [clientMode, setClientMode] = useState<'search' | 'selected' | 'new'>(defaultClient ? 'selected' : 'search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudioClientOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<StudioClientOption | null>(defaultClient);
  const [newName, setNewName] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');

  const [lines, setLines] = useState<Line[]>(() => [{ key: 1, serviceId: services[0]?.id || '', variationId: '' }]);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime || '09:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Servidor avisou: fora do expediente ou trancado — encaixar mesmo assim? */
  const [needsConfirm, setNeedsConfirm] = useState<string | null>(null);

  // Busca de clientes (com pausa curta para não buscar a cada tecla).
  useEffect(() => {
    if (clientMode !== 'search') return;
    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/professional/clients?slug=${encodeURIComponent(slug)}&q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (active) setResults(json.success ? json.clients : []);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, clientMode, slug]);

  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  // Cada linha vira um item com duração/preço (da opção, se escolhida).
  const chosen = lines.map((line) => {
    const service = serviceById.get(line.serviceId);
    const variation = service?.variations.find((v) => v.id === line.variationId) || null;
    return {
      line,
      service,
      variation,
      title: service ? (variation ? `${service.title} — ${variation.name}` : service.title) : '',
      duration: variation?.duration_minutes ?? service?.duration_minutes ?? 0,
      price: variation ? variation.price : (service?.price_value ?? null),
      priceFrom: variation ? false : Boolean(service?.price_from),
    };
  });
  const totalMinutes = chosen.reduce((sum, c) => sum + c.duration, 0);
  const totalLabel = bookingTotalLabel(chosen.map((c) => ({ price: c.price, price_from: c.priceFrom })));
  const endTime = useMemo(() => {
    if (!/^\d{2}:\d{2}$/.test(time) || totalMinutes <= 0) return '';
    const [h, m] = time.split(':').map(Number);
    const end = h * 60 + m + totalMinutes;
    if (end >= 24 * 60) return '';
    return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  }, [time, totalMinutes]);

  const usedIds = new Set(lines.map((l) => l.serviceId));
  const canAddLine = lines.length < MAX_ITEMS && services.some((s) => !usedIds.has(s.id));

  // Qualquer mudança no que vai ser marcado invalida o "encaixar mesmo assim".
  const touch = () => {
    setNeedsConfirm(null);
    setError(null);
  };

  const updateLine = (key: number, patch: Partial<Line>) => {
    touch();
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };
  const addLine = () => {
    const next = services.find((s) => !usedIds.has(s.id));
    if (!next) return;
    touch();
    setLines((prev) => [...prev, { key: Math.max(...prev.map((l) => l.key)) + 1, serviceId: next.id, variationId: '' }]);
  };
  const removeLine = (key: number) => {
    touch();
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  };

  const startNewClient = () => {
    const digits = query.replace(/\D/g, '');
    if (digits.length >= 8 && digits.length === query.replace(/[\s()+-]/g, '').length) {
      setNewWhatsapp(formatPhoneBR(digits.replace(/^55(?=\d{10,11}$)/, '')));
      setNewName('');
    } else {
      setNewName(query.trim());
      setNewWhatsapp('');
    }
    setClientMode('new');
  };

  const submit = async (allowOutside: boolean) => {
    setError(null);
    if (clientMode === 'search' || (clientMode === 'selected' && !selectedClient)) {
      setError('Escolha a cliente ou cadastre uma nova.');
      return;
    }
    if (clientMode === 'new' && (!newName.trim() || !newWhatsapp.trim())) {
      setError('Preencha o nome e o WhatsApp da cliente nova.');
      return;
    }
    const missingOption = chosen.find((c) => c.service && c.service.variations.length > 0 && !c.variation);
    if (missingOption) {
      setError(`Escolha a opção de ${missingOption.service?.title}.`);
      return;
    }
    if (!date || !time) {
      setError('Escolha o dia e o horário.');
      return;
    }

    setSubmitting(true);
    try {
      const startsAt = localDateTimeToUTC(date, time).toISOString();
      const res = await fetch('/api/professional/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          items: lines.map((l) => ({ service_id: l.serviceId, variation_id: l.variationId || null })),
          starts_at: startsAt,
          ...(clientMode === 'selected' && selectedClient
            ? { client_id: selectedClient.id }
            : { client_name: newName.trim(), client_whatsapp: newWhatsapp.trim() }),
          notes: notes.trim() || undefined,
          allow_outside_hours: allowOutside,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        if (json.needsConfirmation) {
          setNeedsConfirm(json.message || 'Esse horário fica fora do seu expediente.');
          return;
        }
        setError(json.message || 'Não foi possível criar o agendamento.');
        return;
      }
      const dateLabel = localDateTimeToUTC(date, time).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo',
      });
      const clientLabel = clientMode === 'selected' && selectedClient ? selectedClient.name : newName.trim();
      onCreated({
        title: json.outsideHours ? 'Encaixe criado!' : 'Agendamento Criado!',
        rows: [
          { label: 'Cliente', value: clientLabel },
          { label: 'Procedimento(s)', value: chosen.map((c) => c.title).join(' + ') },
          { label: 'Data', value: dateLabel },
          { label: 'Horário', value: endTime ? `${time} às ${endTime}` : time },
        ],
      });
    } catch {
      setError('Falha na conexão.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface rounded-t-3xl p-6 pb-8 shadow-2xl flex flex-col gap-3"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-linen text-ink-soft flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="font-serif-pro font-bold text-lg text-ink pr-8">Novo agendamento</p>

        {services.length === 0 ? (
          <p className="text-sm text-amber-700">Nenhum serviço ativo no catálogo ainda. Cadastre um serviço no editor do catálogo primeiro.</p>
        ) : (
          <>
            {/* Cliente */}
            <p className="text-[13px] font-bold uppercase tracking-wider text-ink-faint mt-1">Cliente</p>
            {clientMode === 'selected' && selectedClient && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-cream px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-ink truncate">{selectedClient.name}</p>
                  <p className="text-[13px] text-ink-soft">{selectedClient.whatsapp ? formatPhoneBR(selectedClient.whatsapp) : 'sem WhatsApp'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient(null);
                    setClientMode('search');
                  }}
                  className="text-sm font-bold text-rose-600 shrink-0"
                >
                  Trocar
                </button>
              </div>
            )}

            {clientMode === 'search' && (
              <div className="flex flex-col gap-1.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Buscar por nome ou WhatsApp"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={`${inputClass} w-full pl-9`}
                  />
                </div>
                <div className="rounded-xl border border-linen divide-y divide-linen overflow-hidden">
                  {results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedClient(c);
                        setClientMode('selected');
                        setError(null);
                      }}
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-rose-50/60"
                    >
                      <span className="text-[15px] text-ink truncate">{c.name}</span>
                      <span className="text-[13px] text-ink-faint shrink-0">{c.whatsapp ? formatPhoneBR(c.whatsapp) : ''}</span>
                    </button>
                  ))}
                  {!searching && results.length === 0 && (
                    <p className="px-3.5 py-2.5 text-[13px] text-ink-faint">{query.trim() ? 'Nenhuma cliente encontrada.' : 'Nenhuma cliente cadastrada ainda.'}</p>
                  )}
                  <button
                    type="button"
                    onClick={startNewClient}
                    className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-[15px] font-semibold text-rose-600 hover:bg-rose-50/60"
                  >
                    <UserPlus className="w-4 h-4" /> Cadastrar cliente nova
                  </button>
                </div>
              </div>
            )}

            {clientMode === 'new' && (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Nome da cliente"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`${inputClass} h-12 text-base`}
                />
                <input
                  type="tel"
                  placeholder="WhatsApp: (11) 99999-9999"
                  value={newWhatsapp}
                  onChange={(e) => setNewWhatsapp(formatPhoneBR(e.target.value))}
                  className={`${inputClass} h-12 text-base`}
                />
                <p className="text-[13px] text-ink-faint">
                  Se esse WhatsApp já for de uma cliente sua, o agendamento entra no cadastro dela.{' '}
                  <button type="button" onClick={() => setClientMode('search')} className="font-semibold text-rose-600">
                    Buscar cliente
                  </button>
                </p>
              </div>
            )}

            {/* Serviços */}
            <p className="text-[13px] font-bold uppercase tracking-wider text-ink-faint mt-2">Serviços</p>
            <div className="flex flex-col gap-2">
              {chosen.map(({ line, service }) => (
                <div key={line.key} className="flex flex-col gap-1.5 rounded-xl border border-linen p-2.5">
                  <div className="flex gap-2">
                    <select
                      value={line.serviceId}
                      onChange={(e) => updateLine(line.key, { serviceId: e.target.value, variationId: '' })}
                      className={`${inputClass} flex-1 min-w-0`}
                    >
                      {services
                        .filter((s) => s.id === line.serviceId || !usedIds.has(s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                            {s.variations.length === 0 ? ` · ${s.price} · ${durationToLabel(s.duration_minutes)}` : ''}
                          </option>
                        ))}
                    </select>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        aria-label="Tirar serviço"
                        className="w-11 h-11 shrink-0 rounded-xl border border-linen text-ink-faint flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {service && service.variations.length > 0 && (
                    <select
                      value={line.variationId}
                      onChange={(e) => updateLine(line.key, { variationId: e.target.value })}
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
                <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-[15px] font-semibold text-rose-600 py-1">
                  <Plus className="w-4 h-4" /> Adicionar outro serviço
                </button>
              )}
              <p className="text-[13px] text-ink-soft">
                Total: <b className="text-ink">{totalLabel}</b> · {durationToLabel(totalMinutes)}
              </p>
            </div>

            {/* Quando */}
            <p className="text-[13px] font-bold uppercase tracking-wider text-ink-faint mt-2">Quando</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  touch();
                  setDate(e.target.value);
                }}
                className={`${inputClass} flex-1`}
              />
              <input
                type="time"
                value={time}
                onChange={(e) => {
                  touch();
                  setTime(e.target.value);
                }}
                className={`${inputClass} w-28`}
              />
            </div>
            {endTime && <p className="text-[13px] text-ink-soft -mt-1">Termina às {endTime}.</p>}

            <textarea
              placeholder="Anotação (opcional, só você vê)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              className="rounded-xl bg-surface border border-linen px-3 py-2 text-[15px] text-ink placeholder:text-ink-faint min-h-[60px]"
            />
          </>
        )}

        {needsConfirm && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex flex-col gap-2.5">
            <p className="text-[15px] text-amber-900 flex gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
              <span>
                {needsConfirm} Quer encaixar mesmo assim?
              </span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNeedsConfirm(null)}
                disabled={submitting}
                className="flex-1 h-10 rounded-xl border border-amber-300 text-amber-900 text-sm font-bold"
              >
                Mudar horário
              </button>
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={submitting}
                className="flex-1 h-10 rounded-xl bg-amber-600 text-white text-sm font-bold disabled:opacity-60"
              >
                {submitting ? 'Criando...' : 'Encaixar mesmo assim'}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        {!needsConfirm && (
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl bg-linen text-ink-soft text-[15px] font-bold">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || services.length === 0}
              className="flex-1 h-11 rounded-xl bg-rose-600 text-white text-[15px] font-bold disabled:opacity-50"
            >
              {submitting ? 'Criando...' : 'Criar agendamento'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
