// Ações da profissional sobre um agendamento (F6.3): quais mudanças de status
// valem e as mensagens prontas de WhatsApp para a cliente. Regras puras, sem
// imports (testadas por `scripts/test-appointment-actions.mjs`).

export type AppointmentStatus = 'pending' | 'confirmed' | 'canceled' | 'completed' | 'no_show';

/** Tamanho máximo do motivo da recusa/cancelamento. */
export const MAX_CANCEL_REASON = 300;

/** Para onde cada status pode ir pela agenda da profissional.
 *  - Aguardando: confirmar ou recusar (recusa = cancelado por ela).
 *  - Confirmado: concluir, marcar falta ou cancelar.
 *  - Concluído/falta: trocar entre si ou voltar a confirmado (desfazer engano).
 *  - Cancelado não volta: o horário pode já ter sido ocupado. */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'canceled'],
  confirmed: ['completed', 'no_show', 'canceled'],
  completed: ['confirmed', 'no_show'],
  no_show: ['confirmed', 'completed'],
  canceled: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Mensagem de erro quando a mudança não vale — o caso mais comum é a
 *  cliente ter cancelado pelo link enquanto a profissional olhava a tela. */
export function transitionProblem(from: AppointmentStatus, to: AppointmentStatus): string | null {
  if (canTransition(from, to)) return null;
  if (from === 'canceled') return 'Esse agendamento já foi cancelado.';
  if (from === to) {
    return to === 'confirmed' ? 'Esse agendamento já está confirmado.' : 'Esse agendamento já está com esse status.';
  }
  if (from === 'pending') return 'Confirme o agendamento antes.';
  return 'Não dá para fazer isso com esse agendamento.';
}

/** Motivo limpo (espaços, tamanho) ou `null` se vazio. */
export function cleanCancelReason(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim().slice(0, MAX_CANCEL_REASON);
  return text || null;
}

export interface WhatsappMessageInput {
  clientName: string;
  /** "26 de novembro" */
  dateLabel: string;
  /** "14:00" */
  time: string;
  services: string;
  /** Link único da cliente (ver/cancelar). */
  manageUrl?: string;
  /** Link do catálogo, para ela escolher outro horário. */
  catalogUrl?: string;
  reason?: string | null;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || '';
}

export function buildConfirmMessage(input: WhatsappMessageInput): string {
  const lines = [
    `Olá, ${firstName(input.clientName)}! Seu horário está *confirmado* ✨`,
    '',
    `📅 ${input.dateLabel} às ${input.time}`,
    `💆 ${input.services}`,
  ];
  if (input.manageUrl) lines.push('', `Para ver ou cancelar: ${input.manageUrl}`);
  lines.push('', 'Te espero! 💗');
  return lines.join('\n');
}

export function buildRejectMessage(input: WhatsappMessageInput): string {
  const lines = [
    `Olá, ${firstName(input.clientName)}! Infelizmente não vou conseguir te atender em *${input.dateLabel} às ${input.time}* (${input.services}).`,
  ];
  if (input.reason) lines.push('', input.reason);
  lines.push(
    '',
    input.catalogUrl ? `Se quiser, escolha outro horário aqui: ${input.catalogUrl}` : 'Me chama aqui para escolhermos outro horário. 💗'
  );
  return lines.join('\n');
}
