import { SelfServeLandingPage } from '@/components/self-serve/SelfServeLandingPage';
import { FbclidTracker } from '@/components/tracking/FbclidTracker';
import { PostHogTracker } from '@/components/tracking/PostHogTracker';
import { LANDING_NICHE_CONTENT } from '@/data/landing-niche-content';

/** Página de autosserviço Lash completa (trackers + landing). Servida em
 *  `/` e `/lash`. Sem pixel da Meta por enquanto: o pixel novo do
 *  LashAgenda entra na F15 (regra de saúde e pixel, DECISOES_DE_PRODUTO.md). */
export function LashSelfServeEntry() {
  return (
    <>
      <FbclidTracker />
      <PostHogTracker />
      <SelfServeLandingPage content={LANDING_NICHE_CONTENT.lash} />
    </>
  );
}
