# Decisões de produto — LashAgenda v2

> Registro das decisões tomadas na conversa de 2026-11-19, que deu origem ao v2. Quando uma
> decisão mudar, **edite aqui** e anote a data. O plano (`PLANO_LASHAGENDA_V2.md`) implementa
> o que está aqui.

---

## 1. Contexto: por que existe um v2

- **LashAgenda v1 (julho/2026):** app de agendamento só para lash designers. Produto bom, mas
  difícil de vender — a lead já tem um sistema (generalista) e não quer trocar. Exigia
  marketing pesado e X1.
- **StudioMenu (set–nov/2026):** catálogo digital interativo que substitui o PDF de preços.
  O produto que mais vendeu e mais recebe elogio. Ensinou muito: o que atrai a lead é a
  **vitrine bonita**; vender sem X1 (prévia pelo nome + Cakto) é o caminho.
- **O que os dados mostraram:** as assinantes do StudioMenu usam o botão de **WhatsApp**, não o
  agendamento automático. Mas **leads perguntam** por agendamento automático — umas 4 foram
  perdidas por isso. Conclusão: o agendamento automático é uma funcionalidade de **decisão de
  compra** (mata objeção), mais do que de uso diário. O produto precisa vendê-lo, e também
  oferecer o meio-termo da **aprovação manual**.

**O v2 é:** o LashAgenda (gestão + agendamento) com a experiência do StudioMenu (catálogo,
editor, telas de agendamento, app, venda automática), construído a partir do código do
StudioMenu e com o modelo de dados do LashAgenda.

---

## 2. Relação entre os produtos

- **StudioMenu continua em produção como está** (tem clientes pagantes). Nada do v2 mexe nele.
- O **agendamento automático deixa de ser vendido no StudioMenu** — passa a ser exclusivo do
  LashAgenda. O botão de agendar pelo WhatsApp do StudioMenu **fica** (é o que as clientes usam).
