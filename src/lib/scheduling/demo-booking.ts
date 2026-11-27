/** Agendamento em modo demonstração na prévia (F11.1): a lead vê o fluxo da
 *  cliente inteiro (escolher horário, preencher, confirmar) sem nada ser
 *  gravado. A prévia não tem horários cadastrados, então a demonstração usa
 *  um expediente fixo e alguns horários "ocupados" para parecer uma agenda de
 *  verdade. Arquivo puro (sem imports) — o `scripts/test-demo-booking.mjs`
 *  roda direto no Node, junto com `computeAvailableSlots`.
 *
 *  Os formatos batem com os de `availability.ts` (BusinessHoursRow etc.). */

/** Segunda a sábado, 09:00–12:00 e 13:00–19:00. */
export const DEMO_BUSINESS_HOURS = [1, 2, 3, 4, 5, 6].flatMap((weekday) => [
  { weekday, start_time: '09:00:00', end_time: '12:00:00' },
  { weekday, start_time: '13:00:00', end_time: '19:00:00' },
]);

/** Regras da demonstração (as mesmas de um estúdio novo). */
export const DEMO_RULES = { min_notice_minutes: 120, booking_window_days: 30 };

/** Horários já "ocupados" no dia: 2 blocos de 1h30 que mudam de dia para dia
 *  (mesmo dia → mesmos horários, para a lista não mudar a cada clique). */
export function demoBusyForDate(dateStr: string): { startsAt: Date; endsAt: Date }[] {
  const seed = dateStr.split('').reduce((sum, ch) => sum + (ch >= '0' && ch <= '9' ? Number(ch) : 0), 0);
  const morning = 9 * 60 + (seed % 3) * 30; // 09:00, 09:30 ou 10:00
  const afternoon = 14 * 60 + (seed % 4) * 60; // 14:00 a 17:00
  const at = (min: number) => new Date(`${dateStr}T${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00-03:00`);
  return [morning, afternoon].map((m) => ({ startsAt: at(m), endsAt: at(m + 90) }));
}

/** Contexto do dia para o `computeAvailableSlots` (sem bloqueios). */
export function demoDayContext(dateStr: string) {
  return { businessHours: DEMO_BUSINESS_HOURS, blocks: [], busyAppointments: demoBusyForDate(dateStr) };
}
