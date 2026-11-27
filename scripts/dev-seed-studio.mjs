// F2.3 — cria (ou recria) um estúdio de teste completo no banco DEV, no
// modelo v2 (docs/schema.sql): serviços com e sem variação, categorias,
// horários, um bloqueio, clientes e agendamentos passados e futuros.
//
// Uso: node --env-file=.env.development.local scripts/dev-seed-studio.mjs [--slug=teste-lash] [--name="Fernanda Teste"]
//
// Rodar de novo apaga e recria serviços, clientes, agendamentos, horários e
// bloqueios do estúdio, mas MANTÉM o próprio estúdio (e o link mágico).
// Só roda contra o projeto `lashagendav2-dev`. Usa a REST API via fetch e
// nunca imprime a chave.

const DEV_PROJECT_REF = 'psixalpmgcuydqfxlrto'; // lashagendav2-dev
const TZ = 'America/Sao_Paulo';

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

/** POST em lote. A REST API exige as mesmas chaves em todas as linhas — as
 *  que faltam numa linha vão como `null`. */
function post(table, rows) {
  if (Array.isArray(rows)) {
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    rows = rows.map((r) => Object.fromEntries(keys.map((k) => [k, k in r ? r[k] : null])));
  }
  return rest(table, { method: 'POST', body: JSON.stringify(rows) });
}

// --- Datas no fuso de São Paulo -------------------------------------------

const todaySP = new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD

function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Data daqui a `days` dias; pula domingo para frente (não há expediente). */
function workday(days) {
  let date = shiftDate(todaySP, days);
  if (new Date(`${date}T12:00:00Z`).getUTCDay() === 0) date = shiftDate(date, 1);
  return date;
}

/** Instante (ISO, UTC) de uma data + hora "de parede" em São Paulo (UTC-3). */
const at = (date, time) => new Date(`${date}T${time}:00-03:00`);

// --------------------------------------------------------------------------