- **Estratégia futura (decidir depois do v2 pronto):** o StudioMenu vira a "vitrine" mais
  barata e de entrada; o LashAgenda é a evolução ("já pensou suas clientes vendo esse catálogo
  incrível e agendando sozinhas?"). Consequência técnica **já agora**: o catálogo do v2 mantém o
  formato do StudioMenu (serviços, categorias, temas, modelos), para uma importação futura
  StudioMenu → LashAgenda ser quase direta (ver `BACKLOG_FUTURO.md`).
- O LashAgenda também precisa funcionar **sozinho**, com anúncio e página próprios — não só
  como upgrade do StudioMenu.

---

## 3. Base técnica

- **Repositório novo** `doupsdigital/lashagendav2`, nascido de uma **cópia** do StudioMenu
  (snapshot da branch `desenv`, commit `092022e`, 2026-11-19). Não é fork com histórico: o
  histórico começa do zero aqui.
- **Banco novo e separado** (Supabase próprio). O modelo de dados **não** é o `orders` do
  StudioMenu: é o do LashAgenda v1 (estúdio, clientes, serviços, variações, agendamentos),
  redesenhado (ver arquitetura no plano).
- **Mesma forma de trabalho do StudioMenu:** `desenv`/`main`, docs `atual/`, playbook, banco
  dev separado, testes pela usuária antes de cada commit.
- **v1 fica em `legacy/lashagenda-v1/`** como especificação, só leitura.

---

## 4. Preço e venda

| Item | Decisão |
|---|---|
| Planos no lançamento | **Um plano só**, com tudo dentro. A progressão de valor no lançamento é StudioMenu → LashAgenda. Uma divisão Básico/Pro pode vir depois, com dados de uso; a estrutura para restringir por plano fica pronta, mas desligada. |
| Mensal | **R$ 22,90/mês** (Cakto, assinatura, cartão) |
| Anual | **R$ 197/ano** (Cakto; forma de pagamento a definir na Fase 11 — no StudioMenu o anual é Pix, pagamento único) |
| Gateway | **Cakto** (substitui o Asaas; não há clientes antigos a migrar) |
| Venda | Autosserviço, **sem X1**: anúncio → página → prévia pelo nome → Cakto → ativação automática → e-mail de acesso (Resend) |
| Teste grátis | O **trial de 7 dias do v1 morre**; a **prévia de 24h** pelo nome substitui |

---

## 5. Regra de saúde e pixel (crítica)

O pixel da Meta usado no LashAgenda v1 foi **restringido por falar de questões de saúde** —
provavelmente por causa da ficha de anamnese. Regras do v2:

1. A ficha da cliente (anamnese + ficha técnica) **existe e é mantida**, mas é divulgada e
   acessada **só dentro do app**.
2. **Nunca** em anúncio, landing page, página de checkout, e-mail de marketing, vídeo de venda
   ou qualquer página com pixel: as palavras anamnese, saúde, alergia, gestante, gravidez,
   medicamento, doença, tratamento médico, clínica/clínico, prontuário.
3. **O pixel só roda na landing page e no checkout da Cakto.** Nunca no app da profissional
   (`/app/...`), nunca no catálogo público das profissionais (subdomínios), nunca na página do
   agendamento da cliente.
4. URLs e eventos de pixel não carregam parâmetros com esses termos.
5. Dentro do app, o nome da funcionalidade é **"Ficha da cliente"** (abas "Ficha técnica" e
   "Saúde e cuidados"), não "anamnese" em destaque.
6. **Pixel novo** para o v2 (nunca reaproveitar o pixel restrito do v1).
7. LGPD: dado de saúde é **dado pessoal sensível**. A ficha só é lida e gravada no servidor,
   só pela profissional dona do estúdio, e a ficha tem um registro de consentimento da cliente.

---

## 6. Funcionalidades — o que fica, o que sai (decidido item a item)

Legenda: ✅ fica · 🔁 fica, refeito no modelo do StudioMenu · ⭐ fica (candidato a plano
superior no futuro; no lançamento está no plano único) · ❌ sai.

### App da profissional

| # | Funcionalidade (v1) | Decisão | Fase |
|---|---|---|---|
| 1 | Cadastro (e-mail, senha, negócio, slug) | 🔁 Compra Cakto + prévia pelo nome + login automático | F11 |
| 2 | Login (e-mail/senha, Google, recuperar senha) | 🔁 "Criar acesso" do StudioMenu (Google ou senha, depois da compra) | F11 |
| 3 | Trial de 7 dias | ❌ Substituído pela prévia de 24h | F11 |
| 4 | Painel "Meu Estúdio" (hoje, aguardando, faturado, receita 7 dias, novas clientes, ações rápidas) | ✅ Mais enxuto, no estilo do Início do StudioMenu | F9 |
| 5 | Agenda (dia/mês — **sem semana**, decidido em 2026-11-25 na F6.2, manual, confirmar/recusar, concluir com valor recebido, falta, trancar horário) | ✅ Coração do produto · 🔁 visual do StudioMenu | F6 |
| 6 | Meus horários + bloqueios | 🔁 Editor do StudioMenu + **pausa de almoço / mais de um intervalo por dia** (nenhum dos dois tem hoje) | F4 |
| 7 | Serviços (foto, descrição, duração, valor, ativo, prévia) | 🔁 Editor visual do StudioMenu, com categorias | F3 |
| 8 | Variações de serviço | ✅ **Usar** (ex.: manutenção fio a fio / volume russo) | F3 |
| 9 | Lista de clientes (busca, WhatsApp, cadastro automático ao agendar) | ✅ | F7 |
| 10 | Perfil da cliente (dados, histórico, faltas, atendimento manual) | ✅ | F7 |
| 11 | Ficha de anamnese + ficha técnica (curvatura, espessura, mapping, técnica, retenção) | ⭐ Mantida, **só dentro do app** (regra da seção 5) | F8 |
| 12 | Relatórios por período | ⭐ | F9 |
| 13 | Link de agendamento | 🔁 Vira `fernanda.lashagenda.com` + QR code | F10/F13 |
| 14 | Dados do negócio (nome, descrição, Instagram, endereço, logo) | ✅ | F10 |
| 15 | Identidade visual (paletas, cores, modo escuro) | 🔁 Temas e modelos do StudioMenu (Rosé/Luxury, Mosaico/Clássico) | F3 |
| 16 | Regras de agendamento (aprovação automática, antecedência de cancelamento, mensagem pós-agendamento) | ✅ | F5/F10 |
| 17 | Assinatura (Asaas) | 🔁 Cakto | F11 |
| 18 | Tour guiado | 🔁 "Primeiros passos" do StudioMenu | F11 |
| 19 | Notificação push | ✅ Versão do StudioMenu | F5/F12 |
| 20 | Instalar app (PWA) | ✅ | F12 |
| 21 | Botão de ajuda (WhatsApp) | ✅ | F10 |
| 22 | Tutoriais | ❌ (vídeos nos Primeiros passos) | — |
| 23 | Log de auditoria | ❌ | — |
| 24 | 7 landing pages antigas | ❌ Uma página nova no modelo de autosserviço do StudioMenu | F15 |

### Lado da cliente final

| # | Funcionalidade (v1) | Decisão | Fase |
|---|---|---|---|
| 25 | Catálogo (serviços + perguntas frequentes) | 🔁 O catálogo do StudioMenu | F3 |
| 26 | Agendar (4 etapas, como convidada; dedupe por WhatsApp) | 🔁 Telas do StudioMenu + lógica de clientes do v1 | F5 |
| 27 | Meus agendamentos (com conta) | 🔁 **Link único do agendamento** (ver, cancelar respeitando a antecedência), sem conta | F5 |
| 28 | Perfil da cliente (ela edita os próprios dados) | ❌ | — |
| 29 | App da cliente instalável com token | ❌ | — |

### Modos de agendamento (decorrência das seções 1 e 2)

A profissional escolhe como o botão "Agendar" do catálogo funciona:

- **Automático** — a cliente escolhe o horário e já fica confirmado.
- **Com aprovação** — a cliente escolhe o horário, fica "aguardando"; a profissional confirma
  ou recusa com um toque (o meio-termo para quem gosta de controlar pelo WhatsApp).
- **Botão de WhatsApp** — opcional, liga/desliga, pode conviver com os dois modos acima.
- **Pausar agenda** — como no StudioMenu: some o agendamento do catálogo sem perder o app.

O carro-chefe vendido é o agendamento (automático ou com aprovação).

---

## 7. Domínio e marca

- Domínio: **`lashagenda.com`** (já é da usuária, está ativo).
- Link da profissional: **`<slug>.lashagenda.com`** (como `fernanda.studiomenu.art`).
- Nome do produto: **LashAgenda**. "v2" é só o nome do repositório.
- **Paleta do app da profissional (2026-11-24): a do LashAgenda v1** — fundo bege `#F7F3EE`,
  cards brancos, rosa-terroso (`#A85560` nos botões), dourado `#C9A96E` de destaque, texto
  `#2C1810`. Os temas do catálogo público (Rosé/Luxury) não mudam.
- **Referência visual do app:** `docs/referencias/prototipo-inicio-app.html` (aprovado pela
  usuária em 2026-11-24, incluindo os ícones). As telas do app, em especial o Início (F9.1),
  devem seguir esse protótipo.
- **Agenda sem visão semana (2026-11-25, F6.2):** no celular 7 colunas ficam apertadas; Dia
  (com as setas) + Mês (com marcações) bastam.

---

## 8. Ideias para depois do produto pronto

Ver `BACKLOG_FUTURO.md`. Nenhuma delas entra antes do lançamento.
