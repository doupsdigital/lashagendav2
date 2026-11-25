// F5.3/F5.5 — troca regras de agendamento de um estúdio no banco DEV, para
// testar antes de existir a tela de regras (F10.2).
//
// Uso: node --env-file=.env.development.local scripts/dev-set-booking-mode.mjs <opção> [--slug=teste-lash]
//   auto          → agendamento da cliente já nasce confirmado
//   aprovacao     → nasce "aguardando confirmação" (padrão de estúdio novo)
//   whatsapp-on   → catálogo mostra também "ou agende pelo WhatsApp" (padrão)
//   whatsapp-off  → só o agendamento online (WhatsApp volta se pausar a agenda)
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

const OPTIONS = {
  auto: { patch: { booking_mode: 'auto' }, msg: 'modo automático (já confirma)' },
  aprovacao: { patch: { booking_mode: 'approval' }, msg: 'modo com aprovação (aguarda você)' },
  'whatsapp-on': { patch: { whatsapp_button_enabled: true }, msg: 'botão "agende pelo WhatsApp" ligado' },
  'whatsapp-off': { patch: { whatsapp_button_enabled: false }, msg: 'botão "agende pelo WhatsApp" desligado' },
};
const optArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const option = OPTIONS[(optArg || '').toLowerCase()];
const slugArg = process.argv.slice(2).find((a) => a.startsWith('--slug='));
const slug = slugArg ? slugArg.slice('--slug='.length).toLowerCase().trim() : 'teste-lash';

if (!option) {
  console.error('Uso: node --env-file=.env.development.local scripts/dev-set-booking-mode.mjs auto|aprovacao|whatsapp-on|whatsapp-off [--slug=teste-lash]');
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
  body: JSON.stringify(option.patch),
});
const rows = res.ok ? await res.json() : [];
if (!res.ok || rows.length === 0) {
  console.error(`❌ Não consegui mudar o estúdio "${slug}" (${res.status}).`);
  process.exit(1);
}
console.log(`✅ ${slug}: ${option.msg}.`);
