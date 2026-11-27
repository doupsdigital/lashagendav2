// Testes do atendimento registrado à mão (F7.4) — `node scripts/test-client-record.mjs`.
import { recordDateProblem, MIN_RECORD_DATE } from '../src/lib/clients/client-record.ts';

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
check('hoje vale', recordDateProblem(today, today), null);
check('passado vale', recordDateProblem('2024-02-29', today), null);
check('limite mais antigo vale', recordDateProblem(MIN_RECORD_DATE, today), null);
check('amanhã não', recordDateProblem('2026-11-26', today), 'Só dá para registrar atendimento de hoje ou de antes. Para o futuro, agende pela agenda.');
check('antes do limite', recordDateProblem('1999-12-31', today), 'Data muito antiga.');
check('dia que não existe', recordDateProblem('2025-02-29', today), 'Data inválida.');
check('vazio', recordDateProblem('', today), 'Escolha a data do atendimento.');
check('formato brasileiro', recordDateProblem('25/11/2026', today), 'Escolha a data do atendimento.');
check('não-texto', recordDateProblem(20261125, today), 'Escolha a data do atendimento.');

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
