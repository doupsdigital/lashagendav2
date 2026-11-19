# Playbook de Comportamento — leitura obrigatória para qualquer IA/agente

> Este documento não é sobre o produto. É sobre **como trabalhar** neste repositório, em
> qualquer ferramenta (Claude Code, Cursor, Antigravity...) e em qualquer estação. Foi adaptado
> do playbook do StudioMenu, que já foi validado na prática.
>
> Se você é uma IA lendo isto: siga ao pé da letra desde a primeira mensagem, mesmo que a
> usuária não repita nada disso.

---

## 0. Ordem de leitura, antes de qualquer coisa

1. Este documento, inteiro.
2. `docs/atual/ESTADO_ATUAL.md`, inteiro — o que o projeto é hoje e **qual fase/etapa é a atual**.
3. `docs/plano/PLANO_LASHAGENDA_V2.md` — pelo menos a seção "Como usar este plano", a
   arquitetura alvo e a fase atual inteira.
4. Se a tarefa envolver decisão de produto: `docs/plano/DECISOES_DE_PRODUTO.md`.

**Nunca comece a editar código, responder dúvida técnica ou sugerir algo sem os passos 1 e 2.**

---

## 1. Regra de ouro: nunca alucine dado antigo

Existem três fontes que parecem "verdade" e não são:

- **`legacy/lashagenda-v1/`** — o v1. É referência de funcionalidade e regra de negócio, **não**
  descrição do v2. Preço, plano, Asaas, trial de 7 dias, login de cliente: tudo isso morreu.
- **O repositório do StudioMenu** (`doupsdigital/studiomenu`) — é a base técnica copiada na
  Fase 1, mas é **outro produto**, com outro banco, outro domínio e outros preços.
- **Conversas anteriores** — sempre confira contra o código e contra `docs/atual/`.

Preço, nome de plano, link de checkout: só no arquivo central de preços (a partir da Fase 1,
`src/lib/pricing.ts`) e em `docs/plano/DECISOES_DE_PRODUTO.md`. Nunca hardcoded em outro lugar.

---

## 2. Regra de ouro: fluxo de Git — nunca pule etapa

Todo trabalho acontece na branch **`desenv`**. Ciclo de qualquer mudança:

1. **Implementa localmente.** Não comita ainda.
2. **A usuária testa** (localhost ou preview da Vercel). Espere o teste dela.
3. **Só comita/dá push na `desenv` quando ela disser** ("pode subir pra desenv"). Antes de
   comitar, rode sempre (a partir da Fase 1):
   - `npx tsc --noEmit` — limpo;
   - `node scripts/check-integrity.js` — limpo (roda no pre-commit; nunca use `--no-verify`).
4. **Nunca promove para `main` sozinho.** Só quando ela pedir, separadamente, para aquela
   mudança específica. Se ela pedir as duas coisas na mesma frase ("sobe pra desenv e já deixa
   a PR pra main"), vale para as duas — mas a PR fica só **aberta**; o merge é sempre dela.
5. **Mecânica da promoção** (enquanto não houver clientes, pode ser merge da `desenv` inteira
   via PR; depois do lançamento, cherry-pick como no StudioMenu):
   - antes do lançamento: abrir PR `desenv → main` e entregar o link;
   - depois do lançamento: branch nova a partir de `origin/main` + `git cherry-pick` só dos
     commits novos + PR.

**Credenciais:** o token do GitHub fica em `.env` (`GITHUB_TOKEN`, fora do Git). O push usa o
token **só na linha de comando**, nunca gravado no remote:

```bash
git push "https://x-access-token:${GITHUB_TOKEN}@github.com/doupsdigital/lashagendav2.git" desenv
```

O remote `origin` fica sempre com a URL limpa (`https://github.com/doupsdigital/lashagendav2.git`).
Nunca imprima o token em resposta, log ou commit.

**Nunca:** `git push --force` em branch compartilhada, `git reset --hard` sem olhar
`git status`, pular o hook de integridade, mexer na `main` sem pedido explícito e recente.

**Mensagens de commit:** em português, com prefixo (`feat:`, `fix:`, `docs:`, `chore:`,
`refactor:`) e citando a etapa do plano quando houver, ex. `feat(f4.2): pausa de almoço nos
horários`.

---

## 3. Regra de ouro: faça só o que foi pedido

- Implemente a etapa pedida. Nada de refatoração "de bônus" ou "já que estou aqui".
- Pedido ambíguo → pergunte antes de uma edição grande.
- Se precisar ir além do literal (ex.: ajustar algo vizinho para manter consistência),
  **sinalize** no relatório final.
- Nada de tratamento de erro, flag ou compatibilidade para cenário que não existe.

---

## 4. Regra de ouro: verifique antes de dizer que terminou

- `npx tsc --noEmit` limpo e `node scripts/check-integrity.js` limpo.
- Mudança visual → servidor local rodando e conferência do resultado real antes de reportar.
- **Nunca valide UI com automação de navegador** (Puppeteer/Playwright). A usuária testa;
  a IA valida por código, compilador, servidor e banco.
- **Nunca use `alert()`/`confirm()` nativos** — sempre os modais React do projeto.
- Mudança de banco → migração em `docs/migrations/AAAAMMDD_nome.sql`, idempotente, rodada
  **primeiro no projeto dev**, e o `docs/schema.sql` atualizado no mesmo commit.

---

## 5. Regra de ouro: investigue de verdade

- Leia o caminho real do código; não assuma como "deveria" funcionar.
- Formule a hipótese de causa raiz e **confirme** (query no banco, script isolado, estado que o
  código produz) antes de declarar resolvido. Apague scripts temporários depois.
- Se a correção não funcionou na prática, não insista na mesma hipótese — investigue de novo.

---

## 6. Como se comunicar

- **Sempre em português.** Direto, sem floreio.
- Pergunta de opinião → recomendação curta com o principal trade-off; não implemente até ela
  confirmar.
- Pedido de implementação → implemente, verifique (seção 4), relate: o que mudou, o que rodou,
  o resultado, **e o roteiro de teste da etapa** (o que ela deve clicar/conferir).
- Ao final de cada entrega, diga se está esperando o teste dela ou se já pode subir.

---

## 7. Fatos do ambiente

- Repositório: `doupsdigital/lashagendav2`. Trabalho em `desenv`. Produção: `main`.
- Domínio de produção (a partir da Fase 13): `lashagenda.com`, com subdomínio por profissional
  (`fernanda.lashagenda.com`).
- **Dois projetos Supabase**: `lashagendav2-dev` (local + preview) e `lashagendav2-prod`
  (só `main`). As chaves do dev ficam em `.env.development.local` — **exatamente esse nome de
  arquivo e exatamente** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
  `SUPABASE_SERVICE_ROLE_KEY`. Qualquer outro nome é ignorado em silêncio pelo Next.js (isso já
  fez o StudioMenu rodar dias contra produção sem ninguém perceber). Antes de qualquer script ou
  query a partir do local, confirme qual projeto está configurado.
- `rm -rf .next` resolve erro falso de `tsc` depois de trocar de branch com o `next dev` aberto.
- O LashAgenda v1 e o StudioMenu são **outros projetos**. Nunca rode migração, script ou
  deploy neles a partir daqui.

---

## 8. Quando estiver em dúvida

Pare e pergunte, com uma pergunta objetiva e, se possível, opções. Vale principalmente para
escopo que toca vários arquivos, decisão de produto (preço, texto de venda, comportamento
visível para a cliente final) e qualquer coisa que mexa em dado real.
