// Testes do "Meu negócio" (F10.1) — `node scripts/test-business-profile.mjs`.
import { cleanBusinessProfile, cleanInstagram, cleanMapsUrl } from '../src/lib/studio/business-profile.ts';

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failures += 1;
    console.log('     esperado:', JSON.stringify(expected), '| veio:', JSON.stringify(actual));
  }
}

check('instagram com @', cleanInstagram('@Ju.Lash'), 'ju.lash');
check('instagram sem @', cleanInstagram('ju_lash'), 'ju_lash');
check('instagram por link', cleanInstagram('https://www.instagram.com/ju.lash/?igsh=abc'), 'ju.lash');
check('instagram link sem https', cleanInstagram('instagram.com/ju.lash'), 'ju.lash');
check('instagram vazio', cleanInstagram('  '), '');
check('instagram com espaço', cleanInstagram('ju lash'), null);
check('instagram longo', cleanInstagram('a'.repeat(31)), null);

check('mapa completo', cleanMapsUrl('https://maps.app.goo.gl/AbC123'), 'https://maps.app.goo.gl/AbC123');
check('mapa sem https', cleanMapsUrl('maps.app.goo.gl/AbC123'), 'https://maps.app.goo.gl/AbC123');
check('mapa vazio', cleanMapsUrl(''), '');
check('mapa texto solto', cleanMapsUrl('perto da praça'), null);
check('mapa javascript', cleanMapsUrl('javascript:alert(1)'), null);

const ok = cleanBusinessProfile({
  owner_name: '  Fernanda   Lima ',
  studio_name: ' Studio Fê ',
  instagram: '@fe.lash',
  address: ' Rua 10,  nº 5 — Centro ',
  maps_url: 'maps.app.goo.gl/x1',
});
check('tudo certo, com espaços limpos', ok, {
  ok: true,
  data: { owner_name: 'Fernanda Lima', studio_name: 'Studio Fê', instagram: 'fe.lash', address: 'Rua 10, nº 5 — Centro', maps_url: 'https://maps.app.goo.gl/x1' },
});
check('campos opcionais vazios viram null', cleanBusinessProfile({ owner_name: 'Fê' }), {
  ok: true,
  data: { owner_name: 'Fê', studio_name: null, instagram: null, address: null, maps_url: null },
});
check('sem nome', cleanBusinessProfile({ owner_name: ' ' }).field, 'owner_name');
check('nome longo', cleanBusinessProfile({ owner_name: 'a'.repeat(81) }).field, 'owner_name');
check('estúdio longo', cleanBusinessProfile({ owner_name: 'Fê', studio_name: 'a'.repeat(81) }).field, 'studio_name');
check('instagram ruim', cleanBusinessProfile({ owner_name: 'Fê', instagram: 'a b' }).field, 'instagram');
check('endereço longo', cleanBusinessProfile({ owner_name: 'Fê', address: 'a'.repeat(201) }).field, 'address');
check('mapa ruim', cleanBusinessProfile({ owner_name: 'Fê', maps_url: 'nada' }).field, 'maps_url');
check('não-texto ignorado', cleanBusinessProfile({ owner_name: 'Fê', studio_name: 42 }).ok, true);

console.log(failures ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures ? 1 : 0);
