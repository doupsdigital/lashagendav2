// Testes da ficha técnica (F8.1) — `node scripts/test-client-technical.mjs`.
import { cleanTechnical, readTechnical, technicalSummary, countTechnicalFilled, TECH_FIELDS } from '../src/lib/clients/client-technical.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

check('18 campos, como no v1', TECH_FIELDS.length, 18);
check('vazio vale', cleanTechnical({}), { ok: true, data: {} });
check('não-objeto recusa', cleanTechnical('x').ok, false);
check('lista recusa', cleanTechnical([]).ok, false);
check('escolha válida', cleanTechnical({ formato_olho: 'amendoado', curvatura_preferida: 'CC' }), { ok: true, data: { formato_olho: 'amendoado', curvatura_preferida: 'CC' } });
check('opção que não existe', cleanTechnical({ formato_olho: 'quadrado' }), { ok: false, message: 'Opção inválida em "Formato do olho".' });
check('vazio some', cleanTechnical({ formato_olho: '', tipo_adesivo: null }), { ok: true, data: {} });
check('sim/não', cleanTechnical({ maquiagem_prova_agua: true, exposicao_calor_agua: false }), { ok: true, data: { maquiagem_prova_agua: true, exposicao_calor_agua: false } });
check('sim/não como texto recusa', cleanTechnical({ maquiagem_prova_agua: 'true' }).ok, false);
check('dias em texto vira número', cleanTechnical({ tempo_medio_retencao_dias: ' 21 ' }), { ok: true, data: { tempo_medio_retencao_dias: 21 } });
check('dias número', cleanTechnical({ frequencia_manutencao_dias: 15 }), { ok: true, data: { frequencia_manutencao_dias: 15 } });
check('dias zero recusa', cleanTechnical({ tempo_medio_retencao_dias: '0' }).ok, false);
check('dias acima de 365 recusa', cleanTechnical({ tempo_medio_retencao_dias: 400 }).ok, false);
check('dias quebrado recusa', cleanTechnical({ tempo_medio_retencao_dias: '2.5' }).ok, false);
check('texto limpa espaços', cleanTechnical({ comprimento_predominante: '  8-13mm  ' }), { ok: true, data: { comprimento_predominante: '8-13mm' } });
check('texto longo recusa', cleanTechnical({ comprimento_predominante: 'x'.repeat(41) }).ok, false);
check('observação mantém linhas', cleanTechnical({ observacoes_retencao: 'a\r\nb ' }), { ok: true, data: { observacoes_retencao: 'a\nb' } });
check('chave de fora é ignorada', cleanTechnical({ alergias: 'látex', formato_olho: 'fundo' }), { ok: true, data: { formato_olho: 'fundo' } });
check('ler do banco descarta lixo', readTechnical({ formato_olho: 'xx', tecnica_preferida: 'hibrido', tempo_medio_retencao_dias: 21, outro: 1 }), { tecnica_preferida: 'hibrido', tempo_medio_retencao_dias: 21 });
check('ler nulo', readTechnical(null), {});
check(
  'resumo completo',
  technicalSummary({ tecnica_preferida: 'volume_russo', mapping_preferido: 'gatinho', curvatura_preferida: 'C', espessura_preferida: '0.07', comprimento_predominante: '8-13mm', efeito_desejado: 'natural' }),
  'Volume Russo · Gatinho (Cat Eye) · C 0.07 · 8-13mm · Natural'
);
check('resumo só espessura', technicalSummary({ espessura_preferida: '0.05' }), '0.05');
check('resumo sem preferências', technicalSummary({ formato_olho: 'fundo' }), null);
check('conta preenchidos', countTechnicalFilled({ formato_olho: 'fundo', maquiagem_prova_agua: false }), 2);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
