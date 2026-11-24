# Estado atual — LashAgenda v2

> **Fonte de verdade sobre o presente.** Atualizado ao fim de cada fase (e sempre que algo
> importante mudar).
>
> Última atualização: **2026-11-24 — F3.1 concluída (catálogo público no modelo novo).**

---

## 1. Onde estamos

| | |
|---|---|
| **Fase atual** | **F3 — Catálogo público + editor visual** (F3.1 ✅) |
| **Próxima etapa** | **F3.2 — Variações no catálogo** (ver `docs/plano/PLANO_LASHAGENDA_V2.md`) |
| **Fases concluídas** | F0, F1, F2 (F2: teste superficial da usuária ok em 2026-11-24; teste a fundo fica para a fase de testes) |
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
  - `lib/scheduling/booking-service.ts` — cliente com dedupe por WhatsApp (guardado só com
    dígitos, sem o 55) + agendamento + itens. `agenda-service.ts` monta o formato da Agenda.
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
- [ ] Decidir na F3.4: quantos serviços de exemplo um estúdio novo ganha.
- [ ] Decidir na F5.1: vários serviços no mesmo agendamento (recomendação: sim).
- [ ] Decidir na F6.2: se a visão "semana" da agenda entra.
- [ ] Bug herdado do StudioMenu (visto no preview em 2026-11-24): no primeiro acesso ao app, os
      tooltips do `InicioTour` ("Agendamentos de hoje", "Aguardando confirmação", "Seus próximos
      passos") aparecem **por cima da tela de boas-vindas** (`WelcomeOnboarding`), apontando
      para coisas escondidas atrás dela. O tour deveria esperar as boas-vindas terminarem.
      Corrigir junto com o Início novo (F9.1) ou antes, se atrapalhar os testes.
- [ ] Herdado do StudioMenu, a resolver nas fases indicadas (anotado na F2.2):
  - **F3.3:** o editor de serviço só ganhou o ajuste mínimo na F3.1 (preço vazio = "Sob
    consulta", duração obrigatória); falta marcar "a partir de" e o resto do editor novo.
  - **F3.2/F5:** as variações já existem no banco e nas APIs de horário/agendamento
    (`variation_id`), mas o catálogo ainda não mostra nem envia.
  - **F4:** o motor de horários (`lib/scheduling/availability.ts`) ainda lê **uma faixa por
    dia**; o banco já aceita várias (pausa de almoço). Também falta aplicar
    `min_notice_minutes`/`booking_window_days` do estúdio (hoje usa a folga fixa de 30 min).
  - **F5:** o link único da cliente (`manage_token`) já é gravado, mas ainda não é mostrado.
  - **F11:** preço anual exibido ainda é R$ 127 (`lib/pricing.ts`); o v2 vende a R$ 197.
  - **F12:** `/admin/catalogos` virou uma lista enxuta (status, links, +1 mês/ano, liberar à
    mão, desativar, excluir). Saíram o "Cadastrar serviços com IA" (`extract-catalog`,
    `replace-services` — ferramenta do X1, que o v2 não usa) e os controles de preço/plano
    do StudioMenu.
