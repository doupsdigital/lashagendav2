// Testes do histórico da cliente (F7.3) — `node scripts/test-client-history.mjs`.
// Futuros x passados, resumo e rótulos, sem banco nem servidor.
import { historyStatusLabel, splitHistory, summarizeHistory } from '../src/lib/clients/client-history.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

const now = new Date('2026-11-25T15:00:00Z');
const a = (id, starts_at, status, extra = {}) => ({
  id, starts_at, status, origin: 'catalog', total_price: 180, amount_received: null, canceled_by: null, cancel_reason: null, services: ['Volume Russo'], ...extra,
});
const rows = [
  a('done1', '2026-10-01T13:00:00Z', 'completed', { amount_received: 180 }),
  a('done2', '2026-11-10T13:00:00Z', 'completed', { amount_received: 150.5 }),
  a('rec', '2026-03-01T15:00:00Z', 'completed', { origin: 'record', amount_received: 0.1, total_price: null }),
  a('rec2', '2026-02-01T15:00:00Z', 'completed', { origin: 'record', amount_received: 0.2, total_price: null }),
  a('noshow', '2026-09-01T13:00:00Z', 'no_show'),
  a('cancelFuture', '2026-12-20T13:00:00Z', 'canceled', { canceled_by: 'client' }),
  a('far', '2027-01-10T13:00:00Z', 'confirmed'),
  a('near', '2026-11-30T13:00:00Z', 'pending'),
  a('stale', '2026-11-20T13:00:00Z', 'confirmed'),
  a('now', '2026-11-25T15:00:00Z', 'confirmed'),
];
const { upcoming, past } = splitHistory(rows, now);
check('futuros: só ativos que não começaram, mais perto primeiro', upcoming.map((r) => r.id), ['now', 'near', 'far']);
check('passados: o resto, mais recente primeiro', past.map((r) => r.id), ['cancelFuture', 'stale', 'done2', 'done1', 'noshow', 'rec', 'rec2']);

const s = summarizeHistory(rows, now);
check('atendimentos = concluídos (com registros)', s.visits, 4);
check('total gasto soma o recebido sem erro de centavos', s.totalSpent, 330.8);
check('faltas', s.noShows, 1);
check('cancelados', s.canceled, 1);
check('próximo', s.next.id, 'now');
check('último atendimento', s.lastVisit.id, 'done2');
const empty = summarizeHistory([], now);
check('sem nada', [empty.visits, empty.totalSpent, empty.next, empty.lastVisit], [0, 0, null, null]);
check('concluído sem valor conta como 0', summarizeHistory([a('x', '2026-01-01T13:00:00Z', 'completed')], now).totalSpent, 0);

check('rótulo concluído', historyStatusLabel(rows[0], now), 'Concluído');
check('rótulo registro', historyStatusLabel(rows[2], now), 'Atendimento registrado');
check('rótulo falta', historyStatusLabel(rows[4], now), 'Faltou');
check('rótulo ela cancelou', historyStatusLabel(rows[5], now), 'Ela cancelou');
check('rótulo você cancelou', historyStatusLabel(a('c', '2026-01-01T13:00:00Z', 'canceled', { canceled_by: 'professional' }), now), 'Você cancelou');
check('rótulo confirmado futuro', historyStatusLabel(rows[6], now), 'Confirmado');
check('rótulo confirmado que passou', historyStatusLabel(rows[8], now), 'Confirmado · não marcado como concluído');
check('rótulo aguardando futuro', historyStatusLabel(rows[7], now), 'Aguardando sua confirmação');
check('rótulo aguardando que passou', historyStatusLabel(a('p', '2026-11-01T13:00:00Z', 'pending'), now), 'Aguardando · já passou');

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
