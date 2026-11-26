/** Ligação entre as boas-vindas (`WelcomeOnboarding`) e os tours de balões
 *  (`ProductTour`), F9.1: enquanto as boas-vindas não foram vistas, o tour da
 *  tela espera — antes os balões apareciam por cima delas, apontando para
 *  coisas escondidas atrás. Só no navegador. */

export const WELCOME_CLOSED_EVENT = 'sm:welcome-closed';

export const welcomeStorageKey = (slug: string) => `sm_welcome_seen_v1_${slug}`;

/** As boas-vindas ainda podem abrir? (não vistas). Sem localStorage, diz que
 *  não — o tour roda como antes em vez de ficar esperando para sempre. */
export function welcomePending(slug: string): boolean {
  try {
    return !window.localStorage.getItem(welcomeStorageKey(slug));
  } catch {
    return false;
  }
}
