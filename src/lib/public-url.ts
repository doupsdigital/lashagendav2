export const PRODUCTION_DOMAIN = 'lashagenda.com';

/** Se o host atual usa o roteamento por subdomínio (`slug.lashagenda.com`,
 *  ver `src/proxy.ts`) — true no domínio oficial, false em
 *  localhost/*.vercel.app, onde esse roteamento é propositalmente ignorado
 *  (ver comentário em `proxy.ts`). */
export function usesSubdomainRouting(hostname: string): boolean {
  return hostname !== 'localhost' && !hostname.endsWith('.vercel.app');
}
