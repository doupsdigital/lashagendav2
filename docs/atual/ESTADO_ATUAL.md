# Estado atual — LashAgenda v2

> **Fonte de verdade sobre o presente.** Atualizado ao fim de cada fase (e sempre que algo
> importante mudar).
>
> Última atualização: **2026-11-26 — F10.4 concluída — F10 fechada (marco M2).**

---

## 1. Onde estamos

| | |
|---|---|
| **Fase atual** | **F11 — Venda e acesso (marco M3)** |
| **Próxima etapa** | **F11.1 — Prévia pelo nome** (ver `docs/plano/PLANO_LASHAGENDA_V2.md`) |
| **Fases concluídas** | F0, F1, F2, F3, F4, F5, F6, F7, F8, F9, F10 (F10: teste do marco M2 pela usuária ainda a fazer — "dia de trabalho" simulado; F9: teste da usuária da F9 ainda a fazer; F8: teste da usuária da F8 ainda a fazer; F7: teste da usuária da F7 ainda a fazer; F6: teste do marco M1 pela usuária ainda a fazer; F2: teste superficial da usuária ok em 2026-11-24; teste a fundo fica para a fase de testes) |
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
- Clientes (F7.1): aba nova `app/[slug]/clientes` (barra: Início · Clientes · [Agenda] · Config).
  `lib/clients/client-list.ts` (puro: resumo de atendimentos — só `completed` conta —, busca sem
  acento por nome ou pedaço do WhatsApp, rótulos) e `lib/clients/client-service.ts` (lista
  paginada de 1000 em 1000; cadastro manual que avisa WhatsApp repetido em vez de reaproveitar).
  POST `/api/professional/clients` cria cliente (`source='manual'`, 409 `duplicate`).
- Perfil da cliente (F7.2): `app/[slug]/clientes/[id]` (dados, editar, excluir; id que não
  existe volta para a lista). `lib/clients/client-profile.ts` (puro: validação de nome, e-mail,
  nascimento e observações; idade). PATCH/DELETE `/api/professional/clients/[id]` (sessão do
  `slug`, cliente sempre filtrada pelo estúdio). Excluir só sem nenhum agendamento — com
  histórico devolve 409 `has_history` e a tela avisa (não há arquivar; o banco tem `RESTRICT`).
- Histórico da cliente (F7.3): no perfil, resumo (atendimentos, total gasto = soma do
  `amount_received` dos concluídos, faltas, próximo, último) e listas Próximos/Histórico, cada
  item levando ao dia na agenda (registro `origin='record'` não leva). `lib/clients/client-history.ts`
  (puro: `splitHistory`, `summarizeHistory`, `historyStatusLabel`), `getClientHistory` (até 500),
  `components/clients/ClientHistory.tsx`.
- Atendimento registrado (F7.4): "Registrar atendimento" no perfil (`RecordVisitSheet`) →
  POST `/api/professional/clients/[id]/records` → `booking-service.createRecord`
  (`origin='record'`, `completed`, ao meio-dia da data, recebido = total se vazio). Data só hoje
  ou antes, desde 2000 (`lib/clients/client-record.ts`). Não ocupa horário (a trava do banco
  ignora `record`). "Apagar registro" no histórico: DELETE `.../records/[recordId]`, só `record`.
  O histórico mostra a anotação da profissional (`notes`).
- Atalhos (F7.5): no detalhe do agendamento, "Ver cliente" → perfil (`AgendaAppointment.client_id`).
  No perfil, "Agendar" → `/agenda?cliente=<id>` abre o agendamento manual com ela escolhida
  (`getStudioClient`, só cliente do estúdio; id inválido abre a agenda normal).
