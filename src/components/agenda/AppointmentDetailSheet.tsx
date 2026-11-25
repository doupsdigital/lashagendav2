'use client';

import React from 'react';
import { X, Check, MessageCircle, CheckCircle2, XCircle } from 'lucide-react';
import type { AgendaAppointment } from '@/lib/scheduling/agenda-service';
import { durationToLabel, formatBRL, PRICE_ON_REQUEST_LABEL } from '@/lib/service-format';
import { formatPhoneBR } from '@/lib/format';

interface AppointmentDetailSheetProps {
  appointment: AgendaAppointment;
  busy: boolean;
  onClose: () => void;
  /** Pendente → abre o modal de aprovar/recusar (não age direto). */
  onApprove: (appointment: AgendaAppointment) => void;
  onReject: (appointment: AgendaAppointment) => void;
  /** Já confirmado → cancelamento direto, sem o fluxo de aprovação. */
  onCancelConfirmed: (appointment: AgendaAppointment) => void;
  /** Marca como concluído/falta — só faz sentido pra um agendamento já
   *  confirmado (controle pós-atendimento). */
  onComplete: (appointment: AgendaAppointment) => void;
  onNoShow: (appointment: AgendaAppointment) => void;
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
  busy,
  onClose,
  onApprove,
  onReject,
  onCancelConfirmed,
  onComplete,
  onNoShow,
}) => {
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
        </div>

        {appointment.status === 'pending' && (
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
        )}

        {appointment.status === 'confirmed' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onComplete(appointment)}
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
            <button
              type="button"
              disabled={busy}
              onClick={() => onCancelConfirmed(appointment)}
              className="w-full h-10 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-bold disabled:opacity-50 transition-colors"
            >
              Cancelar agendamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
