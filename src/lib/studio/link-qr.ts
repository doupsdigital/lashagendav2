import 'server-only';
import QRCode from 'qrcode';
import { PRODUCTION_DOMAIN } from '../public-url';

/** QR code do link oficial do catálogo (F10.3), como PNG em data URL.
 *  Sempre o endereço de produção (`<slug>.lashagenda.com`): o QR é para
 *  imprimir, então nunca aponta para localhost/preview. Gerado no servidor,
 *  sem serviço de fora. */
export function linkQrDataUrl(slug: string, width = 512): Promise<string> {
  return QRCode.toDataURL(`https://${slug}.${PRODUCTION_DOMAIN}`, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width,
    color: { dark: '#2C1810', light: '#FFFFFF' },
  });
}
