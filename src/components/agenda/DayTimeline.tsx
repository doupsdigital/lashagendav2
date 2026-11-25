'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { AgendaAppointment } from '@/lib/scheduling/agenda-service';
import type { BusinessHoursConfigRow, ScheduleBlockConfigRow } from '@/lib/scheduling/config-service';
import { localDateTimeToUTC } from '@/lib/scheduling/availability';
import { CheckCircle2, XCircle } from 'lucide-react';
import { STATUS_LABEL } from './status-styles';
import { formatBRL } from '@/lib/service-format';

interface DayTimelineProps {
  dateStr: string;
  todayStr: string;
  /** Agendamentos do dia, incluindo os cancelados (listados à parte no fim,
   *  sem ocupar horário — F6.1). */
  appointments: AgendaAppointment[];
  businessHours: BusinessHoursConfigRow[];
  scheduleBlocks: ScheduleBlockConfigRow[];
  /** Horário livre tocado (F6.6): início e fim do trecho livre ("HH:MM"). */
  onSlotClick: (time: string, endTime: string) => void;
  /** Trancado tocado (F6.6): abre o detalhe com "destrancar". */
  onBlockClick: (block: ScheduleBlockConfigRow) => void;
  onAppointmentClick: (appointment: AgendaAppointment) => void;
  onApprove: (appointment: AgendaAppointment) => void;
}

const MIN_FREE_MINUTES = 30;

type Item =
  | { kind: 'appt'; start: number; appt: AgendaAppointment; end: number }
  | { kind: 'free'; start: number; end: number }
  | { kind: 'block'; start: number; label: string; block: ScheduleBlockConfigRow }
  | { kind: 'note'; title: string; hint: string };

function toMinutes(hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Minutos desde meia-noite de um instante, no fuso America/Sao_Paulo — não no
 *  fuso do navegador (mesmo cuidado do resto do agendamento). */
function saoPauloMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

const fmt = (minutes: number) => `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`;
}

/** Visão "Dia" da Agenda como linha do tempo vertical (lista ordenada por
 *  horário), em vez da grade proporcional de horas — no celular a grade fixa
 *  espremia os agendamentos curtos e ainda rolava por dentro da tela.
 *  Três tipos de bloco: agendamento (cartão), horário livre (tracejado, toca
 *  pra agendar) e trancado (listrado). Os "livres" são os intervalos contínuos
 *  do expediente que sobram depois de descontar agendamentos e bloqueios —
 *  um bloco por intervalo, não um por meia hora. Só usa os dados que a grade
 *  antiga já usava (agendamentos, expediente, bloqueios). */
