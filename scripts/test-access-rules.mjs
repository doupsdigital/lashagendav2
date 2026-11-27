// Testes do acesso por e-mail e senha (F11.6) — `node scripts/test-access-rules.mjs`.
import { cleanAccessEmail, passwordProblem, PASSWORD_MIN } from '../src/lib/auth/access-rules.ts';
import { buildPasswordResetEmailContent } from '../src/lib/access-email.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

check('e-mail: tira espaços e põe minúsculo', cleanAccessEmail('  Fer.Lima@Gmail.COM '), 'fer.lima@gmail.com');
check('e-mail sem domínio: recusa', cleanAccessEmail('fernanda@gmail'), null);
check('e-mail com espaço no meio: recusa', cleanAccessEmail('fer lima@gmail.com'), null);
check('e-mail que não é texto: recusa', cleanAccessEmail(42), null);
check('e-mail longo demais: recusa', cleanAccessEmail(`${'a'.repeat(250)}@x.com`), null);

check('mínimo de 8', PASSWORD_MIN, 8);
check('senha curta: avisa', passwordProblem('1234567'), 'A senha precisa ter pelo menos 8 caracteres.');
check('senha de 8: ok', passwordProblem('12345678'), null);
check('senha só de espaços: avisa', passwordProblem('        '), 'A senha não pode ser só espaços.');
check('senha acima de 72 bytes: avisa', passwordProblem('ç'.repeat(40)), 'Essa senha é longa demais. Use uma menor.');
check('senha que não é texto: avisa', typeof passwordProblem(undefined), 'string');

const url = 'https://lashagenda.com/entrar/nova-senha?token_hash=abc123';
const mail = buildPasswordResetEmailContent({ name: 'Fernanda Lima', resetUrl: url, supportWhatsapp: '5562991083435' });
check('assunto da nova senha', mail.subject, 'Crie uma nova senha do seu LashAgenda');
check('link no botão e no texto', mail.html.includes(`href="${url}"`) && mail.text.includes(url), true);
check('fala que vale 1 hora e uma vez só', mail.text.includes('1 hora') && mail.text.includes('uma vez'), true);
check('"não foi você" para quem não pediu', mail.text.includes('Não foi você?'), true);
check('sem termos de saúde', /anamnese|saúde|alergi|gestante|gravidez|medicament|doença|clínic|prontuário/i.test(mail.html + mail.text), false);
const evil = buildPasswordResetEmailContent({ name: '<b>x</b>', resetUrl: url, supportWhatsapp: '1' });
check('nome escapado no HTML', evil.html.includes('<b>x</b>'), false);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
