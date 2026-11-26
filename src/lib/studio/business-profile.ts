/** "Meu negócio" na Config (F10.1). Arquivo puro (sem imports) — o
 *  `scripts/test-business-profile.mjs` roda direto no Node. Grava nas mesmas
 *  colunas de `studios` que o editor do catálogo usa (um dado só, dois
 *  lugares para mudar). O WhatsApp é tratado à parte, com `client-phone`. */

export const MAX_OWNER_NAME = 80;
export const MAX_STUDIO_NAME = 80;
export const MAX_ADDRESS = 200;
export const MAX_MAPS_URL = 500;

export interface BusinessProfileInput {
  owner_name?: unknown;
  studio_name?: unknown;
  instagram?: unknown;
  address?: unknown;
  maps_url?: unknown;
}

export interface CleanBusinessProfile {
  owner_name: string;
  studio_name: string | null;
  instagram: string | null;
  address: string | null;
  maps_url: string | null;
}

export type CleanBusinessResult = { ok: true; data: CleanBusinessProfile } | { ok: false; field: string; message: string };

const text = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

/** "@ju.lash", "ju.lash", "instagram.com/ju.lash/", "https://www.instagram.com/ju.lash?igsh=x"
 *  → "ju.lash". Vazio → "". Inválido → null. */
export function cleanInstagram(raw: unknown): string | null {
  let v = text(raw);
  if (!v) return '';
  v = v.replace(/^https?:\/\//i, '').replace(/^(www\.)?instagram\.com\//i, '');
  v = v.split(/[/?#]/)[0].replace(/^@/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(v) ? v.toLowerCase() : null;
}

/** Link do mapa: precisa ser um endereço http(s) de verdade. Sem o
 *  "https://" na frente, completa. Vazio → "". Inválido → null. */
export function cleanMapsUrl(raw: unknown): string | null {
  let v = text(raw).replace(/\s/g, '');
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  if (v.length > MAX_MAPS_URL) return null;
  try {
    const u = new URL(v);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function cleanBusinessProfile(input: BusinessProfileInput): CleanBusinessResult {
  const owner = text(input.owner_name);
  if (!owner) return { ok: false, field: 'owner_name', message: 'Escreva o seu nome.' };
  if (owner.length > MAX_OWNER_NAME) return { ok: false, field: 'owner_name', message: `Seu nome pode ter até ${MAX_OWNER_NAME} letras.` };

  const studio = text(input.studio_name);
  if (studio.length > MAX_STUDIO_NAME) return { ok: false, field: 'studio_name', message: `O nome do estúdio pode ter até ${MAX_STUDIO_NAME} letras.` };

  const instagram = cleanInstagram(input.instagram);
  if (instagram === null) return { ok: false, field: 'instagram', message: 'Esse Instagram não parece certo. Escreva só o @ do perfil.' };

  const address = text(input.address);
  if (address.length > MAX_ADDRESS) return { ok: false, field: 'address', message: `O endereço pode ter até ${MAX_ADDRESS} letras.` };

  const maps = cleanMapsUrl(input.maps_url);
  if (maps === null) return { ok: false, field: 'maps_url', message: 'Esse link do mapa não parece certo. Copie o link de compartilhar do Google Maps.' };

  return {
    ok: true,
    data: {
      owner_name: owner,
      studio_name: studio || null,
      instagram: instagram || null,
      address: address || null,
      maps_url: maps || null,
    },
  };
}
