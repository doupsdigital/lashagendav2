'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { UserRound, X, Check, MessageCircle, CheckCircle2, XCircle, CalendarClock, Undo2, AlertTriangle, ClipboardList, ChevronRight } from 'lucide-react';
import type { SheetHighlight } from '@/lib/clients/client-sheet-service';
import type { AgendaAppointment } from '@/lib/scheduling/agenda-service';
import { durationToLabel, formatBRL, PRICE_ON_REQUEST_LABEL } from '@/lib/service-format';
import { formatPhoneBR } from '@/lib/format';
import { amountToInput } from '@/lib/scheduling/appointment-actions';

/** Resultado de remarcar, devolvido por quem chama (AgendaClient faz o pedido). */
export type RescheduleResult = { ok: true } | { ok: false; needsConfirm?: string; message?: string };

interface AppointmentDetailSheetProps {
  appointment: AgendaAppointment;
  /** Perfil da cliente (F7.5). */
  clientHref: string;
  /** Ficha da cliente (F8.4): resumo e pontos de atenção; null se vazia. */
  sheetHref: string;
  sheet: SheetHighlight | null;
  busy: boolean;
  onClose: () => void;
  /** Pendente → abre o modal de aprovar/recusar (não age direto). */
  onApprove: (appointment: AgendaAppointment) => void;
  onReject: (appointment: AgendaAppointment) => void;
  /** Confirmado → abre o modal de cancelar (motivo + aviso no WhatsApp). */
  onCancelConfirmed: (appointment: AgendaAppointment) => void;
  /** Concluir com o valor recebido (texto do campo; vazio = total). */
  onComplete: (appointment: AgendaAppointment, amountText: string) => void;
  onNoShow: (appointment: AgendaAppointment) => void;
  /** Desfazer concluído/falta → volta a confirmado. */
  onUndo: (appointment: AgendaAppointment) => void;
  /** Remarcar para `date` + `time` (fuso de São Paulo). `notify` abre o WhatsApp. */
  onReschedule: (
    appointment: AgendaAppointment,
    date: string,
    time: string,
    options: { allowOutside: boolean; notify: boolean }
  ) => Promise<RescheduleResult>;
}

const STATUS_LABEL: Record<AgendaAppointment['status'], string> = {
  pending: 'Aguardando',
  confirmed: 'Confirmado',
  canceled: 'Cancelado',
  completed: 'Concluído',
  no_show: 'Não compareceu',
};

const STATUS_BADGE: Record<AgendaAppointment['status'], string> = {
  pending: 'bg-amber-200 text-amber-900',
  confirmed: 'bg-green-200 text-green-900',
  canceled: 'bg-gray-200 text-gray-600',
  completed: 'bg-blue-200 text-blue-950',
  no_show: 'bg-red-200 text-red-900',
};

/** Painel de detalhe (bottom sheet) aberto ao clicar num agendamento na
 *  grade de horário da Agenda. */
