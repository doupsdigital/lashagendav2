// Testes do link único da cliente (F5.4) — `node scripts/test-client-appointment.mjs`.
// Prazo para cancelar e arquivo de agenda (.ics), sem banco nem servidor.
import { buildIcsEvent, clientCancelState, isValidManageToken } from '../src/lib/scheduling/client-appointment.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

const now = new Date('2027-03-01T12:00:00-03:00');
const at = (iso) => new Date(iso);
const state = (status, startsIso, hours = 24) => {
  const s = clientCancelState(status, at(startsIso), hours, now);
  return s.canCancel ? 'pode' : s.reason;
};

check('confirmado em 2 dias, prazo 24h', state('confirmed', '2027-03-03T12:00:00-03:00'), 'pode');
check('aguardando em 2 dias', state('pending', '2027-03-03T12:00:00-03:00'), 'pode');
check('exatamente no limite (24h antes)', state('confirmed', '2027-03-02T12:00:00-03:00'), 'pode');
check('1 minuto depois do limite', state('confirmed', '2027-03-02T11:59:00-03:00'), 'too_late');
check('daqui a 3h com prazo 24h', state('confirmed', '2027-03-01T15:00:00-03:00'), 'too_late');
check('daqui a 3h com prazo 0h', state('confirmed', '2027-03-01T15:00:00-03:00', 0), 'pode');
check('horário já passou', state('confirmed', '2027-03-01T11:00:00-03:00'), 'past');
check('já cancelado', state('canceled', '2027-03-03T12:00:00-03:00'), 'already_canceled');
check('concluído', state('completed', '2027-02-20T12:00:00-03:00'), 'finished');
check('falta', state('no_show', '2027-02-20T12:00:00-03:00'), 'finished');
const s = clientCancelState('confirmed', at('2027-03-03T12:00:00-03:00'), 24, now);
check('prazo calculado', s.deadline.toISOString(), '2027-03-02T15:00:00.000Z');

check('token válido', isValidManageToken('0123456789abcdef0123456789abcdef'), true);
check('token curto', isValidManageToken('0123'), false);
check('token com maiúscula/símbolo', isValidManageToken('0123456789ABCDEF0123456789abcde;'), false);

const ics = buildIcsEvent({
  uid: 'abc',
  startsAt: at('2027-03-03T14:00:00-03:00'),
  endsAt: at('2027-03-03T15:30:00-03:00'),
  title: 'Volume Russo, Manutenção; teste',
  location: 'Rua A, 10',
  now,
});
check('ics começa e termina certo', [ics.startsWith('BEGIN:VCALENDAR\r\n'), ics.endsWith('END:VCALENDAR\r\n')], [true, true]);
check('ics horário em UTC', [ics.includes('DTSTART:20270303T170000Z'), ics.includes('DTEND:20270303T183000Z')], [true, true]);
check('ics escapa vírgula e ponto e vírgula', ics.includes('SUMMARY:Volume Russo\\, Manutenção\\; teste'), true);
check('ics com lembrete 1 dia antes', ics.includes('TRIGGER:-P1D'), true);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
