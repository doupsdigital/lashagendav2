// Testes do perfil da cliente (F7.2) — `node scripts/test-client-profile.mjs`.
// Validação dos dados editados, idade e aviso de exclusão, sem banco nem servidor.
import {
  ageOn,
  birthDateLabel,
  cleanClientProfile,
  deleteBlockedMessage,
  isValidBirthDate,
  MAX_CLIENT_NOTES,
} from '../src/lib/clients/client-profile.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

const today = '2026-11-25';
const ok = cleanClientProfile({ name: '  Maria   Silva ', email: ' Maria@Email.COM ', birth_date: '1990-03-12', notes: ' Prefere manhã \r\n ' }, today);
check('limpa tudo', ok, { ok: true, data: { name: 'Maria Silva', email: 'maria@email.com', birth_date: '1990-03-12', notes: 'Prefere manhã' } });
check('opcionais vazios viram null', cleanClientProfile({ name: 'Ana', email: ' ', birth_date: '', notes: '' }, today), {
  ok: true,
  data: { name: 'Ana', email: null, birth_date: null, notes: null },
});
check('opcionais ausentes viram null', cleanClientProfile({ name: 'Ana' }, today).data.email, null);
check('sem nome', cleanClientProfile({ name: ' ' }, today).ok, false);
check('nome não-texto', cleanClientProfile({ name: 42 }, today).ok, false);
check('e-mail sem @', cleanClientProfile({ name: 'Ana', email: 'ana.email.com' }, today).message, 'E-mail inválido — confira o que foi digitado.');
check('e-mail sem domínio', cleanClientProfile({ name: 'Ana', email: 'ana@x' }, today).ok, false);
check('observação longa demais', cleanClientProfile({ name: 'Ana', notes: 'x'.repeat(MAX_CLIENT_NOTES + 1) }, today).ok, false);
check('observação no limite', cleanClientProfile({ name: 'Ana', notes: 'x'.repeat(MAX_CLIENT_NOTES) }, today).ok, true);
check('observação mantém quebra de linha', cleanClientProfile({ name: 'Ana', notes: 'a\r\nb' }, today).data.notes, 'a\nb');

check('nascimento válido', isValidBirthDate('2000-02-29', today), true);
check('29/02 em ano não bissexto', isValidBirthDate('2001-02-29', today), false);
check('mês 13', isValidBirthDate('1990-13-01', today), false);
check('no futuro', isValidBirthDate('2026-11-26', today), false);
check('hoje vale', isValidBirthDate(today, today), true);
check('antes de 1900', isValidBirthDate('1899-12-31', today), false);
check('formato brasileiro não', isValidBirthDate('12/03/1990', today), false);
check('nascimento inválido no perfil', cleanClientProfile({ name: 'Ana', birth_date: '1990-02-30' }, today).message, 'Data de nascimento inválida.');

check('idade antes do aniversário', ageOn('1990-12-01', today), 35);
check('idade no dia do aniversário', ageOn('1990-11-25', today), 36);
check('idade depois do aniversário', ageOn('1990-03-12', today), 36);
check('rótulo da data', birthDateLabel('1990-03-12', today), '12/03/1990 · 36 anos');
check('rótulo com 1 ano', birthDateLabel('2025-01-10', today), '10/01/2025 · 1 ano');

check('aviso com 1 agendamento', deleteBlockedMessage(1).startsWith('Ela tem 1 agendamento no histórico'), true);
check('aviso com vários', deleteBlockedMessage(5).startsWith('Ela tem 5 agendamentos no histórico'), true);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
