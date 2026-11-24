// F5.3 — troca o modo de agendamento de um estúdio no banco DEV, para testar
// os dois modos antes de existir a tela de regras (F10.2).
//
// Uso: node --env-file=.env.development.local scripts/dev-set-booking-mode.mjs auto|aprovacao [--slug=teste-lash]
//   auto      → agendamento da cliente já nasce confirmado
//   aprovacao → nasce "aguardando confirmação" (padrão de estúdio novo)
//
// Só roda contra o projeto `lashagendav2-dev`. Nunca imprime a chave.

const DEV_PROJECT_REF = 'psixalpmgcuydqfxlrto'; // lashagendav2-dev

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Rode com --env-file=.env.development.local');
  process.exit(1);
}
if (new URL(supabaseUrl).hostname !== `${DEV_PROJECT_REF}.supabase.co`) {
  console.error(`❌ A URL do Supabase não é a do lashagendav2-dev (${DEV_PROJECT_REF}) — abortando.`);
  process.exit(1);
}

const MODES = { auto: 'auto', aprovacao: 'approval', approval: 'approval' };
const modeArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const mode = MODES[(modeArg || '').toLowerCase()];
const slugArg = process.argv.slice(2).find((a) => a.startsWith('--slug='));
const slug = slugArg ? slugArg.slice('--slug='.length).toLowerCase().trim() : 'teste-lash';

if (!mode) {
  console.error('Uso: node --env-file=.env.development.local scripts/dev-set-booking-mode.mjs auto|aprovacao [--slug=teste-lash]');
  process.exit(1);
}

const res = await fetch(`${supabaseUrl}/rest/v1/studios?slug=eq.${encodeURIComponent(slug)}`, {
  method: 'PATCH',
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({ booking_mode: mode }),
});
const rows = res.ok ? await res.json() : [];
if (!res.ok || rows.length === 0) {
  console.error(`❌ Não consegui mudar o estúdio "${slug}" (${res.status}).`);
  process.exit(1);
}
console.log(`✅ ${slug}: modo ${mode === 'auto' ? 'automático (já confirma)' : 'com aprovação (aguarda você)'}.`);
