import type { ReactNode } from 'react';

/** Conteúdo da Hero da landing de vendas que muda por nicho de anúncio —
 *  alinhado ao posicionamento de Menu Digital (2026-10-14).
 *  Cada nicho reflete a copy dos criativos ("Menu Digital com a cara do seu Studio").
 *
 *  `geral` é o fallback padrão para acessos diretos ou sem parâmetro ?nicho=.
 *
 *  `lashdesigner`/`naildesigner` (2026-10-19) — variante de Hero pra nova
 *  campanha de criativos ("Angulos Novos", `marketing/criativos/Campanha01/
 *  Imagem/Angulos Novos/`), com copy de dor/objeção (perde clientes
 *  mandando PDF/fotos soltas no WhatsApp → "não é PDF nem Canva, é site de
 *  verdade"). `lash`/`nail` continuam intocados de propósito — já rodando
 *  anúncio com a copy antiga, não mexer enquanto ainda estiver em teste. */
export type LandingNiche = 'lash';

export interface LandingNicheContent {
  /** Linha pequena acima do título na Hero. */
  eyebrow: ReactNode;
  /** Teste (pedido real, 2026-10-20) — troca o logo "Studio<em>Menu</em>"
   *  da Hero por uma saudação nichada (ex: "Ei, <em>LashDesigner</em>")
   *  e esconde a linha de `eyebrow` logo abaixo (vira redundante). Só
   *  `lash`/`nail` por enquanto — os outros nichos continuam com o logo
   *  padrão + eyebrow normal. */
  heroBrandName?: { prefix: string; highlight: string };
  /** Título principal da Hero — alinhado aos criativos. */
  heroTitle: ReactNode;
  /** Linha curta logo abaixo do `heroTitle`, antes da `whatsappPainImage`
   *  (pedido real, 2026-10-27) — reforça o título em 1 frase só, no mesmo
   *  espírito da legenda do criativo ("Transforme seu Catálogo..."). Fica
   *  ENTRE o título e a imagem; a `heroSubtitle` de sempre ("Conheça o
   *  StudioMenu...") continua depois da imagem, sem mudar de lugar. */
  heroTagline?: ReactNode;
  heroSubtitle: ReactNode;
  /** Imagem "WhatsApp bagunçado" (pedido real, 2026-10-20) — mostra na
   *  prática a dor que a Hero descreve em texto (tabela de preços e fotos
   *  soltas no WhatsApp, com X vermelho). Fica entre a subheadline e o
   *  card rosa "Toque no celular..." (`SalesLandingPage.tsx`). Só
   *  `lash`/`nail` por pedido dela — os outros nichos não têm essa imagem
   *  ainda, então simplesmente não renderiza nada pra eles. */
  whatsappPainImage?: string;
  /** Brilho deslizando só sobre a área do celular dentro de
   *  `whatsappPainImage` (pedido real, 2026-10-26) — mesmo efeito já usado
   *  em `goodMockupImage` mais abaixo, só que aqui a imagem é um composto
   *  único (lista ruim + celular lado a lado, sem recorte separado do
   *  celular pra usar como máscara de alpha), então a área é um retângulo
   *  arredondado posicionado por porcentagem (calibrado nos pixels reais
   *  de `capa_hero_nova.png` — ver `.lp-hero-pain-shine` em
   *  `landing-lpb.css`). `undefined`/`false` nos nichos cuja
   *  `whatsappPainImage` não tem um celular dentro (ex: nail, que mostra 2
   *  capturas de WhatsApp lado a lado). */
  heroPainImageShine?: boolean;
  /** 2º reforço da dor (pedido real, 2026-10-20) — depois do card de
   *  preços, antes do FAQ: texto grande ("Pare de perder tempo...") em
   *  cima da imagem de conversa de WhatsApp (cliente pedindo preço/fotos,
   *  com X vermelho, rotacionada), texto menor ("Foque no que você faz de
   *  melhor...") embaixo. Empurra pra compra logo após ver o preço.
   *  `lash`/`nail` por enquanto. */
  secondPainImage?: string;
  /** Texto grande ACIMA da imagem. */
  secondPainHeading?: ReactNode;
  /** Texto menor ABAIXO da imagem. */
  secondPainText?: ReactNode;
  /** Imagem do catálogo StudioMenu já organizado (pedido real, 2026-10-20)
   *  — some ao lado da `secondPainImage` (WhatsApp com X), rotacionada pro
   *  lado OPOSTO, com um selo de check verde saindo por cima da borda de
   *  baixo (overflow). Contraste direto "ruim vs bom" reforçando a mesma
   *  dor. Só existe junto com `secondPainImage` (mesmos nichos). */
  goodMockupImage?: string;
  /** Slug de `/c/showcase/{slug}` embutido no mockup de celular da Hero. */
  showcaseSlug: string;
  /** Trecho em negrito da barra de prova social no topo ("4.9/5 · Mais de {isto} já usam"). */
  socialProofHighlight: ReactNode;
  /** 1ª pergunta do FAQ nichada. */
  faqFirstItem: { question: string; answer: string };
  /** Âncora de valor nichada (pedido real, 2026-10-15) — substitui a 2ª
   *  bullet do card "StudioMenu Anual" (`SalesLandingPage.tsx`), comparando
   *  o preço anual ao custo de 1 atendimento típico do nicho. */
  anualValueAnchor: string;
  /** Faixa decorativa no canto superior direito da Hero. */
  cornerBadge?: ReactNode;
  /** Teste de plano único anual (pedido real, 2026-10-19) — quando
   *  presente, `SalesLandingPage.tsx` esconde o card Mensal e mostra só o
   *  Anual (sem badge "MAIS POPULAR", sem comparação), com preço/âncora/
   *  CTA próprios. Hipótese: a escolha entre 2 planos bem na hora do
   *  preço pode estar derrubando gente que já tinha testado o mockup e
   *  gostado (visto nas gravações de sessão). Só `lash`/`nail` por
   *  enquanto — `lashdesigner`/`naildesigner` ficam sem isso de propósito
   *  (referência/backup da página de 2 planos). Pra reativar o Mensal
   *  depois, é só remover este campo do nicho. */
  singleAnnualPlanTest?: {
    price: number;
    anchorPrice: number;
    ctaLabel: string;
    /** Nome do nicho em texto puro (ex: "Lash Designer"), usado na
     *  mensagem pré-pronta do WhatsApp (pedido real, 2026-10-19) — pra ela
     *  saber de qual página a lead veio sem precisar perguntar, e sem
     *  soar como texto de robô ("Plano Anual, pagamento único" fazia
     *  gente desistir de mandar, segundo gravações de sessão). Não dá pra
     *  reaproveitar `eyebrow`/`cornerBadge` aqui porque são ReactNode, não
     *  string simples (não dá pra colocar JSX dentro de um link de
     *  WhatsApp). */
    nicheLabel: string;
    /** Subtítulo de preço opcional (ex: "menos de 11 reais por mês") */
    priceSub?: string;
  };
  /** Override da 1ª pergunta destacada do FAQ (`SUBSCRIPTION_FAQ_ITEM` em
   *  `FaqSection.tsx`) — só faz sentido junto com `singleAnnualPlanTest`:
   *  sem um 2º plano mensal pra comparar, não cabe mais falar em
   *  "assinatura". */
  subscriptionFaqOverride?: { question: string; answer: string };
}

