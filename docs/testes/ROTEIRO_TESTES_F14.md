# Roteiro de testes — F14 (marco M4 "No ar")

Para a dona testar o LashAgenda v2 **em produção** (`www.lashagenda.com`), no celular, como se
fosse uma profissional de verdade e as clientes dela. Junta num caminho só os testes que
ficaram pendentes das fases F2 a F13 (M1, M2, M3 e os testes da F7 a F13).

**Como me contar o resultado:** para cada cenário, mande o número + **ok** ou **problema**. Se
for problema, diga o que esperava, o que aconteceu e, se der, mande um print. Pode mandar
vários de uma vez. Correções vão pela `desenv` → `main`, como sempre.

---

## 0. Antes de começar

| | |
|---|---|
| **Celular principal** ("da profissional") | o seu. De preferência teste os blocos A–E num **iPhone** e repita o bloco C (instalar + notificações) num **Android**, se tiver um à mão. |
| **Segundo aparelho** ("da cliente") | outro celular, ou o computador numa **janela anônima**. Sem login nenhum. |
| **E-mail** | um que você abre no celular. É para onde vão o acesso e o "esqueci a senha". |
| **Telegram** | aberto no **@LashAgendaAvisosBot** — os avisos de produção chegam **sem** o 🧪. |
| **Admin** | `www.lashagenda.com/admin`, com a `ADMIN_PASSWORD` do `.env.prod`. |
| **Cakto** | produtos reais com preço provisório (Mensal **R$ 5,00**). A compra é de verdade; o reembolso fica no bloco G. |

**Antes do bloco B:** o DNS novo precisa ter chegado no seu celular. Teste abrindo
`https://teste-lash.lashagenda.com` — se aparecer "Catálogo Não Encontrado" (com a marca
LashAgenda), está pronto. Se o navegador disser que o site não existe, espere algumas horas.

---

## A. De visitante a assinante (M3)

| # | O que fazer | O que deve acontecer |
|---|---|---|
| A1 | No celular, abra `www.lashagenda.com/lash` e gere a prévia com **seu nome profissional** (ex.: "Doni Teste"). | Animação curta e o catálogo de exemplo com o seu nome. Chega no Telegram "✨ Nova prévia: …". |
| A2 | Na prévia, troque o **tema** e o **modelo** do catálogo. | O catálogo muda na hora, sem sair da prévia. |
| A3 | Na prévia, toque num serviço e faça o **agendamento de demonstração**. | Aparece o recado de que é só demonstração; não pede WhatsApp de verdade. |
| A4 | Gere a prévia de novo com o **mesmo nome**, no mesmo celular. | Volta para a **mesma** prévia (não cria outra). |
| A5 | Toque para **ativar** o plano **Mensal** → paga na Cakto (cartão). Use o seu e-mail. | Checkout da Cakto com "LashAgenda Mensal" e R$ 5,00. Nada de saúde no texto da página de pagamento. |
| A6 | Depois de pagar, espere. | A Cakto leva para `/ativando`, que mostra "confirmando" e abre o **app sozinha**, já nos **Primeiros passos**. Chega no Telegram "Nova assinatura — Mensal". |
| A7 | Abra o seu e-mail. | E-mail de **acesso@lashagenda.com**, em português, com o link do app. O link abre o app logado. |
| A8 | Faça os **Primeiros passos**: confirme o WhatsApp, coloque serviços e preços, horários, compartilhe o link. Deixe "criar acesso" para o A9. | Cada passo fica marcado como feito. |
| A9 | Em **Config → Conta**, crie o acesso com **e-mail e senha** (mínimo 8 caracteres). | Acesso criado, sem pedir confirmação por e-mail. O passo "Crie seu acesso" fica marcado. |
| A10 | **Saia da conta** (Config). Entre de novo em `www.lashagenda.com/entrar` com e-mail e senha. | Volta para o app, no seu estúdio. |
| A11 | Saia de novo. Em `/entrar`, use **"Esqueci a senha"** → abra o e-mail → crie uma senha nova. | E-mail chega; o link abre a tela de nova senha; depois de salvar, já entra no app. |
| A12 | Abra o link do **e-mail de acesso** (o do A7) de novo, já deslogada. | Entra no app (o link mágico não vence — decisão sua). |

