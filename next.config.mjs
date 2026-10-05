/** @type {import('next').NextConfig} */
//
// Ajoute le 25/08/2026, Bourama : Lot 3A Partie 3 mobile (fusion Capacitor).
//
// CAPACITOR_BUILD conditionne un export HTML statique (npx cap sync copie
// ensuite ce dossier `out/` dans les projets natifs Android/iOS). Le
// deploiement web normal sur Vercel N'EST PAS TOUCHE : sans cette variable
// d'environnement, le comportement est exactement celui d'avant (SSR
// normal). Voir package.json, script `build:capacitor`.
//
// Pourquoi export statique et pas server.url (charger le site deploye
// directement dans la WebView) : verifie avant de choisir -- ce depot n'a
// ni route API (app/**/route.ts), ni Server Action ('use server'), ni
// route dynamique ([slug]), ni usage de cookies()/headers() cote serveur
// (recherche faite le 25/08). Tout le dynamique passe deja par des appels
// client vers clovis-backend (FastAPI) et le SDK Supabase JS. L'export
// statique est donc la voie officiellement recommandee et compatible
// Play/App Store (server.url est explicitement deconseille en production
// par la doc Capacitor -- problemes de cookies/auth rapportes par la
// communaute, et incertitude sur l'acceptation Play Store d'une app qui
// se contente de charger un site distant).
// 30/09/2026, demande Bourama : le chat a pris l'adresse "/" (voir
// lib/routesApp.ts). L'ancienne adresse /chat redirige vers "/" pour ne
// pas casser un lien ou un marque-page existant. Ignoré (et donc non
// déclaré) dans l'export statique Capacitor, où les redirections next.config
// ne s'appliquent pas et où personne n'arrive par un ancien lien web.
// Test canal en direct PC : les builds Capacitor/Electron de cette branche
// parlent au backend de test Railway (environnement staging), pas a la
// production. Adresse en dur volontairement, a retirer avant toute fusion.
// Le web Vercel n'est pas touche (CAPACITOR_BUILD absent).
if (process.env.CAPACITOR_BUILD === "true") {
  process.env.NEXT_PUBLIC_API_URL =
    "https://clovis-backend-staging.up.railway.app";
}

const redirectionsWeb =
  process.env.CAPACITOR_BUILD === "true"
    ? {}
    : {
        async redirects() {
          return [{ source: "/chat", destination: "/", permanent: true }];
        },
      };

const nextConfig = {
  ...(process.env.CAPACITOR_BUILD === "true" ? { output: "export" } : {}),
  ...redirectionsWeb,
  images: {
    // image_vitrine_url (agents.image_vitrine_url, voir PIVOT_SOCIAL.md)
    // est hébergée sur Supabase Storage — next/image refuse par défaut
    // tout domaine non déclaré. Wildcard sur *.supabase.co plutôt que le
    // project ref exact : évite de casser l'image si le projet change
    // (dev/prod) ou si le bucket est reconfiguré.
    // L'export statique (CAPACITOR_BUILD) n'a de toute facon pas
    // next/image en mode optimise (limitation Next.js documentee), d'ou
    // unoptimized conditionne au meme flag plutot que force globalement.
    unoptimized: process.env.CAPACITOR_BUILD === "true",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
