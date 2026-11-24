'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, CalendarX, Plus, Sparkles, X } from 'lucide-react';
import { ProcedureItem } from '@/types/catalog';
import type { AvailabilitySlot } from '@/lib/scheduling/availability';
import { formatPhoneBR } from '@/lib/format';
import { ProcedureImage } from '../ProcedureImage';
import { bookingTotalLabel, durationToLabel, procedurePriceLabel, procedureWithVariation } from '@/lib/service-format';
import '@/styles/scheduling-wizard.css';

interface BookingModalProps {
  /** Serviço (já com a variação escolhida, se tiver) que abriu o agendamento. */
  service: ProcedureItem;
  /** Serviços agendáveis do catálogo, para "+ Adicionar outro serviço" (F5.1). */
  availableServices?: ProcedureItem[];
  slug: string;
  /** Nome da profissional/studio (não confundir com o `clientName` abaixo,
   *  que é o da CLIENTE preenchendo o formulário) — só pro placeholder de
   *  foto ausente/quebrada, mesma composição "STUDIO" + nome da capa. */
  professionalName?: string;
  /** Até quantos dias à frente dá para agendar (regra do estúdio). */
  bookingWindowDays?: number;
  onClose: () => void;
}

type WizardStep = 'datetime' | 'contact' | 'confirm';

interface BookedAppointment {
  time: string;
  dateLabel: string;
  confirmed: boolean;
}

/** Igual ao limite do servidor (`MAX_BOOKING_ITEMS`). */
const MAX_SERVICES = 5;

/** Dias mostrados quando o catálogo não informa a janela, e o teto da lista
 *  (a janela pode ir até 365 dias; mais de ~2 meses de botões só atrapalha). */
const DEFAULT_DAYS_AHEAD = 14;
const MAX_DAYS_SHOWN = 62;

function toDateKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD
}

/** Próximos dias para os botões. `month` aparece no primeiro botão e em cada
 *  dia 1º — com ~2 meses de botões, só o número do dia confundia. */
function buildNextDays(count: number): { key: string; weekday: string; day: string; month: string | null }[] {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const day = d.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'America/Sao_Paulo' });
    days.push({
      key: toDateKey(d),
      weekday: d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', ''),
      day,
      month:
        i === 0 || day === '01'
          ? d.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')
          : null,
    });
  }
  return days;
}

/** Chave de um item escolhido (serviço + variação). */
const itemKey = (p: ProcedureItem) => (p.variation_id ? `${p.id}:${p.variation_id}` : p.id);

function formatDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00-03:00`);
  const label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const BookingModal: React.FC<BookingModalProps> = ({
  service,
  availableServices = [],
  slug,
  professionalName,
  bookingWindowDays,
  onClose,
}) => {
  // Hoje + a janela do estúdio (ex.: 60 dias → 61 botões), com teto.
  const days = useState(() =>
    buildNextDays(Math.min(MAX_DAYS_SHOWN, bookingWindowDays ? bookingWindowDays + 1 : DEFAULT_DAYS_AHEAD))
  )[0];

  // Serviços do agendamento, um atrás do outro (F5.1). Começa com o que a
  // cliente tocou no catálogo.
  const [selected, setSelected] = useState<ProcedureItem[]>([service]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerVariationsFor, setPickerVariationsFor] = useState<string | null>(null);
  const selectedKey = selected.map(itemKey).join(',');
  const totalMinutes = selected.reduce((sum, p) => sum + (p.duration_minutes || 0), 0);
  const addable = useMemo(
    () => availableServices.filter((p) => !selected.some((s) => s.id === p.id)),
    [availableServices, selected]
  );
  const headline = selected.length === 1 ? selected[0].title : `${selected.length} serviços`;

  const addService = (p: ProcedureItem) => {
    setSelected((prev) => [...prev, p]);
    setPickerOpen(false);
    setPickerVariationsFor(null);
  };
  const removeService = (key: string) => setSelected((prev) => (prev.length > 1 ? prev.filter((p) => itemKey(p) !== key) : prev));

  const [step, setStep] = useState<WizardStep>('datetime');
  const [selectedDate, setSelectedDate] = useState<string>(days[0].key);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  // Preview antes de assinar (2026-09-28): a API sinaliza quando o motivo
  // de não ter horário nenhum é ela ainda não ter cadastrado horário de
  // atendimento (só possível depois de assinar), não "esse dia lotou".
  const [noSchedulingYet, setNoSchedulingYet] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booked, setBooked] = useState<BookedAppointment | null>(null);

  // Trava scroll do body e fecha no Esc (mesmo padrão de ProcedureDetailModal)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const fetchSlots = async (dateKey: string) => {
    setLoadingSlots(true);
    setSlotsError(null);
    setNoSchedulingYet(false);
    setSelectedSlot(null);
    try {
      const params = new URLSearchParams({ slug, items: selectedKey, date: dateKey });
      const res = await fetch(`/api/scheduling/availability?${params.toString()}`);
      const json = await res.json();
      if (!json.success) {
        setSlots([]);
        setSlotsError(json.message || 'Não foi possível carregar os horários.');
        return;
      }
      setSlots(json.slots || []);
      setNoSchedulingYet(Boolean(json.noSchedulingYet));
    } catch {
      setSlots([]);
      setSlotsError('Falha na conexão ao buscar horários.');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchSlots(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedKey]);

  const handleSubmitContact = async () => {
    if (!selectedSlot || !clientName.trim() || !clientWhatsapp.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/scheduling/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          items: selected.map((p) => ({ service_id: p.id, variation_id: p.variation_id || null })),
          starts_at: selectedSlot.startsAt,
          client_name: clientName.trim(),
          client_whatsapp: clientWhatsapp.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setSubmitError(json.message || 'Não foi possível confirmar o agendamento.');
        if (res.status === 409) {
          // Horário deixou de estar disponível — volta e recarrega a grade.
          setStep('datetime');
          fetchSlots(selectedDate);
        }
        return;
      }
      setBooked({
        time: selectedSlot.time,
        dateLabel: formatDateLabel(selectedDate),
        confirmed: json.appointment?.status === 'confirmed',
      });
      setStep('confirm');
    } catch {
      setSubmitError('Falha na conexão ao confirmar o agendamento.');
    } finally {
      setSubmitting(false);
    }
  };

  // Passo 3 (confirmado) não é mais parte do bottom sheet do wizard — é um
  // evento concluído, não um passo do formulário, por isso vira um modal
  // centralizado próprio (ver comentário em scheduling-wizard.css). Sem
  // botão de avisar a profissional pelo WhatsApp de propósito — isso era um
  // paliativo enquanto não existe push notification pra ela (que vem numa
  // fase futura); pedir isso da cliente não é a experiência final desejada,
  // só confirma que o agendamento foi reservado.
  if (step === 'confirm' && booked) {
    return (
      <div className="wizard-success" role="dialog" aria-modal="true" aria-label="Agendamento reservado">
        <div className="wizard-success__backdrop" onClick={onClose} />
        <div className="wizard-success__card">
          <button type="button" className="modal__fechar" aria-label="Fechar" onClick={onClose} style={{ position: 'absolute', top: 14, right: 14 }}>
            ✕
          </button>

          <div className="wizard-success__icon">
            <CheckCircle className="w-8 h-8" />
          </div>
          <p className="wizard-success__titulo">Agendamento reservado!</p>
          <p className="wizard-success__subtitulo">
            {booked.confirmed ? 'Seu horário está confirmado.' : 'A profissional vai confirmar seu horário em breve.'}
          </p>

          <div className="wizard__resumo">
            <div className="wizard__resumo-linha">
              <span className="wizard__resumo-k">{selected.length === 1 ? 'Procedimento' : 'Procedimentos'}</span>
              <span className="wizard__resumo-v">{selected.map((p) => p.title).join(' + ')}</span>
            </div>
            <div className="wizard__resumo-linha">
              <span className="wizard__resumo-k">Quando</span>
              <span className="wizard__resumo-v">
                {booked.dateLabel} às {booked.time}
              </span>
            </div>
            <div className="wizard__resumo-linha">
              <span className="wizard__resumo-k">Investimento</span>
              <span className="wizard__resumo-v">{bookingTotalLabel(selected)}</span>
            </div>
          </div>

          <div className="modal__acoes">
            <button type="button" className="modal__cta" onClick={onClose}>
              Ok, entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-detalhe" role="dialog" aria-modal="true" aria-label={`Agendar ${headline}`}>
      <div className="modal-detalhe__backdrop" onClick={onClose} />
      <div className="modal-detalhe__sheet">
        <div className="modal__foto-wrap">
          <ProcedureImage src={service.image_url} alt={service.title} className="modal__foto" variant="detail" clientName={professionalName} />
          <div className="modal__scrim" />
          <button type="button" className="modal__fechar" aria-label="Fechar" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal__corpo">
          <span className="modal__cat">Agendamento</span>
          <h3 className="modal__titulo">{headline}</h3>

          <div className="wizard__steps" aria-hidden="true">
            <div className={`wizard__step-dot ${step === 'datetime' ? 'is-active' : 'is-done'}`} />
            <div className={`wizard__step-dot ${step === 'contact' ? 'is-active' : ''}`} />
          </div>

          {step === 'datetime' && (
            <>
              <span className="wizard__label">{selected.length === 1 ? 'Seu serviço' : 'Seus serviços'}</span>
              <div className="wizard__servicos">
                {selected.map((p) => (
                  <div key={itemKey(p)} className="wizard__servico">
                    <div className="wizard__servico-info">
                      <span className="wizard__servico-nome">{p.title}</span>
                      <span className="wizard__servico-meta">
                        {durationToLabel(p.duration_minutes)} · {procedurePriceLabel(p)}
                      </span>
                    </div>
                    {selected.length > 1 && (
                      <button
                        type="button"
                        className="wizard__servico-remover"
                        aria-label={`Tirar ${p.title}`}
                        onClick={() => removeService(itemKey(p))}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {selected.length > 1 && (
                  <div className="wizard__servico-total">
                    <span>Total</span>
                    <span>
                      {durationToLabel(totalMinutes)} · {bookingTotalLabel(selected)}
                    </span>
                  </div>
                )}
              </div>

              {addable.length > 0 && selected.length < MAX_SERVICES && !pickerOpen && (
                <button type="button" className="wizard__adicionar" onClick={() => setPickerOpen(true)}>
                  <Plus className="w-4 h-4" /> Adicionar outro serviço
                </button>
              )}

              {pickerOpen && (
                <div className="wizard__picker">
                  <div className="wizard__picker-topo">
                    <span className="wizard__label" style={{ marginBottom: 0 }}>
                      Adicionar serviço
                    </span>
                    <button
                      type="button"
                      className="wizard__servico-remover"
                      aria-label="Fechar lista de serviços"
                      onClick={() => {
                        setPickerOpen(false);
                        setPickerVariationsFor(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {addable.map((p) => {
                    const variations = p.variations || [];
                    const showingVariations = pickerVariationsFor === p.id;
                    return (
                      <div key={p.id} className="wizard__picker-item">
                        <button
                          type="button"
                          className="wizard__picker-servico"
                          aria-expanded={variations.length > 0 ? showingVariations : undefined}
                          onClick={() =>
                            variations.length > 0
                              ? setPickerVariationsFor(showingVariations ? null : p.id)
                              : addService(p)
                          }
                        >
                          <span className="wizard__servico-nome">{p.title}</span>
                          <span className="wizard__servico-meta">
                            {variations.length > 0
                              ? `${variations.length} opções`
                              : `${durationToLabel(p.duration_minutes)} · ${procedurePriceLabel(p)}`}
                          </span>
                        </button>
                        {showingVariations && (
                          <div className="wizard__picker-opcoes">
                            {variations.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                className="wizard__picker-opcao"
                                onClick={() => addService(procedureWithVariation(p, v))}
                              >
                                <span>{v.name}</span>
                                <span className="wizard__servico-meta">
                                  {durationToLabel(v.duration_minutes)} · {procedurePriceLabel({ price: v.price })}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <span className="wizard__label">Escolha o dia</span>
              <div className="wizard__dias">
                {days.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    className={`wizard__dia-chip ${selectedDate === d.key ? 'is-ativo' : ''}`}
                    onClick={() => setSelectedDate(d.key)}
                  >
                    <span>{d.weekday}</span>
                    <strong>{d.day}</strong>
                    {d.month && <span className="wizard__dia-mes">{d.month}</span>}
                  </button>
                ))}
              </div>

              <span className="wizard__label">Horários disponíveis</span>
              {loadingSlots ? (
                <div className="wizard__vazio">Carregando horários...</div>
              ) : slotsError ? (
                <div className="wizard__vazio">{slotsError}</div>
              ) : noSchedulingYet ? (
                <div className="wizard__vazio">
                  <Sparkles className="w-6 h-6" />
                  A agenda online ainda não está aberta. Fale com a profissional pelo WhatsApp.
                </div>
              ) : slots.length === 0 ? (
                <div className="wizard__vazio">
                  <CalendarX className="w-6 h-6" />
                  Sem horários livres nesse dia.
                  <br />
                  Escolha outra data acima.
                </div>
              ) : (
                <div className="wizard__slots">
                  {slots.map((slot) => (
                    <button
                      key={slot.startsAt}
                      type="button"
                      className={`wizard__slot ${selectedSlot?.startsAt === slot.startsAt ? 'is-ativo' : ''}`}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setStep('contact');
                      }}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 'contact' && selectedSlot && (
            <>
              <button type="button" className="wizard__voltar" onClick={() => setStep('datetime')}>
                ← Trocar horário
              </button>

              <div className="wizard__resumo">
                <div className="wizard__resumo-linha">
                  <span className="wizard__resumo-k">{selected.length === 1 ? 'Serviço' : 'Serviços'}</span>
                  <span className="wizard__resumo-v">{selected.map((p) => p.title).join(' + ')}</span>
                </div>
                <div className="wizard__resumo-linha">
                  <span className="wizard__resumo-k">Horário escolhido</span>
                  <span className="wizard__resumo-v">
                    {formatDateLabel(selectedDate)} às {selectedSlot.time}
                  </span>
                </div>
              </div>

              <div className="wizard__campo">
                <span className="wizard__label">Seu nome</span>
                <input
                  type="text"
                  className="wizard__input"
                  placeholder="Nome completo"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="wizard__campo">
                <span className="wizard__label">Seu WhatsApp</span>
                <input
                  type="tel"
                  className="wizard__input"
                  placeholder="(11) 99999-9999"
                  value={clientWhatsapp}
                  onChange={(e) => setClientWhatsapp(formatPhoneBR(e.target.value))}
                  autoComplete="tel"
                />
              </div>

              {submitError && <p className="wizard__erro">{submitError}</p>}

              <div className="modal__acoes">
                <button
                  type="button"
                  className="modal__cta wizard__cta"
                  disabled={submitting || !clientName.trim() || clientWhatsapp.replace(/\D/g, '').length < 10}
                  onClick={handleSubmitContact}
                >
                  {submitting ? 'Confirmando...' : 'Confirmar agendamento'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
