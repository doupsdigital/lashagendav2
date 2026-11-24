/** Nomes que nunca podem ser tratados como subdomínio de cliente — colidem
 *  com rotas reais do app ou com domínios do próprio produto. Conferir de
 *  novo contra os registros DNS de `lashagenda.com` na F13. */
export const RESERVED_SLUGS = [
  'www',
  'lashagenda',
  'admin',
  'api',
  'app',
  'c',
  'entrar',
  'modelos',
  'clientes',
  // Subdomínios do DNS do Resend (e-mail): o registro CNAME fixo ganharia
  // do `*`, então um catálogo com esse slug nunca abriria.
  'send',
  'rsend',
];
