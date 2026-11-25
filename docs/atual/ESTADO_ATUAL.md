# Estado atual — LashAgenda v2

> **Fonte de verdade sobre o presente.** Atualizado ao fim de cada fase (e sempre que algo
> importante mudar).
>
> Última atualização: **2026-11-24 — F5.3 concluída (modos de agendamento).**

---

## 1. Onde estamos

| | |
|---|---|
| **Fase atual** | **F6 — Agenda da profissional (marco M1)** (F6.1 ✅, F6.2 ⏭️ pulada, F6.3 ✅, F6.4 ✅, F6.5 ✅) |
| **Próxima etapa** | **F6.6 — Trancar horário direto da agenda** (ver `docs/plano/PLANO_LASHAGENDA_V2.md`) |
| **Fases concluídas** | F0, F1, F2, F3, F4, F5 (F2: teste superficial da usuária ok em 2026-11-24; teste a fundo fica para a fase de testes) |
| **Bloqueios** | Nenhum |

## 2. O que existe no repositório

- Documentação: plano, decisões de produto, backlog futuro, playbook, este documento.
- `legacy/lashagenda-v1/`: código do v1, só referência.
- **App Next.js** (`src/`, `public/`, configs na raiz): base do StudioMenu (`desenv` @ `092022e`)
  já limpa (sem Asaas, upsells, X1, nichos, admin de marketing, formulário de onboarding,
  pixel) e com a marca LashAgenda (paleta do v1, ícones do v1, textos, domínio
  `lashagenda.com` em `lib/public-url.ts`). **Código já no modelo v2** (F2.2): nenhuma
  referência a `orders`/`order_services`. As telas ainda são as do StudioMenu; a camada de dados
  traduz o banco novo para o formato delas.
- **Camada de dados (F2.2):**
  - `types/studio.ts` — linhas do banco v2.
  - `lib/studio-access.ts` — regras centrais: `studioHasFeature` (sempre `true` no lançamento),
    prévia, acesso pago (`paid_until` + folga de 3 dias, liberação manual), `isBookingLive`.
  - `lib/studio-service.ts` — estúdio + serviços ↔ formato do catálogo/editor; criação de
    estúdio e slug pelo nome; dados do app da profissional.
  - `lib/service-format.ts` — texto do preço ("R$ 180", "A partir de…", "Sob Consulta")
    e da duração a partir dos números. `ProcedureItem` (catálogo/editor) já usa
    `price: number | null`, `price_from` e `duration_minutes` obrigatório (F3.1).
  - Editor visual (F3.3): preço com "a partir de", opções (variações) com id estável no
    salvar, "Mostrar no catálogo" (`services.active`) e "Cliente pode agendar online"
    (`bookable`). O editor carrega também os ocultos (`getCatalogBySlug(..., { includeInactive })`),
    porque salvar apaga o serviço que não veio na lista.
  - Serviços de exemplo (F3.4): os 6 do preset Lash (`data/niche-presets/lash`), com a
    Manutenção em 3 opções, gravados por `insertStudioServices` em todo estúdio novo (prévia
    ou compra direta). Fotos em `public/modelos/mosaico/assets/img/`.
  - `lib/scheduling/booking-service.ts` — cliente com dedupe por WhatsApp (guardado só com
    dígitos, sem o 55) — regras do número em `client-phone.ts` (F5.2: com o 9 do celular, acha
    cadastro antigo sem o 9, recusa número inválido) + agendamento + itens. `agenda-service.ts` monta o formato da Agenda.
- `docs/schema.sql`: **schema v2** (fonte da verdade do banco; 12 tabelas, travas e segurança).
- `docs/schema_studiomenu_base.sql`: schema do StudioMenu usado na F1 (só referência; já apagado do dev).
- `docs/referencias/prototipo-inicio-app.html`: protótipo aprovado do Início (base da F9.1).
- `scripts/dev-seed-studio.mjs` (F2.3): cria/recria no banco dev o estúdio `teste-lash`
  ("Fernanda Teste", liberado à mão, modo com aprovação) com 7 serviços (um "a partir de", um
  "sob consulta"), 2 variações, horários seg–sáb 09–18, almoço bloqueado e uma folga, 5
  clientes e 9 agendamentos (passados, cancelado, falta, histórico, futuros confirmados e
  aguardando). Rodar de novo recria os dados e **mantém o link mágico**. Recusa rodar fora do
  `lashagendav2-dev`. Uso:
  `node --env-file=.env.development.local scripts/dev-seed-studio.mjs`
