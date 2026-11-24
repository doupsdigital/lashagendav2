# Estado atual — LashAgenda v2

> **Fonte de verdade sobre o presente.** Atualizado ao fim de cada fase (e sempre que algo
> importante mudar).
>
> Última atualização: **2026-11-19 — Fase 0 concluída.**

---

## 1. Onde estamos

| | |
|---|---|
| **Fase atual** | **F1 — Base do StudioMenu rodando como LashAgenda** (não iniciada) |
| **Próxima etapa** | **F1.1 — Cópia limpa do código** (ver `docs/plano/PLANO_LASHAGENDA_V2.md`) |
| **Fases concluídas** | F0 |
| **Bloqueios** | Para a F1.2: a usuária criar o projeto Supabase `lashagendav2-dev` |

## 2. O que existe no repositório

- Documentação: plano, decisões de produto, backlog futuro, playbook, este documento.
- `legacy/lashagenda-v1/`: código do v1, só referência.
- **Ainda não existe código do app.** Ele entra na F1.1.

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

- [ ] Criar o projeto Supabase `lashagendav2-dev` (usuária) — atenção ao limite de 2 projetos
      ativos no plano grátis.
- [ ] Ter um clone do StudioMenu na estação onde a F1 for feita.
- [x] Decidir na F1.4: paleta do app → **v1** (2026-11-24; ver `DECISOES_DE_PRODUTO.md`, seção 7).
- [ ] Decidir na F3.4: quantos serviços de exemplo um estúdio novo ganha.
- [ ] Decidir na F5.1: vários serviços no mesmo agendamento (recomendação: sim).
- [ ] Decidir na F6.2: se a visão "semana" da agenda entra.
