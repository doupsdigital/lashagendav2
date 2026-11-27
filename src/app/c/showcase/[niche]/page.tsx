import type { Metadata } from 'next';
import { NicheType, CatalogOrderData } from '@/types/catalog';
import { ShowcaseClient } from './ShowcaseClient';

interface ShowcasePageProps {
  params: Promise<{ niche: string }>;
  searchParams: Promise<{ tela?: string; tema?: string }>;
}

/** Resolve o slug da URL pro nicho real + se é a versão "Básico" (agenda via
 *  WhatsApp) ou "Plus" (agendamento automático) — pedido real, 2026-10-02:
 *  ela precisava de 2 links fixos e fáceis de reconhecer de cabeça (sem
 *  parâmetro na URL) pra mandar pra leads de anúncio, um pra cada plano.
 *  `.../lash` e `.../nail` continuam exatamente como sempre foram (Plus);
 *  `.../lashdesigner` e `.../naildesigner` são os novos, iguais em tudo
 *  menos o botão "Agendar" cair na simulação de WhatsApp. Nicho sem versão
 *  Básico (estetica/studio) só passa direto, sem mudar nada.
 *
 *  `.../lashs` e `.../nails` (pedido real, 2026-10-07): duplicatas de
 *  `lashdesigner`/`naildesigner` (mesmo plano Básico), só trocando a capa
 *  genérica pela nova capa "padronizada" do nicho — os originais continuam
 *  intocados, pra não perder os exemplos já em uso. */
const SHOWCASE_SLUGS: Record<string, { niche: NicheType; forceBasico: boolean; coverOverride?: string; presetOverride?: CatalogOrderData }> = {
  lash: { niche: 'lash', forceBasico: false },
};

function resolveShowcaseSlug(slug: string): { niche: NicheType; forceBasico: boolean; coverOverride?: string; presetOverride?: CatalogOrderData } {
  return SHOWCASE_SLUGS[slug] || { niche: slug as NicheType, forceBasico: false };
}

// Nomes por nicho pro título do link (plural, "venda pro nicho" — não o
// singular usado em NICHE_OPTIONS, que é pra UI de seleção).
const NICHE_METADATA_LABEL: Record<NicheType, string> = {
  lash: 'Lash Designers',
};

/** Preview do link no WhatsApp pra esse showroom — pedido real, 2026-10-01:
 *  sem isso, herdava o título/descrição genérico de venda da home (feito
 *  pra visitante institucional, não pro primeiro contato de um lead de
 *  anúncio clicando num link "olha esse exemplo"). Sem "exemplo"/"demo" no
 *  título de propósito — a palavra já está na mensagem de texto que ela
 *  manda; o card do link não precisa repetir e soar menos como algo real. */
export async function generateMetadata({ params }: ShowcasePageProps): Promise<Metadata> {
  const { niche: nicheParam } = await params;
  const { niche } = resolveShowcaseSlug(nicheParam);
  const nicheLabel = NICHE_METADATA_LABEL[niche];

  const title = nicheLabel ? `Catálogo Digital para ${nicheLabel}` : 'Catálogo Digital — LashAgenda';
  const description = 'Veja como fica, ao vivo, no seu celular — em menos de 1 minuto você já visualiza tudo funcionando.';

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function ShowcasePage({ params, searchParams }: ShowcasePageProps) {
  const { niche: nicheParam } = await params;
  const { tela, tema } = await searchParams;
  const { niche, forceBasico, coverOverride, presetOverride } = resolveShowcaseSlug(nicheParam);
  return (
    <ShowcaseClient
      niche={niche}
      forceBasico={forceBasico}
      coverOverride={coverOverride}
      presetOverride={presetOverride}
      hideCoverSection={tela === 'catalogo'}
      defaultTheme={tema === 'luxury' ? 'luxury' : 'rose'}
    />
  );
}
