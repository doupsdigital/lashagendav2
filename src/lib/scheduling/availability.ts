/**
 * Motor de disponibilidade do agendamento (F4.3). Função pura: recebe os
 * dados já carregados do banco (faixas de atendimento, bloqueios,
 * agendamentos existentes, regras do estúdio) e devolve os horários livres
 * para uma data + duração de serviço.
 *
 * Regras:
 * - um dia pode ter várias faixas (ex.: 09:00–12:00 e 13:00–18:00); o
 *   serviço tem de caber INTEIRO dentro de uma faixa — não atravessa a pausa;
 * - bloqueio de dia inteiro fecha o dia; bloqueio com horário vale naquela
 *   faixa em cada dia do período;
 * - agendamentos existentes (menos cancelados e registros) ocupam o horário;
 * - antecedência mínima (`min_notice_minutes`) a partir de agora e janela
 *   máxima (`booking_window_days`) contada a partir de hoje.
 *
 * Fuso horário: fixo em America/Sao_Paulo (UTC-3, sem horário de verão
 * desde 2019) — o público inteiro é BR.
 *
 * Sem imports de propósito: `scripts/test-availability.mjs` roda este
 * arquivo direto no Node (que entende TypeScript sem compilar).
 */

const TIMEZONE_OFFSET = '-03:00';
const SLOT_STEP_MINUTES = 30;

export interface BusinessHoursRow {
  weekday: number;
  start_time: string; // "HH:MM:SS" ou "HH:MM"
  end_time: string;
}

export interface ScheduleBlockRow {
  start_date: string; // "YYYY-MM-DD"
  end_date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
}

export interface BusyInterval {
  startsAt: Date;
  endsAt: Date;
}

export interface AvailabilitySlot {
  /** Horário local pra exibir, ex. "14:00". */
  time: string;
  /** Instante absoluto de início, ISO 8601 (UTC). */
  startsAt: string;
  /** Instante absoluto de fim, ISO 8601 (UTC). */
  endsAt: string;
}

function normalizeTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}

