// Testes das ações da profissional (F6.3) — `node scripts/test-appointment-actions.mjs`.
// Mudanças de status, motivo da recusa e mensagens de WhatsApp, sem banco nem servidor.
import {
  buildConfirmMessage,
  buildRejectMessage,
  canTransition,
  cleanCancelReason,
  MAX_CANCEL_REASON,
  transitionProblem,
} from '../src/lib/scheduling/appointment-actions.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

check('aguardando → confirmar', canTransition('pending', 'confirmed'), true);
check('aguardando → recusar', canTransition('pending', 'canceled'), true);
check('aguardando → concluir (não)', canTransition('pending', 'completed'), false);
check('confirmado → concluir', canTransition('confirmed', 'completed'), true);
check('confirmado → falta', canTransition('confirmed', 'no_show'), true);
check('confirmado → cancelar', canTransition('confirmed', 'canceled'), true);
check('confirmado → confirmar de novo (não)', canTransition('confirmed', 'confirmed'), false);
check('concluído → falta (corrigir)', canTransition('completed', 'no_show'), true);
check('falta → confirmado (desfazer)', canTransition('no_show', 'confirmed'), true);
check('cancelado → confirmar (não)', canTransition('canceled', 'confirmed'), false);
check('cancelado → cancelar de novo (não)', canTransition('canceled', 'canceled'), false);
check('mensagem: cliente já cancelou', transitionProblem('canceled', 'confirmed'), 'Esse agendamento já foi cancelado.');
check('mensagem: já confirmado', transitionProblem('confirmed', 'confirmed'), 'Esse agendamento já está confirmado.');
check('mensagem: concluir sem confirmar', transitionProblem('pending', 'completed'), 'Confirme o agendamento antes.');
check('mudança válida não tem problema', transitionProblem('pending', 'confirmed'), null);

check('motivo vazio vira null', cleanCancelReason('   '), null);
check('motivo não-texto vira null', cleanCancelReason(42), null);
check('motivo com espaços sobrando', cleanCancelReason('  Vou viajar \n nesse dia  '), 'Vou viajar nesse dia');
check('motivo cortado no limite', cleanCancelReason('x'.repeat(500)).length, MAX_CANCEL_REASON);

const base = { clientName: 'Joana Silva', dateLabel: '26 de novembro', time: '14:00', services: 'Volume Russo + Remoção' };
const confirm = buildConfirmMessage({ ...base, manageUrl: 'https://x/c/teste/agendamento/abc' });
check('confirmação com o primeiro nome', confirm.startsWith('Olá, Joana!'), true);
check('confirmação com data, hora e serviços', confirm.includes('26 de novembro às 14:00') && confirm.includes('Volume Russo + Remoção'), true);
check('confirmação com o link da cliente', confirm.includes('Para ver ou cancelar: https://x/c/teste/agendamento/abc'), true);
check('confirmação sem link não fala de link', buildConfirmMessage(base).includes('Para ver'), false);

const reject = buildRejectMessage({ ...base, reason: 'Vou estar em curso nesse dia.', catalogUrl: 'https://teste.lashagenda.com' });
check('recusa com o motivo', reject.includes('Vou estar em curso nesse dia.'), true);
check('recusa com o catálogo', reject.includes('escolha outro horário aqui: https://teste.lashagenda.com'), true);
const rejectNoReason = buildRejectMessage({ ...base, reason: null });
check('recusa sem motivo nem catálogo', rejectNoReason.includes('Me chama aqui'), true);
check('recusa nunca diz "null"', rejectNoReason.includes('null'), false);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