export const LANDING_NICHE_CONTENT: Record<LandingNiche, LandingNicheContent> = {
  lash: {
    // Copy do Hero atualizada pra bater com a nova campanha de criativos
    // (pedido real, 2026-10-19 — ela testou `lashdesigner` em localhost,
    // gostou mais e pediu pra aplicar na página oficial também, não só na
    // nova). Idêntica à de `lashdesigner` abaixo de propósito, exceto
    // `whatsappPainImage` (pedido real, 2026-10-20) — só nas páginas ao
    // vivo (`lash`/`nail`), não nas de backup/referência.
    heroBrandName: { prefix: 'Ei, ', highlight: 'LashDesigner' },
    eyebrow: (
      <>
        Feito para <span className="lp-eyebrow-highlight">Lash Designer</span>
      </>
    ),
    // Headline curta (pedido real, 2026-10-27) — alinhada à legenda do
    // criativo ("NÃO MANDE MAIS PDF PARA SUAS CLIENTES"), trocando a antiga
    // headline mais longa ("Sua cliente compra com os olhos..."). Jogo de
    // cores: "PDF" em vinho (o problema) e "Clientes" no gradiente de marca
    // (quem importa), mesmo padrão de destaque já usado no resto da página.
    heroTitle: (
      <>
        Não mande mais <span className="lp-text-wine">PDF</span> para suas{' '}
        <span className="lp-text-gradient">Clientes</span>.
      </>
    ),
    heroTagline: (
      <>
        Transforme seus serviços de <strong className="lp-text-gradient">Lash Designer</strong> em um <strong className="lp-text-wine">Catálogo Digital</strong> profissional que valoriza seu trabalho.
      </>
    ),
    heroSubtitle: (
      <>
        <span className="lp-hero-subtitle-lead">
          Conheça o <strong className="lp-hero-subtitle-brand">Lash<em className="lp-text-gradient">Agenda</em></strong>.
        </span>
        <strong className="lp-text-wine">Prático para a cliente escolher, irresistível para ela agendar.</strong>
      </>
    ),
    whatsappPainImage: '/capa_hero_nova.png',
    heroPainImageShine: true,
    secondPainImage: '/whatsapp_vermelho_lash.webp',
    secondPainHeading: (
      <>
        Pare de <span className="lp-pain-reinforce-highlight">perder tempo</span> copiando
        tabela de preços no <span className="lp-pain-reinforce-highlight lp-pain-reinforce-highlight--plain">WhatsApp</span>.
      </>
    ),
    secondPainText: (
      <>
        Foque no que você faz de melhor:
        <br />
        <strong>Seu trabalho como Lash Designer.</strong>
        <br />
        Deixe que o LashAgenda cuide do resto.
      </>
    ),
    goodMockupImage: '/mockup_lash_bom.webp',
    showcaseSlug: 'lashlanding',
    socialProofHighlight: '350+ Lash Designers',
    faqFirstItem: {
      question: '1. Só serve pra extensão de cílios ou dá pra colocar outros serviços também?',
      answer: 'Dá pra colocar qualquer serviço que você oferecer no seu studio! Fio a Fio, Volume Russo, Híbrido, Egípcio, Design de Sobrancelha, Henna — você organiza o seu Catálogo Digital do jeitinho que atende de verdade, sem limite de categoria.',
    },
    anualValueAnchor: 'Sai por menos que 1 aplicação de Volume Brasileiro',
    cornerBadge: (
      <div className="lp-hero-niche-ribbon-wrap" aria-hidden="true">
        <span className="lp-hero-niche-ribbon" />
      </div>
    ),
    // Teste de plano único anual (preço ajustado pra R$127,00/ano no nicho Lash) —
    // ver comentário de `singleAnnualPlanTest` na interface acima. O
    // desconto do badge é sempre CALCULADO contra `anchorPrice`.
    singleAnnualPlanTest: {
      price: 127.0,
      anchorPrice: 199.9,
      ctaLabel: 'QUERO VER NO MEU STUDIO',
      nicheLabel: 'Lash Designer',
      priceSub: 'menos de 11 reais por mês',
    },
    subscriptionFaqOverride: {
      question: 'Por que o pagamento é anual?',
      answer: 'Diferente de um catálogo em PDF ou imagem, seu Catálogo Digital é um Site de verdade — precisa ficar hospedado, no ar, seguro e rápido 365 dias por ano. Esse valor garante exatamente isso: que ele nunca saia do ar, nunca fique lento e que suas clientes consigam acessar sempre através do seu link.',
    },
  },
};
