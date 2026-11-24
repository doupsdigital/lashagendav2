'use client';

import { useEffect } from 'react';
import { initPostHog, identify, reset, getDistinctId } from '@/lib/analytics';

interface AppPostHogTrackerProps {
  slug: string;
  /** `studios.plan_status` (preview/active/suspended/canceled). */
  planStatus: string;
  clientName: string;
  studioName?: string;
}

/** Analytics do app da profissional (`/app/[slug]/*`) — acompanha a
 *  experiência de uma profissional específica desde a prévia até o app de
 *  verdade depois de pagar. Montado no `layout.tsx`, cobre todas as abas.
 *
 *  Diferença-chave pra landing page (`PostHogTracker.tsx`): aqui usamos
 *  `posthog.identify(slug, ...)` — amarra cada sessão/gravação a UMA
 *  cliente específica, pra dar pra filtrar "me mostra as gravações da
 *  Fulana" no PostHog, em vez de sessões anônimas soltas.
 *
 *  Máscara de e-mail/senha ligada por tipo de input (`maskInputOptions`). */
export function AppPostHogTracker({ slug, planStatus, clientName, studioName }: AppPostHogTrackerProps) {
  useEffect(() => {
    initPostHog({
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'always',
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: { password: true, email: true },
      },
    });

    // Bug real, 2026-10-20: testar o link de VÁRIAS clientes diferentes no
    // mesmo navegador (QA logo após criar cada catálogo) fazia a 2ª
    // cliente herdar o `distinct_id` (e as gravações) da 1ª, porque o
    // `identify` anterior nunca era limpo. Só reseta quando o slug
    // realmente muda — não a cada remount da mesma cliente.
    const currentDistinctId = getDistinctId();
    if (currentDistinctId && currentDistinctId !== slug) {
      reset();
    }

    identify(slug, {
      plan_status: planStatus,
      client_name: clientName,
      studio_name: studioName,
    });
  }, [slug, planStatus, clientName, studioName]);

  return null;
}
