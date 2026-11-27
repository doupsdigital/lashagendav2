# Continuar em outra estação — passagem de bastão (2026-11-27)

Documento para o **agente de IA** (e para a dona) que vai continuar o LashAgenda v2 numa estação
diferente da que fez a F1–F14. Ele não substitui os outros: diz **o que não vai pelo Git**, como
a dona gosta de trabalhar e o que aprendemos na prática. O resto está nos documentos de sempre.

## 1. Ordem de leitura (obrigatória)

1. Este documento.
2. [`PLAYBOOK_IA.md`](PLAYBOOK_IA.md) — regras de Git, escopo, verificação e comunicação.
3. [`ESTADO_ATUAL.md`](ESTADO_ATUAL.md) — o projeto hoje: o que existe, ambientes, pendências.
4. [`../testes/ROTEIRO_TESTES_F14.md`](../testes/ROTEIRO_TESTES_F14.md) — o roteiro que a dona
   está executando.
5. [`../plano/PLANO_LASHAGENDA_V2.md`](../plano/PLANO_LASHAGENDA_V2.md) e
   [`../plano/DECISOES_DE_PRODUTO.md`](../plano/DECISOES_DE_PRODUTO.md) — quando precisar do
   porquê de alguma regra.

## 2. Onde estamos

- **Código:** F1–F13 prontas. **Produção no ar** em `www.lashagenda.com` (raiz → `www`, curinga
  `*.lashagenda.com` para os catálogos), projeto Vercel `lashagendav2`, banco
  `lashagendav2-prod`. O v1 saiu do ar (projeto `lashagenda-v0` ficou sem domínio).
- **Fase atual: F14 — testes finais.** A dona executa o roteiro **em produção** e manda, por
  cenário, "ok" ou "problema". O agente corrige.
- **Falta da F13:** login com Google (seção 6), pixel novo (só se ela quiser anúncio — é da F15).
- **No fim:** preços reais na Cakto, limpeza dos estúdios de teste, destino do `lashagenda-v0`
  (bloco I do roteiro).

## 3. Primeira coisa na estação nova

1. `git checkout desenv && git pull` (o `origin` tem URL limpa; ver o playbook para o push).
2. **Node 22** (`node -v`). Depois `npm install`.
3. **Arquivos de chaves** — não estão no Git. A dona precisa trazê-los desta estação por um meio
   seguro (pendrive, gerenciador de senhas). **Nunca** por e-mail, WhatsApp, chat ou commit:

| Arquivo (raiz do projeto) | O que tem | Usado para |
|---|---|---|
| `.env` | `GITHUB_TOKEN` | push na `desenv` (só na linha de comando) |
| `.env.development.local` | Supabase **dev** (3 chaves), `CAKTO_WEBHOOK_SECRET`/`CAKTO_PRODUCT_MAP` inventados, `NODE_TLS_REJECT_UNAUTHORIZED=0` | `npm run dev` e scripts contra o banco dev |
| `.env.local` | segredos de sessão, `ADMIN_PASSWORD` do dev, VAPID de dev, Telegram, `RESEND_API_KEY` de teste | `npm run dev` |
| `.env.prod` | as 17 variáveis de **produção** (mesmas da Vercel Production) | **só** conferências de produção com `node --env-file=.env.prod` — nunca carregado pelo Next |

   Se a estação nova já tinha um `.env.local` antigo (da F1), **substitua** pelo desta: o antigo
   não tem VAPID, Telegram nem Resend. A linha `NODE_TLS_REJECT_UNAUTHORIZED=0` só existe por
   causa da rede desta estação (proxy); em casa pode não ser necessária.
4. Conferir: `npx tsc --noEmit`, `node scripts/check-integrity.js`, `npm test` — tudo limpo.
5. `npm run dev` e abrir `http://localhost:3000/c/teste-lash` (único estúdio do banco dev).

## 4. Como a dona trabalha (preferências registradas)

- **Sempre em português**, direto, sem jargão. Ela não é programadora: explique o efeito, não
  o código.
- **Tarefas manuais dela** (painéis da Vercel, Supabase, Cakto, Google, GitHub): **um passo por
  mensagem**, com onde clicar, e esperar ela confirmar. Ela se perde com vários passos juntos.
  Peça print quando a tela puder ser diferente do esperado.
- **Ciclo de cada mudança:** você implementa e testa → relata → pede **"pode subir pra desenv"**
  → só então commit + push (com `tsc`, integridade e `npm test` antes) → confere
  `HEAD == FETCH_HEAD` no remoto. Para produção: Pull Request `desenv → main` pelo GitHub, e
  **ela** faz o merge; nunca dê push/merge na `main`.
- Em mudanças **invisíveis** (infra, config) ela não testa: confia na sua verificação —
  verifique em dobro.
- **Segredos:** nunca peça para ela colar chave no chat. Ela cola nos arquivos `.env*` e você
  confere **sem imprimir** (formato, tamanho, uma chamada à API mostrando só o resultado).
  Se um segredo aparecer em print, avise e recomende trocar — a decisão é dela (ela já decidiu
  **não** trocar a `service_role` de produção que apareceu num print em 2026-11-27).
