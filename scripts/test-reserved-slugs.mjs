// Endereços reservados (F13) — `node scripts/test-reserved-slugs.mjs`.
import { readdirSync, statSync } from 'node:fs';
import { RESERVED_SLUGS } from '../src/lib/reserved-slugs.ts';

let failures = 0;
function check(name, ok, extra) {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    if (extra !== undefined) console.log('     ', JSON.stringify(extra));
  }
}
const appDirs = readdirSync('src/app').filter((d) => !d.startsWith('[') && !d.startsWith('(') && !d.startsWith('_') && statSync(`src/app/${d}`).isDirectory());
const missing = appDirs.filter((d) => !RESERVED_SLUGS.includes(d));
check('toda pasta de primeiro nível de src/app é reservada', missing.length === 0, missing);
const publicDirs = readdirSync('public').filter((d) => statSync(`public/${d}`).isDirectory());
const missingPublic = publicDirs.filter((d) => !RESERVED_SLUGS.includes(d));
check('toda pasta de public/ é reservada', missingPublic.length === 0, missingPublic);
check('subdomínios do e-mail (Resend) reservados', ['send', 'resend', 'mail'].every((s) => RESERVED_SLUGS.includes(s)));
check('www e admin reservados', ['www', 'admin', 'api', 'app'].every((s) => RESERVED_SLUGS.includes(s)));
check('tudo em minúsculas e sem repetição', RESERVED_SLUGS.every((s) => s === s.toLowerCase()) && new Set(RESERVED_SLUGS).size === RESERVED_SLUGS.length);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
