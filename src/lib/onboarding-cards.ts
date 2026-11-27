export interface OnboardingChecklistItem {
  id: string;
  label: string;
  href: string;
  /** Já feito, segundo o que o servidor sabe (banco). */
  done: boolean;
  /** Não existe dado no banco pra saber se foi feito — o "feito" é uma marca
   *  guardada no aparelho (`localStorage`), resolvida no cliente. */
  clientTracked?: boolean;
}

interface OnboardingChecklistInput {
  slug: string;
  /** Pagante em dia (app completo). Na prévia o checklist não aparece. */
  hasPaidAccess: boolean;
  hasAccount: boolean;
  /** Ela já salvou horários de atendimento (`business_hours` tem alguma linha). */
  hoursDone: boolean;
  /** Checklist "Primeiros passos" (F11.5) ainda aberto: ele já cobre horários e
   *  acesso, então este card espera ele terminar (sem dois checklists na tela). */
  selfServePending?: boolean;
}

/** Chave da marca "já conheceu a agenda" (escrita por `MarkAgendaVisited`,
 *  lida pelo checklist do Início). */
export const agendaVisitedKey = (slug: string) => `sm_agenda_visited_${slug}`;

/** Itens do checklist "Deixe seu studio pronto" do Início — fonte única de
 *  verdade, usada tanto por `OnboardingCardStack` (renderiza o card) quanto
 *  pelo tour guiado do Início (`InicioTour`), que precisa saber se o card vai
 *  existir pra apontar um balão nele. O item "Catálogo publicado" (sempre
 *  marcado, só pra ela já começar com algo pronto) é adicionado pelo card, não
 *  entra aqui. Ordem: horários → agenda → acesso com senha. */
export function getOnboardingChecklistItems({ slug, hasPaidAccess, hasAccount, hoursDone, selfServePending = false }: OnboardingChecklistInput): OnboardingChecklistItem[] {
  const items: OnboardingChecklistItem[] = [];

  // Lista vazia faz o card sumir sozinho (ver `OnboardingCardStack`).
  if (!hasPaidAccess || selfServePending) return items;

  items.push({ id: 'horarios', label: 'Definir horários de atendimento', href: `/app/${slug}/config#horarios`, done: hoursDone });
  items.push({ id: 'ver-agenda', label: 'Conhecer sua agenda', href: `/app/${slug}/agenda`, done: false, clientTracked: true });
  items.push({ id: 'criar-conta', label: 'Criar acesso com senha', href: `/app/${slug}/config#conta`, done: hasAccount });

  return items;
}