export const AppointmentDetailSheet: React.FC<AppointmentDetailSheetProps> = ({
  appointment,
  clientHref,
  sheetHref,
  sheet,
  busy,
  onClose,
  onApprove,
  onReject,
  onCancelConfirmed,
  onComplete,
  onNoShow,
  onUndo,
  onReschedule,
}) => {
  // Painéis do próprio detalhe (F6.5): valor recebido ao concluir e remarcar.
  const [panel, setPanel] = useState<'none' | 'complete' | 'reschedule'>('none');
  const [amountText, setAmountText] = useState(() => amountToInput(appointment.total_price));
  const currentDate = new Date(appointment.starts_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const currentTime = new Date(appointment.starts_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
  const [newDate, setNewDate] = useState(currentDate);
  const [newTime, setNewTime] = useState(currentTime);
  const [rescheduleConfirm, setRescheduleConfirm] = useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const hasWhatsapp = Boolean(appointment.client_whatsapp);

  const submitReschedule = async (allowOutside: boolean, notify: boolean) => {
    setRescheduleError(null);
    if (!newDate || !newTime) {
      setRescheduleError('Escolha o novo dia e horário.');
      return;
    }
    if (newDate === currentDate && newTime === currentTime) {
      setRescheduleError('Esse já é o horário do agendamento.');
      return;
    }
    setRescheduling(true);
    try {
      const result = await onReschedule(appointment, newDate, newTime, { allowOutside, notify });
      if (!result.ok) {
        if (result.needsConfirm) setRescheduleConfirm(result.needsConfirm);
        else setRescheduleError(result.message || 'Não foi possível remarcar.');
      }
    } finally {
      setRescheduling(false);
    }
  };
  const time = new Date(appointment.starts_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
  const dateLabel = new Date(appointment.starts_at).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  });
  const endTime = new Date(appointment.ends_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
  const canceledAtLabel = appointment.canceled_at
    ? new Date(appointment.canceled_at).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }).replace(',', ' às')
    : '';
  const whatsappHref = appointment.client_whatsapp ? `https://wa.me/${appointment.client_whatsapp}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface rounded-t-3xl p-6 pb-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-linen text-ink-soft flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <span className={`inline-block px-2.5 py-1 rounded-full text-[13px] font-bold uppercase tracking-wide mb-3 ${STATUS_BADGE[appointment.status]}`}>
          {STATUS_LABEL[appointment.status]}
        </span>

        <h3 className="font-serif-pro text-xl font-bold text-ink mb-1">{appointment.client_name}</h3>
        <p className="text-[15px] text-ink-soft">
          <span className="capitalize">{dateLabel}</span> · {time} às {endTime}
        </p>
        <p className="text-[13px] text-ink-faint mb-4">
          {appointment.origin === 'catalog' ? 'Agendado pela cliente no catálogo' : 'Agendado por você'}
        </p>

        {/* Serviços (F6.1): cada um com duração e preço do momento em que foi marcado. */}
        <div className="rounded-xl bg-cream px-4 py-2 mb-3">
          {(appointment.items.length > 0 ? appointment.items : [{ title: appointment.service_title, duration_minutes: appointment.duration_minutes, price: null }]).map(
            (item, idx) => (
              <div key={idx} className="flex items-baseline justify-between gap-3 py-2 border-b border-linen last:border-b-0">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-ink">{item.title}</p>
                  <p className="text-[13px] text-ink-faint">{durationToLabel(item.duration_minutes)}</p>
                </div>
                <p className="text-[15px] text-ink-soft shrink-0">{item.price === null ? PRICE_ON_REQUEST_LABEL : formatBRL(item.price)}</p>
              </div>
            )
          )}
          {appointment.items.length > 1 && (
            <div className="flex items-baseline justify-between gap-3 py-2 border-t border-linen">
              <p className="text-[13px] font-bold uppercase tracking-wider text-ink-soft">Total · {durationToLabel(appointment.duration_minutes)}</p>
              <p className="text-[15px] font-bold text-ink shrink-0">{appointment.price_snapshot || PRICE_ON_REQUEST_LABEL}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mb-5">
          {/* Fora das gravações do analytics: é dado da ficha. Só o número de
              pontos de atenção de saúde, nunca o texto. */}
          <Link
            href={sheetHref}
            className="ph-no-capture rounded-xl border border-linen bg-surface px-3.5 py-2.5 flex items-center gap-3 active:bg-cream"
          >
            <ClipboardList className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{sheet?.summary || 'Ficha técnica ainda não preenchida'}</span>
              {sheet && sheet.healthAlerts > 0 && (
                <span className="flex items-center gap-1 text-sm font-semibold text-amber-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> Saúde: {sheet.healthAlerts}{' '}
                  {sheet.healthAlerts === 1 ? 'ponto de atenção' : 'pontos de atenção'} — ver ficha
                </span>
              )}
            </span>
            <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" />
          </Link>
          {appointment.client_notes && (
            <p className="text-sm text-ink-soft rounded-xl border border-linen px-3.5 py-2.5">
              <span className="font-semibold text-ink">Recado da cliente:</span> {appointment.client_notes}
            </p>
          )}
          {appointment.notes && (
            <p className="text-sm text-ink-soft rounded-xl border border-linen px-3.5 py-2.5">
              <span className="font-semibold text-ink">Sua anotação:</span> {appointment.notes}
            </p>
          )}
          {appointment.status === 'canceled' && (
            <p className="text-sm text-ink-soft rounded-xl bg-linen/50 px-3.5 py-2.5">
              {appointment.canceled_by === 'client' ? 'Cancelado pela cliente' : 'Cancelado por você'}
              {canceledAtLabel ? ` em ${canceledAtLabel}` : ''}.
              {appointment.cancel_reason ? ` Motivo: ${appointment.cancel_reason}` : ''}
            </p>
          )}
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 rounded-xl border border-linen bg-surface text-ink text-[15px] font-bold flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp · {formatPhoneBR(appointment.client_whatsapp.replace(/^55/, ''))}
            </a>
          )}
          <Link
            href={clientHref}
            className="h-11 rounded-xl border border-linen bg-surface text-ink text-[15px] font-bold flex items-center justify-center gap-2"
          >
            <UserRound className="w-4 h-4 text-ink-soft" /> Ver cliente
          </Link>
        </div>

        {appointment.status === 'pending' && panel === 'none' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onApprove(appointment)}
                className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-[15px] font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Aprovar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onReject(appointment)}
                className="flex-1 h-11 rounded-xl border border-red-300 text-red-600 text-[15px] font-bold disabled:opacity-50"
              >
                Recusar
              </button>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPanel('reschedule')}
              className="w-full h-10 rounded-xl border border-linen text-ink-soft text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <CalendarClock className="w-4 h-4" /> Remarcar
            </button>
          </div>
        )}

        {appointment.status === 'confirmed' && panel === 'none' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setPanel('complete')}
                className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-[15px] font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Concluir
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onNoShow(appointment)}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-[15px] font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" /> Marcar falta
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setPanel('reschedule')}
                className="flex-1 h-10 rounded-xl border border-linen text-ink-soft text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CalendarClock className="w-4 h-4" /> Remarcar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onCancelConfirmed(appointment)}
                className="flex-1 h-10 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-bold disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Concluído / falta: valor recebido e como corrigir um engano. */}
        {(appointment.status === 'completed' || appointment.status === 'no_show') && panel === 'none' && (
          <div className="flex flex-col gap-2">
            {appointment.status === 'completed' && (
              <p className="text-[15px] text-ink rounded-xl bg-blue-50 border border-blue-100 px-3.5 py-2.5">
                Valor recebido: <b>{appointment.amount_received === null ? 'não informado' : formatBRL(appointment.amount_received)}</b>
                {appointment.amount_received !== null &&
                  appointment.total_price !== null &&
                  appointment.amount_received !== appointment.total_price && (
                    <span className="text-[13px] text-ink-soft"> (serviços: {formatBRL(appointment.total_price)})</span>
                  )}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => (appointment.status === 'completed' ? onNoShow(appointment) : setPanel('complete'))}
                className="flex-1 h-10 rounded-xl border border-linen text-ink-soft text-sm font-bold disabled:opacity-50"
              >
                {appointment.status === 'completed' ? 'Era falta' : 'Ela veio (concluir)'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onUndo(appointment)}
                className="flex-1 h-10 rounded-xl border border-linen text-ink-soft text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Undo2 className="w-4 h-4" /> Desfazer
              </button>
            </div>
          </div>
        )}

        {panel === 'complete' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onComplete(appointment, amountText);
            }}
            className="flex flex-col gap-2 rounded-xl border border-linen p-3.5"
          >
            <label className="text-[13px] font-bold uppercase tracking-wider text-ink-soft" htmlFor="valor-recebido">
              Valor recebido
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[15px] text-ink-soft">R$</span>
              <input
                id="valor-recebido"
                inputMode="decimal"
                autoFocus
                value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/[^\d.,]/g, ''))}
                placeholder="0"
                className="flex-1 h-11 rounded-xl bg-surface border border-linen px-3 text-base text-ink"
              />
            </div>
            <p className="text-[13px] text-ink-faint">
              {appointment.total_price !== null
                ? `Total dos serviços: ${formatBRL(appointment.total_price)}. Mude se deu desconto ou combinou outro valor.`
                : 'Serviço sob consulta: informe quanto ela pagou (ou deixe vazio).'}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPanel('none')} disabled={busy} className="flex-1 h-11 rounded-xl bg-linen text-ink-soft text-[15px] font-bold">
                Voltar
              </button>
              <button type="submit" disabled={busy} className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-[15px] font-bold disabled:opacity-50">
                {busy ? 'Salvando...' : 'Concluir'}
              </button>
            </div>
          </form>
        )}

        {panel === 'reschedule' && (
          <div className="flex flex-col gap-2 rounded-xl border border-linen p-3.5">
            <p className="text-[13px] font-bold uppercase tracking-wider text-ink-soft">Remarcar para</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  setRescheduleConfirm(null);
                  setRescheduleError(null);
                }}
                className="flex-1 h-11 rounded-xl bg-surface border border-linen px-3 text-[15px] text-ink"
              />
              <input
                type="time"
                value={newTime}
                onChange={(e) => {
                  setNewTime(e.target.value);
                  setRescheduleConfirm(null);
                  setRescheduleError(null);
                }}
                className="w-28 h-11 rounded-xl bg-surface border border-linen px-3 text-[15px] text-ink"
              />
            </div>
            <p className="text-[13px] text-ink-faint">Mesmos serviços ({durationToLabel(appointment.duration_minutes)}). O link da cliente continua o mesmo.</p>

            {rescheduleConfirm ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex flex-col gap-2">
                <p className="text-[15px] text-amber-900 flex gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                  <span>{rescheduleConfirm} Quer encaixar mesmo assim?</span>
                </p>
                <div className="flex flex-col gap-2">
                  {hasWhatsapp && (
                    <button
                      type="button"
                      disabled={rescheduling}
                      onClick={() => submitReschedule(true, true)}
                      className="h-10 rounded-xl bg-amber-600 text-white text-sm font-bold disabled:opacity-60"
                    >
                      Encaixar e avisar no WhatsApp
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={rescheduling}
                    onClick={() => submitReschedule(true, false)}
                    className="h-10 rounded-xl border border-amber-300 text-amber-900 text-sm font-bold disabled:opacity-60"
                  >
                    {hasWhatsapp ? 'Encaixar sem avisar' : 'Encaixar mesmo assim'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {hasWhatsapp && (
                  <button
                    type="button"
                    disabled={rescheduling}
                    onClick={() => submitReschedule(false, true)}
                    className="h-11 rounded-xl bg-rose-600 text-white text-[15px] font-bold disabled:opacity-50"
                  >
                    {rescheduling ? 'Remarcando...' : 'Remarcar e avisar no WhatsApp'}
                  </button>
                )}
                <button
                  type="button"
                  disabled={rescheduling}
                  onClick={() => submitReschedule(false, false)}
                  className={`h-11 rounded-xl text-[15px] font-bold disabled:opacity-50 ${hasWhatsapp ? 'border border-linen text-ink-soft' : 'bg-rose-600 text-white'}`}
                >
                  {rescheduling ? 'Remarcando...' : hasWhatsapp ? 'Remarcar sem avisar' : 'Remarcar'}
                </button>
              </div>
            )}
            {rescheduleError && <p className="text-sm text-rose-600">{rescheduleError}</p>}
            <button
              type="button"
              onClick={() => {
                setPanel('none');
                setRescheduleConfirm(null);
                setRescheduleError(null);
              }}
              className="h-10 text-sm font-bold text-ink-faint"
            >
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