- `scripts/test-availability.mjs` (F4.3): testes do motor de horários (almoço, bloqueios, folga,
  antecedência, janela, agendamento manual), sem banco nem servidor. Uso: `npm run test:availability`.
- `scripts/test-client-phone.mjs` (F5.2): regras do WhatsApp da cliente (55, 0, 9 do celular,
  fixo, inválidos).
- `scripts/test-client-appointment.mjs` (F5.4): prazo para a cliente cancelar e arquivo de
  agenda (.ics). `npm test` roda os cinco scripts de teste.
- Link único da cliente (F5.4): `/c/<slug>/agendamento/<manage_token>` (ver, adicionar à agenda,
  cancelar até `cancellation_notice_hours` antes). Recado pós-agendamento e prazo ainda sem tela
  (F10.2); no seed: recado preenchido e prazo de 24h.
- `scripts/dev-set-booking-mode.mjs` (F5.3/F5.5): troca o modo de um estúdio do dev (`auto` ou
  `aprovacao`) e liga/desliga o "ou agende pelo WhatsApp" (`whatsapp-on`/`whatsapp-off`) até
  existir a tela de regras (F10.2). Uso:
  `node --env-file=.env.development.local scripts/dev-set-booking-mode.mjs auto`
- Início (F5.6): card "Novidades das clientes" (`ClientActivityCard`, regras em
  `lib/scheduling/client-activity.ts`, testes em `scripts/test-client-activity.mjs`) com o que
  as clientes agendaram ou cancelaram pelo link nos últimos 3 dias. O push sai ao agendar e ao
  cancelar, mas só funciona com as chaves VAPID (ainda não configuradas — F12).
- Agenda (F6.1): `AgendaAppointment` traz os itens (serviço, duração, preço), origem e dados do
  cancelamento. A visão do dia lista "Cancelados neste dia" à parte (sem ocupar horário); o
  detalhe mostra cada serviço + total e o WhatsApp clicável. O mês continua sem cancelados.
- Pós-atendimento (F6.5): concluir grava `amount_received` (padrão = total; `parseAmountReceived`),
  falta/desfazer limpam o valor; cancelar confirmado usa o modal da recusa (motivo + WhatsApp);
  remarcar em `/api/professional/appointments/[id]/reschedule` (mesmos itens e link, ignora o
  próprio agendamento no choque, mesma regra de encaixe da F6.4).
- Agendamento manual (F6.4): busca de cliente (`/api/professional/clients`), até 5 serviços com
  opções, anotação em `appointments.notes`. Choque nunca passa; fora do expediente/trancado
  responde `needsConfirmation` e só grava com `allow_outside_hours` (`instantProblem` em
  `availability.ts`). Serviço com opções exige a opção escolhida também no servidor.
- Aguardando (F6.3): confirmar/recusar só pelas mudanças de `lib/scheduling/appointment-actions.ts`
  (testes em `scripts/test-appointment-actions.mjs`); motivo da recusa gravado em `cancel_reason`
  e mostrado no link da cliente; WhatsApp de confirmação leva o link único, o de recusa leva o
  catálogo. Atualização condicional ao status (cliente cancelou ao mesmo tempo → 409).
- Catálogo (F5.5): com agendamento online ligado, `whatsapp_button_enabled` mostra também
  "ou agende pelo WhatsApp" no detalhe do serviço; com `agenda_paused` (Configurações →
  Desligar Agenda), só o WhatsApp.

### Ambientes

| | |
|---|---|
| **Node** | 22 (o `@supabase/supabase-js` atual quebra no Node 20). |
| **Banco dev** | Supabase `lashagendav2-dev` (ref `psixalpmgcuydqfxlrto`), **schema v2** (`docs/schema.sql`, aplicado em 2026-11-24). |
| **Local** | `.env.development.local` (3 chaves do Supabase dev) + `.env.local` (segredos de sessão e senha do admin). Ambos fora do Git. |
| **Vercel** | Projeto `lashagendav2` (time "doupsdigital's projects", Hobby), Node 22.x, Vercel Authentication ligado. Variáveis só no **Preview** (as 6 do local, apontando para o dev; as secretas como Secret). A `main` ainda não tem o app, então o deploy de produção falha — esperado até a F13. |
| **Preview fixo da `desenv`** | `https://lashagendav2-git-desenv-doupsdigital-s-projects.vercel.app` — catálogo em `/c/teste-lash`; app pelo link mágico `/api/professional/login?slug=teste-lash&token=…` (token impresso pelo script). No celular, logar na Vercel **antes** de abrir o link mágico (o redirect do login perde os parâmetros). |

