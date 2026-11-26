// Consentimento da cliente para guardar os dados de saúde da ficha (F8.3) —
// LGPD: dado de saúde é dado pessoal sensível e precisa de autorização. Fica
// em `client_records.consent_at`. Puro: sem imports.

/** O que a profissional confirma que a cliente autorizou. */
export const CONSENT_TEXT =
  'A cliente autorizou guardar estas informações para cuidar do atendimento dela. Elas ficam só aqui no app, só você vê, e são apagadas se ela pedir.';

/** "Autorizado em 26/11/2026 às 14:30" (fuso de São Paulo). */
export function consentLabel(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  const hour = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  return `Autorizado em ${date} às ${hour}`;
}
