// Testes das regras de agendamento (F10.2) — `node scripts/test-booking-rules.mjs`.
import { cleanBookingRules, optionsWith, MIN_NOTICE_OPTIONS } from '../src/lib/studio/booking-rules.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

const base = {
  booking_mode: 'approval',
  whatsapp_button_enabled: true,
  min_notice_minutes: 120,
  booking_window_days: 60,
  cancellation_notice_hours: 24,
  post_booking_message: '',
};
check('padrão ok', cleanBookingRules(base), { ok: true, data: base });
check('automático', cleanBookingRules({ ...base, booking_mode: 'auto' }).ok, true);
check('modo inválido', cleanBookingRules({ ...base, booking_mode: 'x' }).field, 'booking_mode');
check('botão precisa ser sim/não', cleanBookingRules({ ...base, whatsapp_button_enabled: 'true' }).field, 'whatsapp_button_enabled');
check('antecedência zero', cleanBookingRules({ ...base, min_notice_minutes: 0 }).ok, true);
check('antecedência fora do banco', cleanBookingRules({ ...base, min_notice_minutes: 10081 }).field, 'min_notice_minutes');
check('antecedência quebrada', cleanBookingRules({ ...base, min_notice_minutes: 1.5 }).field, 'min_notice_minutes');
check('valor antigo fora das opções ainda salva', cleanBookingRules({ ...base, min_notice_minutes: 45 }).ok, true);
check('janela zero', cleanBookingRules({ ...base, booking_window_days: 0 }).field, 'booking_window_days');
check('janela 1 ano', cleanBookingRules({ ...base, booking_window_days: 365 }).ok, true);
check('cancelar texto', cleanBookingRules({ ...base, cancellation_notice_hours: '24' }).field, 'cancellation_notice_hours');
check('cancelar acima do banco', cleanBookingRules({ ...base, cancellation_notice_hours: 721 }).field, 'cancellation_notice_hours');

const msg = cleanBookingRules({ ...base, post_booking_message: '  Oi!   Chegue 10 min antes.\r\n\r\n\r\n\r\nTraga   o cartão.  ' });
check('mensagem limpa, linhas mantidas', msg.ok && msg.data.post_booking_message, 'Oi! Chegue 10 min antes.\n\nTraga o cartão.');
check('mensagem longa', cleanBookingRules({ ...base, post_booking_message: 'a'.repeat(501) }).field, 'post_booking_message');
check('mensagem não-texto vira vazia', cleanBookingRules({ ...base, post_booking_message: 5 }).ok && cleanBookingRules({ ...base, post_booking_message: 5 }).data.post_booking_message, '');

check('opção salva já existe', optionsWith(MIN_NOTICE_OPTIONS, 120, (v) => `${v}`).length, MIN_NOTICE_OPTIONS.length);
const extra = optionsWith(MIN_NOTICE_OPTIONS, 45, (v) => `${v} min`);
check('opção salva fora da lista entra no lugar certo', [extra.length, extra[2]], [MIN_NOTICE_OPTIONS.length + 1, { value: 45, label: '45 min' }]);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
