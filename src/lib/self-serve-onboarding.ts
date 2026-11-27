/** Checklist "Primeiros passos" de quem comprou (Cakto). Fonte única dos
 *  passos — usada pela tela `/app/[slug]/primeiros-passos`, pelo card
 *  "Continue de onde parou" do Início e (na mesma ordem) pelo e-mail de
 *  acesso (`access-email.ts`). Arquivo puro (sem imports): o
 *  `scripts/test-self-serve-onboarding.mjs` roda direto no Node.
 *
 *  Cada passo fica marcado sozinho quando ela faz (F11.5):
 *  - WhatsApp: ao confirmar o número na própria tela (gravado no jsonb).
 *  - Serviços e preços: quando ela salva o catálogo (algum serviço mudou
 *    depois da criação do estúdio) — ou se ela disser que os de exemplo já
 *    servem (gravado no jsonb).
 *  - Horários: quando existe horário de atendimento salvo.
 *  - Acesso: quando há login vinculado (`auth_user_id`).
 *  - Compartilhar: ao copiar ou enviar o link (gravado no jsonb).
 *  O progresso gravado fica em `studios.onboarding_steps` (jsonb), pra valer
 *  em qualquer aparelho. O id `menu` (serviços) ficou do StudioMenu — é
 *  chave no jsonb, não muda. */
export type SelfServeStepId = 'whatsapp' | 'menu' | 'horarios' | 'acesso' | 'compartilhar';

/** Passos marcados por ação dela (gravados no jsonb). */
export const MARKABLE_STEPS: SelfServeStepId[] = ['whatsapp', 'menu', 'compartilhar'];

export const SELF_SERVE_STEP_ORDER: SelfServeStepId[] = ['whatsapp', 'menu', 'horarios', 'acesso', 'compartilhar'];

/** Vídeo curto de cada passo — o arquivo central dos vídeos. URL vazia = o
 *  espaço do vídeo simplesmente não aparece. Aceita link do YouTube (normal,
 *  youtu.be ou /shorts) ou arquivo .mp4 (https). */
export const SELF_SERVE_STEP_VIDEOS: Record<SelfServeStepId, string> = {
  whatsapp: '',
  menu: '',
  horarios: '',
  acesso: '',
  compartilhar: '',
};

export type OnboardingSteps = Partial<Record<SelfServeStepId, string>>;

/** O que o servidor sabe olhando o banco (fora do jsonb). */
export interface SelfServeFacts {
  hasAccount: boolean;
  hoursDone: boolean;
  servicesEdited: boolean;
}

export function parseOnboardingSteps(raw: unknown): OnboardingSteps {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: OnboardingSteps = {};
  for (const id of MARKABLE_STEPS) {
    const v = (raw as Record<string, unknown>)[id];
    if (typeof v === 'string' && v) out[id] = v;
  }
  return out;
}

/** Folga entre a criação do estúdio e a dos serviços de exemplo (gravados
 *  logo em seguida, na mesma requisição). Mudança depois disso = foi ela. */
export const SERVICES_EDIT_GRACE_MS = 2 * 60 * 1000;

/** `latestServiceChange` = maior `updated_at`/`created_at` entre os serviços
 *  do estúdio (null = nenhum serviço). Salvar o catálogo regrava os
 *  serviços, então conta como "mexeu". */
export function servicesLookEdited(studioCreatedAt: string, latestServiceChange: string | null): boolean {
  if (!latestServiceChange) return false;
  const created = Date.parse(studioCreatedAt);
  const changed = Date.parse(latestServiceChange);
  if (Number.isNaN(created) || Number.isNaN(changed)) return false;
  return changed - created > SERVICES_EDIT_GRACE_MS;
}

export function getSelfServeStepsDone(steps: OnboardingSteps, facts: SelfServeFacts): Record<SelfServeStepId, boolean> {
  return {
    whatsapp: Boolean(steps.whatsapp),
    menu: Boolean(steps.menu) || facts.servicesEdited,
    horarios: facts.hoursDone,
    acesso: facts.hasAccount,
    compartilhar: Boolean(steps.compartilhar),
  };
}

export function countSelfServeStepsDone(steps: OnboardingSteps, facts: SelfServeFacts): number {
  return Object.values(getSelfServeStepsDone(steps, facts)).filter(Boolean).length;
}

/** Converte link do YouTube (watch, youtu.be, shorts) em URL de embed.
 *  Devolve null pra qualquer outra coisa (aí é tratado como arquivo de vídeo). */
export function toYoutubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0&playsinline=1` : null;
}

/** Só https vira vídeo (link vazio ou estranho = sem vídeo). */
export function stepVideoUrl(id: SelfServeStepId): string {
  const url = SELF_SERVE_STEP_VIDEOS[id].trim();
  return /^https:\/\//i.test(url) ? url : '';
}