/** Converte uma data+hora "de parede" no fuso do catálogo pra um Date (UTC). */
export function localDateTimeToUTC(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${normalizeTime(timeStr)}${TIMEZONE_OFFSET}`);
}

/** Dia da semana (0=domingo..6=sábado) de uma data "YYYY-MM-DD", calculado
 *  no fuso do catálogo — não no fuso do servidor (Vercel roda em UTC). */
export function getWeekdayForDate(dateStr: string): number {
  return localDateTimeToUTC(dateStr, '00:00:00').getUTCDay();
}

/** Data "YYYY-MM-DD" de um instante, no fuso do catálogo. */
export function toLocalDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/** Soma dias a uma data "YYYY-MM-DD". */
export function addDaysToDateKey(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Faixas de atendimento do dia, em ordem, já como instantes. */
function dayWindows(dateStr: string, businessHours: BusinessHoursRow[]): BusyInterval[] {
  const weekday = getWeekdayForDate(dateStr);
  return businessHours
    .filter((h) => h.weekday === weekday)
    .map((h) => ({ startsAt: localDateTimeToUTC(dateStr, h.start_time), endsAt: localDateTimeToUTC(dateStr, h.end_time) }))
    .filter((w) => w.endsAt > w.startsAt)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Tudo que ocupa o dia: agendamentos + bloqueios com horário. `null` se um
 *  bloqueio de dia inteiro fecha o dia. */
function dayBusyIntervals(dateStr: string, blocks: ScheduleBlockRow[], busyAppointments: BusyInterval[]): BusyInterval[] | null {
  const dayBlocks = blocks.filter((b) => dateStr >= b.start_date && dateStr <= b.end_date);
  if (dayBlocks.some((b) => b.all_day)) return null;
  const partial = dayBlocks
    .filter((b) => b.start_time && b.end_time)
    .map((b) => ({
      startsAt: localDateTimeToUTC(dateStr, b.start_time as string),
      endsAt: localDateTimeToUTC(dateStr, b.end_time as string),
    }));
  return [...busyAppointments, ...partial];
}

/** A data está dentro da janela de agendamento (hoje até hoje + N dias)? */
export function isDateWithinBookingWindow(dateStr: string, bookingWindowDays: number, now: Date = new Date()): boolean {
  const today = toLocalDateKey(now);
  return dateStr >= today && dateStr <= addDaysToDateKey(today, Math.max(0, bookingWindowDays));
}

export interface ComputeAvailableSlotsParams {
  /** Data alvo, "YYYY-MM-DD" no fuso do catálogo. */
  dateStr: string;
  durationMinutes: number;
  businessHours: BusinessHoursRow[];
  blocks: ScheduleBlockRow[];
  /** Agendamentos já existentes (sem cancelados/registros) perto dessa data. */
  busyAppointments: BusyInterval[];
  /** Antecedência mínima a partir de agora (`studios.min_notice_minutes`). */
  minNoticeMinutes: number;
  /** Até quantos dias à frente a cliente pode agendar (`studios.booking_window_days`).
   *  `null` = sem limite (uso interno). */
  bookingWindowDays: number | null;
  /** Injetável pra teste; default `new Date()`. */
  now?: Date;
}

/** Horários livres de uma data: candidatos a cada 30 min a partir do início
 *  de cada faixa, só onde o serviço inteiro cabe na faixa, sem choque com
 *  agendamento/bloqueio e respeitando antecedência e janela. */
export function computeAvailableSlots(params: ComputeAvailableSlotsParams): AvailabilitySlot[] {
  const { dateStr, durationMinutes, businessHours, blocks, busyAppointments, minNoticeMinutes, bookingWindowDays } = params;
  const now = params.now ?? new Date();

  if (!durationMinutes || durationMinutes <= 0) return [];
  if (bookingWindowDays !== null && !isDateWithinBookingWindow(dateStr, bookingWindowDays, now)) return [];

  const windows = dayWindows(dateStr, businessHours);
  if (windows.length === 0) return []; // fechado nesse dia da semana

  const busy = dayBusyIntervals(dateStr, blocks, busyAppointments);
  if (busy === null) return []; // folga de dia inteiro

  const earliestAllowed = addMinutes(now, Math.max(0, minNoticeMinutes));
  const slots: AvailabilitySlot[] = [];

  for (const w of windows) {
    for (let cursor = w.startsAt; addMinutes(cursor, durationMinutes) <= w.endsAt; cursor = addMinutes(cursor, SLOT_STEP_MINUTES)) {
      const slotEnd = addMinutes(cursor, durationMinutes);
      if (cursor < earliestAllowed) continue;
      if (busy.some((b) => intervalsOverlap(cursor, slotEnd, b.startsAt, b.endsAt))) continue;
      slots.push({
        time: cursor.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
        startsAt: cursor.toISOString(),
        endsAt: slotEnd.toISOString(),
      });
    }
  }

  return slots;
}

export interface IsInstantAvailableParams {
  /** Instante exato pretendido (não precisa estar na grade de 30min). */
  startsAt: Date;
  durationMinutes: number;
  /** Data local (fuso do catálogo) correspondente a `startsAt`. */
  dateStr: string;
  businessHours: BusinessHoursRow[];
  blocks: ScheduleBlockRow[];
  busyAppointments: BusyInterval[];
}

/** Mesmas regras de faixa/bloqueio/choque de `computeAvailableSlots`, para
 *  um instante exato — usado pelo agendamento manual da profissional, que
 *  pode digitar qualquer horário (ex.: 14:15). Sem antecedência nem janela:
 *  ela pode estar com a cliente na frente agora mesmo. */
export function isInstantAvailable(params: IsInstantAvailableParams): boolean {
  const { startsAt, durationMinutes, dateStr, businessHours, blocks, busyAppointments } = params;
  if (!durationMinutes || durationMinutes <= 0) return false;

  const endsAt = addMinutes(startsAt, durationMinutes);
  const windows = dayWindows(dateStr, businessHours);
  if (!windows.some((w) => startsAt >= w.startsAt && endsAt <= w.endsAt)) return false;

  const busy = dayBusyIntervals(dateStr, blocks, busyAppointments);
  if (busy === null) return false;
  return !busy.some((b) => intervalsOverlap(startsAt, endsAt, b.startsAt, b.endsAt));
}
