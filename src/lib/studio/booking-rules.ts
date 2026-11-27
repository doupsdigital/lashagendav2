/** Regras de agendamento na Config (F10.2). Arquivo puro (sem imports) — o
 *  `scripts/test-booking-rules.mjs` roda direto no Node. As colunas já
 *  existiam e já valiam no agendamento; aqui só ganham tela. */

export interface RuleOption {
  value: number;
  label: string;
}

/** Antecedência mínima para agendar (`min_notice_minutes`). */
export const MIN_NOTICE_OPTIONS: RuleOption[] = [
  { value: 0, label: 'Sem mínimo' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1h' },
  { value: 120, label: '2h' },
  { value: 180, label: '3h' },
  { value: 360, label: '6h' },
  { value: 720, label: '12h' },
  { value: 1440, label: '1 dia' },
  { value: 2880, label: '2 dias' },
];

/** Até quantos dias à frente (`booking_window_days`). */
export const WINDOW_OPTIONS: RuleOption[] = [
  { value: 7, label: '7 dias' },
  { value: 15, label: '15 dias' },
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '90 dias' },
  { value: 180, label: '6 meses' },
  { value: 365, label: '1 ano' },
];

/** Até quando a cliente cancela pelo link (`cancellation_notice_hours`). */
export const CANCEL_OPTIONS: RuleOption[] = [
  { value: 0, label: 'Até a hora' },
  { value: 2, label: '2h antes' },
  { value: 6, label: '6h antes' },
  { value: 12, label: '12h antes' },
  { value: 24, label: '1 dia antes' },
  { value: 48, label: '2 dias antes' },
  { value: 72, label: '3 dias antes' },
];

export const MAX_POST_BOOKING_MESSAGE = 500;

export interface BookingRules {
  booking_mode: 'auto' | 'approval';
  whatsapp_button_enabled: boolean;
  min_notice_minutes: number;
  booking_window_days: number;
  cancellation_notice_hours: number;
  /** Vazio = sem mensagem. */
  post_booking_message: string;
}

export type CleanRulesResult = { ok: true; data: BookingRules } | { ok: false; field: keyof BookingRules; message: string };

/** Inteiro dentro dos limites do banco. A tela só oferece as opções, mas um
 *  valor antigo fora delas (ex.: mudado direto no banco) continua salvável. */
const inRange = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Confere o que veio da tela. Quebras de
 *  linha da mensagem ficam (no máximo uma linha em branco seguida). */
export function cleanBookingRules(input: Record<string, unknown>): CleanRulesResult {
  if (input.booking_mode !== 'auto' && input.booking_mode !== 'approval') {
    return { ok: false, field: 'booking_mode', message: 'Escolha como os agendamentos entram.' };
  }
  if (typeof input.whatsapp_button_enabled !== 'boolean') {
    return { ok: false, field: 'whatsapp_button_enabled', message: 'Escolha se o botão de WhatsApp aparece.' };
  }
  if (!inRange(input.min_notice_minutes, 0, 10080)) {
    return { ok: false, field: 'min_notice_minutes', message: 'Escolha a antecedência mínima.' };
  }
  if (!inRange(input.booking_window_days, 1, 365)) {
    return { ok: false, field: 'booking_window_days', message: 'Escolha até quantos dias à frente.' };
  }
  if (!inRange(input.cancellation_notice_hours, 0, 720)) {
    return { ok: false, field: 'cancellation_notice_hours', message: 'Escolha até quando ela pode cancelar.' };
  }
  const raw = typeof input.post_booking_message === 'string' ? input.post_booking_message : '';
  const message = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (message.length > MAX_POST_BOOKING_MESSAGE) {
    return { ok: false, field: 'post_booking_message', message: `A mensagem pode ter até ${MAX_POST_BOOKING_MESSAGE} letras.` };
  }
  return {
    ok: true,
    data: {
      booking_mode: input.booking_mode,
      whatsapp_button_enabled: input.whatsapp_button_enabled,
      min_notice_minutes: input.min_notice_minutes,
      booking_window_days: input.booking_window_days,
      cancellation_notice_hours: input.cancellation_notice_hours,
      post_booking_message: message,
    },
  };
}

/** Valor salvo fora das opções (ex.: mudado direto no banco): mostra como
 *  opção extra, para a tela não fingir que é outro. */
export function optionsWith(opts: RuleOption[], value: number, label: (v: number) => string): RuleOption[] {
  return opts.some((o) => o.value === value) ? opts : [...opts, { value, label: label(value) }].sort((a, b) => a.value - b.value);
}
