export type NicheType = 'lash';
export type LayoutModel = 'mosaico' | 'classico';
export type ThemeVariant = 'rose' | 'luxury';

/** Variação de um serviço (`service_variations`) — ex.: Manutenção "Fio a
 *  fio" e "Volume", cada uma com duração e preço próprios. */
export interface ProcedureVariation {
  id: string;
  name: string;
  duration_minutes: number;
  /** `null` = "Sob consulta". */
  price: number | null;
}

export interface ProcedureItem {
  id: string;
  title: string;
  description?: string;
  /** Preço em reais (`services.price`); `null` = "Sob consulta". O texto
   *  exibido sai de `procedurePriceLabel` (`lib/service-format.ts`). */
  price: number | null;
  /** Mostra "A partir de" antes do preço. */
  price_from?: boolean;
  /** Duração em minutos (obrigatória no banco, 5 a 720) — é o que o
   *  catálogo mostra e o que a régua de horários do agendamento usa. */
  duration_minutes: number;
  /** Se false, o procedimento fica de fora do agendamento automático (ex:
   *  "sob consulta"), mesmo com o catálogo tendo `booking_enabled = true`. */
  bookable?: boolean;
  /** `false` = escondido do catálogo público (continua no editor). Ausente
   *  conta como ativo. */
  active?: boolean;
  category?: string;
  image_url?: string;
  /** Fotos extras do procedimento (pedido real, 2026-10-22 — uma cliente
   *  queria mais de 1 foto por técnica, pra cliente final comparar antes de
   *  decidir). Opcional, no máx. 2 (3 fotos no total com `image_url`) —
   *  mostradas na galeria em tela cheia do modal de detalhes
   *  (`ProcedureImageGallery.tsx`). A maioria dos catálogos não usa. */
  extra_photos?: string[];
  badge?: string;
  is_highlight?: boolean;
  specs?: [string, string][];
  /** Variações na ordem do catálogo; vazio/ausente = serviço sem variação. */
  variations?: ProcedureVariation[];
  /** Só no item montado para agendar uma variação escolhida
   *  (`procedureWithVariation`) — o agendamento envia junto com o `id`. */
  variation_id?: string;
}

export interface CatalogInstructionItem {
  id: string;
  title: string;
  description: string;
}

export interface CatalogInstructions {
  pre_care?: string[];
  post_care?: string[];
  tolerances?: string;
  location_notes?: string;
  custom_policies?: string[];
  /** Lista livre de itens (título + descrição) da tela de Orientações
   *  (pedido real, 2026-10-09) — substitui os 4 bullets fixos que
   *  existiam antes. A profissional adiciona/edita/remove à vontade pelo
   *  Editor Visual. Catálogos que nunca editaram essa tela continuam
   *  vendo um array-padrão montado a partir de `tolerances`/`pre_care`
   *  (ver `getCatalogBySlug` em `catalog-service.ts`) — essas colunas
   *  antigas continuam existindo só pra esse fallback. */
  items?: CatalogInstructionItem[];
}

export interface CatalogOrderData {
  id?: string;
  slug: string;
  client_name: string;
  studio_name?: string;
  /** Texto pequeno acima do nome na capa (hoje sempre "STUDIO") — editável
   *  (pedido real, 2026-10-22, de uma cliente que queria "Beauty" em vez de
   *  "Studio"). Vazio/ausente cai pro padrão "STUDIO" em `HeaderCover.tsx`
   *  — catálogos antigos continuam mostrando igual, sem precisar de
   *  migração de dado nenhuma. */
  studio_label?: string;
  bio_description?: string;
  hero_phrase?: string;
  avatar_url?: string;
  cover_media_url?: string;
  niche: NicheType;
  layout_model: LayoutModel;
  theme_variant: ThemeVariant;
  whatsapp_number: string;
  instagram_handle?: string;
  address?: string;
  maps_url?: string;
  instructions_bg_url?: string;
  final_screen_bg_url?: string;
  cta_bg_url?: string;
  edit_token?: string;
  /** Agendamento pelo catálogo funcionando agora (calculado por
   *  `isBookingLive`, `lib/studio-access.ts`) — com false, o botão de agendar
   *  cai no WhatsApp. */
  booking_enabled?: boolean;
  /** `auto` confirma na hora; `approval` deixa aguardando a profissional. */
  booking_mode?: 'auto' | 'approval';
  /** Ela pausou o agendamento pelo catálogo (o app continua normal). */
  agenda_paused?: boolean;
  /** Até quantos dias à frente a cliente pode agendar (`studios.booking_window_days`). */
  booking_window_days?: number;
  /** Recado da profissional mostrado depois que a cliente agenda. */
  post_booking_message?: string;
  /** Desligado pelo admin — catálogo público e link mágico bloqueados. */
  catalog_disabled?: boolean;
  /** Já pagou e o período pago (com folga) acabou — catálogo fora do ar. */
  catalog_payment_lapsed?: boolean;
  /** Situação da assinatura (`studios.plan_status`); `preview` = prévia de 24h. */
  plan_status?: 'preview' | 'active' | 'suspended' | 'canceled';
  preview_expires_at?: string | null;
  categories?: string[];
  procedures: ProcedureItem[];
  instructions?: CatalogInstructions;
  status?: string;
  created_at?: string;
  updated_at?: string;
}