- Ficha da cliente (F8.1/F8.2): página `app/[slug]/clientes/[id]/ficha` (`ClientSheetForm`, chips;
  sim/não com "não informado"), card com resumo no perfil. Campos/opções/chaves do v1 em
  `lib/clients/client-technical.ts` (puro: `cleanTechnical`, `readTechnical`, `technicalSummary`).
  `client_records.technical` via `lib/clients/client-sheet-service.ts` (confere a cliente no
  estúdio; upsert só da coluna `technical`, não toca `health`). PUT `/api/professional/clients/[id]/ficha`.
  Ficha e resumo com `ph-no-capture` (fora das gravações/cliques do PostHog). O resto do app
  ainda é gravado pelo PostHog (nomes/telefones de clientes) — decisão pendente da usuária.
- Saúde e cuidados (F8.2): segunda aba da mesma página (aba é só estado, nunca vai para a URL).
  14 perguntas/chaves do v1 em `lib/clients/client-health.ts` (puro: `cleanHealth`, `readHealth`,
  `countHealthAlerts`; "reação alérgica" só com "já fez extensão" = Sim). Grava em
  `client_records.health` pelo mesmo PUT (`{ health }`; uma aba por vez, `saveClientSheetTab`).
  Card do perfil: "Saúde: N pontos de atenção" (sem o texto).
- Consentimento (F8.3): `client_records.consent_at`. Sem ele a aba de saúde fica travada (só o
  pedido de autorização, `lib/clients/client-consent.ts`), o PUT de saúde dá 409 `no_consent` e
  `getClientSheet` nem devolve `health`. POST/DELETE `/api/professional/clients/[id]/ficha/consent`;
  registrar de novo mantém a data; retirar apaga `health` (a técnica fica) — decisão a confirmar
  pela usuária. Ficha técnica não depende de consentimento.
- Ficha no atendimento (F8.4): `getSheetHighlights` (client-sheet-service) — resumo da técnica e
  só a CONTAGEM de pontos de atenção de saúde (com consentimento), das clientes na tela da agenda
  (segunda consulta na página, filtro pelo `studio_id` da cliente). Aparece no topo do
  `AppointmentDetailSheet` (link para a ficha, `ph-no-capture`). Texto de saúde nunca vai para a agenda.
- Filtro de fichas na lista (F8.5): `getStudioSheetStatus` (client-sheet-service) devolve por cliente
  só `{filled, healthAlerts}`; `matchesSheetFilter` (client-list) e chips Todas / Sem ficha / Com
  atenção no `ClientsClient` (`ph-no-capture`, filtro não vai para a URL), ícone âmbar ao lado do nome.
- Início / painel (F9.1): `inicio/page.tsx` + `components/inicio/InicioCards.tsx` — pendentes no
  topo, 4 números (`getInicioNumbers` em `lib/dashboard/inicio-service.ts`; contas puras em
  `inicio-numbers.ts`), agenda de hoje e ações rápidas. Faturado = `amount_received` dos concluídos
  (inclui registros do histórico, pela data); clientes novas = `created_at` no mês. As ações abrem
  a Agenda com `?abrir=novo|trancar` (o parâmetro sai da URL depois de abrir). O Início confere a
  sessão na própria página.
- Relatórios (F9.2): `app/[slug]/relatorios` (link no Início, fora da barra de abas) +
  `components/reports/ReportView.tsx`. Período na URL (`?periodo=`, `de`/`ate` no personalizado,
  máx. 2 anos); contas puras em `lib/dashboard/report.ts`, leitura em `report-service.ts`. Mesma
  regra do Início: registros do histórico contam como concluídos; receita e serviços mais feitos
  só dos concluídos. Gráfico só com CSS (por dia até 62 dias, senão por mês), sem lib nova.
- Meu negócio (F10.1): primeira seção da Config (`BusinessSection`), `PUT /api/professional/business`
  (`lib/studio/business-service.ts`; validação pura em `business-profile.ts`). Grava nas MESMAS
  colunas de `studios` que o editor do catálogo (owner_name, studio_name, whatsapp com 55,
  instagram sem @, address, maps_url). Foto continua só no editor do catálogo. Fora do tour da
  Config de propósito (passo novo reabriria o tour para quem já viu).
