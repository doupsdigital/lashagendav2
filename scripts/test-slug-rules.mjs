// Testes do endereço do link (F10.3) — `node scripts/test-slug-rules.mjs`.
import { typeSlug, finalSlug, slugProblem, migrateStorageKey } from '../src/lib/studio/slug-rules.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

check('acentos e espaços', typeSlug('Fê Lash  Estúdio'), 'fe-lash-estudio');
check('símbolos saem', typeSlug('ju@lash!.com'), 'julashcom');
check('sublinhado vira hífen', typeSlug('ju_lash'), 'ju-lash');
check('hífens repetidos', typeSlug('ju---lash'), 'ju-lash');
check('hífen do começo sai', typeSlug('-ju'), 'ju');
check('hífen do fim fica enquanto digita', typeSlug('ju-'), 'ju-');
check('final tira hífen do fim', finalSlug('ju- '), 'ju');
check('corta em 50', typeSlug('a'.repeat(60)).length, 50);
check('ç vira c', typeSlug('Graça'), 'graca');

check('ok', slugProblem('fe-lash'), null);
check('curto', slugProblem('fe'), 'O endereço precisa ter pelo menos 3 letras ou números.');
check('longo', slugProblem('a'.repeat(51)), 'O endereço pode ter até 50 letras ou números.');
check('hífen na ponta', slugProblem('fe-lash-'), 'Use só letras, números e hífen (sem começar ou terminar com hífen).');
check('maiúscula', slugProblem('FeLash') !== null, true);

check('tour', migrateStorageKey('sm_tour_seen_inicio_ana_[data-tour="x"]', 'ana', 'ana-lash'), 'sm_tour_seen_inicio_ana-lash_[data-tour="x"]');
check('boas-vindas (fim da chave)', migrateStorageKey('sm_welcome_seen_v1_ana', 'ana', 'ana-lash'), 'sm_welcome_seen_v1_ana-lash');
check('não confunde prefixo de outro slug', migrateStorageKey('sm_welcome_seen_v1_anabela', 'ana', 'x'), null);
check('acha depois de um falso', migrateStorageKey('sm_tour_seen_anab_ana_y', 'ana', 'z'), 'sm_tour_seen_anab_z_y');
check('chave de fora do app', migrateStorageKey('ph_ana', 'ana', 'x'), null);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