export const DayTimeline: React.FC<DayTimelineProps> = ({
  dateStr,
  todayStr,
  appointments,
  businessHours,
  scheduleBlocks,
  onSlotClick,
  onBlockClick,
  onAppointmentClick,
  onApprove,
}) => {
  const isToday = dateStr === todayStr;
  const activeAppointments = useMemo(() => appointments.filter((a) => a.status !== 'canceled'), [appointments]);
  const canceledAppointments = useMemo(
    () => appointments.filter((a) => a.status === 'canceled').sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [appointments]
  );

  // "Agora" só depois de montar: calcular no render faria o HTML do servidor
  // divergir do cliente (minuto diferente) na visão de hoje.
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    if (!isToday) {
      setNowMin(null);
      return;
    }
    setNowMin(saoPauloMinutes(new Date()));
  }, [isToday, dateStr]);

  const items = useMemo<Item[]>(() => {
    const weekday = localDateTimeToUTC(dateStr, '00:00:00').getUTCDay();
    // Um dia pode ter várias faixas (F4.1, ex.: pausa de almoço no meio).
    const windows = businessHours
      .filter((h) => h.weekday === weekday)
      .map((h) => ({ start: toMinutes(h.start_time), end: toMinutes(h.end_time) }))
      .sort((a, b) => a.start - b.start);
    const window = windows.length > 0 ? windows[0] : null;

    const dayBlocks = scheduleBlocks.filter((b) => dateStr >= b.start_date && dateStr <= b.end_date);
    const allDayBlock = dayBlocks.find((b) => b.all_day);

    const apptItems = activeAppointments.map((appt) => {
      const start = saoPauloMinutes(new Date(appt.starts_at));
      return { kind: 'appt' as const, start, end: start + appt.duration_minutes, appt };
    });

    const partialBlocks = dayBlocks.filter((b) => !b.all_day && b.start_time && b.end_time);
    const blockItems: Item[] = partialBlocks.map((b) => ({
      kind: 'block',
      start: toMinutes(b.start_time as string),
      label: `${b.reason ? `Trancado — ${b.reason}` : 'Trancado'} · até ${fmt(toMinutes(b.end_time as string))}`,
      block: b,
    }));

    const result: Item[] = [...apptItems, ...blockItems];

    if (allDayBlock) {
      result.push({
        kind: 'block',
        start: window ? window.start : 0,
        label: allDayBlock.reason ? `Dia trancado — ${allDayBlock.reason}` : 'Dia trancado',
        block: allDayBlock,
      });
    } else if (window) {
      // Intervalos ocupados (agendamentos + bloqueios parciais) → sobra = livre.
      const busy = [
        ...apptItems.map((i) => ({ start: i.start, end: i.end })),
        ...partialBlocks.map((b) => ({ start: toMinutes(b.start_time as string), end: toMinutes(b.end_time as string) })),
      ].sort((a, b) => a.start - b.start);

      const minStart = nowMin !== null ? Math.ceil(nowMin / 30) * 30 : 0;
      const pushFree = (from: number, to: number) => {
        const start = Math.max(from, minStart);
        if (to - start >= MIN_FREE_MINUTES) result.push({ kind: 'free', start, end: to });
      };

      // Livre = cada faixa do dia menos o que está ocupado dentro dela.
      for (const w of windows) {
        let cursor = w.start;
        for (const b of busy) {
          if (b.end <= cursor || b.start >= w.end) continue;
          // `Math.min(..., w.end)`: agendamento/bloqueio depois do fim da
          // faixa não pode "abrir" um horário livre fora dela.
          if (b.start > cursor) pushFree(cursor, Math.min(b.start, w.end));
          cursor = Math.max(cursor, b.end);
        }
        if (w.end > cursor) pushFree(cursor, w.end);
      }
    }

    // Cartões antes de livres/trancados no mesmo horário.
    const order = { appt: 0, block: 1, free: 2, note: 3 } as const;
    result.sort((a, b) => {
      const sa = a.kind === 'note' ? 0 : a.start;
      const sb = b.kind === 'note' ? 0 : b.start;
      return sa - sb || order[a.kind] - order[b.kind];
    });

    if (result.length === 0) {
      if (!window) return [{ kind: 'note', title: 'Sem atendimento neste dia', hint: 'Esse dia não está nos seus horários de atendimento.' }];
      return [{ kind: 'note', title: 'Nada mais por hoje', hint: 'Não há horários livres nem agendamentos pra o resto do dia.' }];
    }
    return result;
  }, [dateStr, activeAppointments, businessHours, scheduleBlocks, nowMin]);

  // Horário em negrito: o próximo agendamento (hoje) ou o primeiro do dia.
  const highlightId = useMemo(() => {
    const appts = items.filter((i): i is Extract<Item, { kind: 'appt' }> => i.kind === 'appt');
    if (appts.length === 0) return null;
    if (nowMin !== null) return appts.find((i) => i.end > nowMin)?.appt.id ?? null;
    return appts[0].appt.id;
  }, [items, nowMin]);

  return (
    <div data-tour="agenda-day-grid" className="flex flex-col gap-2">
      {items.map((item, index) => {
        if (item.kind === 'note') {
          return (
            <div key={`note-${index}`} className="rounded-[14px] bg-surface border border-linen px-4 py-5 text-center">
              <p className="text-base font-semibold text-ink">{item.title}</p>
              <p className="text-sm text-ink-soft mt-1">{item.hint}</p>
            </div>
          );
        }

        const bold = item.kind === 'appt' && item.appt.id === highlightId;
        const label = (
          <div
            className={`w-[52px] shrink-0 pt-0.5 text-sm tabular-nums ${bold ? 'font-semibold text-ink' : 'text-ink-faint'}`}
          >
            {fmt(item.start)}
          </div>
        );

        if (item.kind === 'free') {
          const length = item.end - item.start;
          return (
            <div key={`free-${item.start}`} className="flex gap-2.5">
              {label}
              <button
                type="button"
                onClick={() => onSlotClick(fmt(item.start), fmt(item.end))}
                style={{ height: length >= 90 ? 72 : 48 }}
                className="flex-1 rounded-xl border-[1.5px] border-dashed border-linen flex items-center justify-center text-sm text-ink-faint hover:bg-rose-50/60 transition-colors"
              >
                + livre{length >= 60 ? ` · ${fmtDuration(length)}` : ''}
              </button>
            </div>
          );
        }

        if (item.kind === 'block') {
          return (
            <div key={`block-${index}`} className="flex gap-2.5">
              {label}
              <button
                type="button"
                onClick={() => onBlockClick(item.block)}
                className="flex-1 min-h-[52px] rounded-xl flex items-center px-3.5 text-sm text-ink-soft text-left"
                style={{ background: 'repeating-linear-gradient(135deg, rgba(44,24,16,0.07) 0 7px, rgba(44,24,16,0.03) 7px 14px)' }}
              >
                {item.label}
              </button>
            </div>
          );
        }

        const { appt } = item;
        const range = `${fmt(item.start)} – ${fmt(item.end)}`;

        if (appt.status === 'pending') {
          return (
            <div key={appt.id} className="flex gap-2.5">
              {label}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onAppointmentClick(appt)}
                onKeyDown={(e) => e.key === 'Enter' && onAppointmentClick(appt)}
                // `overflow-hidden` aqui não é só estético: sem ele, esse card
                // (que é item flexível na linha externa — horário + card — e
                // ao mesmo tempo container flexível dos próprios filhos) não
                // reduz de largura quando o texto é longo (ex.: nome de
                // serviço combinado tipo "Combo Lash + Sobrancelha VIP") —
                // ele estoura pra fora do padding direito e empurra o botão
                // "Aceitar" pra fora da tela, em vez de truncar com "...".
                // Bug real reportado no app (2026-09-23). O card de
                // confirmado/concluído/falta logo abaixo já tinha essa mesma
                // proteção — só faltava aqui.
                className="flex-1 min-h-[56px] rounded-[14px] overflow-hidden bg-surface border border-[#F3E6CE] border-l-4 border-l-[#D79A2B] px-3.5 py-2 flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-base font-semibold text-ink truncate">{appt.client_name}</p>
                  <p className="text-sm text-[#8A6410] truncate">a confirmar · {appt.service_title}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(appt);
                  }}
                  className="shrink-0 text-sm font-bold text-rose-600 py-1 pl-2"
                >
                  Aceitar
                </button>
              </div>
            </div>
          );
        }

        const tone =
          appt.status === 'completed'
            ? 'bg-blue-50 border-blue-200 border-l-blue-500'
            : appt.status === 'no_show'
              ? 'bg-red-50 border-red-200 border-l-red-500 opacity-70'
              : 'bg-surface border-linen border-l-rose-600';
        // Concluído com valor recebido (F6.5): mostra o que ela recebeu.
        const priceText =
          appt.status === 'completed' && appt.amount_received !== null ? `recebido ${formatBRL(appt.amount_received)}` : appt.price_snapshot;
        const meta = [range, priceText].filter(Boolean).join(' · ');
        return (
          <div key={appt.id} className="flex gap-2.5">
            {label}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onAppointmentClick(appt)}
              onKeyDown={(e) => e.key === 'Enter' && onAppointmentClick(appt)}
              className={`relative overflow-hidden flex-1 min-h-[88px] rounded-[14px] border border-l-4 ${tone} px-3.5 py-3 cursor-pointer`}
            >
              {/* Marca d'água grande e translúcida no meio (concluído/falta) —
               *  dá pra ver o status batendo o olho, atrás do texto (mesma
               *  ideia da grade antiga). */}
              {appt.status === 'completed' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <CheckCircle2 className="w-16 h-16 text-blue-600/20" />
                </div>
              )}
              {appt.status === 'no_show' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <XCircle className="w-16 h-16 text-red-600/20" />
                </div>
              )}
              <div className="relative">
                <p className="text-[17px] font-semibold text-ink">{appt.client_name}</p>
                <p className="text-[15px] text-ink-soft mt-0.5">{appt.service_title}</p>
                <p className="text-sm text-ink-faint mt-2">
                  {meta}
                  {(appt.status === 'completed' || appt.status === 'no_show') && ` · ${STATUS_LABEL[appt.status]}`}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {canceledAppointments.length > 0 && (
        <div className="mt-3">
          <p className="text-[13px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">
            {canceledAppointments.length === 1 ? 'Cancelado neste dia' : `Cancelados neste dia (${canceledAppointments.length})`}
          </p>
          <div className="flex flex-col gap-1.5">
            {canceledAppointments.map((appt) => {
              const start = saoPauloMinutes(new Date(appt.starts_at));
              return (
                <button
                  key={appt.id}
                  type="button"
                  onClick={() => onAppointmentClick(appt)}
                  className="flex items-center gap-2.5 rounded-xl bg-linen/40 px-3.5 py-2.5 text-left"
                >
                  <span className="w-[42px] shrink-0 text-sm tabular-nums text-ink-faint line-through">{fmt(start)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] text-ink-soft truncate">{appt.client_name}</span>
                    <span className="block text-[13px] text-ink-faint truncate">
                      {appt.service_title} · {appt.canceled_by === 'client' ? 'cancelado pela cliente' : 'cancelado por você'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
