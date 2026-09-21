const CACHE = "classgpt-v1";

// Porté de djiguigne-frontend/public/sw.js (09/08, Bourama) : même
// besoin ici -- BoutonInstaller.tsx exige un service worker actif avec
// un handler fetch pour être "installable", et useNotificationsPush.ts
// (déjà présent côté client, jusqu'ici inerte faute de service worker)
// a besoin des handlers push/notificationclick ci-dessous pour
// fonctionner. Volontairement minimal : réseau en priorité, cache en
// secours si hors ligne, pas de stratégie de cache agressive.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Correctif (21/09/2026, signalé Bourama : clics et navigations qui ne
  // font "rien" -- notamment les boutons "Avec l'IA" dans Programme et
  // Skills, mais le symptôme touchait potentiellement toute navigation
  // vers une page pas encore en cache). Une requête de NAVIGATION
  // (event.request.mode === "navigate" -- ouverture directe d'une page,
  // rechargement, ou un changement de route qui nécessite une vraie
  // navigation) ne peut PAS être repassée telle quelle à fetch() : le
  // navigateur interdit d'utiliser un Request dont le mode vaut
  // "navigate" comme entrée de fetch(). Ça faisait donc échouer cette
  // requête réseau à coup sûr pour CE type de requête précis -- et comme
  // rien n'était encore en cache pour la page visée (premier passage),
  // le repli du .catch() plus bas renvoyait une vraie erreur réseau
  // (Response.error()) : navigation qui échoue en silence, sans aucun
  // message visible à l'écran (voir le message DevTools "the promise
  // was resolved with an error response object", qui correspond
  // exactement à ce repli). Pour une requête de navigation, on refait
  // donc la requête à partir de l'URL seule (fetch(event.request.url)),
  // qui elle n'a pas cette restriction -- comportement inchangé pour
  // toutes les autres requêtes (JS, CSS, images, appels API...).
  const requeteReseau =
    event.request.mode === "navigate" ? () => fetch(event.request.url) : () => fetch(event.request);

  event.respondWith(
    requeteReseau()
      .then((reponse) => {
        const copie = reponse.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copie));
        return reponse;
      })
      .catch(() =>
        // Correctif (02/09/2026, signalé Bourama : clics qui ne font
        // "rien" sur mobile) : caches.match() renvoie `undefined` si
        // cette requête n'a jamais été mise en cache avant (premier
        // chargement d'une page, ou préchargement Next.js) -- et
        // répondre `undefined` à un fetch fait planter TOUTE la
        // requête (TypeError "Failed to convert value to 'Response'"),
        // sans page d'erreur visible : le clic échoue en silence.
        // Repli sur Response.error() quand rien n'est en cache, pour
        // que le navigateur traite ça comme un échec réseau normal
        // au lieu de planter.
        caches.match(event.request).then((reponseEnCache) => reponseEnCache || Response.error())
      )
  );
});

// Payload envoyé par pywebpush côté backend (core/notifications_push.py,
// partagé avec djiguigne-frontend) : JSON {title, body, url}.
self.addEventListener("push", (event) => {
  let donnees = { title: "Class GPT", body: "" };
  try {
    donnees = event.data.json();
  } catch (e) {
    donnees.body = event.data ? event.data.text() : "";
  }

  event.waitUntil(
    self.registration.showNotification(donnees.title || "Class GPT", {
      body: donnees.body || "",
      icon: "/icone-192.png",
      badge: "/icone-192.png",
      data: { url: donnees.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