## 3. O produto (resumo — detalhes em `docs/plano/DECISOES_DE_PRODUTO.md`)

LashAgenda v2: catálogo digital (experiência do StudioMenu) + agendamento automático ou com
aprovação + agenda + clientes + ficha técnica, só para lash designers autônomas. Plano único,
**R$ 22,90/mês ou R$ 197/ano**, vendido pela Cakto sem X1 (prévia pelo nome de 24h). Domínio
`lashagenda.com`, link da profissional `<slug>.lashagenda.com`.

## 4. Stack (alvo)

Next.js 16 + TypeScript + Tailwind (base copiada do StudioMenu, commit `092022e` da `desenv`)
· Supabase com acesso só pelo servidor · Vercel · Cakto · Resend · PostHog · Telegram · PWA +
Web Push.

## 5. Git

- Remoto: `https://github.com/doupsdigital/lashagendav2.git`.
- Branches: `main` (produção, protegida pela regra do playbook) e `desenv` (trabalho).
- Token do agente: `.env` → `GITHUB_TOKEN` (fora do Git), usado só na linha de comando do
  push.

## 6. Projetos relacionados (não mexer a partir daqui)

| Projeto | Onde | Observação |
|---|---|---|
| StudioMenu | `doupsdigital/studiomenu`, `studiomenu.art` | Em produção com clientes. Base técnica copiada na F1. |
| LashAgenda v1 | `legacy/lashagenda-v1/` (cópia) | Banco antigo apagado; um banco novo de teste foi criado em 2026-11-19 só para rodá-lo localmente e relembrar o produto. No arquivo `scripts/schema_novo_banco.sql` da máquina de trabalho, a URL do push ficou com o domínio repetido (`…supabase.co.supabase.co`) — irrelevante enquanto as Edge Functions não forem usadas. |

## 7. Pendências conhecidas

- [x] Criar o projeto Supabase `lashagendav2-dev` (usuária) — atenção ao limite de 2 projetos
      ativos no plano grátis.
- [x] Ter um clone do StudioMenu na estação onde a F1 for feita.
- [x] Decidir na F1.4: paleta do app → **v1** (2026-11-24; ver `DECISOES_DE_PRODUTO.md`, seção 7).
- [x] Decidir na F5.1: vários serviços no mesmo agendamento → **sim, até 5** (2026-11-24).
- [x] Decidir na F6.2: visão "semana" → **não entra** (2026-11-25; Dia + Mês bastam).
- [ ] Bug herdado do StudioMenu (visto no preview em 2026-11-24): no primeiro acesso ao app, os
      tooltips do `InicioTour` ("Agendamentos de hoje", "Aguardando confirmação", "Seus próximos
      passos") aparecem **por cima da tela de boas-vindas** (`WelcomeOnboarding`), apontando
      para coisas escondidas atrás dela. O tour deveria esperar as boas-vindas terminarem.
      Corrigir junto com o Início novo (F9.1) ou antes, se atrapalhar os testes.
- [ ] Herdado do StudioMenu, a resolver nas fases indicadas (anotado na F2.2):
  - **F10:** `min_notice_minutes` e `booking_window_days` já valem no agendamento (F4.3), mas
    ainda não têm tela para a profissional mudar (hoje ficam no padrão: 2h e 60 dias).
  - **F11:** preço anual exibido ainda é R$ 127 (`lib/pricing.ts`); o v2 vende a R$ 197.
  - **F12:** `/admin/catalogos` virou uma lista enxuta (status, links, +1 mês/ano, liberar à
    mão, desativar, excluir). Saíram o "Cadastrar serviços com IA" (`extract-catalog`,
    `replace-services` — ferramenta do X1, que o v2 não usa) e os controles de preço/plano
    do StudioMenu.
