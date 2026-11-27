// Testes dos números do admin (F12.1) — `node scripts/test-admin-metrics.mjs`.
import { computeAdminMetrics, spDay } from '../src/lib/admin/metrics.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}
const NOW = Date.parse('2026-11-27T15:00:00Z');
const ago = (days) => new Date(NOW - days * 86400000).toISOString();
const base = { plan_status: 'active', cakto_plan: 'mensal', manual_plan: false, created_at: ago(40), from_preview: true, paid: true, lapsed: false, preview_live: false };
const studios = [
  { ...base },
  { ...base },
  { ...base, cakto_plan: 'anual' },
  { ...base, paid: false, lapsed: true },
  { ...base, manual_plan: true, cakto_plan: null },
  { ...base, plan_status: 'preview', cakto_plan: null, paid: false, preview_live: true, created_at: ago(0.2) },
  { ...base, plan_status: 'preview', cakto_plan: null, paid: false, preview_live: false, created_at: ago(2) },
];
const ev = (event, days, result = 'processed') => ({ event, result, received_at: ago(days) });
const events = [ev('purchase_approved', 1), ev('purchase_approved', 10), ev('purchase_approved', 3, 'ignored'), ev('subscription_renewed', 5), ev('subscription_canceled', 20), ev('refund', 2), ev('purchase_approved', 45)];
const previewLog = [ago(0.1), ago(1), ago(1.2), ago(6), ago(12), ago(29), ago(31)];
const m = computeAdminMetrics({ studios, events, previewLog, nowMs: NOW, mensalPrice: 22.9, anualPrice: 197 });

check('pagantes: 2 mensal + 1 anual (sem vencido, sem liberado à mão, sem prévia)', [m.payingMensal, m.payingAnual], [2, 1]);
check('receita mensal estimada = 2 × 22,90 + 197/12', m.mrr, Math.round((2 * 22.9 + 197 / 12) * 100) / 100);
check('vencidos e liberados à mão', [m.lapsed, m.manual], [1, 1]);
check('prévias no ar (só as dentro das 24h)', m.previewsLive, 1);
check('7 dias: prévias, compras (só processadas), renovações, cancelamentos, reembolsos', m.d7, { previews: 4, approved: 1, renewals: 1, cancels: 0, refunds: 1 });
check('30 dias', m.d30, { previews: 6, approved: 2, renewals: 1, cancels: 1, refunds: 1 });
check('conversão 30 dias = compras ÷ prévias', m.conversion30, 2 / 6);
check('com preview_log: contagem exata', m.previewsExact, true);
check('14 dias, o último é hoje (São Paulo)', [m.daily.length, m.daily[13].day], [14, spDay(NOW)]);
check('hoje: 1 prévia; ontem: 2 prévias e 1 compra', [m.daily[13].previews, m.daily[12].previews, m.daily[12].approved], [1, 2, 1]);

const noLog = computeAdminMetrics({ studios, events: [], previewLog: null, nowMs: NOW, mensalPrice: 22.9, anualPrice: 197 });
check('sem preview_log: avisa que é parcial e conta as prévias que sobraram', [noLog.previewsExact, noLog.d7.previews], [false, 2]);
check('sem prévia: conversão vazia', computeAdminMetrics({ studios: [], events: [], previewLog: [], nowMs: NOW, mensalPrice: 1, anualPrice: 1 }).conversion30, null);
check('dia em São Paulo: 01h UTC ainda é o dia anterior', spDay('2026-11-27T01:00:00Z'), '2026-11-26');

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
