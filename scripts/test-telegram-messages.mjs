// Testes dos avisos do Telegram (F12.4) — `node scripts/test-telegram-messages.mjs`.
import {
  envTag,
  previewCreatedMessage,
  saleMessage,
  canceledMessage,
  renewalRefusedMessage,
  revokedMessage,
  webhookErrorMessage,
  webhookRejectedMessage,
} from '../src/lib/telegram-messages.ts';

let failures = 0;
function check(name, ok, extra) {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    if (extra !== undefined) console.log('     ', JSON.stringify(extra));
  }
}
const AT = new Date('2026-11-27T15:30:00Z');
const HEALTH = /anamnese|sa[úu]de|alergi|gestant|gravid|medicament|doen[çc]a|cl[íi]nic|prontu[áa]rio/i;

check('produção sem marca; resto marcado como teste', envTag('production') === '' && envTag('preview').includes('[teste]') && envTag(undefined).includes('[teste]'));

const prev = previewCreatedMessage({ name: 'Ana Lima', slug: 'ana-lima' });
check('prévia: resumida (2 linhas, nome e link)', prev.split('\n').length === 2 && prev.includes('Ana Lima') && prev.includes('https://ana-lima.lashagenda.com'), prev);

const sale = saleMessage({ plan: 'anual', priceLabel: 'R$ 197,00', buyerName: 'Ana', slug: 'ana', withoutPreview: false, emailNote: 'e-mail de acesso enviado', at: AT });
check('venda: plano, preço, nome, link, hora de São Paulo, e-mail', sale.includes('Anual R$ 197,00') && sale.includes('👤 Ana') && sale.includes('27/11/2026, 12:30') && sale.includes('📧 e-mail de acesso enviado') && !sale.includes('Sem prévia'), sale);
const saleNoPrev = saleMessage({ plan: 'mensal', priceLabel: 'R$ 22,90', buyerName: 'Bia', slug: 'bia', withoutPreview: true, emailNote: '', at: AT });
check('venda sem prévia: aviso para conferir, sem linha de e-mail vazia', saleNoPrev.includes('Sem prévia') && saleNoPrev.includes('Mensal') && !saleNoPrev.includes('📧'), saleNoPrev);

check('cancelamento: data de acesso em São Paulo', canceledMessage({ name: 'Ana', slug: 'ana', paidUntil: '2026-12-01T02:00:00Z' }).includes('Acesso até 30/11/2026'));
check('renovação recusada: menciona a folga', renewalRefusedMessage({ name: null, slug: 'x', paidUntil: null }).includes('Sem nome') && renewalRefusedMessage({ name: 'A', slug: 'x', paidUntil: null }).includes('folga'));
check('reembolso e chargeback', revokedMessage({ kind: 'refund', name: 'A', slug: 'a', at: AT }).includes('Reembolso') && revokedMessage({ kind: 'chargeback', name: 'A', slug: 'a', at: AT }).includes('Chargeback'));

const err = webhookErrorMessage({ event: 'purchase_approved', detail: 'x'.repeat(500), slug: null, at: AT });
check('erro: evento, detalhe cortado em 300, link do admin, sem link de estúdio', err.includes('purchase_approved') && err.includes('x'.repeat(300) + '…') && !err.includes('x'.repeat(301)) && err.includes('/admin/cakto') && !err.includes('🔗'), err.length);
check('erro com estúdio: traz o link', webhookErrorMessage({ event: null, detail: 'falhou', slug: 'ana', at: AT }).includes('https://ana.lashagenda.com'));
check('segredo errado: aviso com o admin', webhookRejectedMessage(AT).includes('segredo') && webhookRejectedMessage(AT).includes('/admin/cakto'));

const all = [prev, sale, saleNoPrev, canceledMessage({ name: 'A', slug: 'a', paidUntil: null }), renewalRefusedMessage({ name: 'A', slug: 'a', paidUntil: null }), revokedMessage({ kind: 'refund', name: 'A', slug: 'a', at: AT }), err, webhookRejectedMessage(AT)];
check('nenhum aviso fala de saúde', all.every((m) => !HEALTH.test(m)));
check('todos cabem no limite do Telegram (4096)', all.every((m) => m.length < 4096));

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
