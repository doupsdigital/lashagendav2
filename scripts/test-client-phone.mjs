// Testes do WhatsApp da cliente (F5.2) — `node scripts/test-client-phone.mjs`.
// Roda o arquivo TypeScript de verdade, sem banco nem servidor.
import {
  isValidClientWhatsapp,
  legacyWhatsappVariants,
  normalizeClientWhatsapp,
} from '../src/lib/scheduling/client-phone.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

// Mesma cliente, escrita de vários jeitos → "62999990000".
const same = [
  '62999990000',
  '(62) 99999-0000',
  '(62) 9 9999-0000',
  '+55 (62) 99999-0000',
  '5562999990000',
  '062 99999-0000',
  '62 9999-0000', // celular antigo, sem o 9
  '556299990000', // com 55 e sem o 9
  ' 62.99999.0000 ',
];
for (const raw of same) check(`"${raw}" → 62999990000`, normalizeClientWhatsapp(raw), '62999990000');

// Fixo continua com 10 dígitos (não ganha o 9).
check('fixo (62) 3333-4444', normalizeClientWhatsapp('(62) 3333-4444'), '6233334444');
check('fixo com 55', normalizeClientWhatsapp('+55 62 3333-4444'), '6233334444');

// Válidos / inválidos.
check('celular válido', isValidClientWhatsapp(normalizeClientWhatsapp('(11) 98888-1111')), true);
check('fixo válido', isValidClientWhatsapp(normalizeClientWhatsapp('(11) 3333-4444')), true);
check('curto demais', isValidClientWhatsapp(normalizeClientWhatsapp('9999-0000')), false);
check('vazio', isValidClientWhatsapp(normalizeClientWhatsapp('')), false);
check('sem DDD (00 + número)', isValidClientWhatsapp(normalizeClientWhatsapp('00 99999-0000')), false);
check('DDD 10 não existe', isValidClientWhatsapp('10999990000'), false);
check('11 dígitos sem 9 na frente', isValidClientWhatsapp('62899990000'), false);
check('longo demais', isValidClientWhatsapp(normalizeClientWhatsapp('62 99999-00001')), false);
check('letras', isValidClientWhatsapp(normalizeClientWhatsapp('abc')), false);

// Formas antigas para achar cadastro sem o 9.
check('variação sem o 9', legacyWhatsappVariants('62999990000'), ['6299990000']);
check('fixo não tem variação', legacyWhatsappVariants('6233334444'), []);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
