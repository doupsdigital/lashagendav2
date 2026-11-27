// Service worker básico do LashAgenda — só o necessário pra tornar o app de
// /app/[slug] instalável (Chrome exige um worker ativo controlando a página).
// Sem cache offline nesta versão: o guia oficial do Next 16 não cobre cache
// offline nativo, só menciona a lib de terceiros Serwist pra isso — fora do
// escopo de "PWA básico" desta fase.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Passthrough — sem estratégia de cache por enquanto.
});

// Push notifications (docs/PLANO_PRODUCAO_V1.md, Fase 18) — recebe o payload
// JSON enviado por src/lib/push-notifications.ts e mostra a notificação do
// sistema; ao clicar, foca uma aba já aberta na URL certa ou abre uma nova.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || 'LashAgenda';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/badge-96.png', // silhueta branca com fundo transparente (o Android pinta o ícone da barra de status só com o alfa; um PNG opaco vira quadrado)
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      // App já aberto em outra tela (F12.3): leva essa mesma janela até a
      // agenda em vez de abrir uma segunda.
      const appWindow = clientList.find((client) => new URL(client.url).pathname.startsWith('/app/') && 'navigate' in client);
      if (appWindow) {
        return appWindow.navigate(url).then((client) => (client || appWindow).focus()).catch(() => self.clients.openWindow(url));
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
