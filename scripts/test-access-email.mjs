// Testes do e-mail de acesso (F11.4) — `node scripts/test-access-email.mjs`.
import { buildAccessEmailContent, ACCESS_EMAIL_STEPS } from '../src/lib/access-email.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}
const base = { name: 'Fernanda Lima', slug: 'fernanda-lima', shortCode: 'Ab3xYz9', productionDomain: 'lashagenda.com', supportWhatsapp: '5562991083435' };

const prod = buildAccessEmailContent({ ...base, origin: 'https://lashagenda.com' });
check('assunto fala do LashAgenda', prod.subject, 'Fernanda, seu LashAgenda está ativo! Aqui está seu acesso');
check('produção: link curto do app', prod.html.includes('href="https://lashagenda.com/a/Ab3xYz9"') && prod.text.includes('https://lashagenda.com/a/Ab3xYz9'), true);
check('produção: catálogo no subdomínio', prod.html.includes('href="https://fernanda-lima.lashagenda.com"') && prod.html.includes('>fernanda-lima.lashagenda.com<'), true);

const test = buildAccessEmailContent({ ...base, origin: 'https://lashagendav2-git-desenv.vercel.app/' });
check('teste: app no endereço da Vercel', test.html.includes('href="https://lashagendav2-git-desenv.vercel.app/a/Ab3xYz9"'), true);
check('teste: catálogo em /c/<slug>', test.text.includes('https://lashagendav2-git-desenv.vercel.app/c/fernanda-lima'), true);

check('todos os primeiros passos, na ordem', ACCESS_EMAIL_STEPS.every((s) => prod.text.includes(s)) && prod.text.indexOf(ACCESS_EMAIL_STEPS[0]) < prod.text.indexOf(ACCESS_EMAIL_STEPS[4]), true);
check('sem "menu" nem "catálogo está no ar"', /\bmenu\b|catálogo (já )?está no ar/i.test(prod.text + prod.html), false);
check('sem termos de saúde', /anamnese|saúde|alergi|gestante|gravidez|medicament|doença|clínic|prontuário/i.test(prod.text + prod.html + prod.subject), false);
check('cores da paleta aprovada', prod.html.includes('#A85560') && prod.html.includes('#F7F3EE') && !prod.html.includes('#c9587a'), true);

const evil = buildAccessEmailContent({ ...base, name: '<script>x</script> Ana', origin: 'https://lashagenda.com' });
check('nome escapado no HTML', evil.html.includes('<script>x'), false);
check('sem nome: "Lash"', buildAccessEmailContent({ ...base, name: '  ', origin: 'https://lashagenda.com' }).subject.startsWith('Lash,'), true);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
