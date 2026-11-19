// F1.2 — cria (ou recria) um catálogo de teste no banco DEV, ainda sobre o
// modelo `orders` do StudioMenu. Provisório: a F2.3 substitui por
// `dev-seed-studio.mjs` sobre o modelo v2.
//
// Uso: node --env-file=.env.development.local scripts/dev-create-test-catalog.mjs [--slug=teste-lash] [--name="Fernanda Teste"]
//
// Só roda contra o projeto `lashagendav2-dev` (ref abaixo). Usa a REST API
// via fetch e nunca imprime a chave.

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

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

function parseArgs() {
  const args = { slug: 'teste-lash', name: 'Fernanda Teste' };
  for (const raw of process.argv.slice(2)) {
    if (raw.startsWith('--slug=')) args.slug = raw.slice('--slug='.length).toLowerCase().trim();
    else if (raw.startsWith('--name=')) args.name = raw.slice('--name='.length).trim();
  }
  return args;
}

async function rest(path, init = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers, ...init });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    console.error(`❌ Erro em ${init.method || 'GET'} ${path}:`, body);
    process.exit(1);
  }
  return body;
}

async function main() {
  const { slug, name } = parseArgs();
  const img = (file) => `/modelos/mosaico/assets/img/${file}`;
  const paidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const payload = {
    slug,
    client_name: name,
    studio_name: `${name} Lash`,
    niche: 'lash',
    layout_model: 'mosaico',
    theme_variant: 'rose',
    whatsapp_number: '5511999990000',
    instagram_handle: `@${slug}`,
    hero_phrase: 'Catálogo de teste do LashAgenda v2.',
    bio_description: 'Estúdio de teste criado por script (F1.2).',
    cover_media_url: img('Hero.webp'),
    avatar_url: img('Hero.webp'),
    address: 'São Paulo - SP',
    status: 'active',
    categories: ['Extensão de Cílios', 'Lash Lifting', 'Sobrancelhas'],
    // Acesso completo (agenda incluída), sem depender de cobrança.
    plan_tier: 'plus',
    subscription_status: 'ativo',
    manual_plan: true,
    billing_provider: 'cakto',
    paid_until: paidUntil,
    booking_enabled: true,
  };

  const existing = await rest(`orders?slug=eq.${encodeURIComponent(slug)}&select=id`);
  let order;
  if (existing.length > 0) {
    [order] = await rest(`orders?id=eq.${existing[0].id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    await rest(`order_services?order_id=eq.${order.id}`, { method: 'DELETE' });
    await rest(`business_hours?order_id=eq.${order.id}`, { method: 'DELETE' });
  } else {
    [order] = await rest('orders', { method: 'POST', body: JSON.stringify(payload) });
  }

  const services = [
    ['Volume Brasileiro', 'R$ 150', '2h', 120, 'Extensão de Cílios', true, 'volume-brasileiro.webp'],
    ['Volume Egípcio', 'R$ 180', '2h', 120, 'Extensão de Cílios', false, 'volume-egipcio.webp'],
    ['Fio a Fio Clássico', 'R$ 130', '1h30', 90, 'Extensão de Cílios', false, 'classico-fio-a-fio.webp'],
    ['Manutenção', 'R$ 90', '1h', 60, 'Extensão de Cílios', false, 'manutencao.webp'],
    ['Lash Lifting', 'R$ 120', '1h', 60, 'Lash Lifting', true, 'lash-lifting.webp'],
    ['Design de Sobrancelhas', 'R$ 50', '30min', 30, 'Sobrancelhas', false, 'design-sobrancelha.webp'],
  ].map(([title, price, duration, duration_minutes, category, is_highlight, file], order_index) => ({
    order_id: order.id,
    order_index,
    title,
    description: 'Procedimento de teste.',
    price,
    duration,
    duration_minutes,
    category,
    is_highlight,
    image_url: img(file),
  }));
  await rest('order_services', { method: 'POST', body: JSON.stringify(services) });

  // Segunda a sábado, 09:00–18:00 (o modelo do StudioMenu só tem uma faixa por dia).
  const hours = [1, 2, 3, 4, 5, 6].map((weekday) => ({
    order_id: order.id,
    weekday,
    start_time: '09:00',
    end_time: '18:00',
  }));
  await rest('business_hours', { method: 'POST', body: JSON.stringify(hours) });

  const base = 'http://localhost:3000';
  console.log('✅ Catálogo de teste pronto!');
  console.log('slug:', order.slug);
  console.log('catálogo (cliente):', `${base}/c/${order.slug}`);
  console.log('app (profissional):', `${base}/api/professional/login?slug=${order.slug}&token=${order.edit_token}`);
}

main();
