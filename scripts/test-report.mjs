// Testes dos relatórios (F9.2) — `node scripts/test-report.mjs`.
import { resolvePeriod, summarizeReport, periodLabel, barLabel, MAX_DAILY_BARS } from '../src/lib/dashboard/report.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}
const range = (p) => [p.id, p.from, p.to, p.problem];
const T = '2026-11-26';

check('hoje', range(resolvePeriod('hoje', T)), ['hoje', T, T, null]);
check('ontem', range(resolvePeriod('ontem', T)), ['ontem', '2026-11-25', '2026-11-25', null]);
check('ontem na virada do mês', range(resolvePeriod('ontem', '2026-03-01')), ['ontem', '2026-02-28', '2026-02-28', null]);
check('7 dias (inclui hoje)', range(resolvePeriod('7dias', T)), ['7dias', '2026-11-20', T, null]);
check('este mês', range(resolvePeriod('mes', T)), ['mes', '2026-11-01', '2026-11-30', null]);
check('mês passado', range(resolvePeriod('mes_passado', T)), ['mes_passado', '2026-10-01', '2026-10-31', null]);
check('mês passado em janeiro', range(resolvePeriod('mes_passado', '2027-01-10')), ['mes_passado', '2026-12-01', '2026-12-31', null]);
check('fevereiro bissexto', resolvePeriod('mes', '2028-02-10').to, '2028-02-29');
check('este ano', range(resolvePeriod('ano', T)), ['ano', '2026-01-01', '2026-12-31', null]);
check('desconhecido = este mês', range(resolvePeriod('xyz', T)), ['mes', '2026-11-01', '2026-11-30', null]);
check('personalizado ok', range(resolvePeriod('personalizado', T, '2026-09-10', '2026-10-05')), ['personalizado', '2026-09-10', '2026-10-05', null]);
check('personalizado sem data', resolvePeriod('personalizado', T, '', '2026-10-05').problem, 'Escolha as duas datas do período.');
check('personalizado data inexistente', resolvePeriod('personalizado', T, '2026-02-30', '2026-03-05').id, 'mes');
check('personalizado invertido', resolvePeriod('personalizado', T, '2026-10-05', '2026-09-10').problem, 'A data de início vem depois da data de fim.');
check('personalizado longo demais', resolvePeriod('personalizado', T, '2023-01-01', '2026-01-01').problem, 'O período pode ter no máximo 2 anos.');
check('rótulo de um dia', periodLabel(resolvePeriod('hoje', T)), '26/11/2026');
check('rótulo de intervalo', periodLabel(resolvePeriod('7dias', T)), '20/11/2026 a 26/11/2026');

const rows = [
  { day: '2026-11-03', status: 'completed', amount_received: 180, services: ['Volume Russo', 'Design'] },
  { day: '2026-11-03', status: 'completed', amount_received: 0.1, services: ['Volume Russo'] },
  { day: '2026-11-10', status: 'completed', amount_received: 0.2, services: ['Lash Lifting'] },
  { day: '2026-11-12', status: 'completed', amount_received: null, services: ['Design'] },
  { day: '2026-11-15', status: 'canceled', amount_received: null, services: ['Volume Russo'] },
  { day: '2026-11-16', status: 'no_show', amount_received: null, services: ['Volume Russo'] },
  { day: '2026-11-28', status: 'confirmed', amount_received: null, services: ['Volume Russo'] },
  { day: '2026-10-31', status: 'completed', amount_received: 999, services: ['Fora'] },
];
const s = summarizeReport(rows, resolvePeriod('mes', T));
check('contagens', [s.total, s.completed, s.canceled, s.noShows, s.open], [7, 4, 1, 1, 1]);
check('valor recebido (centavos certos)', s.received, 180.3);
check('serviços mais feitos (só concluídos, empate por nome)', s.topServices, [
  { title: 'Design', count: 2 },
  { title: 'Volume Russo', count: 2 },
  { title: 'Lash Lifting', count: 1 },
]);
check('barras por dia no mês', [s.barUnit, s.bars.length, s.bars[2], s.bars[9]], ['day', 30, { key: '2026-11-03', value: 180.1 }, { key: '2026-11-10', value: 0.2 }]);
const y = summarizeReport(rows, resolvePeriod('ano', T));
check('ano: barras por mês', [y.barUnit, y.bars.length, y.bars[9], y.bars[10]], ['month', 12, { key: '2026-10', value: 999 }, { key: '2026-11', value: 180.3 }]);
const c = summarizeReport([], resolvePeriod('personalizado', T, '2025-11-15', '2026-02-10'));
check('personalizado longo: meses pelo caminho', c.bars.map((b) => b.key), ['2025-11', '2025-12', '2026-01', '2026-02']);
const d = summarizeReport([], { from: '2026-01-01', to: '2026-03-03' });
check(`até ${MAX_DAILY_BARS} dias ainda por dia`, d.barUnit, 'day');
check('vazio', [s && summarizeReport([], resolvePeriod('hoje', T)).total, summarizeReport([], resolvePeriod('hoje', T)).topServices], [0, []]);
check('rótulo de barra dia', barLabel('2026-11-03'), '03/11');
check('rótulo de barra mês', [barLabel('2026-11'), barLabel('2026-01', true)], ['nov', 'jan/26']);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
