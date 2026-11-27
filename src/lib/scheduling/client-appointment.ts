/** Regras do link único do agendamento da cliente (F5.4) — puras, usadas
 *  pela página `/c/<slug>/agendamento/<token>`, pela rota de cancelar e pelo
 *  arquivo de agenda (.ics). Sem imports: dá para testar direto no Node. */

/** `appointments.manage_token`: 16 bytes em hexadecimal. */
const MANAGE_TOKEN_RE = /^[0-9a-f]{32}$/;

export function isValidManageToken(value: unknown): value is string {
  return typeof value === 'string' && MANAGE_TOKEN_RE.test(value);
}

/** Caminho do link único (relativo — funciona no domínio principal e no
 *  subdomínio do estúdio). */
export function manageAppointmentPath(slug: string, token: string): string {
  return `/c/${slug}/agendamento/${token}`;
}

export type ClientCancelState =
  | { canCancel: true; deadline: Date }
  | { canCancel: false; reason: 'already_canceled' | 'finished' | 'past' | 'too_late'; deadline: Date | null };

/** A cliente pode cancelar pelo link? Só agendamento aguardando/confirmado,
 *  ainda no futuro e antes do prazo (`cancellation_notice_hours` antes do
 *  horário). Depois do prazo, a tela mostra o WhatsApp do estúdio. */
export function clientCancelState(
  status: string,
  startsAt: Date,
  cancellationNoticeHours: number,
  now: Date = new Date()
): ClientCancelState {
  if (status === 'canceled') return { canCancel: false, reason: 'already_canceled', deadline: null };
  if (status !== 'pending' && status !== 'confirmed') return { canCancel: false, reason: 'finished', deadline: null };
  if (startsAt <= now) return { canCancel: false, reason: 'past', deadline: null };
  const deadline = new Date(startsAt.getTime() - Math.max(0, cancellationNoticeHours) * 3_600_000);
  if (now > deadline) return { canCancel: false, reason: 'too_late', deadline };
  return { canCancel: true, deadline };
}

/** Data/hora no formato do .ics (UTC): 20270303T120000Z. */
function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Texto seguro dentro do .ics (vírgula, ponto e vírgula, barra, quebra). */
function icsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export interface IcsEventInput {
  uid: string;
  startsAt: Date;
  endsAt: Date;
  title: string;
  description?: string;
  location?: string;
  url?: string;
  now?: Date;
}

/** Arquivo de calendário com um evento e um lembrete 1 dia antes. Abre no
 *  calendário do iPhone, Android (Google Agenda) e Outlook. */
export function buildIcsEvent(input: IcsEventInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LashAgenda//Agendamento//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.uid}@lashagenda`,
    `DTSTAMP:${icsDate(input.now ?? new Date())}`,
    `DTSTART:${icsDate(input.startsAt)}`,
    `DTEND:${icsDate(input.endsAt)}`,
    `SUMMARY:${icsText(input.title)}`,
    ...(input.description ? [`DESCRIPTION:${icsText(input.description)}`] : []),
    ...(input.location ? [`LOCATION:${icsText(input.location)}`] : []),
    ...(input.url ? [`URL:${input.url}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(input.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.join('\r\n')}\r\n`;
}
