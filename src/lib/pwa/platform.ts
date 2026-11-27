/** Qual passo a passo de instalação mostrar (F12.2). Arquivo puro (sem
 *  imports): `scripts/test-pwa-platform.mjs` roda direto no Node. */

export interface InstallPlatform {
  /** iPhone/iPad: só instala pelo menu Compartilhar, nunca por diálogo. */
  isIOS: boolean;
  isAndroid: boolean;
  /** Navegador de dentro de outro app (Instagram, Facebook, TikTok...): não
   *  instala; precisa abrir o endereço no Safari/Chrome. */
  inAppBrowser: boolean;
}

/** `hasTouch`: iPad moderno (iPadOS 13+) se diz "Mac" no user agent, mas tem
 *  toque — Mac de verdade não. */
export function detectInstallPlatform(userAgent: string, hasTouch: boolean): InstallPlatform {
  const ua = userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && hasTouch);
  const isAndroid = !isIOS && /Android/i.test(ua);
  const inAppBrowser = /Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|Bytedance|Snapchat|Pinterest/i.test(ua);
  return { isIOS, isAndroid, inAppBrowser };
}
