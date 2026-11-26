// Testes do agendamento de demonstração da prévia (F11.1) — `node scripts/test-demo-booking.mjs`.
import { computeAvailableSlots } from '../src/lib/scheduling/availability.ts';
import { demoBusyForDate, demoDayContext, DEMO_RULES } from '../src/lib/scheduling/demo-booking.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}
const now = new Date('2026-11-26T12:00:00-03:00'); // quinta, meio-dia
const slots = (date, dur = 60) =>
  computeAvailableSlots({ dateStr: date, durationMinutes: dur, ...demoDayContext(date), minNoticeMinutes: DEMO_RULES.min_notice_minutes, bookingWindowDays: DEMO_RULES.booking_window_days, now }).map((s) => s.time);

const fri = slots('2026-11-27');
check('sexta tem horários', fri.length > 5, true);
check('sexta começa de manhã e termina até 18:00 (1h de serviço)', [fri[0] >= '09:00', fri[fri.length - 1] <= '18:00'], [true, true]);
check('não atravessa o almoço', fri.includes('11:30'), false);
check('domingo fechado', slots('2026-11-29'), []);
check('hoje respeita 2h de antecedência', slots('2026-11-26').every((t) => t >= '14:00'), true);
check('além de 30 dias: nada', slots('2027-01-05'), []);
check('mesmo dia, mesmos ocupados', JSON.stringify(demoBusyForDate('2026-11-27')) === JSON.stringify(demoBusyForDate('2026-11-27')), true);
const busy = demoBusyForDate('2026-11-27').map((b) => b.startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }));
check('ocupados ficam fora da lista', busy.every((t) => !fri.includes(t)), true);
check('dias diferentes podem mudar os ocupados', JSON.stringify(demoBusyForDate('2026-11-27')) !== JSON.stringify(demoBusyForDate('2026-11-28')), true);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
