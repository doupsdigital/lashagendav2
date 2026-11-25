export const PRODUCTION_DOMAIN = 'lashagenda.com';

/** Se o host atual usa o roteamento por subdomínio (`slug.lashagenda.com`,
 *  ver `src/proxy.ts`) — true no domínio oficial, false em
 *  localhost/*.vercel.app, onde esse roteamento é propositalmente ignorado
 *  (ver comentário em `proxy.ts`). */
export function usesSubdomainRouting(hostname: string): boolean {
  return hostname !== 'localhost' && !hostname.endsWith('.vercel.app');
}

/** Link público do catálogo no host atual — `slug.lashagenda.com` no domínio
 *  oficial, `<origin>/c/slug` em localhost/preview (mesma regra do
 *  `ShareLinkButton`). Só no navegador. */
export function publicCatalogUrl(slug: string, location: { hostname: string; origin: string }): string {
  return usesSubdomainRouting(location.hostname) ? `https://${slug}.${PRODUCTION_DOMAIN}` : `${location.origin}/c/${slug}`;
}