async function main() {
  const { slug, name } = parseArgs();
  const img = (file) => `/modelos/mosaico/assets/img/${file}`;
  const paidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const studioPayload = {
    slug,
    owner_name: name,
    studio_name: `${name} Lash`,
    hero_phrase: 'Catálogo de teste do LashAgenda v2.',
    bio: 'Estúdio de teste criado por script (F2.3).',
    whatsapp: '5511999990000',
    instagram: `@${slug}`,
    address: 'São Paulo - SP',
    cover_media_url: img('Hero.webp'),
    avatar_url: img('Hero.webp'),
    instructions_bg_url: img('orientacoes-bg.webp'),
    final_screen_bg_url: img('Footer.webp'),
    cta_bg_url: img('Footer.webp'),
    layout_model: 'mosaico',
    theme_variant: 'rose',
    categories: ['Extensão de Cílios', 'Lash Lifting', 'Sobrancelhas'],
    instructions_items: [
      { id: 'confirmacao', title: 'Confirmação', description: 'Até um dia antes do seu horário marcado.' },
      { id: 'pontualidade', title: 'Pontualidade', description: 'Tolerância de 15 minutos de atraso.' },
      { id: 'preparacao', title: 'Preparação', description: 'Venha com a região dos olhos sem maquiagem.' },
    ],
    booking_mode: 'approval',
    agenda_paused: false,
    whatsapp_button_enabled: true,
    // Recado da tela de sucesso e do link único (F5.4).
    post_booking_message: 'Obrigada por agendar! Chegue 5 minutinhos antes e venha sem maquiagem nos olhos. Qualquer imprevisto, me chama no WhatsApp.',
    cancellation_notice_hours: 24,
    // Acesso completo sem depender de cobrança.
    plan_status: 'active',
    manual_plan: true,
    cakto_plan: 'anual',
    paid_until: paidUntil,
    preview_expires_at: null,
    disabled: false,
  };

  // 1. Estúdio (mantém o mesmo registro — e o link mágico — se já existir)
  const existing = await rest(`studios?slug=eq.${encodeURIComponent(slug)}&select=id`);
  let studio;
  if (existing.length > 0) {
    const id = existing[0].id;
    // Agendamentos antes das clientes (uma cliente com histórico não pode ser apagada sozinha).
    await rest(`appointments?studio_id=eq.${id}`, { method: 'DELETE' });
    await rest(`clients?studio_id=eq.${id}`, { method: 'DELETE' });
    await rest(`services?studio_id=eq.${id}`, { method: 'DELETE' });
    await rest(`business_hours?studio_id=eq.${id}`, { method: 'DELETE' });
    await rest(`schedule_blocks?studio_id=eq.${id}`, { method: 'DELETE' });
    [studio] = await rest(`studios?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(studioPayload) });
  } else {
    [studio] = await post('studios', studioPayload);
  }

  // 2. Serviços (preço NULL = "sob consulta"; price_from = "a partir de")
  const serviceSpecs = [
    { title: 'Volume Brasileiro', price: 150, minutes: 120, category: 'Extensão de Cílios', highlight: true, badge: 'Mais Pedido', file: 'volume-brasileiro.webp' },
    { title: 'Volume Egípcio', price: 180, minutes: 120, category: 'Extensão de Cílios', file: 'volume-egipcio.webp' },
    { title: 'Fio a Fio Clássico', price: 130, minutes: 90, category: 'Extensão de Cílios', file: 'classico-fio-a-fio.webp' },
    { title: 'Manutenção', price: 90, priceFrom: true, minutes: 60, category: 'Extensão de Cílios', file: 'manutencao.webp' },
    { title: 'Lash Lifting', price: 120, minutes: 60, category: 'Lash Lifting', highlight: true, file: 'lash-lifting.webp' },
    { title: 'Design de Sobrancelhas', price: 50, minutes: 30, category: 'Sobrancelhas', file: 'design-sobrancelha.webp' },
    { title: 'Remoção de Extensão', price: null, minutes: 30, category: 'Extensão de Cílios', file: 'remocao.webp' },
  ];
  const services = await post(
    'services',
    serviceSpecs.map((s, position) => ({
      studio_id: studio.id,
      position,
      title: s.title,
      description: 'Procedimento de teste.',
      category: s.category,
      price: s.price,
      price_from: Boolean(s.priceFrom),
      duration_minutes: s.minutes,
      image_url: img(s.file),
      badge: s.badge || null,
      is_highlight: Boolean(s.highlight),
    }))
  );
  const svc = Object.fromEntries(services.map((s) => [s.title, s]));

  // 3. Variações da Manutenção
  const variations = await post('service_variations', [
    { service_id: svc['Manutenção'].id, position: 0, name: 'Fio a fio', duration_minutes: 60, price: 90 },
    { service_id: svc['Manutenção'].id, position: 1, name: 'Volume', duration_minutes: 75, price: 110 },
  ]);
  const varByName = Object.fromEntries(variations.map((v) => [v.name, v]));

  // 4. Horários: segunda a sábado, 09:00–18:00. (O banco aceita várias faixas
  //    por dia, mas o motor de horários só lê uma até a F4.)
  await post(
    'business_hours',
    [1, 2, 3, 4, 5, 6].map((weekday) => ({ studio_id: studio.id, weekday, start_time: '09:00', end_time: '18:00' }))
  );

  // 5. Bloqueios: almoço daqui a 2 dias úteis e uma folga daqui a 6
  const lunchDay = workday(2);
  const dayOff = workday(6);
  await post('schedule_blocks', [
    { studio_id: studio.id, start_date: lunchDay, end_date: lunchDay, all_day: false, start_time: '12:00', end_time: '13:00', reason: 'Almoço (teste)' },
    { studio_id: studio.id, start_date: dayOff, end_date: dayOff, all_day: true, reason: 'Folga (teste)' },
  ]);

  // 6. Clientes (WhatsApp só com dígitos, sem o 55 — como o app grava)
  const clientRows = await post('clients', [
    { studio_id: studio.id, name: 'Ana Souza', whatsapp: '11988881111', source: 'booking' },
    { studio_id: studio.id, name: 'Beatriz Lima', whatsapp: '11988882222', source: 'booking' },
    { studio_id: studio.id, name: 'Carla Mendes', whatsapp: '11988883333', source: 'manual', birth_date: '1994-03-12' },
    { studio_id: studio.id, name: 'Daniela Rocha', whatsapp: '11988884444', source: 'manual', notes: 'Prefere horário de manhã.' },
    { studio_id: studio.id, name: 'Eduarda Alves', whatsapp: '11988885555', source: 'booking' },
  ]);
  const client = Object.fromEntries(clientRows.map((c) => [c.name.split(' ')[0], c]));

  // 7. Agendamentos — cada um com seus itens (cópia de nome/duração/preço)
  const item = (title, variationName) => {
    const s = svc[title];
    const v = variationName ? varByName[variationName] : null;
    return {
      service_id: s.id,
      variation_id: v ? v.id : null,
      title: v ? `${s.title} — ${v.name}` : s.title,
      duration_minutes: v ? v.duration_minutes : s.duration_minutes,
      price: v ? v.price : s.price,
    };
  };

  const plan = [
    // Passados
    { date: shiftDate(todaySP, -60), time: '10:00', who: 'Daniela', items: [item('Volume Egípcio')], status: 'completed', origin: 'record', received: 180 },
    { date: shiftDate(todaySP, -14), time: '10:00', who: 'Ana', items: [item('Volume Brasileiro')], status: 'completed', origin: 'catalog', received: 150 },
    { date: shiftDate(todaySP, -10), time: '14:00', who: 'Beatriz', items: [item('Manutenção', 'Fio a fio')], status: 'completed', origin: 'catalog', received: 90 },
    { date: shiftDate(todaySP, -7), time: '09:00', who: 'Carla', items: [item('Lash Lifting')], status: 'no_show', origin: 'professional' },
    { date: shiftDate(todaySP, -3), time: '15:00', who: 'Ana', items: [item('Design de Sobrancelhas')], status: 'canceled', origin: 'catalog', canceledBy: 'client' },
    // Futuros
    { date: workday(1), time: '10:00', who: 'Beatriz', items: [item('Volume Egípcio')], status: 'confirmed', origin: 'catalog' },
    { date: workday(1), time: '14:00', who: 'Eduarda', items: [item('Design de Sobrancelhas')], status: 'pending', origin: 'catalog', notes: 'Primeira vez, pode ser?' },
    { date: workday(2), time: '09:30', who: 'Carla', items: [item('Manutenção', 'Volume')], status: 'pending', origin: 'catalog' },
    { date: workday(3), time: '16:00', who: 'Daniela', items: [item('Lash Lifting'), item('Design de Sobrancelhas')], status: 'confirmed', origin: 'professional' },
  ];

  for (const a of plan) {
    const startsAt = at(a.date, a.time);
    const minutes = a.items.reduce((sum, i) => sum + i.duration_minutes, 0);
    const priced = a.items.filter((i) => i.price !== null);
    const [appointment] = await post('appointments', {
      studio_id: studio.id,
      client_id: client[a.who].id,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + minutes * 60000).toISOString(),
      status: a.status,
      origin: a.origin,
      total_price: priced.length ? priced.reduce((sum, i) => sum + Number(i.price), 0) : null,
      amount_received: a.received ?? null,
      client_notes: a.notes || null,
      canceled_at: a.status === 'canceled' ? startsAt.toISOString() : null,
      canceled_by: a.canceledBy || null,
    });
    await post('appointment_items', a.items.map((i, position) => ({ appointment_id: appointment.id, position, ...i })));
  }

  const base = 'http://localhost:3000';
  console.log('✅ Estúdio de teste pronto!');
  console.log(`slug: ${studio.slug} · ${services.length} serviços · ${variations.length} variações · ${clientRows.length} clientes · ${plan.length} agendamentos`);
  console.log('catálogo (cliente):', `${base}/c/${studio.slug}`);
  console.log('app (profissional):', `${base}/api/professional/login?slug=${studio.slug}&token=${studio.edit_token}`);
}

main();
