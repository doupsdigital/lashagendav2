/** Endereço do link (slug) — troca na Config (F10.3). Arquivo puro (sem
 *  imports) — o `scripts/test-slug-rules.mjs` roda direto no Node. A lista de
 *  nomes reservados é conferida no servidor (`reserved-slugs.ts`). */

export const MIN_SLUG = 3;
/** Mesmo limite do CHECK do banco (`studios.slug`). */
export const MAX_SLUG = 50;

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/;

/** O que ela digita → o formato do endereço, enquanto digita: minúsculas,
 *  sem acento, espaço e "_" viram "-", o resto sai, sem "--" repetido.
 *  Não tira o "-" do fim (ela pode estar no meio de digitar). */
export function typeSlug(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, MAX_SLUG);
}

/** Forma final para gravar (tira o "-" das pontas). */
export function finalSlug(raw: string): string {
  return typeSlug(raw).replace(/-+$/, '');
}

/** Mensagem do problema, ou null se o formato está certo. */
export function slugProblem(slug: string): string | null {
  if (slug.length < MIN_SLUG) return `O endereço precisa ter pelo menos ${MIN_SLUG} letras ou números.`;
  if (slug.length > MAX_SLUG) return `O endereço pode ter até ${MAX_SLUG} letras ou números.`;
  if (!SLUG_RE.test(slug)) return 'Use só letras, números e hífen (sem começar ou terminar com hífen).';
  return null;
}

/** Troca o slug antigo pelo novo nas chaves "já visto" do aparelho
 *  (`sm_tour_seen_<tela>_<slug>_…`, `sm_welcome_seen_v1_<slug>` etc.), para
 *  tours e boas-vindas não voltarem depois da troca. Devolve a chave nova,
 *  ou null se a chave não é desse slug. */
export function migrateStorageKey(key: string, oldSlug: string, newSlug: string): string | null {
  if (!key.startsWith('sm_')) return null;
  const marker = `_${oldSlug}`;
  let i = key.indexOf(marker);
  while (i !== -1) {
    const after = key[i + marker.length];
    if (after === undefined || after === '_') return key.slice(0, i) + `_${newSlug}` + key.slice(i + marker.length);
    i = key.indexOf(marker, i + 1);
  }
  return null;
}