## B. O catálogo e o link (F3, F4, F10, F13)

| # | O que fazer | O que deve acontecer |
|---|---|---|
| B1 | No app, aba **Catálogo**: crie um serviço com **opções** (ex.: Manutenção → Fio a fio / Volume russo, cada uma com duração e preço), com foto. Edite outro: preço "a partir de" e um "sob consulta". | Salva; fotos aparecem; a ordem e as categorias ficam como você deixou. |
| B2 | Em **Config**, preencha o negócio (nome, frase da capa, endereço, Instagram). | Aparece no catálogo. |
| B3 | Em **Config → Meu link**, copie o link `seunome.lashagenda.com` e abra no **aparelho da cliente**. | O seu catálogo, com tudo do B1/B2. **Este é o teste da F13.** |
| B4 | Em **Config → Meu link**, abra o **QR code**. Aponte a câmera do outro aparelho. | Abre o seu catálogo. |
| B5 | Em **Config → Horários**, coloque um dia com **pausa de almoço** (ex.: 9h–12h e 13h–18h) e marque uma **folga** num dia da semana que vem. | Salva. |
| B6 | No aparelho da cliente, escolha um serviço e veja os horários do dia com almoço e do dia de folga. | Nenhum horário no almoço; o dia de folga não oferece nada; serviço longo não aparece colado no fim do expediente. |

## C. App no celular e notificações (F12)

| # | O que fazer | O que deve acontecer |
|---|---|---|
| C1 | No app, toque em **Instalar app** e siga o passo a passo (iPhone: Compartilhar → Adicionar à Tela de Início; Android: Instalar). | Ícone do LashAgenda na tela inicial; abre sem a barra do navegador, já logada. |
| C2 | Dentro do app instalado, ative as **notificações** e toque em **testar**. | Chega uma notificação de teste no celular. |
| C3 | Abra o app pelo link num navegador **dentro do Instagram/WhatsApp**. | Aparece a orientação de abrir no navegador de verdade (com botão de copiar o endereço). |

## D. A cliente agenda (F5)

Use o **aparelho da cliente**, sem login.

| # | O que fazer | O que deve acontecer |
|---|---|---|
| D1 | Com o agendamento **automático** (Config → regras de agendamento), agende um serviço com **opção** pelo `seunome.lashagenda.com`. | Agendamento confirmado na hora, com link único. **Notificação chega no seu celular** (app instalado). |
| D2 | Mude para **"com aprovação"**. Agende de novo, outro horário. | Para a cliente: "aguardando confirmação". No seu app: aparece em **aguardando** no Início/Agenda. |
| D3 | No app, **confirme** o D2. Toque em mandar pelo WhatsApp. | Mensagem pronta com o link único da cliente. O link mostra "confirmado". |
| D4 | Agende um terceiro horário e **recuse** pelo app, com um motivo. | O link da cliente mostra recusado com o motivo. |
| D5 | Pelo link único, a cliente **cancela** um agendamento com mais de 24h de antecedência. | Cancela; o horário volta a ficar livre no catálogo. |
| D6 | Tente cancelar pelo link um agendamento **daqui a menos de 24h**. | Não deixa cancelar pelo link; orienta falar com você. |
| D7 | Abra o catálogo em **duas abas** (ou dois aparelhos) e tente agendar **o mesmo horário** ao mesmo tempo. | Só um consegue; o outro recebe aviso de horário ocupado. |
| D8 | Agende com o mesmo WhatsApp digitado de outro jeito (com/sem parênteses, espaço, traço). | Em **Clientes**, continua **uma** cliente só, com os dois agendamentos. |
| D9 | Tente agendar para **daqui a 1 hora** e para **daqui a 3 meses**. | Não oferece (antecedência mínima de 2h e janela de 60 dias, se você não mudou). |

## E. Dia de trabalho (M1, M2)

