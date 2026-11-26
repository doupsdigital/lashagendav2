// Testes da aba "Saúde e cuidados" (F8.2) — `node scripts/test-client-health.mjs`.
import { cleanHealth, readHealth, countHealthAlerts, countHealthFilled, HEALTH_FIELDS } from '../src/lib/clients/client-health.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

check('14 perguntas, como no v1', HEALTH_FIELDS.length, 14);
check('vazio vale', cleanHealth({}), { ok: true, data: {} });
check('não-objeto recusa', cleanHealth(null).ok, false);
check('sim/não', cleanHealth({ gestante: true, usa_lentes_contato: false }), { ok: true, data: { usa_lentes_contato: false, gestante: true } });
check('sim/não como texto recusa', cleanHealth({ gestante: 'sim' }).ok, false);
check('reação sem ter feito extensão some', cleanHealth({ reacao_alergica_anterior: true }), { ok: true, data: {} });
check('reação com "Não" em já fez some', cleanHealth({ fez_extensao_antes: false, reacao_alergica_anterior: true }), { ok: true, data: { fez_extensao_antes: false } });
check('reação com "Sim" em já fez fica', cleanHealth({ fez_extensao_antes: true, reacao_alergica_anterior: true }), { ok: true, data: { fez_extensao_antes: true, reacao_alergica_anterior: true } });
check('texto limpa', cleanHealth({ alergias: '  látex\r\ncola  ' }), { ok: true, data: { alergias: 'látex\ncola' } });
check('texto só espaço some', cleanHealth({ medicamentos: '   ' }), { ok: true, data: {} });
check('texto longo recusa', cleanHealth({ alergias: 'x'.repeat(501) }).ok, false);
check('notas até 1000', cleanHealth({ observacoes: 'x'.repeat(1000) }).ok, true);
check('chave de fora (técnica) ignorada', cleanHealth({ formato_olho: 'fundo', gestante: false }), { ok: true, data: { gestante: false } });
check('ler do banco descarta lixo', readHealth({ gestante: 'x', alergias: 'látex', reacao_alergica_anterior: true, y: 1 }), { alergias: 'látex' });
check('ler do banco mantém a reação quando já fez = Sim', readHealth({ fez_extensao_antes: true, reacao_alergica_anterior: true }), { fez_extensao_antes: true, reacao_alergica_anterior: true });
check('ler do banco: já fez inválido derruba a reação', readHealth({ fez_extensao_antes: 'x', reacao_alergica_anterior: true }), {});
check('ler nulo', readHealth(undefined), {});
const sheet = { fez_extensao_antes: true, reacao_alergica_anterior: true, gestante: false, alergias: 'látex', observacoes: 'calma' };
check('alertas: reação + alergia (não conta "já fez" nem notas)', countHealthAlerts(sheet), 2);
check('preenchidos', countHealthFilled(sheet), 5);
check('nenhum alerta', countHealthAlerts({ gestante: false, fez_extensao_antes: true }), 0);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
