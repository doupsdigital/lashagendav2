'use client';

import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import type { AgendaAppointment } from '@/lib/scheduling/agenda-service';

interface AppointmentRowProps {
  appointment: AgendaAppointment;
  onApprove: (appointment: AgendaAppointment) => void;
  onReject: (appointment: AgendaAppointment) => void;
}

/** Linha compacta de um agendamento pendente na fila "Aguardando
 *  confirmação" — mesma estrutura exata do LashAgenda: nome + dia/hora à
 *  esquerda, botões Aprovar/Recusar à direita, que abrem os modais de
 *  confirmação (não agem direto). */
export const AppointmentRow: React.FC<AppointmentRowProps> = ({ appointment, onApprove, onReject }) => {
  const dateLabel = new Date(appointment.starts_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' });
  const timeLabel = new Date(appointment.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  // A lista só abre no navegador (recolhida no HTML do servidor), então dá
  // para olhar o relógio aqui sem divergir na hidratação.
  const [isPast] = React.useState(() => new Date(appointment.starts_at).getTime() < Date.now());

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-amber-50/40 transition-colors">
      {/* Serviço visível também no celular (antes ficava só em telas largas). */}
      <div className="min-w-0">
        <p className="font-semibold text-base text-ink truncate">{appointment.client_name}</p>
        <p className="text-sm text-ink-soft mt-0.5">
          {dateLabel} às {timeLabel}
          {isPast && <span className="ml-1.5 text-[12px] font-bold text-amber-700">· já passou</span>}
        </p>
        <p className="text-[13px] text-ink-faint truncate">{appointment.service_title}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onApprove(appointment)}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-lg transition-colors"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Aprovar
        </button>
        <button
          type="button"
          onClick={() => onReject(appointment)}
          className="flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-[13px] font-semibold rounded-lg transition-colors"
        >
          <XCircle className="w-3.5 h-3.5" />
          Recusar
        </button>
      </div>
    </div>
  );
};
