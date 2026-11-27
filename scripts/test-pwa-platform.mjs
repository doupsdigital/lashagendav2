// Testes da detecção de aparelho para instalar o app (F12.2) — `node scripts/test-pwa-platform.mjs`.
import { detectInstallPlatform } from '../src/lib/pwa/platform.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}
const d = (ua, touch = true) => {
  const p = detectInstallPlatform(ua, touch);
  return [p.isIOS, p.isAndroid, p.inAppBrowser];
};

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const INSTA_IOS = `${IPHONE} Instagram 350.0.0.0 (iPhone14,5; iOS 18_5; pt_BR)`;
const FB_ANDROID = `${ANDROID} [FB_IAB/FB4A;FBAV/480.0.0.0;]`;
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

check('iPhone no Safari', d(IPHONE), [true, false, false]);
check('iPad que se diz Mac (com toque)', d(IPAD, true), [true, false, false]);
check('Mac de verdade (sem toque) não é iOS', d(IPAD, false), [false, false, false]);
check('Android no Chrome', d(ANDROID), [false, true, false]);
check('Instagram no iPhone: iOS + navegador de app', d(INSTA_IOS), [true, false, true]);
check('Facebook no Android: Android + navegador de app', d(FB_ANDROID), [false, true, true]);
check('computador: nada', d(DESKTOP, false), [false, false, false]);
check('user agent vazio não quebra', d('', false), [false, false, false]);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
