import 'server-only';
import { supabaseAdmin } from '../supabase-admin';
import { cleanBookingRules, type BookingRules } from './booking-rules';

const COLS = 'booking_mode, whatsapp_button_enabled, min_notice_minutes, booking_window_days, cancellation_notice_hours, post_booking_message';

export async function getBookingRules(studioId: string): Promise<BookingRules | null> {
  const { data, error } = await supabaseAdmin.from('studios').select(COLS).eq('id', studioId).maybeSingle();
  if (error) console.error('[booking-rules-service] leitura:', error.message);
  if (!data) return null;
  return {
    booking_mode: data.booking_mode === 'auto' ? 'auto' : 'approval',
    whatsapp_button_enabled: Boolean(data.whatsapp_button_enabled),
    min_notice_minutes: data.min_notice_minutes,
    booking_window_days: data.booking_window_days,
    cancellation_notice_hours: data.cancellation_notice_hours,
    post_booking_message: data.post_booking_message || '',
  };
}

export type SaveRulesResult = { ok: true; data: BookingRules } | { ok: false; field?: string; message: string; status: number };

export async function saveBookingRules(studioId: string, input: Record<string, unknown>): Promise<SaveRulesResult> {
  const clean = cleanBookingRules(input);
  if (!clean.ok) return { ok: false, field: clean.field, message: clean.message, status: 400 };
  const { error } = await supabaseAdmin
    .from('studios')
    .update({ ...clean.data, post_booking_message: clean.data.post_booking_message || null })
    .eq('id', studioId);
  if (error) {
    console.error('[booking-rules-service] gravação:', error.message);
    return { ok: false, message: 'Não foi possível salvar. Tente de novo.', status: 500 };
  }
  return { ok: true, data: clean.data };
}