- **Regra de saúde e pixel** (ver `CLAUDE.md` e `DECISOES_DE_PRODUTO.md`): nada de saúde fora do
  app — inclusive nomes e descrições de produto na Cakto e páginas com pixel.

## 5. Fase de testes (F14): como conduzir

1. Ela manda resultados por número de cenário (ex.: "A6 problema: ficou em confirmando").
2. Para cada **problema**: reproduza **no dev** (`npm run dev` + banco dev), ache a causa, corrija
   na `desenv`, teste (de preferência com um script E2E contra o dev, como nas fases anteriores),
   relate e peça "pode subir pra desenv".
3. Junte várias correções num **Pull Request `desenv → main`** quando ela aprovar; ela faz o merge
   e a Vercel publica a produção sozinha.
4. Anote no `ESTADO_ATUAL` o que foi testado/corrigido. Quando o roteiro inteiro passar, a F14
   fecha (marco M4) — atualize a tabela do plano.

**Cuidado com produção:** a produção tem dados reais (a assinatura de teste dela, logo clientes de
verdade). Não rode script que apaga ou altera dados de produção sem ela pedir explicitamente; para
limpar estúdios de teste, prefira o admin (`/admin` → Estúdios → "Apagar tudo dela?").

## 6. Login com Google (pendente — guiar um passo por vez)

Ela precisa de uma estação com acesso à conta Google que será dona do projeto no Google Cloud.

1. **Google Cloud** (`console.cloud.google.com`): projeto novo `LashAgenda` (sem cartão).
2. **Tela de consentimento** (Google Auth Platform → Branding/Público): app **LashAgenda**, tipo
   **Externo**, e-mail de suporte, domínio `lashagenda.com`; escopos só `email`, `profile`,
   `openid`; publicar ("Em produção").
3. **Cliente OAuth** → Aplicativo da Web:
   - Origens JavaScript: `https://www.lashagenda.com`
   - URI de redirecionamento: `https://hqwiqdvbnbvzvebshkmv.supabase.co/auth/v1/callback`
   - Ela copia **ID do cliente** e **chave secreta** direto para o Supabase (não no chat).
4. **Supabase prod** (`lashagendav2-prod`) → Authentication:
   - Sign In / Providers → **Google**: ligar, colar ID e chave secreta.
   - URL Configuration: **Site URL** `https://www.lashagenda.com`; **Redirect URLs**
     `https://www.lashagenda.com/**`.
5. Teste = bloco H do roteiro. O código usa `signInWithOAuth` com volta para `/entrar/callback`
   (login e vínculo em Config → Conta). No dev o Google segue desligado (decisão dela); se quiser
   no dev, adicionar a URI do Supabase dev e `http://localhost:3000/**`.

## 7. Aprendizados de 2026-11-27 (evitam retrabalho)

- **DNS do `lashagenda.com` está na Vercel** (nameservers `ns1/ns2.vercel-dns.com`, trocados na
  Hostinger). Registros manuais: os 4 do Resend (`resend._domainkey`, `send`, `rsend`, `_dmarc`).
  Curinga na Vercel exige DNS na Vercel.
- **Site de teste (`desenv`) tem Vercel Authentication.** Serviço externo (Cakto) só entra com
  `?x-vercel-protection-bypass=<chave>` (Settings → Deployment Protection → Protection Bypass for
  Automation, chave "cakto-webhook"). A produção é aberta.
- **Chave secreta do webhook da Cakto é gerada pela Cakto** (não dá para escolher). Ela fica no
  `.env.prod`/Vercel; se trocar o webhook, atualize a variável e faça **Redeploy**.
- **Vercel: variáveis novas só valem depois de um Redeploy** (Deployments → ⋯ → Redeploy, sem
  build cache). Para colar várias de uma vez, o lote precisa ser todo **Secret** ou todo
  **Config**, e só um ambiente (Preview **ou** Production) quando o nome já existe no outro.
- **Preview precisa de `APP_ORIGIN`** (endereço fixo da `desenv`) para os links dos e-mails não
  apontarem para a produção.
- **Produtos da Cakto:** teste (Mensal/Anual "(teste)") ligados ao webhook da `desenv`; reais
  (Mensal R$ 5,00 provisório, Anual) ligados ao webhook de produção. Página de obrigado em
  "Upsell e Downsell" → `/ativando`. Mapa `id:plano` em `CAKTO_PRODUCT_MAP`.
- **Resend:** domínio verificado; chave `lashagenda-teste` (dev/Preview) e `lashagenda-prod`
  (só o domínio). Endereço de teste que sempre aceita: `delivered@resend.dev`.
- **Telegram:** bot `@LashAgendaAvisosBot`; fora da produção os avisos saem com "🧪 [teste]".
- **Banco dev:** antes de rodar testes E2E em sequência, limpe `rate_limits` (senão os limites
  por IP derrubam os testes). Os scripts E2E da F11–F13 eram descartáveis (pasta temporária
  desta estação); os testes que ficam são os de `scripts/` (`npm test`).
- **Rede desta estação** bloqueava checagem de revogação de certificado no `curl` (usar
  `--ssl-no-revoke`) e o `dns.google`; em casa provavelmente não.
