// Testes do consentimento da ficha (F8.3) — `node scripts/test-client-consent.mjs`.
import { consentLabel, CONSENT_TEXT } from '../src/lib/clients/client-consent.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

check('data e hora no fuso de SP', consentLabel('2026-11-26T17:30:00Z'), 'Autorizado em 26/11/2026 às 14:30');
check('virada do dia no fuso', consentLabel('2026-11-27T02:05:00Z'), 'Autorizado em 26/11/2026 às 23:05');
check('texto não cita anamnese', /anamnese/i.test(CONSENT_TEXT), false);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
