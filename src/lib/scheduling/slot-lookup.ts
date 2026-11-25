import { supabaseAdmin } from '../supabase-admin';
import {
  computeAvailableSlots,
  instantProblem,
  isInstantAvailable,
  localDateTimeToUTC,
  AvailabilitySlot,
  BusinessHoursRow,
  ScheduleBlockRow,
  BusyInterval,
} from './availability';

/** Busca em paralelo horário de atendimento + bloqueios que cobrem `dateStr`
 *  + agendamentos existentes numa janela de +-1 dia — usada tanto por
 *  `getAvailableSlotsForDate` quanto por `isSlotAvailableForBooking`. */
async function fetchDayContext(
  studioId: string,
  dateStr: string
): Promise<{ businessHours: BusinessHoursRow[]; blocks: ScheduleBlockRow[]; busyAppointments: BusyInterval[] }> {
  const [{ data: businessHours }, { data: blocks }] = await Promise.all([
    supabaseAdmin.from('business_hours').select('weekday, start_time, end_time').eq('studio_id', studioId),
    supabaseAdmin
      .from('schedule_blocks')
      .select('start_date, end_date, all_day, start_time, end_time')
      .eq('studio_id', studioId)
      .lte('start_date', dateStr)
      .gte('end_date', dateStr),
  ]);

  const windowStart = localDateTimeToUTC(dateStr, '00:00:00');
  const windowStartMinus1 = new Date(windowStart.getTime() - 24 * 60 * 60000);
  const windowEndPlus1 = new Date(windowStart.getTime() + 2 * 24 * 60 * 60000);

  const { data: appointments } = await supabaseAdmin
    .from('appointments')
    .select('starts_at, ends_at')
    .eq('studio_id', studioId)
    .neq('status', 'canceled')
    .neq('origin', 'record')
    .gte('starts_at', windowStartMinus1.toISOString())
    .lte('starts_at', windowEndPlus1.toISOString());

  return {
    businessHours: (businessHours || []) as BusinessHoursRow[],
    blocks: (blocks || []) as ScheduleBlockRow[],
    busyAppointments: (appointments || []).map((a) => ({
      startsAt: new Date(a.starts_at as string),
      endsAt: new Date(a.ends_at as string),
    })),
  };
}

/** Regras do estúdio que o agendamento da cliente respeita. */
export interface StudioBookingRules {
  min_notice_minutes: number;
  booking_window_days: number;
}

/** Busca faixas de atendimento + bloqueios + agendamentos existentes no
 *  banco e calcula os horários livres de uma data para a cliente — fonte
 *  única da rota pública de disponibilidade e da revalidação antes de gravar
 *  o agendamento (as duas têm de dar o mesmo resultado). */
export async function getAvailableSlotsForDate(
  studioId: string,
  dateStr: string,
  durationMinutes: number,
  rules: StudioBookingRules
): Promise<AvailabilitySlot[]> {
  const ctx = await fetchDayContext(studioId, dateStr);
  return computeAvailableSlots({
    dateStr,
    durationMinutes,
    ...ctx,
    minNoticeMinutes: rules.min_notice_minutes,
    bookingWindowDays: rules.booking_window_days,
  });
}

/** Confere se um instante exato (não precisa estar na grade de 30min) está
 *  livre — usada pelo agendamento manual da profissional, que digita
 *  qualquer horário em vez de escolher de uma lista. */
export async function isSlotAvailableForBooking(
  studioId: string,
  startsAt: Date,
  dateStr: string,
  durationMinutes: number
): Promise<boolean> {
  const ctx = await fetchDayContext(studioId, dateStr);
  return isInstantAvailable({ startsAt, dateStr, durationMinutes, ...ctx });
}

/** Como `isSlotAvailableForBooking`, mas diz o motivo (F6.4): `conflict`
 *  (outro agendamento), `blocked`, `outside_hours`, `invalid` ou `null`. */
export async function getInstantProblem(
  studioId: string,
  startsAt: Date,
  dateStr: string,
  durationMinutes: number
): Promise<ReturnType<typeof instantProblem>> {
  const ctx = await fetchDayContext(studioId, dateStr);
  return instantProblem({ startsAt, dateStr, durationMinutes, ...ctx });
}