- Regras de agendamento (F10.2): seção da Config (`BookingRulesSection`, travada sem acesso pago),
  `PUT /api/professional/booking-rules` (`lib/studio/booking-rules-service.ts`; opções e validação
  puras em `booking-rules.ts`). Modo auto/aprovação, botão de WhatsApp, antecedência mínima,
  janela, prazo para cancelar e mensagem pós-agendamento. Aceita qualquer inteiro nos limites do
  banco (valor antigo fora das opções aparece como opção extra). "Desligar Agenda" segue como
  seção própria. Fora do tour da Config.
- Meu link (F10.3): seção da Config (`LinkSection`) — link, copiar, compartilhar, QR (`qrcode`
  1.5.4, gerado no servidor em `lib/studio/link-qr.ts`, sempre do link de produção), página de
  impressão `config/qr` e troca do slug (`POST /api/professional/slug`, `slug-service.ts`; regras
  puras em `slug-rules.ts`). Sem tabela de slugs antigos: o link antigo morre. A troca devolve o
  cookie de sessão do slug novo; o layout de `/app/[slug]` leva o endereço antigo (estúdio que
  não existe mais) ao slug da sessão válida; o aparelho migra as chaves `sm_*` do localStorage.
  Catálogo inexistente responde 200 com "Catálogo Não Encontrado" (herdado, não é 404).
- Conta e ajuda (F10.4): "Minha conta" mostra o e-mail do login vinculado
  (`lib/studio/account-service.ts`); e-mail já cadastrado entra com a senha digitada e vincula;
  sair sem acesso criado pede confirmação. Suporte: botão "Ver de novo as dicas do app" (apaga as
  chaves de tour/boas-vindas do slug). Número do suporte num lugar só: `lib/support.ts`.
  Notificações intactas (ligam na F12).
- Testes E2E em sequência estouram o limite de `scheduling-book` (f52 falha por isso): limpar
  `rate_limits` do banco dev antes de rodar os de agendamento.
- Páginas do app sem sessão: Início, Agenda, Clientes, Relatórios e Config conferem a sessão na própria página e não leem
  nada (o layout só esconde; sem isso os dados iam no HTML). Corrigido na F7.1.
- Trancar pela agenda (F6.6): tocar num horário livre pergunta Agendar/Trancar (trancar já vem
  com o trecho); tocar num trancado mostra período/motivo e Destrancar (bloqueio de vários dias
  sai inteiro, com aviso). Componentes em `components/agenda/SlotSheets.tsx`.
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
- [x] (Corrigido na F9.1: o `ProductTour` espera as boas-vindas fecharem, `lib/welcome-gate.ts`.)
      Bug herdado do StudioMenu (visto no preview em 2026-11-24): no primeiro acesso ao app, os
      tooltips do `InicioTour` ("Agendamentos de hoje", "Aguardando confirmação", "Seus próximos
      passos") aparecem **por cima da tela de boas-vindas** (`WelcomeOnboarding`), apontando
      para coisas escondidas atrás dela. O tour deveria esperar as boas-vindas terminarem.
      Corrigir junto com o Início novo (F9.1) ou antes, se atrapalhar os testes.
- [ ] Herdado do StudioMenu, a resolver nas fases indicadas (anotado na F2.2):
  - ~~**F10:** `min_notice_minutes` e `booking_window_days` sem tela~~ — resolvido na F10.2.
  - **F11:** preço anual exibido ainda é R$ 127 (`lib/pricing.ts`); o v2 vende a R$ 197.
  - **F12:** `/admin/catalogos` virou uma lista enxuta (status, links, +1 mês/ano, liberar à
    mão, desativar, excluir). Saíram o "Cadastrar serviços com IA" (`extract-catalog`,
    `replace-services` — ferramenta do X1, que o v2 não usa) e os controles de preço/plano
    do StudioMenu.
