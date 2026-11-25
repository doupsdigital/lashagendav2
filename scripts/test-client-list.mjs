// Testes da lista de clientes (F7.1) — `node scripts/test-client-list.mjs`.
// Resumo de atendimentos, busca e nome da cliente nova, sem banco nem servidor.
import {
  cleanClientName,
  matchesClientQuery,
  MAX_CLIENT_NAME,
  normalizeSearchText,
  sortClientsByName,
  summarizeVisits,
  visitsLabel,
} from '../src/lib/clients/client-list.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

const rows = [
  { client_id: 'a', status: 'completed', starts_at: '2026-03-10T13:00:00Z' },
  { client_id: 'a', status: 'completed', starts_at: '2026-05-02T13:00:00Z' },
  { client_id: 'a', status: 'completed', starts_at: '2026-04-01T13:00:00Z' },
  { client_id: 'a', status: 'no_show', starts_at: '2026-06-01T13:00:00Z' },
  { client_id: 'a', status: 'confirmed', starts_at: '2026-12-01T13:00:00Z' },
  { client_id: 'b', status: 'canceled', starts_at: '2026-05-01T13:00:00Z' },
  { client_id: null, status: 'completed', starts_at: '2026-05-01T13:00:00Z' },
];
const sum = summarizeVisits(rows);
check('conta só os concluídos', sum.get('a').visits, 3);
check('último = o mais recente concluído (não a ordem)', sum.get('a').lastVisit, '2026-05-02T13:00:00Z');
check('só cancelado não entra', sum.has('b'), false);

check('texto sem acento e minúsculo', normalizeSearchText('  Júlia   CONCEIÇÃO '), 'julia conceicao');
const julia = { name: 'Júlia Conceição', whatsapp: '62999990000' };
check('busca vazia mostra todas', matchesClientQuery(julia, '  '), true);
check('nome sem acento acha com acento', matchesClientQuery(julia, 'julia'), true);
check('pedaço do sobrenome', matchesClientQuery(julia, 'conce'), true);
check('duas palavras fora de ordem', matchesClientQuery(julia, 'conceicao jul'), true);
check('palavra que não está', matchesClientQuery(julia, 'julia souza'), false);
check('WhatsApp: pedaço do número', matchesClientQuery(julia, '99990'), true);
check('WhatsApp: com máscara', matchesClientQuery(julia, '(62) 99999-0000'), true);
check('WhatsApp: com 55', matchesClientQuery(julia, '5562999990000'), true);
check('WhatsApp: número de outra', matchesClientQuery(julia, '11988'), false);
check('cliente sem WhatsApp não acha por número', matchesClientQuery({ name: 'Ana', whatsapp: '' }, '119'), false);

check(
  'ordem por nome, acento não muda a posição',
  sortClientsByName([{ name: 'bruna' }, { name: 'Ágata' }, { name: 'Amanda' }]).map((c) => c.name),
  ['Ágata', 'Amanda', 'bruna']
);

check('sem atendimento', visitsLabel(0, null), 'Nenhum atendimento ainda');
check('um atendimento', visitsLabel(1, '2026-03-12T13:00:00Z'), '1 atendimento · último em 12/03/2026');
check('vários atendimentos', visitsLabel(4, '2026-05-02T13:00:00Z'), '4 atendimentos · último em 02/05/2026');
check('data no fuso de SP (madrugada UTC)', visitsLabel(1, '2026-03-13T02:00:00Z'), '1 atendimento · último em 12/03/2026');

check('nome com espaços sobrando', cleanClientName('  Maria   da  Silva '), 'Maria da Silva');
check('nome curto demais', cleanClientName(' a '), null);
check('nome não-texto', cleanClientName(42), null);
check('nome cortado no limite', cleanClientName('x'.repeat(300)).length, MAX_CLIENT_NAME);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
