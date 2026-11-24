# Estado atual — LashAgenda v2

> **Fonte de verdade sobre o presente.** Atualizado ao fim de cada fase (e sempre que algo
> importante mudar).
>
> Última atualização: **2026-11-24 — Fase 1 concluída.**

---

## 1. Onde estamos

| | |
|---|---|
| **Fase atual** | **F2 — Modelo de dados v2 + camada de serviço** (não iniciada) |
| **Próxima etapa** | **F2.1** (ver `docs/plano/PLANO_LASHAGENDA_V2.md`) |
| **Fases concluídas** | F0, F1 |
| **Bloqueios** | Nenhum |

## 2. O que existe no repositório

- Documentação: plano, decisões de produto, backlog futuro, playbook, este documento.
- `legacy/lashagenda-v1/`: código do v1, só referência.
- **App Next.js** (`src/`, `public/`, configs na raiz): base do StudioMenu (`desenv` @ `092022e`)
  já limpa (sem Asaas, upsells, X1, nichos, admin de marketing, formulário de onboarding,
  pixel) e com a marca LashAgenda (paleta do v1, ícones do v1, textos, domínio
  `lashagenda.com` em `lib/public-url.ts`). **Ainda usa o modelo de dados do StudioMenu
  (`orders`)** — a troca é a F2.
- `docs/schema_studiomenu_base.sql`: schema provisório aplicado no banco dev (só referência).
- `docs/referencias/prototipo-inicio-app.html`: protótipo aprovado do Início (base da F9.1).
- `scripts/dev-create-test-catalog.mjs`: cria/atualiza o catálogo de teste `teste-lash` no
  banco dev (recusa rodar fora do `lashagendav2-dev`).

### Ambientes

| | |
|---|---|
| **Node** | 22 (o `@supabase/supabase-js` atual quebra no Node 20). |
| **Banco dev** | Supabase `lashagendav2-dev` (ref `psixalpmgcuydqfxlrto`), schema do StudioMenu. |
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
