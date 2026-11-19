# Backlog futuro — depois do produto pronto

> Decisão de 2026-11-19: **nada daqui entra antes do lançamento** (Fase 15 concluída).
> Cada item tem o porquê, uma ideia de como fazer e o que ele exige do que vem antes —
> para que a base construída nas fases não feche a porta para eles.

---

## 1. Lembrete de manutenção

**O quê:** a extensão de cílios precisa de manutenção a cada 15–21 dias. O app avisa a
profissional: "Faz 18 dias da Maria — chamar para manutenção?", com botão que abre o WhatsApp
da cliente com uma mensagem pronta.

**Por quê:** gera receita para a profissional, é específico de lash (nenhum app generalista
faz bem) e é um ótimo argumento de venda.

**Como:** uma lista "Para chamar" no Início, calculada a partir do último atendimento concluído
de cada cliente + um intervalo configurável por serviço (ex.: "Manutenção a cada 20 dias").
Primeira versão sem envio automático — só o botão de WhatsApp.

**Exige da base:** serviço com campo de intervalo de retorno (pode ser adicionado depois) e
histórico de atendimentos concluídos por cliente (Fases 6 e 7).

## 2. Lembrete do agendamento para a cliente

**O quê:** na véspera, a profissional tem um botão "Lembrar" que abre o WhatsApp da cliente
com data, hora e o link único do agendamento.

**Como:** primeira versão manual (botão), sem API paga de WhatsApp. Envio automático só se um
dia valer o custo de uma API oficial.

**Exige da base:** link único do agendamento (Fase 5).

## 3. Sinal via Pix contra falta

**O quê:** a profissional exige um sinal (ex.: 30%) para confirmar o agendamento.

**Como:** começar simples — a cliente vê a chave Pix da profissional e um aviso de que o
horário só é garantido após o envio do comprovante; a profissional marca "sinal recebido".
Cobrança automática por Pix (com split) é bem mais complexa e fica para muito depois.

**Exige da base:** status "aguardando" no agendamento (Fase 5) e campo de valor recebido
(Fase 6).

## 4. Importar clientes

**O quê:** trazer a lista de clientes de uma planilha ou da agenda antiga. Reduz o medo de
"trocar de sistema".

**Como:** upload de CSV com colunas nome e WhatsApp, com prévia e dedupe por WhatsApp antes de
gravar.

**Exige da base:** dedupe de cliente por WhatsApp normalizado (Fase 2).

## 5. Importar o catálogo do StudioMenu

**O quê:** a profissional que já tem StudioMenu sobe para o LashAgenda sem recadastrar nada.

**Como:** rota de admin (primeiro) que lê um catálogo do banco do StudioMenu pelo slug e cria
estúdio + serviços + fotos no LashAgenda. Depois, autosserviço.

**Exige da base:** o catálogo do v2 manter os mesmos conceitos do StudioMenu (categorias,
`layout_model`, `theme_variant`, `instructions_items`, fotos extras) — regra seguida nas
Fases 2 e 3.

## 6. Plano superior (Pro)

**O quê:** dividir em Básico e Pro, se os dados de uso mostrarem que faz sentido. Candidatos a
Pro: ficha da cliente, relatórios e os lembretes deste backlog.

**Exige da base:** uma função central de "o estúdio tem acesso a X?" (Fase 2), hoje sempre
`true`.

## 7. Criar catálogo com IA a partir da foto da tabela de preços

**O quê:** o StudioMenu tem isso no admin (`/admin/criar-com-ia`). No v2 poderia ser o
onboarding: ela tira foto da tabela de preços e os serviços aparecem prontos.

**Exige da base:** nada específico; o código do StudioMenu fica como referência.

## 8. Outros nichos

Nail, sobrancelha, estética. Só se o LashAgenda der certo. O nome e o posicionamento continuam
"só para lash" até lá.
