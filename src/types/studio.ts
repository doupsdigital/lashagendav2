/** Linhas do banco v2 (`docs/schema.sql`, F2.1). Espelham as colunas das
 *  tabelas — a camada de serviço (`lib/studio-service.ts` e
 *  `lib/scheduling/*`) lê e grava nesses formatos e traduz para os formatos
 *  que as telas usam (`types/catalog.ts`, `AgendaAppointment`…). */

export type PlanStatus = 'preview' | 'active' | 'suspended' | 'canceled';
export type BookingMode = 'auto' | 'approval';
export type CaktoPlan = 'mensal' | 'anual';
export type LayoutModelValue = 'mosaico' | 'classico';
export type ThemeVariantValue = 'rose' | 'luxury';

export interface InstructionItemRow {
  id: string;
  title: string;
  description: string;
}

export interface StudioRow {
  id: string;
  created_at: string;
  updated_at: string;

  slug: string;
  owner_name: string;
  studio_name: string | null;
  studio_label: string | null;
  hero_phrase: string | null;
  bio: string | null;
  whatsapp: string | null;
  instagram: string | null;
  address: string | null;
  maps_url: string | null;

  avatar_url: string | null;
  cover_media_url: string | null;
  instructions_bg_url: string | null;
  final_screen_bg_url: string | null;
  cta_bg_url: string | null;
  layout_model: LayoutModelValue;
  theme_variant: ThemeVariantValue;
  categories: string[];
  instructions_items: InstructionItemRow[];

  booking_mode: BookingMode;
  whatsapp_button_enabled: boolean;
  agenda_paused: boolean;
  cancellation_notice_hours: number;
  min_notice_minutes: number;
  booking_window_days: number;
  post_booking_message: string | null;

  plan_status: PlanStatus;
  cakto_plan: CaktoPlan | null;
  cakto_order_id: string | null;
  cakto_subscription_ref: string | null;
  paid_until: string | null;
  manual_plan: boolean;
  billing_email: string | null;
  preview_code: string | null;
  preview_expires_at: string | null;
  acquisition_source: string | null;

  edit_token: string;
  auth_user_id: string | null;
  app_short_code: string | null;
  disabled: boolean;
  onboarding_steps: Record<string, unknown>;
}

export interface ServiceRow {
  id: string;
  studio_id: string;
  created_at: string;
  updated_at: string;
  position: number;
  title: string;
  description: string | null;
  category: string | null;
  /** `null` = "sob consulta". Vem do PostgREST como número ou string. */
  price: number | string | null;
  price_from: boolean;
  duration_minutes: number;
  image_url: string | null;
  extra_photos: string[];
  badge: string | null;
  is_highlight: boolean;
  specs: [string, string][];
  bookable: boolean;
  active: boolean;
}

export interface ServiceVariationRow {
  id: string;
  service_id: string;
  created_at: string;
  position: number;
  name: string;
  duration_minutes: number;
  price: number | string | null;
}

export interface ClientRow {
  id: string;
  studio_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  whatsapp: string | null;
  whatsapp_digits: string;
  email: string | null;
  birth_date: string | null;
  notes: string | null;
  source: 'booking' | 'manual';
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'canceled' | 'completed' | 'no_show';
export type AppointmentOrigin = 'catalog' | 'professional' | 'record';

export interface AppointmentRow {
  id: string;
  studio_id: string;
  client_id: string;
  created_at: string;
  updated_at: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  origin: AppointmentOrigin;
  total_price: number | string | null;
  amount_received: number | string | null;
  client_notes: string | null;
  notes: string | null;
  manage_token: string;
  canceled_at: string | null;
  canceled_by: 'client' | 'professional' | null;
  cancel_reason: string | null;
}

export interface AppointmentItemRow {
  id: string;
  appointment_id: string;
  position: number;
  service_id: string | null;
  variation_id: string | null;
  title: string;
  duration_minutes: number;
  price: number | string | null;
}
