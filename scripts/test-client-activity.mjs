// Testes das novidades do Início (F5.6) — `node scripts/test-client-activity.mjs`.
// O que vira novidade e o texto "há X", sem banco nem servidor.
import { classifyActivity, relativeTimeLabel } from '../src/lib/scheduling/client-activity.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

const now = new Date('2027-03-10T12:00:00-03:00');
const since = new Date(now.getTime() - 72 * 3600000);
const row = (over) => ({
  created_at: '2027-03-10T10:00:00-03:00',
  canceled_at: null,
  canceled_by: null,
  status: 'pending',
  origin: 'catalog',
  ...over,
});
const kind = (over) => classifyActivity(row(over), since)?.kind ?? null;

check('cliente agendou (aguardando)', kind({}), 'booked');
check('cliente agendou (confirmado)', kind({ status: 'confirmed' }), 'booked');
check('já concluído: não é novidade', kind({ status: 'completed' }), null);
check('falta: não é novidade', kind({ status: 'no_show' }), null);
check('agendou há 4 dias: fora da janela', kind({ created_at: '2027-03-06T10:00:00-03:00' }), null);
check('agendamento manual da profissional: não é novidade', kind({ origin: 'professional' }), null);
check('registro de histórico: não é novidade', kind({ origin: 'record' }), null);
check('cliente cancelou pelo link', kind({ status: 'canceled', canceled_by: 'client', canceled_at: '2027-03-10T11:00:00-03:00' }), 'canceled');
check(
  'cliente cancelou agendamento antigo (feito há 10 dias)',
  kind({ created_at: '2027-02-28T10:00:00-03:00', status: 'canceled', canceled_by: 'client', canceled_at: '2027-03-09T11:00:00-03:00' }),
  'canceled'
);
check('profissional cancelou: não é novidade', kind({ status: 'canceled', canceled_by: 'professional', canceled_at: '2027-03-10T11:00:00-03:00' }), null);
check('cancelou há 5 dias: fora da janela', kind({ status: 'canceled', canceled_by: 'client', canceled_at: '2027-03-05T11:00:00-03:00' }), null);
check(
  'manual cancelado pela cliente: é novidade',
  kind({ origin: 'professional', status: 'canceled', canceled_by: 'client', canceled_at: '2027-03-10T11:00:00-03:00' }),
  'canceled'
);
check('hora do evento = hora do cancelamento',
  classifyActivity(row({ status: 'canceled', canceled_by: 'client', canceled_at: '2027-03-10T11:00:00-03:00' }), since).at.toISOString(),
  '2027-03-10T14:00:00.000Z'
);

const ago = (min) => relativeTimeLabel(new Date(now.getTime() - min * 60000), now);
check('agora', ago(0), 'agora');
check('há 5 min', ago(5), 'há 5 min');
check('há 59 min', ago(59), 'há 59 min');
check('há 1 h', ago(60), 'há 1 h');
check('há 23 h', ago(23 * 60 + 59), 'há 23 h');
check('ontem', ago(24 * 60), 'ontem');
check('há 2 dias', ago(48 * 60), 'há 2 dias');

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
