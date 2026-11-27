'use client';

import { useMemo } from 'react';
import type { Step } from 'react-joyride';
import { ProductTour } from './ProductTour';
import { getOnboardingChecklistItems } from '@/lib/onboarding-cards';

interface InicioTourProps {
  slug: string;
  hasPaidAccess: boolean;
  hasAccount: boolean;
  hoursDone: boolean;
  selfServePending: boolean;
  /** Card de pendentes na tela (F9.1: só aparece quando há algum). */
  hasPending: boolean;
}

/** Tour guiado da tela Início (Fase 20) — primeiro os 2 cards de estatística
 *  (se o agendamento estiver de fato ligado), depois um balão por card de
 *  "próximo passo" no fim da tela. Pula de propósito os 3 cards de link
 *  (ver catálogo/editar/compartilhar) — ela já usou esses links pra assinar,
 *  não precisam de explicação (pedido explícito do usuário).
 *
 *  `useMemo` por precaução, mesmo padrão do tour da Config — sem estabilidade
 *  de referência no array de steps, qualquer re-render no meio do tour (por
 *  qualquer motivo, aqui ou numa mudança futura) recria os objetos e o
 *  Joyride mostra o balão duplicado (achado de verdade na Config, corrigido
 *  lá — aplicado aqui também de forma preventiva). */
export const InicioTour: React.FC<InicioTourProps> = ({ slug, hasPaidAccess, hasAccount, hoursDone, selfServePending, hasPending }) => {
  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [];

    // Painel (F9.1): só com o app completo, como os cards.
    if (hasPaidAccess && hasPending) {
      list.push({
        target: '[data-tour="stat-pending"]',
        title: 'Aguardando você',
        content: 'Agendamentos que esperam sua confirmação aparecem primeiro, aqui no topo.',
      });
    }
    if (hasPaidAccess) {
      list.push({
        target: '[data-tour="stat-today"]',
        title: 'Seus números',
        content: 'Agendamentos e faturado de hoje, e como está o mês.',
      });
    }

    // Um balão só, no checklist. O card só existe se sobrar algum item
    // pendente que o servidor sabe (o "conhecer a agenda" só o aparelho sabe,
    // então não conta aqui — melhor sem balão do que apontar pra um card que
    // pode não estar na tela).
    const items = getOnboardingChecklistItems({ slug, hasPaidAccess, hasAccount, hoursDone, selfServePending });
    if (items.some((item) => !item.done && !item.clientTracked)) {
      list.push({
        target: '[data-tour="onboarding-checklist"]',
        title: 'Seus próximos passos',
        content: 'Cada item fica marcado sozinho quando você faz. É só tocar pra abrir.',
      });
    }

    return list;
  }, [slug, hasPaidAccess, hasAccount, hoursDone, selfServePending, hasPending]);

  return <ProductTour tourId="inicio" slug={slug} steps={steps} enabled={hasPaidAccess} />;
};
