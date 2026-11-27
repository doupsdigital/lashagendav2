import 'server-only';
import { envTag } from './telegram-messages';

/** Envia uma mensagem pro Telegram da dona do produto — nunca lança, só loga
 *  erro (usado em caminhos críticos como o webhook da Cakto, que precisa
 *  responder rápido e não pode falhar por causa de um aviso secundário).
 *  Os textos ficam em `telegram-messages.ts` (F12.4).
 *
 *  F12.4: fora da produção a mensagem sai marcada "[teste]"; espera no máximo
 *  5 s pelo Telegram (antes, um Telegram lento segurava o webhook). */
export async function sendTelegramMessage(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const vercelEnv = process.env.VERCEL_ENV;

  if (!botToken || !chatId) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados — notificação ignorada.');
    return false;
  }

  // Só para os testes automáticos locais (um Telegram falso); nunca na produção.
  const apiBase = (vercelEnv !== 'production' && process.env.TELEGRAM_API_BASE) || 'https://api.telegram.org';

  try {
    const res = await fetch(`${apiBase}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: `${envTag(vercelEnv)}${message}`, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    if (!json.ok) {
      console.error('[Telegram] Falha ao enviar mensagem:', json.description || res.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Telegram] Exceção ao enviar mensagem:', error instanceof Error ? error.message : error);
    return false;
  }
}
