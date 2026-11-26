# Plano LashAgenda v2 — da fundação ao lançamento

> Criado em 2026-11-19. Plano mestre do projeto: **16 fases (0 a 15)**, cada uma dividida em
> etapas pequenas, funcionais e testáveis. O "porquê" de cada decisão de produto está em
> [`DECISOES_DE_PRODUTO.md`](DECISOES_DE_PRODUTO.md); o que fica para depois do lançamento está em
> [`BACKLOG_FUTURO.md`](BACKLOG_FUTURO.md).

---

## Sumário

1. [Como usar este plano](#1-como-usar-este-plano)
2. [Visão geral das fases](#2-visão-geral-das-fases)
3. [Arquitetura alvo](#3-arquitetura-alvo)
4. [Contas e serviços externos](#4-contas-e-serviços-externos)
5. [Fases detalhadas](#5-fases-detalhadas) (F0 a F15)
6. [Plano de testes](#6-plano-de-testes)
7. [Riscos e como reduzir](#7-riscos-e-como-reduzir)

---

## 1. Como usar este plano

**Ritmo:** uma etapa por vez. Cada etapa termina com algo que a usuária consegue **ver e
testar**. Nenhuma etapa é "só infraestrutura invisível" por mais de um passo.

**Ciclo de cada etapa** (o mesmo do playbook):

1. O agente lê a etapa inteira, confere o código real e tira dúvidas **antes** de começar.
2. Implementa. Roda `npx tsc --noEmit` + `node scripts/check-integrity.js` (a partir da F1).
3. Entrega com um **roteiro de teste** curto (o que abrir, o que clicar, o que deve acontecer).
4. A usuária testa e opina. Ajustes até ficar bom.
5. Ela autoriza → commit + push na `desenv`.
6. Ao fim de cada **fase**, o agente atualiza `docs/atual/ESTADO_ATUAL.md` (fase atual,
   o que mudou, pendências) e marca o status na tabela da seção 2.

**Formato de cada fase:** objetivo · entregas · etapas (cada uma com "pronto quando") ·
teste da usuária no fim da fase · riscos/atenções.

**Status:** ⬜ não iniciada · 🟨 em andamento · ✅ concluída · ⏸️ pausada.

**Regra de ouro:** se, durante uma fase, surgir uma decisão de produto que este plano não
cobre, **pare e pergunte**. Depois de decidida, registre em `DECISOES_DE_PRODUTO.md`.

---

## 2. Visão geral das fases

| Fase | Nome | Resultado visível | Status |
|---|---|---|---|
| F0 | Fundação do repositório | Repo no GitHub com plano, playbook e o v1 como referência | ✅ |
| F1 | Base do StudioMenu rodando como LashAgenda | `localhost:3000` abre um app com a marca LashAgenda, código limpo do que não serve | ✅ |
| F2 | Modelo de dados v2 + camada de serviço | Banco dev com o schema novo; estúdio de teste criado por script | ✅ |
| F3 | Catálogo público + editor visual | `/c/<slug>` mostra o catálogo; a profissional edita serviços, variações, categorias, tema | ✅ |
| F4 | Horários e bloqueios | Grade semanal com pausa de almoço, folgas e bloqueios parciais | ✅ |
| F5 | Agendamento pela cliente | Cliente agenda pelo catálogo (automático ou com aprovação) e recebe link do agendamento | ✅ |
| F6 | Agenda da profissional | Dia/mês (semana pulada), confirmar/recusar, agendamento manual, concluir com valor, falta, trancar | ✅ |
| F7 | Clientes | Lista, busca, perfil com histórico, atendimento manual | ✅ |
| F8 | Ficha da cliente | Ficha técnica + saúde e cuidados, só dentro do app, com consentimento | ✅ |
| F9 | Início (painel) + relatórios | Números do dia/mês, pendências, relatórios por período | ✅ |
| F10 | Configurações | Negócio, regras de agendamento, WhatsApp, conta, ajuda, link + QR | ✅ |
| F11 | Venda e acesso (prévia + Cakto + e-mail) | Ciclo completo: prévia → compra → ativação → e-mail → primeiros passos | ⬜ |
| F12 | Admin + PWA + notificações | Painel admin, app instalável, push de novo agendamento | ⬜ |
| F13 | Produção e domínio | `lashagenda.com` + subdomínios no ar, banco prod, Cakto real | ⬜ |
| F14 | Testes finais | Roteiro completo aprovado no celular + compra real com cupom e reembolso | ⬜ |
| F15 | Página de venda + marketing | Landing de autosserviço, pixel novo, campanha no ar | ⬜ |

**Marcos:**
- **M1 — "Agenda funciona" (fim da F6):** já dá para usar o produto de verdade em uma
  profissional de teste, criando o estúdio pelo banco.
- **M2 — "Produto completo" (fim da F10):** tudo que a profissional usa no dia a dia.
- **M3 — "Vende sozinho" (fim da F11):** o ciclo de compra funciona no ambiente dev.
- **M4 — "No ar" (fim da F14):** produção validada com compra real.
- **M5 — "Lançado" (fim da F15):** anúncio rodando.

---

## 3. Arquitetura alvo

### 3.1 Stack

| Camada | Escolha | Origem |
|---|---|---|
| Framework | **Next.js 16** (App Router, TypeScript, React 19) | StudioMenu |
| Estilo | Tailwind 3 + CSS dos temas do catálogo (`catalog-theme.css`, `scheduling-wizard.css`) | StudioMenu |
| Banco | **Supabase** (Postgres + Storage + Auth) | os dois |
| Acesso a dados | **Só no servidor**, com `supabaseAdmin` (service role). RLS ligado em todas as tabelas, **sem policies para `anon`/`authenticated`**. O navegador nunca fala direto com tabela. | StudioMenu (o v1 usava RLS no cliente — não vamos repetir) |
| Hospedagem | **Vercel** (projeto novo `lashagendav2`) | StudioMenu |
| Pagamento | **Cakto** (webhook + página de obrigado) | StudioMenu (funil Lash) |
| E-mail | **Resend** (domínio `lashagenda.com`) | StudioMenu |
| Analytics | **PostHog** (projeto novo) + **pixel da Meta novo** (só na landing) | StudioMenu |
| Avisos internos | **Telegram** (mesmo bot, mensagens com prefixo `[LashAgenda]`) | StudioMenu |
| App | **PWA** + Web Push | StudioMenu |

### 3.2 Ambientes

| Ambiente | Branch | Banco | Cakto | URL |
|---|---|---|---|---|
| Local | qualquer | `lashagendav2-dev` | webhook de teste por script | `localhost:3000` |
| Preview | `desenv` | `lashagendav2-dev` | produto de teste | `lashagendav2-git-desenv-<conta>.vercel.app` |
| Produção | `main` | `lashagendav2-prod` | produtos reais | `lashagenda.com` + `*.lashagenda.com` |

### 3.3 Rotas (alvo)

| Rota | Quem usa | O que é |
|---|---|---|
| `<slug>.lashagenda.com` → `/c/<slug>` | cliente final | Catálogo + agendamento |
| `/c/<slug>/agendamento/<token>` | cliente final | Link único do agendamento (ver/cancelar) |
| `/app/<slug>/inicio` | profissional | Início (painel) |
| `/app/<slug>/agenda` | profissional | Agenda dia/semana/mês |
| `/app/<slug>/clientes` e `/app/<slug>/clientes/<id>` | profissional | Clientes e perfil (com a ficha) |
| `/app/<slug>/catalogo` | profissional | Atalho para o editor visual do catálogo |
| `/app/<slug>/relatorios` | profissional | Relatórios |
| `/app/<slug>/config` | profissional | Configurações |
| `/app/<slug>/primeiros-passos` | profissional | Onboarding pós-compra |
| `/entrar` | profissional | Login (Google ou senha) |
| `/ativando` | profissional | Obrigado da Cakto → loga sozinha |
| `/a/<código>` | profissional | Link curto do app (e-mail) |
| `/` (e `/lash`) | lead | Landing de autosserviço com prévia |
| `/admin` | dona do produto | Painel admin |

### 3.4 Modelo de dados (alvo — finalizado na F2)

Nomes de tabela e coluna em **inglês**, como no StudioMenu, para maximizar o reaproveitamento de
código. Conceitos vindos do LashAgenda v1.

| Tabela | Papel | Campos principais (rascunho) |
|---|---|---|
| `studios` | O "tenant" (uma profissional = um estúdio). Substitui `orders` (StudioMenu) e `estabelecimentos` (v1). | `slug`, `owner_name`, `studio_name`, `whatsapp`, `instagram`, `bio`, `address`, `maps_url`, `avatar_url`, `cover_media_url`, `layout_model`, `theme_variant`, `categories[]`, `instructions_items`, **agendamento:** `booking_mode` (`auto`/`approval`), `whatsapp_button_enabled`, `agenda_paused`, `cancellation_notice_hours`, `min_notice_minutes`, `booking_window_days`, `post_booking_message`; **cobrança:** `plan_status` (`preview`/`active`/`suspended`/`canceled`), `cakto_plan`, `cakto_order_id`, `cakto_subscription_ref`, `paid_until`, `preview_code`, `preview_expires_at`, `acquisition_source`; **acesso:** `auth_user_id`, `app_short_code`, `disabled`, `onboarding_steps` |
| `services` | Serviços do catálogo | `studio_id`, `position`, `title`, `description`, `category`, `price` (numérico; `NULL` = "sob consulta"), `price_from` (mostra "a partir de"), `duration_minutes` (obrigatório), `image_url`, `extra_photos`, `badge`, `is_highlight`, `specs`, `bookable`, `active` |
| `service_variations` | Variações (item 8) | `service_id`, `position`, `name`, `duration_minutes`, `price` |
| `clients` | Clientes do estúdio | `studio_id`, `name`, `whatsapp`, `whatsapp_digits` (gerado), `email`, `birth_date`, `notes`, `source` (`booking`/`manual`); único por (`studio_id`, `whatsapp_digits`) |
| `client_records` | Ficha da cliente (1:1) | `client_id`, `technical` (jsonb: curvatura, espessura, mapping, técnica, efeito, retenção…), `health` (jsonb: alergias, medicamentos, condições, gestante…), `consent_at`, `updated_at` |
| `appointments` | Agendamentos **e** atendimentos registrados à mão (o v1 tinha `atendimentos` separado — unificamos) | `studio_id`, `client_id`, `starts_at`, `ends_at`, `status` (`pending`/`confirmed`/`canceled`/`completed`/`no_show`), `origin` (`catalog`/`professional`/`record`), `total_price` (soma dos itens), `amount_received`, `notes`, `manage_token`, `canceled_by`, `cancel_reason`; trava de banco contra choque de horário (`EXCLUDE … WHERE status <> 'canceled' AND origin <> 'record'`) |
| `appointment_items` | Serviços de cada agendamento (com cópia do nome/duração/preço no momento) | `appointment_id`, `service_id`, `variation_id`, `title`, `duration_minutes`, `price` |
| `business_hours` | Grade semanal — **várias faixas por dia** (pausa de almoço) | `studio_id`, `weekday`, `start_time`, `end_time` |
| `schedule_blocks` | Folgas, férias, bloqueios parciais e "trancar horário" | `studio_id`, `start_date`, `end_date`, `all_day`, `start_time`, `end_time`, `reason` |
| `push_subscriptions` | Push por dispositivo | como no StudioMenu, com `studio_id` |
| `cakto_events` | Log de todo webhook | como no StudioMenu |
| `rate_limits` | Limite de tentativas (prévia, agendamento) | como no StudioMenu |

**Decisões de modelagem já tomadas:**
- Cliente final **não tem conta**. A identidade dela é o WhatsApp (dedupe) + o
  `manage_token` de cada agendamento.
- Preço numérico (o StudioMenu usa texto livre "R$ 150" / "Sob consulta"); relatório e
  faturamento precisam somar.
- Duração obrigatória em todo serviço (no StudioMenu era opcional; aqui tudo é agendável).
- Função central `studioHasFeature(studio, feature)` sempre `true` no lançamento (preparada
  para um plano Pro no futuro).

### 3.5 Reaproveitamento

**Do StudioMenu (código):** catálogo e temas (`components/catalog/*`), editor visual, wizard de
agendamento (`BookingModal`, `scheduling-wizard.css`), motor de horários
(`lib/scheduling/*`), agenda (`components/agenda/*`), app shell (`components/app-shell/*`),
config (`components/config/*`), push, PWA, sessão da profissional (cookie HMAC +
Supabase Auth), roteamento por subdomínio (`proxy.ts`), prévia + Cakto + `/ativando` +
e-mail + primeiros passos (`components/self-serve/*`, `lib/cakto*.ts`, `lib/email.ts`),
admin (parte), rate limit, otimização de imagem.

**Do LashAgenda v1 (especificação, reescrito no estilo do StudioMenu):** clientes, perfil com
histórico, ficha técnica + saúde (todos os campos e opções), relatórios, painel com números,
agenda semana, concluir com valor recebido, falta, trancar horário, variações, regras de
dedupe de cliente, regras de agendamento (aprovação, antecedência, mensagem).

**Descartado:** Asaas (tudo), funis de anúncio/X1/prospecção do admin, landings antigas
(StudioMenu e v1), nichos nail/estética/studio, "Catálogo apenas"/"Catálogo completo",
upgrades vitalício, login de cliente, portal "Meus agendamentos" com conta, app da cliente.

---

## 4. Contas e serviços externos

| Serviço | O que precisa | Quem faz | Quando |
|---|---|---|---|
| GitHub | Repo `doupsdigital/lashagendav2` + token fine-grained (Contents: read/write, só este repo) | usuária | F0 ✅ |
| Supabase | Projeto `lashagendav2-dev`. **Atenção:** o plano grátis permite 2 projetos ativos por organização — pode ser preciso pausar o projeto do v1 ou usar outra organização. | usuária | F1 |
| Vercel | Projeto `lashagendav2` ligado ao repo (preview da `desenv`) | usuária, com guia do agente | F1 |
| Supabase prod | Projeto `lashagendav2-prod` | usuária | F13 |
| Domínio | `lashagenda.com` com DNS na Vercel (nameservers `ns1/ns2.vercel-dns.com`) + wildcard `*.lashagenda.com`. Hoje o domínio aponta para o v1 — será movido. | usuária, com guia | F13 |
| Resend | Verificar `lashagenda.com` na conta "doupsdigital" (registros DKIM/SPF na Vercel) | usuária, com guia | F11 (dev pode usar o remetente de teste) / F13 |
| Cakto | 2 produtos (mensal R$ 22,90 cartão · anual R$ 197), página de obrigado, webhook, pixel novo | usuária, com guia | F11 (teste) / F13 (real) |
| Meta | **Pixel novo** do LashAgenda v2 | usuária | F15 |
| PostHog | Projeto novo "LashAgenda" | usuária | F1 (chave) |
| Telegram | Reaproveitar o bot; definir se usa o mesmo chat | usuária | F11 |
| VAPID (push) | Gerar par de chaves novo | agente (`npx web-push generate-vapid-keys`) | F12 |
| Google OAuth | Cliente OAuth para o login com Google (Supabase Auth) | usuária, com guia | F11 |

---

## 5. Fases detalhadas

### F0 — Fundação do repositório ✅

**Objetivo:** ter onde trabalhar, com o plano e as regras, acessível de qualquer estação.

**Entregas:**
- Repositório `doupsdigital/lashagendav2` com `main` e `desenv`.
- `README.md`, `CLAUDE.md`, `AGENTS.md`, `.gitignore`.
- `docs/atual/PLAYBOOK_IA.md`, `docs/atual/ESTADO_ATUAL.md`.
- `docs/plano/PLANO_LASHAGENDA_V2.md` (este), `DECISOES_DE_PRODUTO.md`, `BACKLOG_FUTURO.md`.
- `legacy/lashagenda-v1/` com o código do v1 (sem segredos) + `legacy/README.md`.

**Teste da usuária:** abrir o repositório no GitHub, conferir os documentos; na outra estação,
`git clone` e abrir no editor.

---

### F1 — Base do StudioMenu rodando como LashAgenda

**Objetivo:** trazer o código do StudioMenu, tirar tudo que não serve, trocar a marca e ver o
app rodando localmente contra um banco dev novo. Ainda com o modelo de dados do StudioMenu —
a troca de modelo é a F2. Separar as duas coisas evita misturar "o que quebrou na cópia" com
"o que quebrou na mudança de modelo".

**Pré-requisitos:** projeto Supabase `lashagendav2-dev` criado; clone do StudioMenu disponível
na estação (o snapshot de referência é a `desenv` no commit `092022e`).

**Etapas:**

**F1.1 — Cópia limpa do código.**
Copiar do StudioMenu (`desenv` @ `092022e`): `src/`, `public/`, `scripts/check-integrity.js`,
`package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.js`,
`postcss.config.js`, `vercel.json`, `docs/schema.sql` (→ `docs/schema_studiomenu_base.sql`,
só referência). **Não copiar:** `.git`, `.env*`, `.next`, `node_modules`, `.vercel`, `legacy/`,
`marketing/`, `docs/historico/`, `docs/atual/`, `tsconfig.tsbuildinfo`.
Ajustar `package.json` (`name: "lashagendav2"`, `version: "0.1.0"`). `npm ci`.
*Pronto quando:* `npx tsc --noEmit` passa com o código como veio.

**F1.2 — Banco dev com o schema do StudioMenu + rodar.**
Aplicar `docs/schema_studiomenu_base.sql` no `lashagendav2-dev` (provisório, só para a base
rodar). Criar `.env.development.local` com as 3 chaves do dev + `.env.local` com
`PROFESSIONAL_SESSION_SECRET`, `ADMIN_PASSWORD` (e o que o `next dev` exigir — o agente lista
as variáveis lendo o código). Criar um catálogo de teste por script.
*Pronto quando:* `npm run dev` sobe, `/c/<slug-teste>` abre o catálogo, o link mágico abre o app.

**F1.3 — Remoção do que não serve.**
Remover (conferindo com `grep` que nada mais importa cada item): Asaas (`lib/asaas.ts`,
`lib/billing-service.ts`, `api/billing/*` exceto `cakto-webhook`, `OpenChargeBanner`,
`PlanSubscribeCard`, `SubscriptionSection` do Asaas, `meta-capi.ts`); ofertas e upsells
(`FullCatalogOfferCard`, `PlusUpsellCard`, `plus-onboarding/*`, `FirstContactScreen`,
`UrgencyTimerBanner`, `upgrade-to-*`, `full-catalog-offer-decision`); admin de marketing
(`admin/prospeccao`, `funil-ads*`, `scripts`, `paginas-vendas`, `formularios`,
`estudio-videos`, `criar-com-ia` — este fica anotado no backlog, item 7); vendas antigas
(`components/sales*`, `/plus`, `/classica`, `/lp`, `data/funil-*`, `data/vendas-x1-scripts.ts`,
`landing-*.css` que não forem usados); nichos (`niche-presets/nail|estetica|studio`,
`use-niche-selection`, `niche-options`); onboarding por formulário (`/form`,
`api/onboarding/*`) — substituído pela prévia na F11; `types/prospeccao.ts`.
*Pronto quando:* `tsc` limpo, `check-integrity` ajustado e limpo, catálogo e app ainda abrem.
*Atenção:* remoção grande → fazer em 2 ou 3 commits temáticos, não um só.

**F1.4 — Marca LashAgenda.**
Nome, título, meta tags, manifest do PWA, ícones (usar os do v1: `legacy/lashagenda-v1/public/
icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon.svg`), textos "StudioMenu" →
"LashAgenda" em tudo que a profissional/cliente vê, domínio em `public-url.ts`
(`lashagenda.com`), `RESERVED_SLUGS` revisados. Paleta: manter os temas do catálogo; para o
app, decidir com a usuária se mantém o rosa do StudioMenu ou o do v1.
*Pronto quando:* nenhuma ocorrência visível de "StudioMenu" (`grep -ri studiomenu src public`
só em comentários de origem).

**F1.5 — Vercel (preview).**
Criar o projeto na Vercel ligado ao repo, variáveis do Preview apontando para o dev, deploy da
`desenv`. Vercel Authentication ligado no preview.
*Pronto quando:* o link de preview abre o catálogo de teste no celular.

**Teste da usuária (fim da F1):** abrir o catálogo de teste e o app no computador e no celular;
conferir que não sobrou nada de StudioMenu/Asaas/X1 visível.

**Riscos:** a remoção quebrar algo escondido → por isso `tsc` + teste a cada sub-remoção.

---

### F2 — Modelo de dados v2 + camada de serviço

**Objetivo:** trocar o modelo `orders` do StudioMenu pelo modelo da seção 3.4, sem mudar o que
a usuária vê. Ao fim, catálogo e app funcionam como na F1, mas sobre o banco novo.

**Etapas:**

**F2.1 — `docs/schema.sql` v2.** Escrever o schema completo da seção 3.4 (tabelas, índices,
trava de choque de horário com `btree_gist`, `whatsapp_digits` gerado, RLS ligado sem
policies, `REVOKE` de `anon`, bucket de storage com upload só pelo servidor). Revisar com a
usuária **antes** de aplicar (é a decisão mais difícil de desfazer do projeto).
*Pronto quando:* aprovado e aplicado no `lashagendav2-dev` (banco limpo — apagar o schema
provisório da F1.2).

**F2.2 — Tipos e serviços de dados.** `types/` novos (`Studio`, `Service`, `Variation`,
`Client`, `Appointment`…) e a camada de serviço reescrita sobre eles: `studio-service.ts`
(substitui `catalog-service.ts` + `professional-app-service.ts`), `scheduling/*` lendo as
tabelas novas. Função `studioHasFeature`. Sessão da profissional por `studio.slug`.
*Pronto quando:* `tsc` limpo sem nenhuma referência a `orders`/`order_services`.

**F2.3 — Script de estúdio de teste.** `scripts/dev-seed-studio.mjs` cria um estúdio completo
no dev (serviços com e sem variação, categorias, horários, algumas clientes e agendamentos
passados/futuros) e imprime o link mágico do app. Recusa rodar se a URL do Supabase não for a
do dev.
*Pronto quando:* rodar o script e abrir catálogo + app do estúdio criado.

**Teste da usuária:** rodar o seed (o agente dá o comando), abrir catálogo e app, navegar —
tudo deve se comportar como na F1.

**Riscos:** é a fase mais "invisível". Manter as etapas curtas e testar a cada uma.

---

### F3 — Catálogo público + editor visual

**Objetivo:** a vitrine pronta. É o que vai vender o produto — tem de ficar no nível do
StudioMenu.

**Etapas:**

**F3.1 — Catálogo público sobre o modelo novo.** Capa, grade de serviços, detalhe do serviço,
orientações, contato, temas (Rosé/Luxury) e modelos (Mosaico/Clássico). Preço numérico
formatado (com "a partir de" e "sob consulta").
**F3.2 — Variações no catálogo.** O detalhe do serviço lista as variações com duração e preço;
o botão de agendar leva a variação escolhida.
**F3.3 — Editor visual.** Editar capa, textos, serviços (criar/editar/excluir/reordenar,
foto com compressão, duração obrigatória, preço), variações, categorias, orientações, tema e
modelo. Acesso pelo app (`/app/<slug>/catalogo`).
**F3.4 — Serviços de exemplo.** Os serviços que todo estúdio novo ganha (lista do v1:
Fio a Fio Clássico, Volume Russo, Volume Híbrido, Volume Brasileiro, Lash Lifting, Manutenção
com 4 variações, Remoção, Design de Sobrancelhas…) com fotos padrão no storage do v2.
Decidir com a usuária quantos (o v1 acabou reduzindo para 2).

*Pronto quando (fase):* uma profissional consegue montar o catálogo inteiro sozinha pelo editor.

**Teste da usuária:** montar o catálogo de um estúdio "real" (ex.: o dela de teste) do zero
pelo celular; abrir como cliente em aba anônima.

---

### F4 — Horários e bloqueios

**Objetivo:** a disponibilidade que alimenta o agendamento.

**Etapas:**

**F4.1 — Grade semanal com várias faixas.** Editor do StudioMenu (`BusinessHoursEditor`)
estendido: cada dia pode ter mais de uma faixa ("09:00–12:00" + "13:30–19:00"). Atalho
"adicionar pausa de almoço". Validação de faixas sobrepostas.
**F4.2 — Folgas e bloqueios.** Dias inteiros (férias, feriados) e faixas num dia
(`ScheduleBlocksManager`).
**F4.3 — Motor de disponibilidade.** `lib/scheduling/availability.ts` considerando várias
faixas por dia, bloqueios, agendamentos existentes, antecedência mínima e janela máxima.
Testes unitários simples do cálculo (script `node`) para os casos: almoço, bloqueio parcial,
serviço que não cabe antes do almoço, dia de folga.

**Teste da usuária:** configurar horário com almoço e uma folga; abrir o agendamento como
cliente e conferir que os horários oferecidos respeitam tudo.

---

### F5 — Agendamento pela cliente ✅

**Objetivo:** o carro-chefe. A cliente agenda sozinha, em poucos toques, bonito.

**Etapas:**

**F5.1 — Wizard do StudioMenu sobre o modelo novo.** Escolher serviço (e variação) → dia →
horário (grade de horários do StudioMenu) → nome e WhatsApp → confirmar. **Decisão a
confirmar com a usuária nesta etapa:** permitir mais de um serviço no mesmo agendamento (o v1
permitia, ex.: extensão + design de sobrancelha). Recomendação: sim, com o modelo
`appointment_items` já preparado.
**F5.2 — Cliente por WhatsApp.** Achar a cliente existente pelo WhatsApp normalizado do
estúdio; se não existir, criar. Tratar corrida (índice único + reaproveitar). Nome divergente
não sobrescreve o cadastro (regra do v1: o WhatsApp sozinho não dá acesso a dados de
ninguém — a cliente final não vê histórico, então o risco do v1 não existe aqui).
**F5.3 — Modos de agendamento.** `auto` → nasce confirmado; `approval` → nasce "aguardando".
Re-checagem do horário no servidor + trava do banco contra choque.
**F5.4 — Tela de sucesso + link único.** Mensagem pós-agendamento da profissional, resumo,
botão "falar no WhatsApp", e o link `/c/<slug>/agendamento/<token>`: ver o agendamento,
status, **cancelar** (respeitando `cancellation_notice_hours`; depois disso, mostra o botão de
WhatsApp). Botão "adicionar à agenda do celular" (arquivo .ics) se for simples.
**F5.5 — Botão de WhatsApp opcional e agenda pausada.** Quando `whatsapp_button_enabled`, o
catálogo mostra também "agendar pelo WhatsApp". Quando `agenda_paused`, só o WhatsApp.
**F5.6 — Aviso para a profissional.** Push (se ativado) + o agendamento aparece no Início.
(O push completo é ligado na F12; aqui basta o registro no banco + o aviso no app.)

**Teste da usuária:** agendar como cliente nos dois modos, pelo celular; cancelar pelo link;
tentar agendar o mesmo horário em duas abas ao mesmo tempo.

**Riscos:** fuso horário (tudo em `America/Sao_Paulo`, gravado em UTC) — testar perto da
meia-noite e em dia de mudança de mês.

---

### F6 — Agenda da profissional — **marco M1** ✅

**Objetivo:** o coração do uso diário.

**Etapas:**

**F6.1 — Visão dia e mês do StudioMenu** sobre o modelo novo (timeline do dia, calendário do
mês com marcações).
**F6.2 — Visão semana** — ⏭️ **pulada** (decisão da usuária em 2026-11-25: Dia + Mês bastam no celular). Texto original: (do v1, no visual do StudioMenu) — confirmar com a usuária se vale;
no celular a visão dia costuma bastar.
**F6.3 — Pendentes:** confirmar / recusar (com motivo opcional e botão de WhatsApp já com a
mensagem).
**F6.4 — Agendamento manual** pela profissional (cliente existente ou nova, serviço(s),
horário — pode encaixar fora da grade, com aviso).
**F6.5 — Concluir atendimento** com "valor recebido" (padrão = valor dos serviços; pode mudar
para desconto/valor negociado), **marcar falta**, cancelar, remarcar.
**F6.6 — Trancar horário** direto da agenda (cria um bloqueio parcial).

**Teste da usuária (M1):** usar a agenda de um estúdio de teste como se fosse um dia real:
receber agendamento da "cliente", confirmar, encaixar um manual, concluir com desconto,
marcar uma falta, trancar um horário.

---

### F7 — Clientes ✅

**Etapas:**

**F7.1 — Lista de clientes:** busca por nome/WhatsApp, botão de WhatsApp, quantidade de
atendimentos e data do último; nova cliente manual.
**F7.2 — Perfil da cliente:** dados (nome, WhatsApp, e-mail, nascimento, observações),
editar, excluir (com confirmação; não exclui se houver histórico — arquiva ou avisa).
**F7.3 — Histórico:** agendamentos passados e futuros, concluídos com valor, faltas, total
gasto; resumo rápido no topo.
**F7.4 — Registrar atendimento manual** (algo feito fora do app, entra no histórico e nos
relatórios — `origin = 'record'`).
**F7.5 — Atalhos:** do agendamento na agenda → perfil da cliente; do perfil → novo agendamento.

**Teste da usuária:** encontrar uma cliente, ver o histórico, registrar um atendimento antigo,
conferir que aparece nos números.

---

### F8 — Ficha da cliente ✅

**Objetivo:** o diferencial "só lash", com todo cuidado de privacidade.

**Etapas:**

**F8.1 — Ficha técnica** (aba principal): formato do olho, espaçamento, densidade/comprimento/
curvatura natural, técnica preferida, mapping, curvatura, espessura, comprimento predominante,
efeito desejado, tipo de adesivo, retenção média, frequência de manutenção, observações. Campos
e opções exatamente do v1 (`FichaAnamneseDetalhe.tsx`), visual do StudioMenu (seleções em
"chips", rápido de preencher no celular).
**F8.2 — Saúde e cuidados** (segunda aba): perguntas do v1 (alergias, medicamentos, condições,
gestante, lentes, olhos sensíveis, etc.).
**F8.3 — Consentimento:** registro de que a cliente autorizou guardar os dados (data/hora;
texto curto) — LGPD.
**F8.4 — Ficha no atendimento:** ao abrir um agendamento na agenda, um resumo da ficha técnica
aparece ("Última vez: C 0.07, gatinho, volume russo").
**F8.5 — Lista "Fichas"** (opcional): clientes com/sem ficha preenchida.

**Regras desta fase (checar no fim):** nenhuma rota/página da ficha carrega pixel; textos da
ficha nunca aparecem fora do app; dados só pelo servidor, só para a dona do estúdio.

**Teste da usuária:** preencher a ficha de uma cliente pelo celular em menos de 2 minutos;
abrir o agendamento seguinte dela e ver o resumo.

---

### F9 — Início (painel) + relatórios ✅

**Etapas:**

**F9.1 — Início:** atenção primeiro (agendamentos aguardando confirmação), agenda de hoje,
números (agendamentos hoje, faturado hoje, faturado no mês, novas clientes no mês), ações
rápidas (novo agendamento, bloquear horário, compartilhar link). Card "Continue de onde parou"
dos primeiros passos (liga na F11). **Visual: seguir o protótipo aprovado
`docs/referencias/prototipo-inicio-app.html`** (cores, cards, ícones).
**F9.2 — Relatórios:** períodos (hoje, ontem, 7 dias, este mês, mês passado, este ano,
personalizado); total de agendamentos, concluídos, cancelamentos, faltas, valor recebido,
novas clientes, serviços mais feitos. Gráfico simples de receita.

**Teste da usuária:** conferir os números do estúdio de teste contra o que ela sabe que fez.

---

### F10 — Configurações — **marco M2** ✅

**Etapas:**

**F10.1 — Meu negócio:** nome do estúdio, nome dela, WhatsApp, Instagram, endereço/mapa, foto
(o que não for editado direto no catálogo).
**F10.2 — Regras de agendamento:** modo (automático / com aprovação), botão de WhatsApp
liga/desliga, pausar agenda, antecedência mínima para agendar, até quantos dias à frente,
antecedência para cancelar, mensagem pós-agendamento.
**F10.3 — Meu link:** `<slug>.lashagenda.com`, copiar, compartilhar, QR code para imprimir;
trocar o slug (com aviso de que o link antigo para de funcionar).
**F10.4 — Conta e ajuda:** acesso (Google/senha — liga na F11), notificações (liga na F12),
suporte pelo WhatsApp, sair.

**Teste da usuária (M2):** usar o app inteiro por um "dia de trabalho" simulado sem precisar de
nada fora dele.

---

### F11 — Venda e acesso — **marco M3**

**Objetivo:** o ciclo de compra sem X1, igual ao do StudioMenu (que está sendo validado agora).

**Etapas:**

**F11.1 — Prévia pelo nome.** A lead digita o nome → nasce um estúdio em `preview` (24h) com
os serviços de exemplo, tema escolhível (Rosé/Luxury, Mosaico/Clássico) e **o agendamento
funcionando em modo demonstração** (ela vê o fluxo da cliente sem gravar agendamento real).
Cookie da prévia, rate limit, limpeza diária das prévias vencidas (cron).
**F11.2 — Cakto (ambiente de teste).** Produtos de teste, link de checkout com `sck` = código
da prévia, webhook com idempotência e log em `cakto_events`, regras de acesso
(`paid_until` + folga), cancelamento/reembolso/chargeback — portar
`lib/cakto.ts`/`cakto-checkout.ts`/`api/billing/cakto-webhook` para `studios`.
Testes por script (aprovação com e sem `sck`, repetição, renovação, cancelamento, reembolso).
**F11.3 — `/ativando`.** Página de obrigado que loga sozinha e leva para os primeiros passos.
**F11.4 — E-mail de acesso (Resend).** Na primeira ativação, e-mail com o link curto do app.
Remetente `LashAgenda <acesso@lashagenda.com>` (em dev, remetente de teste).
**F11.5 — Primeiros passos.** Checklist: WhatsApp → serviços e preços → horários → acesso
(Google ou senha) → compartilhar o link. Vídeos opcionais (URLs em um arquivo central).
**F11.6 — Criar acesso + login.** Google e senha (Supabase Auth) vinculados ao estúdio;
`/entrar`; "esqueci a senha".
**F11.7 — Plano no app.** Card com plano, vencimento, como cancelar (portal da Cakto),
reativar; bloqueio do app e do catálogo quando o acesso vence (com mensagem amigável para a
cliente final).

**Teste da usuária (M3):** no preview, fazer o caminho inteiro de uma lead: prévia → checkout
de teste → ativação → e-mail → primeiros passos → login no celular.

---

### F12 — Admin + PWA + notificações

**Etapas:**

**F12.1 — Admin:** login por senha; lista de estúdios com filtros (pagantes, prévias, vencidos);
detalhe (plano, vencimento, +1 mês/+1 ano manual, desativar, abrir catálogo, entrar no app
como ela para suporte); eventos da Cakto com payload; números gerais (prévias/dia, ativações,
pagantes, cancelamentos).
**F12.2 — PWA:** manifest por estúdio, instalação no Android e no iOS (folha de instruções do
StudioMenu), ícones do LashAgenda.
**F12.3 — Push:** ativação guiada, novo agendamento, cancelamento pela cliente, teste de push.
Chaves VAPID novas.
**F12.4 — Telegram:** avisos de nova prévia (resumido), nova assinatura, cancelamento,
reembolso, erro no webhook.

**Teste da usuária:** instalar o app no celular, receber um push de agendamento feito em outro
aparelho; usar o admin para conceder +1 mês a um estúdio.

---

### F13 — Produção e domínio

**Etapas:**

**F13.1 — Banco de produção:** projeto `lashagendav2-prod`, `docs/schema.sql` aplicado,
storage com as fotos padrão.
**F13.2 — Domínio:** mover `lashagenda.com` do v1 para o projeto novo na Vercel; DNS na Vercel;
wildcard `*.lashagenda.com`; `www` e raiz; `RESERVED_SLUGS` conferido contra os registros DNS
(como `send`/`rsend` no StudioMenu). O v1 sai do ar (ou fica num subdomínio de arquivo, se a
usuária quiser).
**F13.3 — Resend em produção:** domínio verificado, remetente real.
**F13.4 — Cakto real:** produtos reais (R$ 22,90/mês, R$ 197/ano), obrigado e webhook em
`https://www.lashagenda.com/...` (sempre com `www`, ver aprendizado do StudioMenu), pixel novo
nos produtos.
**F13.5 — Variáveis de produção + revisão de segurança:** segredos, sessões, rate limits,
storage, RLS sem brechas, nenhuma chave no cliente, ficha só no servidor.
**F13.6 — Promoção para `main`:** PR `desenv → main`, a usuária faz o merge.

**Teste da usuária:** abrir `fulana.lashagenda.com` de um estúdio criado no admin de produção.

---

### F14 — Testes finais — **marco M4**

Executar o roteiro da seção 6 inteiro, em produção, no celular (Android e iPhone), incluindo
**uma compra real com cupom de 80% e o reembolso**, como foi feito no StudioMenu. Corrigir o
que aparecer, sempre pela `desenv` → `main`.

---

### F15 — Página de venda + marketing — **marco M5**

**Etapas:**

**F15.1 — Landing de autosserviço** (modelo da página Lash do StudioMenu): promessa
("seu catálogo que agenda sozinho"), demonstração ao vivo, prévia pelo nome no topo, oferta
com os dois planos, perguntas frequentes. **Sem nenhum termo de saúde** (regra da seção 5 das
decisões). Texto curto e foco em: link na bio bonito, cliente agenda sozinha, menos tempo no
WhatsApp, agenda e clientes no celular.
**F15.2 — Rastreamento:** pixel novo (PageView, Lead na prévia, AddToCart no clique em ativar;
InitiateCheckout/Purchase na Cakto), PostHog com o funil (prévia → clique → ativação), UTMs.
**F15.3 — Criativos e campanha:** ângulos (o "NÃO MANDE MAIS PDF" do StudioMenu adaptado para
"pare de agendar pelo WhatsApp"; antes/depois do link na bio; demonstração do agendamento),
campanha com o pixel novo, orçamento de teste igual ao do StudioMenu. Reaproveitar os scripts
de Meta Ads do StudioMenu (`marketing/scripts`) se fizer sentido.
**F15.4 — Estratégia StudioMenu → LashAgenda:** decidir (com dados das duas operações) se e
como o StudioMenu vira a vitrine de entrada; texto de upgrade dentro do app do StudioMenu.
Fica registrado em `DECISOES_DE_PRODUTO.md`.

**Teste da usuária:** fazer o caminho de uma lead vinda do anúncio, no celular, até a compra
de teste.

---

## 6. Plano de testes

### 6.1 Em todas as etapas
- `npx tsc --noEmit` e `node scripts/check-integrity.js` limpos.
- Roteiro de teste da etapa entregue pelo agente e executado pela usuária.

### 6.2 Testes por script (o agente cria e roda contra o banco dev)
- Motor de disponibilidade (F4.3): almoço, bloqueio parcial, folga, serviço que não cabe,
  antecedência mínima, janela máxima, virada de mês.
- Agendamento (F5): dois agendamentos no mesmo horário ao mesmo tempo → um falha; cliente
  repetida pelo WhatsApp com formatação diferente → mesma cliente.
- Webhook da Cakto (F11.2): aprovação com/sem `sck`, repetição, renovação, cancelamento,
  reembolso, chargeback, produto fora do mapa.

### 6.3 Roteiro ponta a ponta (F14 — no celular, Android e iPhone)

**Lead → assinante**
1. Abrir a landing pelo link do anúncio; gerar a prévia com um nome.
2. Trocar tema e modelo na prévia; testar o agendamento de demonstração.
3. Ativar → checkout Cakto (cupom) → pagar.
4. `/ativando` abre o app sozinha; o e-mail de acesso chega.
5. Primeiros passos completos; criar acesso com Google; sair e entrar de novo.

**Dia de trabalho da profissional**
6. Ajustar serviços, variações e fotos pelo editor; conferir o catálogo como cliente.
7. Configurar horários com almoço e uma folga.
8. Instalar o app; ativar notificações.

**Cliente final** (em outro celular, sem login)
9. Agendar pelo `<slug>.lashagenda.com` (modo automático) → push chega para a profissional.
10. Trocar para "com aprovação"; agendar de novo → aparece como aguardando → confirmar.
11. Cancelar pelo link único (dentro e fora da antecedência).

**Gestão**
12. Concluir um atendimento com desconto; marcar uma falta; trancar um horário.
13. Abrir a cliente: histórico, total gasto; preencher a ficha técnica e a de saúde.
14. Conferir Início e relatórios.

**Dinheiro e acesso**
15. Reembolso pela Cakto → acesso cai; catálogo mostra mensagem amigável.
16. Admin: +1 mês manual → acesso volta.

**Regra de saúde**
17. Conferir no Meta Pixel Helper que o pixel **só** dispara na landing.

---

## 7. Riscos e como reduzir

| Risco | Como reduzir |
|---|---|
| Escopo cresce e o lançamento nunca chega | Backlog futuro fechado até a F15; toda ideia nova vai para `BACKLOG_FUTURO.md` |
| A cópia do StudioMenu traz complexidade escondida | F1 separada da F2; remover em commits pequenos; `tsc` a cada passo |
| Mudar o modelo de dados quebra fluxos sutis | Revisão do schema antes de aplicar (F2.1); seed de teste completo (F2.3) |
| Pixel restrito de novo por "saúde" | Regra da seção 5 das decisões + checagem na F8, F13 e F14 |
| Fuso horário / virada de dia | Testes por script na F4 e F5 |
| Rodar script contra o banco errado | Scripts recusam rodar fora do dev; nome exato do `.env.development.local` |
| Mexer no StudioMenu sem querer | Repositórios, bancos e projetos Vercel separados; playbook proíbe |
| Domínio `lashagenda.com` hoje aponta para o v1 | Migração planejada na F13, com a usuária |
| Limite de projetos do Supabase grátis | Pausar o projeto do v1 ou usar outra organização (seção 4) |
