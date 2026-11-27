// Testes do checklist "Primeiros passos" (F11.5) — `node scripts/test-self-serve-onboarding.mjs`.
import {
  SELF_SERVE_STEP_ORDER,
  SELF_SERVE_STEP_VIDEOS,
  getSelfServeStepsDone,
  countSelfServeStepsDone,
  parseOnboardingSteps,
  servicesLookEdited,
  toYoutubeEmbed,
} from '../src/lib/self-serve-onboarding.ts';
import { ACCESS_EMAIL_STEPS } from '../src/lib/access-email.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}
const none = { hasAccount: false, hoursDone: false, servicesEdited: false };
const all = { hasAccount: true, hoursDone: true, servicesEdited: true };

check('ordem do plano: WhatsApp → serviços → horários → acesso → compartilhar', SELF_SERVE_STEP_ORDER, ['whatsapp', 'menu', 'horarios', 'acesso', 'compartilhar']);
check('mesmo número de passos do e-mail de acesso', SELF_SERVE_STEP_ORDER.length, ACCESS_EMAIL_STEPS.length);
check('todo passo tem lugar no arquivo de vídeos', SELF_SERVE_STEP_ORDER.every((id) => typeof SELF_SERVE_STEP_VIDEOS[id] === 'string'), true);

check('estúdio novo: nada feito', countSelfServeStepsDone({}, none), 0);
check('tudo feito', countSelfServeStepsDone({ whatsapp: 'x', compartilhar: 'x' }, all), 5);
check('horários vêm do banco, não do jsonb', getSelfServeStepsDone({ horarios: 'x' }, none).horarios, false);
check('serviços: marca sozinho quando ela mexe', getSelfServeStepsDone({}, { ...none, servicesEdited: true }).menu, true);
check('serviços: ou quando ela diz que os de exemplo servem', getSelfServeStepsDone({ menu: 'x' }, none).menu, true);
check('acesso vem do login vinculado', getSelfServeStepsDone({ acesso: 'x' }, none).acesso, false);

check('jsonb: só guarda passos marcáveis', parseOnboardingSteps({ whatsapp: 't', horarios: 't', acesso: 't', lixo: 1 }), { whatsapp: 't' });
check('jsonb inválido vira vazio', parseOnboardingSteps(['x']), {});

const created = '2026-11-27T12:00:00.000Z';
check('serviços de exemplo (mesmo instante): não mexeu', servicesLookEdited(created, '2026-11-27T12:00:01.000Z'), false);
check('salvou o catálogo depois: mexeu', servicesLookEdited(created, '2026-11-27T15:30:00.000Z'), true);
check('sem serviço nenhum: não conta', servicesLookEdited(created, null), false);

check('YouTube shorts vira embed', toYoutubeEmbed('https://youtube.com/shorts/abcdef123'), 'https://www.youtube.com/embed/abcdef123?rel=0&playsinline=1');
check('mp4 não é YouTube', toYoutubeEmbed('https://x.com/v.mp4'), null);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
