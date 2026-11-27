// Testes do motor de disponibilidade (F4.3) — `node scripts/test-availability.mjs`.
// Roda o arquivo TypeScript de verdade (o Node 22 entende TS sem compilar),
// sem banco nem servidor. Sai com código 1 se algum caso falhar.
import { computeAvailableSlots, instantProblem, isInstantAvailable } from '../src/lib/scheduling/availability.ts';

// Quarta-feira 03/03/2027; "agora" fixo dois dias antes, ao meio-dia.
const DAY = '2027-03-03';
const WEEKDAY = 3;
const NOW = new Date('2027-03-01T12:00:00-03:00');

const lunchHours = [
  { weekday: WEEKDAY, start_time: '09:00', end_time: '12:00' },
  { weekday: WEEKDAY, start_time: '13:00', end_time: '18:00' },
];
const at = (hhmm, day = DAY) => new Date(`${day}T${hhmm}:00-03:00`);

function slots(overrides = {}) {
  return computeAvailableSlots({
    dateStr: DAY,
    durationMinutes: 60,
    businessHours: lunchHours,
    blocks: [],
    busyAppointments: [],
    minNoticeMinutes: 120,
    bookingWindowDays: 60,
    now: NOW,
    ...overrides,
  }).map((s) => s.time);
}

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected));
    console.log('     veio:    ', JSON.stringify(actual));
  }
}

// 1. Almoço: nada entre 12:00 e 13:00; serviço de 1h termina no máximo às 12:00 / 18:00.
check('almoço — 1h com pausa 12–13', slots(), [
  '09:00', '09:30', '10:00', '10:30', '11:00',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]);

// 2. Serviço que não cabe antes do almoço: 2h30 de manhã só cabe às 09:00 e 09:30.
check('serviço longo não atravessa o almoço', slots({ durationMinutes: 150 }), [
  '09:00', '09:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
]);

// 3. Serviço maior que a faixa da manhã inteira: só à tarde.
check('serviço maior que a manhã — só tarde', slots({ durationMinutes: 240 }), ['13:00', '13:30', '14:00']);

// 4. Bloqueio parcial 14:00–16:00.
check('bloqueio parcial 14–16', slots({
  blocks: [{ start_date: DAY, end_date: DAY, all_day: false, start_time: '14:00', end_time: '16:00' }],
}), ['09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '16:00', '16:30', '17:00']);

// 5. Bloqueio parcial de vários dias vale em cada dia do período.
check('bloqueio parcial de período (cobre o dia)', slots({
  blocks: [{ start_date: '2027-03-01', end_date: '2027-03-05', all_day: false, start_time: '09:00', end_time: '12:00' }],
}), ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']);

// 6. Dia de folga (bloqueio de dia inteiro, dentro de férias).
check('folga — dia inteiro', slots({
  blocks: [{ start_date: '2027-03-01', end_date: '2027-03-10', all_day: true, start_time: null, end_time: null }],
}), []);

// 7. Dia fechado (sem faixa nesse dia da semana).
check('dia sem atendimento', slots({ businessHours: [{ weekday: 1, start_time: '09:00', end_time: '18:00' }] }), []);

// 8. Agendamento existente 10:00–11:30 ocupa o horário.
check('agendamento existente', slots({ busyAppointments: [{ startsAt: at('10:00'), endsAt: at('11:30') }] }), [
  '09:00',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]);

// 9. Antecedência mínima: "agora" 08:45 do próprio dia + 2h → primeiro 11:00.
check('antecedência de 2h no mesmo dia', slots({ now: at('08:45') }), [
  '11:00',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]);

// 10. Antecedência de 3 dias (4320 min) a partir de 01/03 12:00 → nada no dia 03.
check('antecedência maior que a distância', slots({ minNoticeMinutes: 4320 }), []);

// 11. Janela: 1 dia à frente (01/03 → até 02/03) não alcança o dia 03.
check('fora da janela de agendamento', slots({ bookingWindowDays: 1 }), []);
check('no limite da janela (2 dias)', slots({ bookingWindowDays: 2 }).length, 14);

// 12. Data no passado.
check('data no passado', slots({ now: new Date('2027-03-04T09:00:00-03:00') }), []);

// 13. Faixa que começa em horário "quebrado" (13:15).
check('faixa começando 13:15', slots({
  businessHours: [{ weekday: WEEKDAY, start_time: '13:15', end_time: '15:15' }],
}), ['13:15', '13:45', '14:15']);

// 14. Agendamento manual (instante exato, sem antecedência nem janela).
const manual = (hhmm, duration = 60, extra = {}) =>
  isInstantAvailable({ startsAt: at(hhmm), durationMinutes: duration, dateStr: DAY, businessHours: lunchHours, blocks: [], busyAppointments: [], ...extra });
check('manual 11:00 de 1h cabe', manual('11:00'), true);
check('manual 11:30 de 1h atravessa o almoço', manual('11:30'), false);
check('manual 12:15 cai no almoço', manual('12:15'), false);
check('manual 14:15 com bloqueio 14–16', manual('14:15', 60, {
  blocks: [{ start_date: DAY, end_date: DAY, all_day: false, start_time: '14:00', end_time: '16:00' }],
}), false);
check('manual 17:00 de 1h termina 18:00', manual('17:00'), true);

// 15. Motivo do horário ocupado no agendamento manual (F6.4): choque nunca
// passa; fora do expediente/trancado a profissional pode encaixar.
const why = (hhmm, duration = 60, extra = {}) =>
  instantProblem({ startsAt: at(hhmm), durationMinutes: duration, dateStr: DAY, businessHours: lunchHours, blocks: [], busyAppointments: [], ...extra });
const busy10 = [{ startsAt: at('10:00'), endsAt: at('11:00') }];
check('motivo: livre', why('14:00'), null);
check('motivo: choque com agendamento', why('10:30', 60, { busyAppointments: busy10 }), 'conflict');
check('motivo: encostado no agendamento não é choque', why('11:00', 60, { busyAppointments: busy10 }), null);
check('motivo: almoço = fora do expediente', why('12:15'), 'outside_hours');
check('motivo: depois das 18h', why('18:30'), 'outside_hours');
check('motivo: dia sem expediente', why('10:00', 60, { businessHours: [] }), 'outside_hours');
check('motivo: bloqueio parcial', why('14:15', 60, {
  blocks: [{ start_date: DAY, end_date: DAY, all_day: false, start_time: '14:00', end_time: '16:00' }],
}), 'blocked');
check('motivo: dia trancado', why('10:00', 60, { blocks: [{ start_date: DAY, end_date: DAY, all_day: true, start_time: null, end_time: null }] }), 'blocked');
check('motivo: choque vence fora do expediente', why('18:30', 60, { busyAppointments: [{ startsAt: at('18:00'), endsAt: at('19:00') }] }), 'conflict');
check('motivo: duração inválida', why('10:00', 0), 'invalid');

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
