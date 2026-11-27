/** Regras do acesso por e-mail e senha (F11.6). Arquivo puro (sem imports):
 *  o `scripts/test-access-rules.mjs` roda direto no Node. Valem no servidor
 *  (criar acesso, nova senha) e na tela, para a mensagem bater. */

export const PASSWORD_MIN = 8;
/** Limite do bcrypt usado pelo Supabase Auth (bytes). */
export const PASSWORD_MAX = 72;
const EMAIL_MAX = 254;

/** E-mail limpo (sem espaços, minúsculo) ou null se não parece e-mail. */
export function cleanAccessEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

/** Problema da senha, ou null se está boa. */
export function passwordProblem(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length < PASSWORD_MIN) return `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`;
  if (new TextEncoder().encode(raw).length > PASSWORD_MAX) return 'Essa senha é longa demais. Use uma menor.';
  if (!raw.trim()) return 'A senha não pode ser só espaços.';
  return null;
}
