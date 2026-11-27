import 'server-only';
import webpush from 'web-push';
import { supabaseAdmin } from './supabase-admin';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

if (publicKey && privateKey && subject) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

interface PushPayload {
  title: string;
  body: string;
  /** Caminho relativo pra abrir quando a notificação é clicada, ex. `/app/slug/agenda`. */
  url?: string;
}

export interface PushResult {
  /** Chaves VAPID configuradas no servidor. */
  configured: boolean;
  /** Aparelhos inscritos do estúdio. */
  devices: number;
  /** Entregues ao serviço de push do navegador (aceito, não "lido"). */
  sent: number;
}

/** Push ligado no servidor? (F12.3 — a tela avisa em vez de falhar calada.) */
export function isPushConfigured(): boolean {
  return Boolean(publicKey && privateKey && subject);
}

/** Notifica todos os dispositivos inscritos de um estúdio — nunca lança,
 *  só loga erro (mesmo padrão non-blocking de `src/lib/telegram.ts`, usada
 *  num caminho crítico — `/api/scheduling/book` — que não pode falhar por
 *  causa de uma notificação secundária). */
export async function sendPushToStudio(studioId: string, payload: PushPayload): Promise<PushResult> {
  const result: PushResult = { configured: isPushConfigured(), devices: 0, sent: 0 };
  if (!result.configured) {
    console.warn('[Push] VAPID keys não configuradas — notificação ignorada.');
    return result;
  }

  try {
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('studio_id', studioId);

    if (error || !subscriptions || subscriptions.length === 0) return result;
    result.devices = subscriptions.length;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
            // Aviso de agendamento perde o sentido depois de um dia (F12.3).
            { TTL: 24 * 60 * 60, urgency: 'high' }
          );
          result.sent += 1;
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Inscrição expirada/revogada pelo navegador — limpa do banco.
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
            result.devices -= 1;
          } else {
            console.error('[Push] Falha ao enviar notificação:', err);
          }
        }
      })
    );
  } catch (error) {
    console.error('[Push] Exceção ao enviar notificações:', error);
  }
  return result;
}