| # | O que fazer | O que deve acontecer |
|---|---|---|
| E1 | Na **Agenda**, crie um agendamento **manual** para uma cliente nova, com 2 serviços. | Aparece na agenda com a duração somada. |
| E2 | Tente encaixar um manual **em cima** de outro horário ocupado. | Não deixa (choque de horário nunca passa). |
| E3 | Crie um manual **fora do expediente**. | Pergunta se tem certeza; deixa se você confirmar. |
| E4 | **Remarque** um agendamento para outro dia. | Muda de dia; o link da cliente mostra o horário novo. |
| E5 | **Conclua** um atendimento com **desconto** (valor recebido menor que o total). | Fica concluído com o valor que você digitou. |
| E6 | Marque outro como **falta**. | Fica como falta; não entra no faturamento. |
| E7 | **Tranque** um horário livre tocando nele na agenda. Depois destranque. | Some do catálogo enquanto trancado; volta ao destrancar. |
| E8 | Veja a agenda em **dia** e em **mês**. | Os agendamentos aparecem nos dois. |

## F. Clientes, ficha e números (F7, F8, F9)

| # | O que fazer | O que deve acontecer |
|---|---|---|
| F1 | Em **Clientes**, busque uma cliente pelo nome e pelo WhatsApp. | Encontra pelos dois. |
| F2 | Abra a cliente: veja o **histórico** e o **total gasto**. Registre um **atendimento antigo** (data do mês passado). | O atendimento antigo entra no histórico e no total. |
| F3 | Abra a **ficha**: dê a autorização da cliente e preencha a ficha técnica e a de saúde, **pelo celular, cronometrando**. | Dá para preencher em menos de 2 minutos. Salva. |
| F4 | Abra o próximo agendamento dessa cliente. | Mostra o resumo da ficha (técnica e os alertas). |
| F5 | **Retire a autorização** da ficha (use uma cliente de teste — isso apaga de verdade). | As respostas de saúde são **apagadas**; a ficha técnica fica. |
| F6 | No aparelho da cliente, olhe o catálogo e o link do agendamento dela. | **Nada** da ficha aparece fora do app. |
| F7 | Confira o **Início** e os **Relatórios** (hoje / mês). | Os números batem com o que você fez nos blocos D e E (concluídos, desconto, falta). |

## G. Dinheiro e acesso (F11, F12)

| # | O que fazer | O que deve acontecer |
|---|---|---|
| G1 | Em `/admin` → **Números**. | Mostra 1 pagante, a receita do mês, as prévias. |
| G2 | Em `/admin` → **Avisos da Cakto**. | Aparece a compra do A5 como processada. |
| G3 | Na **Cakto**, faça o **reembolso** da compra do A5. | Chega no Telegram "Reembolso — acesso cortado". |
| G4 | Abra o seu catálogo no aparelho da cliente. | **"Página em pausa"**, sem falar de pagamento. |
| G5 | Abra o app. | Faixa avisando que o acesso venceu; dá para **ver** tudo, mas não para mudar nada. Card **Meu plano** mostra como renovar. |
| G6 | No `/admin` → **Estúdios**, filtro **Vencidos**, ache o seu e toque em **+ 1 mês**. | O app volta ao normal e o catálogo volta a abrir. |
| G7 | No admin, **Desativar** e depois **Reativar** o estúdio. | Desativado: catálogo em pausa. Reativado: volta. |
| G8 | No admin, abra o detalhe do seu estúdio e o botão que **abre o app como ela**. | Abre o seu app (para suporte). |

## H. Login com Google (quando estiver configurado)

| # | O que fazer | O que deve acontecer |
|---|---|---|
| H1 | Em **Config → Conta**, vincule o **Google**. | Volta para o app com o Google vinculado. |
| H2 | Saia e entre em `/entrar` com **Entrar com Google**. | Entra no seu estúdio. |
| H3 | Em `/entrar`, tente **Entrar com Google** usando uma conta Google que **não** tem estúdio. | Não entra em estúdio nenhum; mostra "Essa conta Google ainda não está vinculada a nenhum catálogo." |

## I. Fechamento

| # | O que fazer |
|---|---|
| I1 | Na Cakto: voltar os preços para **R$ 22,90/mês** e **R$ 197/ano** e cancelar qualquer assinatura de teste que tenha ficado. |
| I2 | Me avisar quais estúdios de teste apagar no admin de produção (ou apagar você mesma em **Apagar tudo dela?**). |
| I3 | Decidir o destino do projeto `lashagenda-v0` (v1) na Vercel: deixar parado ou apagar. |

O teste do **pixel** ("só dispara na página de vendas") fica para a F15, quando o pixel novo
for colocado. Até lá, nenhuma página do v2 tem pixel.
