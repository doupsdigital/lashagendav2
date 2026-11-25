/** Perfil da cliente (F7.2): validação dos dados editados pela profissional.
 *  Arquivo puro (sem imports) — o `scripts/test-client-profile.mjs` roda
 *  direto no Node. O WhatsApp é validado à parte (`client-phone.ts`). */

export const MAX_PROFILE_NAME = 120;
export const MAX_CLIENT_EMAIL = 160;
export const MAX_CLIENT_NOTES = 1000;

export interface ClientProfileInput {
  name?: unknown;
  email?: unknown;
  birth_date?: unknown;
  notes?: unknown;
}

export interface CleanClientProfile {
  name: string;
  email: string | null;
  birth_date: string | null;
  notes: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Data "AAAA-MM-DD" que existe de verdade, não está no futuro e não é antes
 *  de 1900. `today` no mesmo formato (fuso do estúdio). */
export function isValidBirthDate(value: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  return y >= 1900 && value <= today;
}

/** Valida e limpa os dados do perfil. Campos opcionais vazios viram null. */
export function cleanClientProfile(
  input: ClientProfileInput,
  today: string
): { ok: true; data: CleanClientProfile } | { ok: false; message: string } {
  const name = typeof input.name === 'string' ? input.name.replace(/\s+/g, ' ').trim().slice(0, MAX_PROFILE_NAME) : '';
  if (name.length < 2) return { ok: false, message: 'Escreva o nome da cliente.' };

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email && (email.length > MAX_CLIENT_EMAIL || !EMAIL_RE.test(email))) {
    return { ok: false, message: 'E-mail inválido — confira o que foi digitado.' };
  }

  const birth = typeof input.birth_date === 'string' ? input.birth_date.trim() : '';
  if (birth && !isValidBirthDate(birth, today)) return { ok: false, message: 'Data de nascimento inválida.' };

  const notes = typeof input.notes === 'string' ? input.notes.replace(/\r\n/g, '\n').trim() : '';
  if (notes.length > MAX_CLIENT_NOTES) {
    return { ok: false, message: `Observações muito longas (máximo ${MAX_CLIENT_NOTES} caracteres).` };
  }

  return { ok: true, data: { name, email: email || null, birth_date: birth || null, notes: notes || null } };
}

/** Idade completa em `today` ("AAAA-MM-DD"). */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** "12/03/1990 · 35 anos". */
export function birthDateLabel(birthDate: string, today: string): string {
  const [y, m, d] = birthDate.split('-');
  const age = ageOn(birthDate, today);
  return `${d}/${m}/${y} · ${age === 1 ? '1 ano' : `${age} anos`}`;
}

/** Motivo de não excluir: a cliente tem agendamentos (de qualquer tipo). */
export function deleteBlockedMessage(appointments: number): string {
  const n = appointments === 1 ? '1 agendamento' : `${appointments} agendamentos`;
  return `Ela tem ${n} no histórico, por isso não pode ser excluída — o histórico e os números do estúdio dependem deles.`;
}
