/** Nomes que nunca podem ser endereço (slug) de estúdio — colidem com rotas
 *  reais do app, com subdomínios do próprio produto ou com registros de DNS de
 *  `lashagenda.com` (um registro fixo ganha do `*`, então o catálogo com esse
 *  nome nunca abriria). Revisado na F13 (`scripts/test-reserved-slugs.mjs`
 *  confere que toda pasta de primeiro nível de `src/app` está aqui). Arquivo
 *  puro, sem imports. */
export const RESERVED_SLUGS = [
  // Produto
  'www',
  'lashagenda',
  'admin',
  'api',
  'app',
  'entrar',
  'ativando',
  'lash',
  'conta',
  'login',
  'painel',
  'suporte',
  'ajuda',
  'blog',
  'status',
  // Rotas curtas e pastas do app
  'a',
  'c',
  'e',
  'modelos',
  'clientes',
  'splash',
  'landing',
  // Ambientes
  'dev',
  'desenv',
  'teste',
  'test',
  'staging',
  'preview',
  'beta',
  // DNS / e-mail (Resend usa `send` e `resend._domainkey`; outros comuns)
  'send',
  'rsend',
  'resend',
  'mail',
  'email',
  'smtp',
  'imap',
  'pop',
  'webmail',
  'mx',
  'ns1',
  'ns2',
  'ftp',
  'cdn',
  'static',
  'assets',
  'img',
  'media',
  // Pagamento
  'cakto',
  'checkout',
  'pagamento',
  'pay',
];
