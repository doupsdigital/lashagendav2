// Testes dos números do Início (F9.1) — `node scripts/test-inicio-numbers.mjs`.
import { monthStartKey, nextMonthStartKey, spDateKey, sumRevenue, dayTag, shortDuration } from '../src/lib/dashboard/inicio-numbers.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

check('início do mês', monthStartKey('2026-11-26'), '2026-11-01');
check('mês seguinte', nextMonthStartKey('2026-11-26'), '2026-12-01');
check('mês seguinte vira o ano', nextMonthStartKey('2026-12-15'), '2027-01-01');
check('dia no fuso de SP (madrugada UTC)', spDateKey('2026-12-01T02:30:00Z'), '2026-11-30');

const rows = [
  { starts_at: '2026-11-26T13:00:00Z', status: 'completed', amount_received: 180 },
  { starts_at: '2026-11-26T16:00:00Z', status: 'completed', amount_received: 0.1 },
  { starts_at: '2026-11-26T17:00:00Z', status: 'completed', amount_received: 0.2 },
  { starts_at: '2026-11-03T15:00:00Z', status: 'completed', amount_received: 120 },
  { starts_at: '2026-11-26T18:00:00Z', status: 'confirmed', amount_received: 999 },
  { starts_at: '2026-11-20T15:00:00Z', status: 'completed', amount_received: null },
  // 23h30 de 30/10 em SP: mês anterior
  { starts_at: '2026-10-31T02:30:00Z', status: 'completed', amount_received: 50 },
  // 23h30 de 30/11 em SP: ainda é novembro
  { starts_at: '2026-12-01T02:30:00Z', status: 'completed', amount_received: 70 },
];
check('faturado hoje e no mês', sumRevenue(rows, '2026-11-26'), { today: 180.3, month: 370.3 });
check('sem nada', sumRevenue([], '2026-11-26'), { today: 0, month: 0 });

check('etiqueta aguardando', dayTag('pending'), { label: 'Aguardando', tone: 'amber' });
check('etiqueta confirmado', dayTag('confirmed'), { label: 'Confirmado', tone: 'green' });
check('etiqueta concluído', dayTag('completed').label, 'Concluído');
check('etiqueta faltou', dayTag('no_show').label, 'Faltou');

check('duração 2h', shortDuration(120), '2h');
check('duração 1h30', shortDuration(90), '1h30');
check('duração 45min', shortDuration(45), '45min');
check('duração 1h05', shortDuration(65), '1h05');

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
